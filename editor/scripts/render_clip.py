"""Renderiza un clip vertical 9:16 a partir de un plan (JSON).

Uso: python render_clip.py <plan.json>

Plan:
- source, output, workdir, fps, focus [x,y] (centro de la cara, 0-1, por defecto)
- segments: [{"s","e" (s. de la fuente), "z" zoom, "f" [x,y] encuadre opcional, "join": "cut"|"zoom"}]
    "cut"  = corte real (micro-fundido de audio 15 ms, evita clics)
    "zoom" = mismo audio continuo, solo cambia el encuadre ("otra cámara")
- words: palabras corregidas [{"w","s","e"}]; keyword_colors {palabra: &HBBGGRR&}
- suppress_subs: [[s,e], ...] rangos de la fuente sin subtítulo (lo dice un título/tarjeta)
- caption: {font, size, y, outline, shadow, anim}; max_words
- extra_styles: líneas "Style: ..." ASS; extra_ass: [{"s","e","text","style","layer"}] en tiempo de fuente
- overlays: [{"file" (MOV con alfa), "s" (tiempo de fuente), "x", "y"}]
Audio: pasa-altos + reducción de ruido suave + loudnorm en 2 pasadas a -14 LUFS / -1.5 dBTP.
Cada segmento se renderiza aparte (decodificar 4K en muchas ramas a la vez agota la memoria).
"""
import json, os, re, subprocess, sys, unicodedata
from pathlib import Path

plan = json.load(open(sys.argv[1]))
src, out = plan["source"], plan["output"]
W, H, FPS = 1080, 1920, plan.get("fps", 25)
fx, fy = plan.get("focus", [0.5, 0.4])
segs = plan["segments"]
work = Path(plan["workdir"]); work.mkdir(parents=True, exist_ok=True)

# ---------- Dimensiones reales (tras autorrotación) ----------
probe = subprocess.run(["ffprobe", "-v", "error", "-select_streams", "v:0", "-show_entries",
                        "stream=width,height:stream_side_data=rotation", "-of", "json", src],
                       capture_output=True, text=True, check=True)
st = json.loads(probe.stdout)["streams"][0]
sw, sh = st["width"], st["height"]
rot = next((abs(int(d.get("rotation", 0))) for d in st.get("side_data_list", []) if "rotation" in d), 0)
if rot in (90, 270):
    sw, sh = sh, sw

# ---------- Segmentos ----------
seg_files = []
for i, sg in enumerate(segs):
    z = sg.get("z", 1.0)
    cw = int(sw / z) // 2 * 2
    ch = int(cw * H / W) // 2 * 2
    if ch > sh:
        ch = int(sh / z) // 2 * 2; cw = int(ch * W / H) // 2 * 2
    sfx, sfy = sg.get("f", [fx, fy])
    cx = min(max(int(sfx * sw - cw / 2), 0), sw - cw)
    cy = min(max(int(sfy * sh - ch / 2), 0), sh - ch)
    d = sg["e"] - sg["s"]
    fades = []
    if i == 0 or sg.get("join", "cut") == "cut":
        fades.append("afade=t=in:d=0.015")
    nxt = segs[i + 1] if i + 1 < len(segs) else None
    if nxt is None or nxt.get("join", "cut") == "cut":
        fades.append(f"afade=t=out:st={max(d - 0.015, 0):.3f}:d=0.015")
    f = work / f"seg_{i:02d}.mkv"
    if os.environ.get("REUSE_SEGS") == "1" and f.exists():
        seg_files.append(f); continue
    subprocess.run(["ffmpeg", "-hide_banner", "-loglevel", "error", "-y", "-ss", f"{sg['s']:.3f}", "-i", src,
                    "-t", f"{d:.3f}", "-vf", f"crop={cw}:{ch}:{cx}:{cy},scale={W}:{H}:flags=lanczos,fps={FPS},setsar=1",
                    "-af", ",".join(fades) if fades else "anull", "-c:v", "libx264", "-preset", "fast", "-crf", "10",
                    "-pix_fmt", "yuv420p", "-c:a", "pcm_s16le", "-ar", "48000", "-threads", "2", str(f)], check=True)
    seg_files.append(f)
    print(f"  segmento {i + 1}/{len(segs)}", flush=True)

lst = work / "concat.txt"
lst.write_text("".join(f"file '{p.resolve().as_posix()}'\n" for p in seg_files))
grade = plan.get("grade", "eq=contrast=1.05:saturation=1.08")
total = sum(sg["e"] - sg["s"] for sg in segs)


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


def ass_t(t):
    h, r = divmod(max(t, 0), 3600); m, s = divmod(r, 60)
    return f"{int(h)}:{int(m):02d}:{s:05.2f}"


# ---------- Subtítulos ----------
colors = {norm(k): v for k, v in plan.get("keyword_colors", {}).items()}
supp = plan.get("suppress_subs", [])
words = [w for w in plan["words"] if out_time(w["s"]) is not None and not any(a <= w["s"] < b for a, b in supp)]
groups, cur = [], []
for idx, w in enumerate(words):
    cur.append(w)
    nxt_w = words[idx + 1] if idx + 1 < len(words) else None
    gap = nxt_w is not None and nxt_w["s"] - w["e"] > 0.5
    if len(cur) >= plan.get("max_words", 3) or w["w"][-1] in ",.?!;:" or gap:
        groups.append(cur); cur = []
if cur:
    groups.append(cur)

