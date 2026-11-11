"""Genera clips cortos de gráficos con transparencia (MOV qtrle/argb) para superponer.

Uso (como módulo): from graficos import copa, tarjeta
- copa(out, color_hex, etiqueta, fps): copa de vino que entra con "pop" (escala con rebote),
  se queda y sale con fundido. 1.6 s, 300x420 px.
- tarjeta(out, lineas, fondo, tinta, dur, fps): tarjeta a pantalla completa 1080x1920 con
  entrada rápida (escala 0.92->1 + fundido 4 frames) y palabras en cascada.
Curvas: entrada tipo back.out (rebote ~8 %), salida lineal corta. Tendencia del perfil marca-personal.
"""
import math, subprocess, tempfile
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

FONT_BLACK = "/usr/share/fonts/opentype/inter/Inter-Black.otf"
FONT_BLACK_IT = "/usr/share/fonts/opentype/inter/Inter-BlackItalic.otf"


def _back_out(t, s=1.7):
    t -= 1
    return t * t * ((s + 1) * t + s) + 1


def _encode(frames_dir, out, fps):
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-framerate", str(fps), "-i", f"{frames_dir}/f_%04d.png",
                    "-c:v", "qtrle", "-pix_fmt", "argb", str(out)], check=True)


def _hex(c):
    c = c.lstrip("#"); return tuple(int(c[i:i + 2], 16) for i in (0, 2, 4))


def _glass(size, wine, label):
    W, H = size
    im = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    cx = W // 2
    bowl = (cx - 95, 20, cx + 95, 250)
    # sombra suave
    sh = Image.new("RGBA", (W, H), (0, 0, 0, 0)); ds = ImageDraw.Draw(sh)
    ds.ellipse((bowl[0] + 5, bowl[1] + 8, bowl[2] + 5, bowl[3] + 8), outline=(0, 0, 0, 110), width=12)
    ds.line((cx + 5, bowl[3] + 4, cx + 5, 336), fill=(0, 0, 0, 110), width=12)
    im = Image.alpha_composite(im, sh); d = ImageDraw.Draw(im)
    d.ellipse(bowl, fill=(255, 255, 255, 55))  # cristal translúcido
    # vino (mitad inferior del cáliz)
    wine_layer = Image.new("RGBA", (W, H), (0, 0, 0, 0)); dw = ImageDraw.Draw(wine_layer)
    dw.ellipse(bowl, fill=_hex(wine) + (255,))
    mask = Image.new("L", (W, H), 0); ImageDraw.Draw(mask).rectangle((0, 120, W, H), fill=255)
    im.paste(wine_layer, (0, 0), Image.composite(wine_layer, Image.new("RGBA", (W, H)), mask).split()[3])
    d = ImageDraw.Draw(im)
    d.ellipse(bowl, outline=(255, 255, 255, 255), width=9)
    d.line((cx, bowl[3] - 4, cx, 330), fill=(255, 255, 255, 255), width=10)
    d.rounded_rectangle((cx - 70, 324, cx + 70, 340), radius=8, fill=(255, 255, 255, 255))
    # brillo
    d.arc((bowl[0] + 28, bowl[1] + 25, bowl[0] + 90, bowl[1] + 150), 190, 250, fill=(255, 255, 255, 200), width=7)
    f = ImageFont.truetype(FONT_BLACK_IT, 50)
    tw = d.textlength(label, font=f)
    d.text((cx - tw / 2, 352), label, font=f, fill=(255, 255, 255, 255), stroke_width=5, stroke_fill=(0, 0, 0, 255))
    return im


def copa(out, wine, label, fps=25, dur=1.6, size=(300, 420)):
    base = _glass(size, wine, label)
    n = int(dur * fps)
    with tempfile.TemporaryDirectory() as td:
        for i in range(n):
            t = i / fps
            if t < 0.28:
                s = max(_back_out(t / 0.28), 0.01); a = min(t / 0.12, 1)
            elif t > dur - 0.2:
                s = 1; a = max((dur - t) / 0.2, 0)
            else:
                s = 1 + 0.015 * math.sin((t - 0.28) * 4); a = 1
            fr = Image.new("RGBA", size, (0, 0, 0, 0))
            w, h = max(int(size[0] * s), 1), max(int(size[1] * s), 1)
            g = base.resize((w, h), Image.LANCZOS)
            if a < 1:
                g.putalpha(g.split()[3].point(lambda v: int(v * a)))
            fr.alpha_composite(g, ((size[0] - w) // 2, size[1] - h if s < 1 else (size[1] - h) // 2))
            fr.save(f"{td}/f_{i:04d}.png")
        _encode(td, out, fps)


def tarjeta(out, lineas, fondo="#FFD400", tinta="#111111", dur=2.6, fps=25, size=(1080, 1920)):
    """lineas: [(texto, tamaño, color_opcional)] ; cada línea entra 3 frames después de la anterior."""
    W, H = size
    n = int(dur * fps)
    fonts = [ImageFont.truetype(FONT_BLACK, sz) for _, sz, *_ in lineas]
    tmp = ImageDraw.Draw(Image.new("RGBA", (1, 1)))
    heights = [sz * 1.05 for _, sz, *_ in lineas]
    y0 = (H - sum(heights)) / 2
    with tempfile.TemporaryDirectory() as td:
        for i in range(n):
            t = i / fps
            a_card = min(t / 0.16, 1) if t < dur - 0.16 else max((dur - t) / 0.16, 0)
            sc = 0.92 + 0.08 * _back_out(min(t / 0.24, 1), 1.2)
            card = Image.new("RGBA", size, _hex(fondo) + (255,))
            d = ImageDraw.Draw(card)
            y = y0
            for k, ((txt, sz, *col), f) in enumerate(zip(lineas, fonts)):
                tl = t - 0.12 * (k + 1)
                if tl > 0:
                    p = _back_out(min(tl / 0.22, 1))
                    tw = d.textlength(txt, font=f)
                    color = _hex(col[0] if col else tinta)
                    d.text(((W - tw) / 2, y + (1 - p) * 60), txt, font=f, fill=color + (int(255 * min(tl / 0.1, 1)),))
                y += heights[k]
            w, h = int(W * sc), int(H * sc)
            card = card.resize((w, h), Image.LANCZOS)
            fr = Image.new("RGBA", size, (0, 0, 0, 0))
            card.putalpha(card.split()[3].point(lambda v: int(v * a_card)))
            fr.alpha_composite(card, ((W - w) // 2, (H - h) // 2))
            fr.save(f"{td}/f_{i:04d}.png")
        _encode(td, out, fps)
