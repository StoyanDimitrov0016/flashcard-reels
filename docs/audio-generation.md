# Technical flashcard audio generation

The bundled question-and-answer audio is generated with [Audiofier TTS](https://github.com/StoyanDimitrov0016/audiofier-tts), a separate text-to-speech application created by Stoyan Dimitrov.

This app bundles generated MP3 files into the APK. The phone does not run the
Python service and does not need network access for playback.

## Locate the local TTS service

The sibling repository is normally located at:

```text
D:\repositories\audiofier-tts
```

The Python service lives in `audio-generator`. If the location changes, search
for `audio-generator/server.py` or `audio-generator/pyproject.toml` under the
repositories workspace.

Requirements are supplied by that repository's locked environment:

- `uv` and CPython 3.12
- the existing `audio-generator/.venv`
- downloaded local TTS models under `.local-tts-ai/models`
- FFmpeg available on PATH, or `FFMPEG_PATH` pointing to `ffmpeg.exe`

Verify the tools before starting:

```powershell
Get-Command uv
ffmpeg -version
```

If FFmpeg is not available, install it with WinGet and start a fresh terminal:

```powershell
winget install --id Gyan.FFmpeg.Shared -e --accept-source-agreements --accept-package-agreements
```

## Start only the Python API

```powershell
cd D:\repositories\audiofier-tts\audio-generator
.\server.cmd --host 127.0.0.1 --port 8765 --output-dir D:\repositories\flashcard-reels\data\generated_audio
```

The health endpoint should return successfully:

```powershell
Invoke-RestMethod http://127.0.0.1:8765/health
```

The API accepts `POST /jobs` requests and exposes job progress through
`GET /jobs/{jobId}`. The service synthesizes WAV, merges chunks, and invokes
FFmpeg with `libmp3lame` to create MP3 output.

## Replace the seed library

Put the source archive in the app root as `technical_flashcard_library.zip`,
then extract it into `data/technical_flashcard_library`. It must contain:

```text
decks.json
flashcards.json
validation.json
```

Import the JSON into the typed TypeScript seeds:

```powershell
node scripts/import-technical-library.mjs
npm.cmd run format
npm.cmd run typecheck
```

The import keeps the source UUIDs. Audio filenames use the same UUID, so audio
cannot silently attach to a different card.

## Generate question and answer audio

Start the API first, then run:

```powershell
$env:AUDIO_GENERATOR_URL = "http://127.0.0.1:8765"
node scripts/generate-technical-audio.mjs
```

The script creates one combined authoring-source file per card in `data/technical_flashcard_library/audio`.
The synthesized text is the question, followed by the service's chunk pause,
followed by the answer. The single file is played by the existing answer-side
control after the card is revealed.

```text
<flashcard-id>.mp3
```

It is resumable. Existing files are skipped. Optional environment variables:

```powershell
$env:AUDIO_LIMIT = "5"       # generate a small smoke-test batch
$env:AUDIO_START = "100"     # start at a zero-based card index
$env:AUDIO_FORCE = "1"       # regenerate existing files
```

After all files exist, generate the bundled deck packages:

```powershell
npm.cmd run decks:packages
npm.cmd run format
```

The package generator validates the canonical `deck.json` contract, embeds each card's optional answer audio as `audio/<card-id>.answer.mp3`, and writes one `.fcrdeck` distribution archive per technical deck. Raw audio is an authoring input and is excluded from EAS uploads; only generated archives under `assets/decks` are runtime assets. The app copies archive audio into versioned persistent application-owned storage during installation.

## Verify and build

```powershell
npm.cmd run check
npm.cmd run test:run
npm.cmd run db:check
npm.cmd run check:android
```

Then build the APK using the repository's normal Expo/EAS workflow. Audio is bundled inside the `.fcrdeck` assets and installed through the normal package pipeline.
