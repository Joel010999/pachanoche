import { BufferAttribute, BufferGeometry, Vector3 } from "three";
import depthMeta from "../../../public/salina/piletas-1-depth.json";

/**
 * Reconstrucción 3D de la foto de las piletas.
 *
 * Cada vértice de la malla corresponde a un punto (u, v) de la foto. Se ubica sobre el rayo
 * que sale de la cámara original por ese píxel, a la distancia que indica el mapa de
 * profundidad (generado por design/scripts/build_salina_depth.py). Vista desde la cámara
 * original la malla reproduce la foto exacta; al moverse aparece el paralaje real del suelo,
 * las piletas y el montículo. Fuera de la foto la malla sigue con el plano del salar y una
 * esfera de cielo, texturizados en espejo para que al girar no aparezcan bordes vacíos.
 */
export const SALINA = depthMeta;

const { camera, grid, encoding, skyRadius } = depthMeta;
const DEG = Math.PI / 180;
const tanH = Math.tan((camera.hfovDeg * DEG) / 2);
const tanV = Math.tan((camera.vfovDeg * DEG) / 2);
const pitch = camera.pitchDeg * DEG;
const cosP = Math.cos(pitch);
const sinP = Math.sin(pitch);

/** Posición de la cámara que sacó la foto (origen en el suelo bajo sus pies, -Z hacia el horizonte). */
export const PHOTO_EYE = new Vector3(0, camera.height, 0);

/** Dirección (normalizada) del rayo de la cámara original para el punto (u, v) de la foto; v crece hacia abajo. */
export function photoRay(u: number, v: number, out = new Vector3()): Vector3 {
  const xc = (2 * u - 1) * tanH;
  const yc = (1 - 2 * v) * tanV;
  return out.set(xc, yc * cosP - sinP, -yc * sinP - cosP).normalize();
}

/** Eje óptico de la cámara original. */
export const PHOTO_AXIS = photoRay(0.5, 0.5);

/** Coordenada de textura en espejo (onda triangular) para extender la foto más allá de sus bordes. */
const mirror = (x: number) => {
  const m = ((x % 2) + 2) % 2;
  return m > 1 ? 2 - m : m;
};

/** Coordenadas de la grilla: paso fino dentro de la foto y más grueso en los márgenes. */
function axis(cells: number, before: number, after: number, outerStep = 4): number[] {
  const out: number[] = [];
  const nb = Math.ceil((before * cells) / outerStep);
  for (let i = nb; i > 0; i--) out.push((-i * outerStep) / cells);
  for (let i = 0; i <= cells; i++) out.push(i / cells);
  const na = Math.ceil((after * cells) / outerStep);
  for (let i = 1; i <= na; i++) out.push(1 + (i * outerStep) / cells);
  return out;
}

export interface PhotoGeometryOptions {
  /** Márgenes fuera de la foto, en fracción del ancho/alto. */
  margin?: { left: number; right: number; top: number; bottom: number };
  /** Se descartan triángulos cuyo salto de profundidad supere esta razón (evita "telones" estirados). */
  maxDepthRatio?: number;
}

