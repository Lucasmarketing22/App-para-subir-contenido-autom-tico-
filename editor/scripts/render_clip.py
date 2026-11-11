"""Renderiza un clip vertical 9:16 a partir de un plan (JSON).

Uso: python render_clip.py <plan.json>

El plan define: fuente, salida, foco (centro de la cara, 0-1), segmentos
[{"s": inicio, "e": fin, "z": zoom, "join": "cut"|"zoom"}] en segundos de la fuente,
palabras corregidas para subtítulos y colores por palabra clave.
- "cut": corte real (micro-fundido de audio de 15 ms para evitar clics).
- "zoom": continuación sin cortar el audio, solo cambia el encuadre (disfraza la monotonía).
Audio: pasa-altos + reducción de ruido suave + loudnorm a -14 LUFS (redes sociales).
"""
import json, subprocess, sys, unicodedata, re
from pathlib import Path

plan = json.load(open(sys.argv[1]))
src, out = plan["source"], plan["output"]
W, H, FPS = 1080, 1920, plan.get("fps", 25)
fx, fy = plan.get("focus", [0.5, 0.4])
segs = plan["segments"]
work = Path(plan["workdir"]); work.mkdir(parents=True, exist_ok=True)

# Dimensiones reales (tras autorrotación)
probe = subprocess.run(["ffprobe", "-v", "error", "-select_streams", "v:0", "-show_entries",
                        "stream=width,height:stream_side_data=rotation", "-of", "json", src],
                       capture_output=True, text=True, check=True)
st = json.loads(probe.stdout)["streams"][0]
sw, sh = st["width"], st["height"]
rot = next((abs(int(d.get("rotation", 0))) for d in st.get("side_data_list", []) if "rotation" in d), 0)
if rot in (90, 270):
    sw, sh = sh, sw

# ---------- Video + audio por segmento ----------
# Cada segmento se renderiza por separado (búsqueda rápida con -ss): decodificar 4K en
# muchas ramas a la vez agota la memoria. Intermedios casi sin pérdida, luego se concatenan.
seg_files = []
for i, sg in enumerate(segs):
    z = sg.get("z", 1.0)
    cw = int(sw / z) // 2 * 2
    ch = int(cw * H / W) // 2 * 2
    if ch > sh:
        ch = int(sh / z) // 2 * 2; cw = int(ch * W / H) // 2 * 2
    cx = min(max(int(fx * sw - cw / 2), 0), sw - cw)
    cy = min(max(int(fy * sh - ch / 2), 0), sh - ch)
    d = sg["e"] - sg["s"]
    fades = []
    if i == 0 or sg.get("join", "cut") == "cut":
        fades.append("afade=t=in:d=0.015")
    nxt = segs[i + 1] if i + 1 < len(segs) else None
    if nxt is None or nxt.get("join", "cut") == "cut":
        fades.append(f"afade=t=out:st={max(d - 0.015, 0):.3f}:d=0.015")
    f = work / f"seg_{i:02d}.mkv"
    subprocess.run(["ffmpeg", "-hide_banner", "-loglevel", "error", "-y", "-ss", f"{sg['s']:.3f}", "-i", src,
                    "-t", f"{d:.3f}", "-vf", f"crop={cw}:{ch}:{cx}:{cy},scale={W}:{H}:flags=lanczos,fps={FPS},setsar=1",
                    "-af", ",".join(fades) if fades else "anull", "-c:v", "libx264", "-preset", "fast", "-crf", "10",
                    "-pix_fmt", "yuv420p", "-c:a", "pcm_s16le", "-ar", "48000", "-threads", "2", str(f)], check=True)
    seg_files.append(f)
    print(f"  segmento {i + 1}/{len(segs)}", flush=True)

lst = work / "concat.txt"
lst.write_text("".join(f"file '{p.resolve().as_posix()}'\n" for p in seg_files))
grade = plan.get("grade", "eq=contrast=1.05:saturation=1.08")

# ---------- Subtítulos (ASS) ----------
def out_time(t):
    """Tiempo de la fuente -> tiempo del clip (None si cae fuera)."""
    acc = 0.0
    for sg in segs:
        if sg["s"] <= t < sg["e"]:
            return acc + (t - sg["s"])
        acc += sg["e"] - sg["s"]
    return None

def norm(w):
    w = unicodedata.normalize("NFD", w.lower())
    return re.sub(r"[^a-zñ]", "", "".join(c for c in w if unicodedata.category(c) != "Mn"))

colors = {norm(k): v for k, v in plan.get("keyword_colors", {}).items()}
words = [w for w in plan["words"] if out_time(w["s"]) is not None]
groups, cur = [], []
for w in words:
    cur.append(w)
    end_punct = w["w"][-1] in ",.?!;:"
    if len(cur) >= plan.get("max_words", 3) or end_punct:
        groups.append(cur); cur = []
if cur:
    groups.append(cur)

def ass_t(t):
    h, r = divmod(max(t, 0), 3600); m, s = divmod(r, 60)
    return f"{int(h)}:{int(m):02d}:{s:05.2f}"

total = sum(sg["e"] - sg["s"] for sg in segs)
style = plan.get("caption", {})
font, size, ypos = style.get("font", "Inter Black"), style.get("size", 82), style.get("y", 1340)
lines = []
for gi, g in enumerate(groups):
    a = out_time(g[0]["s"])
    if gi + 1 < len(groups):
        b = out_time(groups[gi + 1][0]["s"])
        b_end = out_time(g[-1]["e"] - 0.001)
        if b_end is not None and b - b_end > 0.6:  # pausa larga: no dejar el texto colgado
            b = b_end + 0.25
    else:
        b = min(total, (out_time(g[-1]["e"] - 0.001) or total) + 0.4)
    if a is None or b is None or b <= a:
        continue
    parts = []
    for w in g:
        txt = w["w"].upper().rstrip(",.;:")
        c = colors.get(norm(w["w"]))
        parts.append(f"{{\\c{c}}}{txt}{{\\c&HFFFFFF&}}" if c else txt)
    text = " ".join(parts)
    anim = "{\\fscx82\\fscy82\\t(0,90,\\fscx104\\fscy104)\\t(90,150,\\fscx100\\fscy100)}"
    lines.append(f"Dialogue: 0,{ass_t(a)},{ass_t(b)},Cap,,0,0,0,,{anim}{text}")

ass = work / "subs.ass"
ass.write_text(f"""[Script Info]
ScriptType: v4.00+
PlayResX: {W}
PlayResY: {H}
WrapStyle: 0

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Cap,{font},{size},&H00FFFFFF,&H00FFFFFF,&H00000000,&H64000000,0,0,0,0,100,100,1,0,1,6,3,8,60,60,{ypos},1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
""" + "\n".join(lines) + "\n", encoding="utf-8")

cmd = ["ffmpeg", "-hide_banner", "-loglevel", "error", "-y", "-f", "concat", "-safe", "0", "-i", str(lst),
       "-vf", f"{grade},subtitles={ass.as_posix()}",
       "-af", "highpass=f=80,afftdn=nr=10:nf=-30,loudnorm=I=-14:TP=-1.5:LRA=11,aresample=48000",
       "-c:v", "libx264", "-preset", plan.get("preset", "medium"), "-crf", str(plan.get("crf", 18)),
       "-pix_fmt", "yuv420p", "-c:a", "aac", "-b:a", "192k", "-movflags", "+faststart", out]
(work / "ffmpeg_cmd.txt").write_text(" ".join(cmd))
subprocess.run(cmd, check=True)
print(f"OK {out} ({total:.1f}s, {len(segs)} segmentos, {len(lines)} subtítulos)")
