#!/usr/bin/env python3
"""Transcribe every narration clip and reject text drift or voice-prompt leakage."""

from __future__ import annotations

import argparse
import difflib
import json
import re
import sys
from pathlib import Path

import torch
import whisper


AVERAGE_SIMILARITY_THRESHOLD = 0.72
MINIMUM_SEGMENT_SIMILARITY_THRESHOLD = 0.55
PROMPT_LEAKAGE = (
    "保持原音色",
    "自然语速",
    "不要停顿",
    "不要拉长",
    "不要播音腔",
    "endofprompt",
)


def normalize(text: str) -> str:
    return "".join(re.findall(r"[\u3400-\u9fffA-Za-z0-9]+", text.lower()))


def similarity(expected: str, actual: str) -> float:
    return difflib.SequenceMatcher(None, normalize(expected), normalize(actual)).ratio()


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--project", default=".")
    parser.add_argument("--model", default="small")
    args = parser.parse_args()

    root = Path(args.project).resolve()
    episode = json.loads((root / "content" / "episode.json").read_text(encoding="utf-8"))
    model = whisper.load_model(args.model)
    use_fp16 = torch.cuda.is_available()
    results: list[dict[str, object]] = []

    for scene in episode["scenes"]:
        audio_path = root / "audio" / f"{scene['id']}.wav"
        transcription = model.transcribe(
            str(audio_path),
            language="zh",
            fp16=use_fp16,
            temperature=0,
            condition_on_previous_text=False,
        )
        transcript = str(transcription.get("text", "")).strip()
        expected = str(scene["narration"])
        score = similarity(expected, transcript)
        leakage = [phrase for phrase in PROMPT_LEAKAGE if phrase.lower() in transcript.lower()]
        results.append(
            {
                "id": scene["id"],
                "expected": expected,
                "transcript": transcript,
                "similarity": round(score, 4),
                "promptLeakage": leakage,
            }
        )

    average = sum(float(item["similarity"]) for item in results) / len(results)
    minimum = min(float(item["similarity"]) for item in results)
    leaking = [item["id"] for item in results if item["promptLeakage"]]
    low = [
        item["id"]
        for item in results
        if float(item["similarity"]) < MINIMUM_SEGMENT_SIMILARITY_THRESHOLD
    ]
    passed = average >= AVERAGE_SIMILARITY_THRESHOLD and not leaking and not low
    report = {
        "model": args.model,
        "averageSimilarity": round(average, 4),
        "minimumSimilarity": round(minimum, 4),
        "averageThreshold": AVERAGE_SIMILARITY_THRESHOLD,
        "minimumSegmentThreshold": MINIMUM_SEGMENT_SIMILARITY_THRESHOLD,
        "promptLeakage": leaking,
        "lowSimilaritySegments": low,
        "passed": passed,
        "scenes": results,
    }
    report_path = root / "audio" / "asr-audit.json"
    report_path.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(report, ensure_ascii=False, indent=2))
    return 0 if passed else 1


if __name__ == "__main__":
    sys.exit(main())