export function buildPhotoGeometry(depth: Uint16Array, options: PhotoGeometryOptions = {}): BufferGeometry {
  const { gw, gh } = grid;
  const margin = options.margin ?? { left: 1.5, right: 1.5, top: 0.4, bottom: 2.2 };
  const maxRatio = options.maxDepthRatio ?? 2.5;
  const us = axis(gw, margin.left, margin.right);
  const vs = axis(gh, margin.top, margin.bottom);
  const cols = us.length;
  const rows = vs.length;
  const count = cols * rows;

  const positions = new Float32Array(count * 3);
  const uvs = new Float32Array(count * 2);
  const colors = new Float32Array(count * 3);
  const below = new Float32Array(count);
  const dist = new Float32Array(count);

  const logMin = Math.log(encoding.tMin);
  const logSpan = Math.log(encoding.tMax) - logMin;
  const dir = new Vector3();

  let k = 0;
  for (const v of vs) {
    for (const u of us) {
      photoRay(u, v, dir);
      let t: number;
      const i = Math.round(u * gw);
      const j = Math.round(v * gh);
      if (u >= 0 && u <= 1 && v >= 0 && v <= 1) {
        t = Math.exp(logMin + (depth[j * (gw + 1) + i] / 65535) * logSpan);
      } else {
        t = dir.y < 0 ? Math.min(camera.height / -dir.y, skyRadius) : skyRadius;
      }
      dist[k] = t;
      positions[k * 3] = dir.x * t;
      positions[k * 3 + 1] = camera.height + dir.y * t;
      positions[k * 3 + 2] = dir.z * t;
      uvs[k * 2] = mirror(u);
      uvs[k * 2 + 1] = 1 - mirror(v);
      // leve viñeta en la zona espejada para que el borde de la foto no salte a la vista
      const out = Math.max(-u, u - 1, -v, v - 1, 0);
      const shade = 1 - Math.min(out * 0.3, 0.14);
      // suelo fuera de la foto: el material lo resuelve continuando la hilera de piletas
      below[k] = (v > 1 || u < 0 || u > 1) && dir.y < 0 && t < 220 ? 1 : 0;
      const tone = below[k] ? 1 : shade;
      colors[k * 3] = colors[k * 3 + 1] = colors[k * 3 + 2] = tone;
      k++;
    }
  }

  const index: number[] = [];
  const ok = (a: number, b: number, c: number) => {
    const lo = Math.min(dist[a], dist[b], dist[c]);
    const hi = Math.max(dist[a], dist[b], dist[c]);
    // solo cortan los saltos cercanos (bordes del montículo); cielo y suelo lejano se unen siempre
    return lo > 150 || hi / lo <= maxRatio;
  };
  for (let r = 0; r < rows - 1; r++) {
    for (let c = 0; c < cols - 1; c++) {
      const a = r * cols + c;
      const b = a + 1;
      const d = a + cols;
      const e = d + 1;
      if (ok(a, d, b)) index.push(a, d, b);
      if (ok(b, d, e)) index.push(b, d, e);
    }
  }

  const geometry = new BufferGeometry();
  geometry.setAttribute("position", new BufferAttribute(positions, 3));
  geometry.setAttribute("uv", new BufferAttribute(uvs, 2));
  geometry.setAttribute("color", new BufferAttribute(colors, 3));
  geometry.setAttribute("below", new BufferAttribute(below, 1));
  geometry.setIndex(new BufferAttribute(new Uint32Array(index), 1));
  geometry.computeBoundingSphere();
  return geometry;
}

/**
 * Malla de un objeto con volumen (montículo, personas): una grilla sobre su recuadro en la foto
 * con la distancia por vértice que calculó el script. Se dibuja con la foto original y la máscara
 * alfa, encima del suelo limpio.
 */
export function buildObjectGeometry(obj: (typeof depthMeta.objects)[number]): BufferGeometry {
  const { width, height } = depthMeta.image;
  const { cols, rows } = obj;
  const positions = new Float32Array(cols * rows * 3);
  const uvs = new Float32Array(cols * rows * 2);
  const dir = new Vector3();
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const k = r * cols + c;
      const u = (obj.x[0] + ((obj.x[1] - obj.x[0]) * c) / (cols - 1)) / width;
      const v = (obj.y[0] + ((obj.y[1] - obj.y[0]) * r) / (rows - 1)) / height;
      const t = obj.t[r][c];
      photoRay(u, v, dir);
      positions[k * 3] = dir.x * t;
      positions[k * 3 + 1] = camera.height + dir.y * t;
      positions[k * 3 + 2] = dir.z * t;
      uvs[k * 2] = u;
      uvs[k * 2 + 1] = 1 - v;
    }
  }
  const index: number[] = [];
  for (let r = 0; r < rows - 1; r++) {
    for (let c = 0; c < cols - 1; c++) {
      const a = r * cols + c;
      index.push(a, a + cols, a + 1, a + 1, a + cols, a + cols + 1);
    }
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute("position", new BufferAttribute(positions, 3));
  geometry.setAttribute("uv", new BufferAttribute(uvs, 2));
  geometry.setIndex(index);
  geometry.computeBoundingSphere();
  return geometry;
}
