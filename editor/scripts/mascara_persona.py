"""Máscara de la persona (video en escala de grises) para un tramo del clip ya segmentado.
Uso: python mascara_persona.py <modelo.tflite> <concat.txt> <inicio_s> <dur_s> <salida.mkv> [fps=25]
Lee los segmentos (concat.txt de render_clip), segmenta cada frame con MediaPipe y guarda
una máscara suavizada (blanco = persona). Suavizado temporal leve para evitar parpadeo del borde."""
import subprocess, sys, numpy as np, mediapipe as mp
from mediapipe.tasks import python as mpt
from mediapipe.tasks.python import vision
from PIL import Image, ImageFilter
model, lst, t0, dur, out = sys.argv[1:6]; fps = int(sys.argv[6]) if len(sys.argv) > 6 else 25
W, H = 1080, 1920
raw = subprocess.run(["ffmpeg", "-v", "error", "-f", "concat", "-safe", "0", "-i", lst, "-ss", t0, "-t", dur,
                      "-vf", f"fps={fps},scale={W}:{H}", "-f", "rawvideo", "-pix_fmt", "rgb24", "-"],
                     capture_output=True, check=True).stdout
frames = np.frombuffer(raw, np.uint8).reshape(-1, H, W, 3)
seg = vision.ImageSegmenter.create_from_options(vision.ImageSegmenterOptions(
    base_options=mpt.BaseOptions(model_asset_path=model), output_confidence_masks=True))
enc = subprocess.Popen(["ffmpeg", "-v", "error", "-y", "-f", "rawvideo", "-pix_fmt", "gray", "-s", f"{W}x{H}",
                        "-r", str(fps), "-i", "-", "-c:v", "ffv1", "-pix_fmt", "gray", out], stdin=subprocess.PIPE)
prev = None
for fr in frames:
    bg = seg.segment(mp.Image(image_format=mp.ImageFormat.SRGB, data=np.ascontiguousarray(fr))).confidence_masks[0].numpy_view().squeeze()
    a = np.clip((1 - bg) * 1.3 - 0.15, 0, 1)
    a = np.asarray(Image.fromarray((a * 255).astype(np.uint8)).resize((W, H), Image.BILINEAR).filter(ImageFilter.GaussianBlur(1.5)), np.float32)
    prev = a if prev is None else 0.6 * a + 0.4 * prev
    enc.stdin.write(prev.astype(np.uint8).tobytes())
enc.stdin.close(); enc.wait()
print(f"OK {out} ({len(frames)} frames)")
