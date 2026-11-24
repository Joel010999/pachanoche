"""Genera el mapa de profundidad de public/salina/piletas-1.jpg para la vista 3D.

Uso (desde la raíz del repo):
    uv run --with pillow --with numpy python design/scripts/build_salina_depth.py

Cómo se construye la profundidad (analítica, sin red neuronal):
1. Cámara original estimada: lente ~28 mm equivalente (FOV vertical 50°), altura 1,2 m,
   inclinada hacia abajo lo justo para que el horizonte caiga en la fila 587/1440.
2. Suelo: cada píxel bajo el horizonte es la intersección exacta de su rayo con el plano
   del salar (y = 0). Cielo, cerros y franja lejana van a una esfera de radio SKY_R.
3. Relieve fino a partir del color: salmuera turquesa 5 cm por debajo de la costra,
   bordes de sal cristalizada blancos 5 cm por encima (suavizado y atenuado con la distancia).
4. Montículo de sal (x≈31 %, y≈46 %), personas y bulto del fondo: contornos a mano. Se separan
   en una capa propia (máscara alfa) apoyada en su línea de contacto con el suelo (el montículo
   como cono de 35°, las personas casi verticales), y en la foto "limpia" del suelo se rellenan
   con la costra vecina para que al girar no queden "telones" estirados detrás.

Salidas en public/salina/:
- piletas-1-depth.png   16 bits gris, disparidad normalizada (más claro = más cerca), 960x720.
- piletas-1-depth.bin   uint16 little-endian, (GW+1)x(GH+1) vértices, log(distancia) normalizado.
- piletas-1-depth.json  parámetros de cámara, codificación, anclas y mallas de objetos (lo lee photoMesh.ts).
- piletas-1-clean.jpg   foto sin los objetos en relieve (textura del suelo y cielo).
- piletas-1-objects-mask.png  máscara alfa de los objetos (960x720).
"""
import json
import math
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[2]
SRC = ROOT / "public" / "salina" / "piletas-1.jpg"
OUT = ROOT / "public" / "salina"

VFOV = 50.0  # grados
CAM_H = 1.2  # metros
HORIZON_ROW = 587  # fila del horizonte en la foto de 1440
SKY_R = 2000.0
T_MIN, T_MAX = 0.5, SKY_R * 1.01
GW, GH = 384, 288  # celdas de la malla (vértices = +1)
MOUND_PEAK = (567, 648)
# Bordes transversales de las piletas (fila central de cada borde) y punto de fuga de la hilera:
# sirven para continuar la hilera hacia la cámara cuando se gira fuera de la foto.
RIM_ROWS = [1030, 777, 712, 683]
LANE_VANISHING_X = 990
# Objetos con volumen, contorneados a mano sobre la foto (píxeles). Cada uno se separa de la
# foto (máscara alfa) y se levanta sobre su línea de contacto con el suelo con la pendiente dada.
OBJECTS = [
    {"name": "monticulo", "slopeDeg": 35.0, "step": 2, "fill": "left",
     "poly": [(508, 691), (530, 677), (553, 653), (563, 645), (573, 646), (593, 652),
              (620, 653), (633, 657), (647, 673), (660, 684), (672, 691)]},
    {"name": "persona-1", "slopeDeg": 89.0, "step": 1, "fill": "both",
     "poly": [(1301, 611), (1302, 590), (1304, 578), (1309, 575), (1313, 578), (1316, 590), (1317, 611)]},
    {"name": "persona-2", "slopeDeg": 89.0, "step": 1, "fill": "both",
     "poly": [(1370, 613), (1371, 590), (1374, 584), (1379, 582), (1384, 587), (1386, 600), (1385, 613)]},
    {"name": "bulto", "slopeDeg": 60.0, "step": 1, "fill": "both",
     "poly": [(1251, 611), (1253, 600), (1262, 596), (1272, 597), (1281, 601), (1281, 611)]},
]


def box_blur(a: np.ndarray, r: int) -> np.ndarray:
    if r <= 0:
        return a
    k = 2 * r + 1
    p = np.pad(a, r, mode="edge")
    c = np.cumsum(np.cumsum(p, 0), 1)
    c = np.pad(c, ((1, 0), (1, 0)))
    return (c[k:, k:] - c[:-k, k:] - c[k:, :-k] + c[:-k, :-k]) / (k * k)


