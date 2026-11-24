"""Compara una captura con el mockup píxel a píxel.

Uso: uv run --with pillow --with numpy python design/scripts/compare.py mockup.png captura.png [diff.png]
Métricas:
- similitud media = 1 - |diferencia| promedio / 255
- píxeles iguales = % de píxeles cuya diferencia máxima por canal es <= 16
"""
import sys
import numpy as np
from PIL import Image

a = np.asarray(Image.open(sys.argv[1]).convert("RGB"), dtype=np.int16)
b = np.asarray(Image.open(sys.argv[2]).convert("RGB").resize((a.shape[1], a.shape[0])), dtype=np.int16)
d = np.abs(a - b)
mean_sim = 1 - d.mean() / 255
px_match = (d.max(axis=2) <= 16).mean()
print(f"similitud media: {mean_sim * 100:.2f}%")
print(f"pixeles iguales (tol 16): {px_match * 100:.2f}%")
rows = d.max(axis=2) > 16
h, w = rows.shape
for name, (x0, x1) in {"vista": (0, 1160), "panel": (1160, w)}.items():
    print(f"  {name}: {100 - rows[:, x0:x1].mean() * 100:.2f}% iguales")
for y0 in range(0, h, 100):
    print(f"  franja y={y0:4d}: vista {100 - rows[y0:y0 + 100, :1160].mean() * 100:6.2f}%  panel {100 - rows[y0:y0 + 100, 1160:].mean() * 100:6.2f}%")
if len(sys.argv) > 3:
    heat = np.clip(d.max(axis=2) * 3, 0, 255).astype(np.uint8)
    Image.fromarray(heat).save(sys.argv[3])
