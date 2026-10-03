"""Generate combined card audio with the sibling Audiofier Kokoro installation.

Usage: python generate-curated-audio.py <deck-source> [--limit N]
Set AUDIOFIER_TTS_ROOT to the sibling repository and FFMPEG_PATH to ffmpeg.exe.
"""

from __future__ import annotations

import argparse
import json
import os
import subprocess
import sys
from pathlib import Path


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("deck_source", type=Path)
    parser.add_argument("--limit", type=int, default=0)
    parser.add_argument("--force", action="store_true")
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    source = args.deck_source.resolve()
    audiofier_root = Path(os.environ["AUDIOFIER_TTS_ROOT"]).resolve()
    ffmpeg_path = Path(os.environ["FFMPEG_PATH"]).resolve()
    if not ffmpeg_path.is_file():
        raise FileNotFoundError(ffmpeg_path)

    workspace_cache = source.parents[2] / "build" / "audiofier-cache"
    os.environ.setdefault("HF_HOME", str(workspace_cache / "huggingface"))
    os.environ.setdefault("TORCH_HOME", str(workspace_cache / "torch"))
    os.environ.setdefault(
        "KOKORO_MODEL_PATH",
        str(audiofier_root / ".local-tts-ai" / "models" / "kokoro-82m"),
    )
    sys.path.insert(0, str(audiofier_root / "audio-generator" / "src"))

    import soundfile as sf
    from infrastructure.audio_files import SAMPLE_RATE, merge_wavs
    from infrastructure.kokoro_runtime import synthesize_kokoro

    deck = json.loads((source / "deck.json").read_text(encoding="utf-8"))
    cards = deck["cards"][: args.limit] if args.limit else deck["cards"]
    audio_dir = source / "audio"
    audio_dir.mkdir(parents=True, exist_ok=True)
    for index, card in enumerate(cards, start=1):
        target = audio_dir / f"{card['id']}.mp3"
        if target.exists() and not args.force:
            print(f"[{index}/{len(cards)}] reused {card['id']}", flush=True)
            continue
        question = card["question"].strip()
        answer = card["answer"].strip()
        if not question or not answer:
            raise ValueError(f"Empty question or answer: {card['id']}")
        wavs = synthesize_kokoro(
            chunks=[question, answer],
            voice="af_heart",
            speed=1,
            repo_id="hexgrad/Kokoro-82M",
            lang_code="a",
        )
        wav_path = audio_dir / f"{card['id']}.wav"
        temporary_mp3 = audio_dir / f"{card['id']}.mp3.partial"
        try:
            sf.write(
                wav_path,
                merge_wavs(wavs, pause_ms=500, sample_rate=SAMPLE_RATE),
                SAMPLE_RATE,
            )
            subprocess.run(
                [
                    str(ffmpeg_path),
                    "-y",
                    "-hide_banner",
                    "-loglevel",
                    "error",
                    "-i",
                    str(wav_path),
                    "-codec:a",
                    "libmp3lame",
                    "-b:a",
                    "96k",
                    "-f",
                    "mp3",
                    str(temporary_mp3),
                ],
                check=True,
            )
            if temporary_mp3.stat().st_size == 0:
                raise ValueError(f"Empty MP3: {temporary_mp3}")
            temporary_mp3.replace(target)
        finally:
            wav_path.unlink(missing_ok=True)
            temporary_mp3.unlink(missing_ok=True)
        print(
            f"[{index}/{len(cards)}] generated {card['id']} ({target.stat().st_size} bytes)",
            flush=True,
        )


if __name__ == "__main__":
    main()
