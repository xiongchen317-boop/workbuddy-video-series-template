import argparse
import hashlib
import json
import os
import random
import re
import sys
from pathlib import Path

import numpy as np
import torch
import torch.nn.functional as F
import torchaudio


INSTRUCTION = (
    "You are a helpful assistant. 请保持原音色，自然亲切地讲解，语速平稳，"
    "疑问和转折处尾音轻微上扬，保留自然停顿与呼吸。<|endofprompt|>"
)
REFERENCE_SIMILARITY_THRESHOLD = 0.60
ADJACENT_SIMILARITY_THRESHOLD = 0.86
CANDIDATE_SEEDS = (20260712, 20261712, 20262712)


def trim_edge_silence(audio: torch.Tensor, sample_rate: int) -> torch.Tensor:
    """Trim only leading/trailing silence while preserving natural sentence tails."""
    frame_size = max(1, sample_rate // 100)
    mono = audio.abs().mean(dim=0)
    padding = (-mono.numel()) % frame_size
    if padding:
        mono = torch.cat([mono, torch.zeros(padding, device=mono.device)])
    frames = mono.view(-1, frame_size)
    rms = torch.sqrt(torch.mean(frames * frames, dim=1) + 1e-12)
    threshold = max(0.004, float(rms.max()) * 0.035)
    active = torch.nonzero(rms > threshold).flatten()
    if active.numel() == 0:
        return audio
    start = max(0, int(active[0]) * frame_size - round(sample_rate * 0.025))
    end = min(audio.shape[1], (int(active[-1]) + 1) * frame_size + round(sample_rate * 0.04))
    return audio[:, start:end]


def expected_duration_seconds(text: str) -> float:
    spoken_units = len(re.findall(r"[\u4e00-\u9fffA-Za-z0-9]", text))
    return max(2.0, spoken_units / 4.2)


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def cosine_similarity(left: torch.Tensor, right: torch.Tensor) -> float:
    return float(F.cosine_similarity(left, right, dim=1).mean())


def candidate_cost(candidate: dict) -> float:
    duration_error = abs(candidate["duration"] - candidate["target_duration"]) / candidate["target_duration"]
    reference_error = 1.0 - candidate["similarity"]
    return duration_error + reference_error * 2.5


def select_consistent_sequence(candidate_groups: list[list[dict]]) -> list[dict]:
    """Choose one candidate per scene with a hard adjacent-voice continuity gate."""
    if not candidate_groups or any(not group for group in candidate_groups):
        raise RuntimeError("every scene must have at least one valid voice candidate")

    costs: list[list[float]] = [[candidate_cost(item) for item in candidate_groups[0]]]
    parents: list[list[int | None]] = [[None for _ in candidate_groups[0]]]

    for scene_index in range(1, len(candidate_groups)):
        current_costs: list[float] = []
        current_parents: list[int | None] = []
        for current in candidate_groups[scene_index]:
            best_cost = float("inf")
            best_parent = None
            for parent_index, previous in enumerate(candidate_groups[scene_index - 1]):
                adjacent = cosine_similarity(previous["embedding"], current["embedding"])
                if adjacent < ADJACENT_SIMILARITY_THRESHOLD:
                    continue
                transition_cost = (1.0 - adjacent) * 4.0
                total = costs[-1][parent_index] + candidate_cost(current) + transition_cost
                if total < best_cost:
                    best_cost = total
                    best_parent = parent_index
            current_costs.append(best_cost)
            current_parents.append(best_parent)
        if all(parent is None for parent in current_parents):
            raise RuntimeError(
                f"no voice-continuous candidate path at scene {scene_index + 1}; "
                f"required adjacent similarity >= {ADJACENT_SIMILARITY_THRESHOLD:.2f}"
            )
        costs.append(current_costs)
        parents.append(current_parents)

    end_index = min(range(len(costs[-1])), key=costs[-1].__getitem__)
    if not np.isfinite(costs[-1][end_index]):
        raise RuntimeError("no finite voice-continuous candidate path")

    selected: list[dict] = []
    cursor = end_index
    for scene_index in range(len(candidate_groups) - 1, -1, -1):
        selected.append(candidate_groups[scene_index][cursor])
        parent = parents[scene_index][cursor]
        if scene_index > 0:
            if parent is None:
                raise RuntimeError("voice candidate backtracking failed")
            cursor = parent
    selected.reverse()
    return selected


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--project", type=Path, required=True)
    parser.add_argument("--cosy-root", type=Path, required=True)
    parser.add_argument("--scene")
    args = parser.parse_args()

    project = args.project.resolve()
    cosy_root = args.cosy_root.resolve()
    model_dir = cosy_root / "pretrained_models" / "Fun-CosyVoice3-0.5B"
    reference = project / "assets" / "source" / "female_question_reference_999.wav"
    expected_hash = "7909B83D2DEC0D5C9699994DCAF4873C0C9C3EBD9F20B98B55D76C6EEE154033"
    if sha256(reference) != expected_hash:
        raise SystemExit("female voice reference hash mismatch")

    sys.path[:0] = [str(cosy_root), str(cosy_root / "third_party" / "Matcha-TTS")]
    os.environ.setdefault("KMP_DUPLICATE_LIB_OK", "TRUE")
    from cosyvoice.cli.cosyvoice import AutoModel

    episode = json.loads((project / "content" / "episode.json").read_text(encoding="utf-8"))
    selected_scenes = [scene for scene in episode["scenes"] if not args.scene or scene["id"] == args.scene]
    if not selected_scenes:
        raise SystemExit(f"scene not found: {args.scene}")

    output = project / "audio"
    output.mkdir(parents=True, exist_ok=True)
    model = AutoModel(
        model_dir=str(model_dir),
        load_trt=False,
        load_vllm=False,
        fp16=torch.cuda.is_available(),
    )
    reference_embedding = model.frontend._extract_spk_embedding(str(reference)).cpu()
    manifest_path = output / "voice-manifest.json"
    existing = []
    if manifest_path.exists():
        existing = json.loads(manifest_path.read_text(encoding="utf-8"))
    existing_by_id = {item["id"]: item for item in existing}

    candidate_groups: list[list[dict]] = []
    for scene in selected_scenes:
        text = scene["narration"]
        target_duration = expected_duration_seconds(text)
        candidates: list[dict] = []
        for candidate_index, seed in enumerate(CANDIDATE_SEEDS):
            random.seed(seed)
            np.random.seed(seed)
            torch.manual_seed(seed)
            if torch.cuda.is_available():
                torch.cuda.manual_seed_all(seed)
            generated = model.inference_instruct2(
                text,
                INSTRUCTION,
                str(reference),
                zero_shot_spk_id="",
                stream=False,
                speed=1.0,
            )
            chunks = [result["tts_speech"].cpu() for result in generated]
            if not chunks:
                continue
            audio = trim_edge_silence(torch.cat(chunks, dim=1), model.sample_rate)
            temp = output / f".{scene['id']}.{candidate_index}.wav"
            torchaudio.save(str(temp), audio, model.sample_rate)
            embedding = model.frontend._extract_spk_embedding(str(temp)).cpu()
            similarity = cosine_similarity(embedding, reference_embedding)
            temp.unlink(missing_ok=True)
            duration = audio.shape[1] / model.sample_rate
            is_natural_duration = target_duration * 0.55 <= duration <= target_duration + 5.0
            if similarity >= REFERENCE_SIMILARITY_THRESHOLD and is_natural_duration:
                candidates.append({
                    "seed": seed,
                    "audio": audio,
                    "duration": duration,
                    "similarity": similarity,
                    "embedding": embedding,
                    "target_duration": target_duration,
                })
            print(json.dumps({
                "scene": scene["id"],
                "candidate": candidate_index + 1,
                "seed": seed,
                "duration": round(duration, 3),
                "speakerSimilarity": round(similarity, 4),
                "accepted": similarity >= REFERENCE_SIMILARITY_THRESHOLD and is_natural_duration,
            }, ensure_ascii=False), flush=True)

        if not candidates:
            raise RuntimeError(f"no valid audio generated for {scene['id']}")
        candidate_groups.append(candidates)

    if len(selected_scenes) == len(episode["scenes"]) and not args.scene:
        selections = select_consistent_sequence(candidate_groups)
    else:
        selections = [min(group, key=candidate_cost) for group in candidate_groups]

    previous_embedding = None
    for scene, selected in zip(selected_scenes, selections):
        previous_similarity = None
        if previous_embedding is not None:
            previous_similarity = cosine_similarity(previous_embedding, selected["embedding"])
            if previous_similarity < ADJACENT_SIMILARITY_THRESHOLD:
                raise RuntimeError(
                    f"voice changed between segments before {scene['id']}: "
                    f"{previous_similarity:.4f} < {ADJACENT_SIMILARITY_THRESHOLD:.2f}"
                )
        destination = output / f"{scene['id']}.wav"
        torchaudio.save(str(destination), selected["audio"], model.sample_rate)
        existing_by_id[scene["id"]] = {
            "id": scene["id"],
            "engine": "Fun-CosyVoice3-0.5B",
            "voice": "female_question_reference_999",
            "referenceSha256": expected_hash,
            "instruction": INSTRUCTION,
            "seed": selected["seed"],
            "speakerSimilarity": round(selected["similarity"], 4),
            "previousSegmentSimilarity": None if previous_similarity is None else round(previous_similarity, 4),
            "sampleRate": model.sample_rate,
            "speed": 1.0,
            "durationSeconds": round(selected["duration"], 3),
            "audioPath": destination.name,
        }
        previous_embedding = selected["embedding"]
        print(json.dumps(existing_by_id[scene["id"]], ensure_ascii=False), flush=True)

    ordered = [existing_by_id[scene["id"]] for scene in episode["scenes"] if scene["id"] in existing_by_id]
    manifest_path.write_text(json.dumps(ordered, ensure_ascii=False, indent=2), encoding="utf-8")


if __name__ == "__main__":
    main()
