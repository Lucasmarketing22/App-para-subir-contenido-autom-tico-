---
name: fish-audio
description: >-
  Generate speech and clone voices with the Fish Audio API (text-to-speech / TTS
  and voice AI). Use this skill when the user wants to turn text into audio, add a
  voiceover or narration, synthesize speech, clone a voice from a reference sample,
  list or pick a Fish Audio voice model, stream TTS, or transcribe audio (ASR) with
  Fish Audio. Triggers on "fish audio", "fish.audio", "text to speech", "TTS",
  "voiceover", "narración", "voz IA", "clonar voz", "voice cloning", "s2.1-pro",
  "reference_id", "/v1/tts". Covers auth, the /v1/tts endpoint, request parameters,
  model selection, zero-shot cloning, streaming, ASR, and copy-paste curl / Python /
  JS examples. The API key is always read from the FISH_AUDIO_API_KEY environment
  variable — never hardcode or commit it.
license: MIT
---

# Fish Audio — Voice AI (TTS, cloning, ASR)

Fish Audio is a voice-AI platform: text-to-speech, zero-shot voice cloning, and
speech recognition. This skill is how to call its HTTP API correctly.

> Built from the public Fish Audio API reference. For exact, up-to-date field
> schemas always cross-check the official docs: https://docs.fish.audio and
> https://docs.fish.audio/api-reference/endpoint/openapi-v1/text-to-speech

---

## 0. The one hard rule: the API key

The key lives in the `FISH_AUDIO_API_KEY` environment variable. **Never** write it
into a file, a code sample, a commit, or a URL.

```bash
export FISH_AUDIO_API_KEY="sk-fish-..."   # the user sets this; never hardcode it
```

- Every request sends it as `Authorization: Bearer $FISH_AUDIO_API_KEY`.
- If the variable is unset, stop and ask the user to export it — do not invent a key.
- If a key ever appears in chat or a file, tell the user to **rotate it** at fish.audio.

---

## 1. Base URL & auth

| | |
|---|---|
| Base URL | `https://api.fish.audio` |
| Auth header | `Authorization: Bearer $FISH_AUDIO_API_KEY` |
| Body encoding | `Content-Type: application/json` (also supports `application/msgpack`) |

---

## 2. Text to Speech — `POST /v1/tts`

The core endpoint. Send text, get an audio stream back (written to a file here).

### Key request fields

| Field | Type | Notes |
|---|---|---|
| `text` | string, **required** | The text to synthesize. |
| `reference_id` | string | ID of an existing voice model (from the Fish Audio site / `/model`). Picks the voice. |
| `references` | array | Zero-shot cloning instead of `reference_id`: `[{ "audio": <bytes/base64>, "text": "transcript of the sample" }]`. |
| `format` | string | Output: `mp3` (default), `wav`, `pcm`, `opus`. |
| `mp3_bitrate` | int | `64`, `128` (default), or `192` for mp3. |
| `chunk_length` | int | Streaming chunk size (~100–300). |
| `normalize` | bool | Normalize text (numbers, dates). Default `true`. |
| `latency` | string | `"normal"` (default) or `"balanced"` for lower latency. |

### Model selection

Send the model in the **`model` header** (or the body, depending on client):

- `s2.1-pro` — highest quality (default fallback).
- `s2.1-pro-free` — free developer tier.
- `s1` — legacy.

Multi-speaker dialogue is only on the S2 family (`s2-pro`, `s2.1-pro`, `s2.1-pro-free`).

### curl example

```bash
curl -sS -X POST https://api.fish.audio/v1/tts \
  -H "Authorization: Bearer $FISH_AUDIO_API_KEY" \
  -H "Content-Type: application/json" \
  -H "model: s2.1-pro" \
  -d '{
        "text": "Hola, esta es una narración generada con Fish Audio.",
        "reference_id": "YOUR_VOICE_MODEL_ID",
        "format": "mp3",
        "mp3_bitrate": 128
      }' \
  --output narration.mp3
```

Omit `reference_id` to use the model's default voice; add `references` for cloning.

---

## 3. Zero-shot voice cloning

Clone a voice on the fly by passing a short reference sample plus its transcript:

```json
{
  "text": "Text to speak in the cloned voice.",
  "references": [
    { "audio": "<base64 or raw bytes of a 10–30s clean sample>",
      "text": "Exact transcript of that reference audio." }
  ],
  "format": "mp3"
}
```

For a reusable voice, create a **voice model** on the Fish Audio site and reference
it by `reference_id` instead of re-uploading every time.

---

## 4. Python (official SDK)

```python
# pip install fish-audio-sdk
import os
from fish_audio_sdk import Session, TTSRequest

session = Session(os.environ["FISH_AUDIO_API_KEY"])  # read from env

with open("narration.mp3", "wb") as f:
    for chunk in session.tts(TTSRequest(
        text="Hola, esta es una prueba de Fish Audio.",
        reference_id="YOUR_VOICE_MODEL_ID",   # optional
        format="mp3",
    )):
        f.write(chunk)
```

## 5. Node / JavaScript (fetch)

```js
const key = process.env.FISH_AUDIO_API_KEY; // never hardcode
const res = await fetch("https://api.fish.audio/v1/tts", {
  method: "POST",
  headers: {
    Authorization: `Bearer ${key}`,
    "Content-Type": "application/json",
    model: "s2.1-pro",
  },
  body: JSON.stringify({ text: "Hello from Fish Audio", format: "mp3" }),
});
if (!res.ok) throw new Error(`Fish Audio ${res.status}: ${await res.text()}`);
const buf = Buffer.from(await res.arrayBuffer());
require("fs").writeFileSync("narration.mp3", buf);
```

---

## 6. Other endpoints (quick reference)

- **List / get voice models** — `GET /model` (browse or search voices; use an ID as `reference_id`).
- **Speech-to-text (ASR)** — `POST /v1/asr` (send audio, get a transcript).
- **Account / credits** — check remaining balance via the wallet endpoint on the site.
- **Streaming** — Fish Audio supports low-latency streaming (chunked HTTP and a
  WebSocket TTS endpoint) for real-time playback; see the official docs for the
  WebSocket message protocol before implementing.

Exact request/response schemas for these live in the official reference — confirm
there rather than guessing: https://docs.fish.audio

---

## 7. Error handling checklist

- `401 Unauthorized` → key missing/invalid/rotated. Re-check `FISH_AUDIO_API_KEY`.
- `402 / 403` → out of credits or plan restriction (or, in a sandboxed dev
  environment, the network policy is blocking `api.fish.audio` — try from a host
  with open egress).
- `422` → malformed body (missing `text`, bad `format`, or wrong `reference_id`).
- Always surface the response body on failure; Fish Audio returns a JSON reason.

---

## 8. Safety & cost

- Voice cloning: only clone a voice you have the right/consent to use.
- Each call consumes credits — for long text, synthesize in sections and cache the
  audio instead of regenerating.
- Keep the key server-side. In a web page, call Fish Audio from a backend/proxy,
  never from client-side JS where the key would be exposed.
