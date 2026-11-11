"""Transcribe con tiempo por palabra (faster-whisper, CPU).
Uso: python transcribir.py <audio.wav> <salida.json> [modelo] [idioma]
Guarda segmentos y palabras; mantiene muletillas (sin prompt inicial, para no inducir alucinaciones).
"""
import json, subprocess, sys
import numpy as np
from faster_whisper import WhisperModel

audio, out = sys.argv[1], sys.argv[2]
model_name = sys.argv[3] if len(sys.argv) > 3 else "medium"
lang = sys.argv[4] if len(sys.argv) > 4 else "es"
m = WhisperModel(model_name, device="cpu", compute_type="int8")
# Decodificar con ffmpeg (evita incompatibilidades de PyAV)
pcm = subprocess.run(["ffmpeg", "-v", "error", "-i", audio, "-f", "s16le", "-ac", "1", "-ar", "16000", "-"],
                     capture_output=True, check=True).stdout
samples = np.frombuffer(pcm, np.int16).astype(np.float32) / 32768.0
segs, info = m.transcribe(samples, language=lang, word_timestamps=True, vad_filter=False,
                          condition_on_previous_text=False, beam_size=5)
res = {"language": info.language, "duration": info.duration, "segments": []}
for s in segs:
    res["segments"].append({"start": round(s.start, 2), "end": round(s.end, 2), "text": s.text.strip(),
        "words": [{"w": w.word.strip(), "s": round(w.start, 2), "e": round(w.end, 2), "p": round(w.probability, 2)} for w in s.words]})
json.dump(res, open(out, "w"), ensure_ascii=False, indent=1)
for s in res["segments"]:
    print(f"[{s['start']:6.2f}-{s['end']:6.2f}] {s['text']}")
