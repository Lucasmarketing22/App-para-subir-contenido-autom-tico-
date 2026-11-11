"""Recorta a la persona del fondo (PNG con alfa) con MediaPipe selfie_multiclass.
Uso: python recortar_persona.py <modelo.tflite> <entrada.png> [<entrada2.png> ...]  -> <entrada>_person.png
Sirve para el efecto "texto detrás de la persona". Requiere libegl1 (apt) en el contenedor."""
import sys, numpy as np, mediapipe as mp
from mediapipe.tasks import python as mpt
from mediapipe.tasks.python import vision
from PIL import Image, ImageFilter
seg = vision.ImageSegmenter.create_from_options(vision.ImageSegmenterOptions(
    base_options=mpt.BaseOptions(model_asset_path=sys.argv[1]), output_confidence_masks=True))
for f in sys.argv[2:]:
    bg = seg.segment(mp.Image.create_from_file(f)).confidence_masks[0].numpy_view().squeeze()
    a = Image.fromarray((np.clip((1 - bg) * 1.3 - 0.15, 0, 1) * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(1.2))
    im = Image.open(f).convert("RGB"); a = a.resize(im.size, Image.BILINEAR); im.putalpha(a)
    im.save(f.rsplit(".", 1)[0] + "_person.png")
print("ok")