style = plan.get("caption", {})
font, size, ypos = style.get("font", "Inter Black"), style.get("size", 82), style.get("y", 1340)
anim = style.get("anim", r"{\fscx82\fscy82\t(0,90,\fscx104\fscy104)\t(90,150,\fscx100\fscy100)}")
lines = []
for gi, g in enumerate(groups):
    a = out_time(g[0]["s"])
    b_end = out_time(g[-1]["e"] - 0.001)
    if gi + 1 < len(groups):
        b = out_time(groups[gi + 1][0]["s"])
        if b_end is not None and b is not None and b - b_end > 0.6:  # pausa larga: no dejar texto colgado
            b = b_end + 0.25
    else:
        b = min(total, (b_end or total) + 0.4)
    if a is None or b is None or b <= a:
        continue
    parts = []
    for w in g:
        txt = w["w"].upper().rstrip(",.;:")
        c = colors.get(norm(w["w"]))
        parts.append(f"{{\\c{c}}}{txt}{{\\c&HFFFFFF&}}" if c else txt)
    lines.append(f"Dialogue: 0,{ass_t(a)},{ass_t(b)},Cap,,0,0,0,,{anim}{' '.join(parts)}")

for ex in plan.get("extra_ass", []):
    a, b = out_time(ex["s"]), out_time(ex["e"] - 0.001)
    if a is not None and b is not None:
        lines.append(f"Dialogue: {ex.get('layer', 1)},{ass_t(a)},{ass_t(b)},{ex.get('style', 'Title')},,0,0,0,,{ex['text']}")

header = "\n".join([
    "[Script Info]", "ScriptType: v4.00+", f"PlayResX: {W}", f"PlayResY: {H}", "WrapStyle: 0", "",
    "[V4+ Styles]",
    "Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, "
    "Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, "
    "MarginV, Encoding",
    f"Style: Cap,{font},{size},&H00FFFFFF,&H00FFFFFF,&H00000000,&H64000000,0,0,0,0,100,100,1,0,1,"
    f"{style.get('outline', 6)},{style.get('shadow', 3)},8,60,60,{ypos},1",
    *plan.get("extra_styles", []), "",
    "[Events]", "Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text", ""])
ass = work / "subs.ass"
ass.write_text(header + "\n".join(lines) + "\n", encoding="utf-8")

# ---------- Audio: loudnorm en 2 pasadas ----------
LUFS = plan.get("lufs", -14)
afilt = "highpass=f=80,afftdn=nr=10:nf=-30"
m = subprocess.run(["ffmpeg", "-hide_banner", "-f", "concat", "-safe", "0", "-i", str(lst), "-vn",
                    "-af", afilt + f",loudnorm=I={LUFS}:TP=-1.5:LRA=11:print_format=json", "-f", "null", "-"],
                   capture_output=True, text=True).stderr
ln = json.loads(m[m.rindex("{"):m.rindex("}") + 1])
afilt += (f",loudnorm=I={LUFS}:TP=-1.5:LRA=11:measured_I={ln['input_i']}:measured_TP={ln['input_tp']}"
          f":measured_LRA={ln['input_lra']}:measured_thresh={ln['input_thresh']}:offset={ln['target_offset']}"
          ":linear=true,aresample=48000")

# ---------- Composición final ----------
inputs = ["-f", "concat", "-safe", "0", "-i", str(lst)]
fc = [f"[0:v]{grade}[b0]"]
last, n_ov = "b0", 0
for ov in plan.get("overlays", []):
    t = out_time(ov["s"])
    if t is None:
        continue
    n_ov += 1
    inputs += ["-itsoffset", f"{t:.3f}", "-i", ov["file"]]
    if ov.get("matte"):
        # Gráfico DETRÁS de la persona: se pinta el gráfico y luego se vuelve a poner encima
        # la persona recortada (mismos píxeles del fondo + máscara). Tras el fin de la máscara
        # se repite el último frame, pero como son los mismos píxeles de la base no se nota.
        n_ov += 1
        inputs += ["-itsoffset", f"{t:.3f}", "-i", ov["matte"]]
        fc.append(f"[{last}]split[sa{n_ov}][sb{n_ov}]")
        fc.append(f"[sa{n_ov}][{n_ov - 1}:v]overlay=eof_action=pass:format=auto[g{n_ov}]")
        fc.append(f"[{n_ov}:v]format=gray,scale={W}:{H}[m{n_ov}]")
        fc.append(f"[sb{n_ov}][m{n_ov}]alphamerge[p{n_ov}]")
        fc.append(f"[g{n_ov}][p{n_ov}]overlay=format=auto[b{n_ov}]")
    else:
        fc.append(f"[{last}][{n_ov}:v]overlay=x={ov.get('x', 0)}:y={ov.get('y', 0)}:eof_action=pass:format=auto[b{n_ov}]")
    last = f"b{n_ov}"
fc.append(f"[{last}]subtitles={ass.as_posix()}[vout]")
cmd = ["ffmpeg", "-hide_banner", "-loglevel", "error", "-y", *inputs,
       "-filter_complex", ";".join(fc), "-map", "[vout]", "-map", "0:a", "-af", afilt,
       "-c:v", "libx264", "-preset", plan.get("preset", "medium"), "-crf", str(plan.get("crf", 18)),
       "-pix_fmt", "yuv420p", "-c:a", "aac", "-b:a", "192k", "-movflags", "+faststart", "-t", f"{total:.3f}", out]
(work / "ffmpeg_cmd.txt").write_text(" ".join(cmd))
subprocess.run(cmd, check=True)
print(f"OK {out} ({total:.1f}s, {len(segs)} segmentos, {len(lines)} líneas de texto, {n_ov} gráficos)")
