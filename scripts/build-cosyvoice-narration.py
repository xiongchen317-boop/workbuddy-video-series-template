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
    "You are a helpful assistant. 请保持原音色。"
    "像真人教学一样自然亲切地讲解，句尾有轻微自然转折，语速舒展，不要播音腔。"
    "<|endofprompt|>"
)


def trim_edge_silence(audio: torch.Tensor, sample_rate: int) -> torch.Tensor:
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
    scenes = [scene for scene in episode["scenes"] if not args.scene or scene["id"] == args.scene]
    if not scenes:
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

    for index, scene in enumerate(episode["scenes"]):
        if scene not in scenes:
            continue
        text = scene["narration"]
        target_duration = expected_duration_seconds(text)
        candidates = []
        for candidate_index, seed in enumerate((20260719 + index, 20261719 + index)):
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
            similarity = float(F.cosine_similarity(embedding, reference_embedding, dim=1).mean())
            temp.unlink(missing_ok=True)
            duration = audio.shape[1] / model.sample_rate
            candidates.append({
                "seed": seed,
                "audio": audio,
                "duration": duration,
                "similarity": similarity,
            })
            print(json.dumps({
                "scene": scene["id"],
                "candidate": candidate_index + 1,
                "duration": round(duration, 3),
                "speakerSimilarity": round(similarity, 4),
            }, ensure_ascii=False), flush=True)

        if not candidates:
            raise RuntimeError(f"no audio generated for {scene['id']}")
        natural = [
            item for item in candidates
            if target_duration * 0.55 <= item["duration"] <= target_duration + 5.0
        ] or candidates
        best_similarity = max(item["similarity"] for item in natural)
        selected = min(
            natural,
            key=lambda item: (
                abs(item["duration"] - target_duration) / target_duration
                + (best_similarity - item["similarity"]) * 2.5
            ),
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
            "sampleRate": model.sample_rate,
            "durationSeconds": round(selected["duration"], 3),
            "audioPath": destination.name,
        }
        print(json.dumps(existing_by_id[scene["id"]], ensure_ascii=False), flush=True)

    ordered = [existing_by_id[scene["id"]] for scene in episode["scenes"] if scene["id"] in existing_by_id]
    manifest_path.write_text(json.dumps(ordered, ensure_ascii=False, indent=2), encoding="utf-8")


if __name__ == "__main__":
    main()