def main() -> None:
    img = Image.open(SRC).convert("RGB")
    W, H = img.size
    rgb = np.asarray(img, dtype=np.float32)
    r, g, b = rgb[..., 0], rgb[..., 1], rgb[..., 2]

    aspect = W / H
    tv = math.tan(math.radians(VFOV) / 2)
    th = tv * aspect
    hfov = math.degrees(2 * math.atan(th))
    vh = (HORIZON_ROW + 0.5) / H
    pitch = math.atan((1 - 2 * vh) * tv)  # positivo = mira hacia abajo

    def rays(u: np.ndarray, v: np.ndarray):
        xc = (2 * u - 1) * th
        yc = (1 - 2 * v) * tv
        cp, sp = math.cos(pitch), math.sin(pitch)
        dx = xc
        dy = yc * cp - sp
        dz = -yc * sp - cp
        n = np.sqrt(dx * dx + dy * dy + dz * dz)
        return dx / n, dy / n, dz / n

    u = (np.arange(W) + 0.5) / W
    v = (np.arange(H) + 0.5) / H
    U, V = np.meshgrid(u, v)
    dx, dy, dz = rays(U, V)
    horiz = np.sqrt(dx * dx + dz * dz)

    with np.errstate(divide="ignore"):
        t_ground = np.where(dy < 0, CAM_H / np.maximum(-dy, 1e-9), np.inf)
    t = np.minimum(t_ground, SKY_R)

    # --- relieve por color (solo suelo cercano) ---
    below = V > vh + 0.004
    water = (g - r > 14) & (b - r > 14) & below
    lum = 0.3 * r + 0.59 * g + 0.11 * b
    water = box_blur(box_blur(water.astype(np.float64), 10), 6) > 0.55  # tapa huecos por reflejos
    near_water = box_blur(water.astype(np.float64), 9) > 0.04
    rim = near_water & ~water & below & (lum > 150)
    relief = np.where(water, -0.06, 0.0) + np.where(rim, 0.05, 0.0)
    relief = box_blur(box_blur(relief, 2), 2)
    dist_ground = np.where(np.isfinite(t_ground), t_ground * horiz, np.inf)
    relief *= np.clip(1 - dist_ground / 60.0, 0, 1)
    with np.errstate(divide="ignore", invalid="ignore"):
        t_rel = np.where(dy < 0, (CAM_H - relief) / np.maximum(-dy, 1e-9), np.inf)
    t = np.where(np.isfinite(t_ground) & (t_ground < SKY_R), np.minimum(t_rel, SKY_R), t)

    t = np.clip(t, T_MIN, T_MAX)
    lo, hi = math.log(T_MIN), math.log(T_MAX)

    # --- objetos en relieve: máscaras, foto limpia y profundidad propia ---
    def ray_at(xp: float, yp: float):
        ddx, ddy, ddz = rays(np.array(xp / W), np.array(yp / H))
        return float(ddx), float(ddy), float(ddz)

    def ground_dist_at(xp: float, yp: float) -> float:
        ddx, ddy, ddz = ray_at(xp, yp)
        return CAM_H / -ddy * math.hypot(ddx, ddz)

    mask_img = Image.new("L", (W, H), 0)
    clean = rgb.copy()
    objects = []
    for obj in OBJECTS:
        polygon = obj["poly"]
        m_img = Image.new("L", (W, H), 0)
        ImageDraw.Draw(m_img).polygon(polygon, fill=255)
        mask_img.paste(255, (0, 0), m_img)
        m = np.asarray(m_img) > 127
        # foto limpia: cada fila del objeto se rellena con la costra vecina en espejo
        hole = box_blur(m.astype(np.float64), 3) > 0.01
        ys, _ = np.nonzero(hole)
        for y in range(ys.min(), ys.max() + 1):
            row = np.nonzero(hole[y])[0]
            if row.size == 0:
                continue
            a, b = row.min(), row.max() + 1
            n = b - a
            for x in range(a, b):
                k = x - a
                left = clean[y, max(a - 1 - k, 0)]
                right = clean[y, min(b + (n - 1 - k), W - 1)]
                w = 0.0 if obj["fill"] == "left" else (k + 0.5) / n
                clean[y, x] = left * (1 - w) + right * w
        # malla del objeto: columnas apoyadas en su línea de contacto con el suelo
        pts = np.array(polygon)
        x0, y0 = pts.min(0) - 2
        x1, y1 = pts.max(0) + 3
        step = obj["step"]
        gx = np.arange(x0, x1 + 1e-6, step)
        gy = np.arange(y0, y1 + 1e-6, step)
        base_rows: list = []
        for xg in gx:
            cols = range(int(max(xg - step, x0)), int(min(xg + step, x1)) + 1)
            rows_ = [np.nonzero(m[:, c])[0].max() for c in cols if m[:, c].any()]
            base_rows.append(max(rows_) + 0.5 if rows_ else None)
        known = [i for i, br in enumerate(base_rows) if br is not None]
        for i, br in enumerate(base_rows):
            if br is None:
                j = min(known, key=lambda q: abs(q - i))
                base_rows[i] = base_rows[j]
        tan_a = math.tan(math.radians(obj["slopeDeg"]))
        tgrid = []
        for yg in gy:
            row_t = []
            for xg, br in zip(gx, base_rows):
                d0 = ground_dist_at(xg, br)
                ddx, ddy, ddz = ray_at(xg, yg)
                hz = math.hypot(ddx, ddz)
                if yg >= br:
                    tv_ = CAM_H / -ddy
                else:
                    tv_ = (d0 + CAM_H / tan_a) / (hz - ddy / tan_a)
                row_t.append(round(min(tv_, SKY_R), 3))
            tgrid.append(row_t)
        objects.append({
            "name": obj["name"],
            "x": [float(gx[0]), float(gx[-1])],
            "y": [float(gy[0]), float(gy[-1])],
            "cols": len(gx),
            "rows": len(gy),
            "t": tgrid,
        })

    Image.fromarray(np.clip(clean, 0, 255).astype(np.uint8)).save(OUT / "piletas-1-clean.jpg", quality=90)
    mask_img = mask_img.resize((W // 2, H // 2), Image.Resampling.BOX)
    mask_img.save(OUT / "piletas-1-objects-mask.png", optimize=True)

    # --- salidas ---
    disp = T_MIN / t
    disp = (disp - disp.min()) / (disp.max() - disp.min())
    png = Image.fromarray(np.round(disp * 65535).astype(np.uint16))
    png = png.resize((W // 2, H // 2), Image.Resampling.BILINEAR)
    png.save(OUT / "piletas-1-depth.png")

    gu = np.clip(np.round(np.arange(GW + 1) / GW * W - 0.5).astype(int), 0, W - 1)
    gv = np.clip(np.round(np.arange(GH + 1) / GH * H - 0.5).astype(int), 0, H - 1)
    # muestreo con un leve promedio para no perder el relieve fino entre vértices
    lt_s = box_blur(np.log(t).astype(np.float64), 1)
    grid = lt_s[np.ix_(gv, gu)]
    q = np.round((grid - lo) / (hi - lo) * 65535).astype("<u2")
    (OUT / "piletas-1-depth.bin").write_bytes(q.tobytes())

    # anclas del lote: cima del montículo y centro de su base
    mound = next(o for o in OBJECTS if o["name"] == "monticulo")
    mp = np.array(mound["poly"])
    px, py = MOUND_PEAK
    base_y = mp[:, 1].max() + 0.5
    cx = (mp[:, 0].min() + mp[:, 0].max()) / 2
    d_front = ground_dist_at(cx, base_y)
    half_w = (mp[:, 0].max() - mp[:, 0].min()) / 2 / W * 2 * th * d_front
    ddx, ddy, ddz = ray_at(cx, base_y)
    hz = math.hypot(ddx, ddz)
    center_d = d_front + half_w * 0.6
    center = [ddx / hz * center_d, 0.0, ddz / hz * center_d]
    ddx, ddy, ddz = ray_at(px, py)
    tan_m = math.tan(math.radians(mound["slopeDeg"]))
    tp = (d_front + CAM_H / tan_m) / (math.hypot(ddx, ddz) - ddy / tan_m)
    peak = [ddx * tp, CAM_H + ddy * tp, ddz * tp]

    rim_d = [ground_dist_at(LANE_VANISHING_X, y) for y in RIM_ROWS]
    period = (rim_d[-1] - rim_d[0]) / (len(rim_d) - 1)
    ldx, _, ldz = ray_at(LANE_VANISHING_X, HORIZON_ROW + 0.5)
    lane_dir = [ldx / math.hypot(ldx, ldz), ldz / math.hypot(ldx, ldz)]

    meta = {
        "image": {"src": "/salina/piletas-1.jpg", "width": W, "height": H},
        "clean": "/salina/piletas-1-clean.jpg",
        "objectsMask": "/salina/piletas-1-objects-mask.png",
        "camera": {
            "vfovDeg": VFOV,
            "hfovDeg": hfov,
            "pitchDeg": math.degrees(pitch),
            "height": CAM_H,
        },
        "skyRadius": SKY_R,
        "grid": {"gw": GW, "gh": GH, "src": "/salina/piletas-1-depth.bin"},
        "encoding": {"type": "log-uint16", "tMin": T_MIN, "tMax": T_MAX},
        "anchors": {
            "moundPeak": [round(c, 3) for c in peak],
            "moundBase": [round(c, 3) for c in center],
            "moundRadius": round(half_w, 3),
        },
        "lane": {"period": round(period, 3), "dirXZ": [round(c, 5) for c in lane_dir],
                 "rimDistances": [round(d, 2) for d in rim_d]},
        "objects": objects,
    }
    (OUT / "piletas-1-depth.json").write_text(json.dumps(meta, separators=(",", ":")) + "\n", encoding="utf-8")
    print(json.dumps({k: v for k, v in meta.items() if k != "objects"}))
    print("objetos:", [(o["name"], o["cols"], o["rows"]) for o in objects])


if __name__ == "__main__":
    main()
