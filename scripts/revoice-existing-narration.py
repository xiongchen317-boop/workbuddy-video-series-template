import argparse
import hashlib
import json
import os
import random
import shutil
import sys
from pathlib import Path

import numpy as np
import torch
import torch.nn.functional as F
import torchaudio


REFERENCE_SIMILARITY_THRESHOLD = 0.60
ADJACENT_SIMILARITY_THRESHOLD = 0.86
FIXED_SEED = 20260712


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def similarity(left: torch.Tensor, right: torch.Tensor) -> float:
    return float(F.cosine_similarity(left, right, dim=1).mean())


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--project", type=Path, required=True)
    parser.add_argument("--cosy-root", type=Path, required=True)
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
    audio_dir = project / "audio"
    staging_dir = audio_dir / "continuity-candidates"
    backup_dir = audio_dir / "original-before-continuity"
    staging_dir.mkdir(parents=True, exist_ok=True)
    backup_dir.mkdir(parents=True, exist_ok=True)

    random.seed(FIXED_SEED)
    np.random.seed(FIXED_SEED)
    torch.manual_seed(FIXED_SEED)
    if torch.cuda.is_available():
        torch.cuda.manual_seed_all(FIXED_SEED)

    model = AutoModel(
        model_dir=str(model_dir),
        load_trt=False,
        load_vllm=False,
        fp16=torch.cuda.is_available(),
    )
    reference_embedding = model.frontend._extract_spk_embedding(str(reference)).cpu()
    generated_items: list[dict] = []

    for scene in episode["scenes"]:
        source = audio_dir / f"{scene['id']}.wav"
        if not source.exists():
            raise RuntimeError(f"missing source narration: {source}")
        source_info = torchaudio.info(str(source))
        chunks = [
            item["tts_speech"].cpu()
            for item in model.inference_vc(
                str(source),
                str(reference),
                stream=False,
                speed=1.0,
            )
        ]
        if not chunks:
            raise RuntimeError(f"voice conversion produced no audio for {scene['id']}")
        converted = torch.cat(chunks, dim=1)
        candidate_path = staging_dir / f"{scene['id']}.wav"
        torchaudio.save(str(candidate_path), converted, model.sample_rate)
        embedding = model.frontend._extract_spk_embedding(str(candidate_path)).cpu()
        reference_similarity = similarity(embedding, reference_embedding)
        generated_items.append({
            "id": scene["id"],
            "path": candidate_path,
            "embedding": embedding,
            "referenceSimilarity": reference_similarity,
            "durationSeconds": converted.shape[1] / model.sample_rate,
            "sourceDurationSeconds": source_info.num_frames / source_info.sample_rate,
        })
        print(json.dumps({
            "scene": scene["id"],
            "referenceSimilarity": round(reference_similarity, 4),
            "durationSeconds": round(converted.shape[1] / model.sample_rate, 3),
        }, ensure_ascii=False), flush=True)

    previous_embedding = None
    report: list[dict] = []
    for item in generated_items:
        previous_similarity = None
        if previous_embedding is not None:
            previous_similarity = similarity(previous_embedding, item["embedding"])
        if item["referenceSimilarity"] < REFERENCE_SIMILARITY_THRESHOLD:
            raise RuntimeError(
                f"reference voice similarity failed for {item['id']}: "
                f"{item['referenceSimilarity']:.4f} < {REFERENCE_SIMILARITY_THRESHOLD:.2f}"
            )
        if previous_similarity is not None and previous_similarity < ADJACENT_SIMILARITY_THRESHOLD:
            raise RuntimeError(
                f"voice continuity failed before {item['id']}: "
                f"{previous_similarity:.4f} < {ADJACENT_SIMILARITY_THRESHOLD:.2f}"
            )
        report.append({
            "id": item["id"],
            "engine": "Fun-CosyVoice3-0.5B",
            "voice": "female_question_reference_999",
            "method": "fixed-reference voice conversion continuity repair",
            "referenceSha256": expected_hash,
            "seed": FIXED_SEED,
            "speakerSimilarity": round(item["referenceSimilarity"], 4),
            "previousSegmentSimilarity": None if previous_similarity is None else round(previous_similarity, 4),
            "sampleRate": model.sample_rate,
            "speed": 1.0,
            "sourceDurationSeconds": round(item["sourceDurationSeconds"], 3),
            "durationSeconds": round(item["durationSeconds"], 3),
            "audioPath": f"{item['id']}.wav",
        })
        previous_embedding = item["embedding"]

    for item in generated_items:
        destination = audio_dir / f"{item['id']}.wav"
        backup = backup_dir / destination.name
        if not backup.exists():
            shutil.copy2(destination, backup)
        shutil.copy2(item["path"], destination)

    (audio_dir / "voice-manifest.json").write_text(
        json.dumps(report, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    (audio_dir / "continuity-report.json").write_text(
        json.dumps(report, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    print(json.dumps({
        "status": "pass",
        "minimumReferenceSimilarity": min(item["speakerSimilarity"] for item in report),
        "minimumAdjacentSimilarity": min(
            item["previousSegmentSimilarity"]
            for item in report
            if item["previousSegmentSimilarity"] is not None
        ),
    }, ensure_ascii=False), flush=True)


if __name__ == "__main__":
    main()
