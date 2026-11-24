import type { LotEvent } from "@/contracts/v1";

type ApiInit = RequestInit & { json?: unknown; idempotent?: boolean };

export class ApiError extends Error {
  readonly code?: string;
  readonly status: number;

  constructor(message: string, status: number, code?: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

// crypto.randomUUID y crypto.subtle sólo existen en contextos seguros (HTTPS o localhost).
// En el celular por http://IP-local hacen falta alternativas.
export function uuid() {
  if (typeof globalThis.crypto?.randomUUID === "function") return crypto.randomUUID();
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = [...bytes].map(byte => byte.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

export async function api<T>(path: string, { json, idempotent, headers: extra, body, ...init }: ApiInit = {}): Promise<T> {
  const headers = new Headers(extra);
  if (json !== undefined) headers.set("Content-Type", "application/json");
  if (idempotent) headers.set("Idempotency-Key", uuid());
  const response = await fetch(`/api/v1${path}`, { ...init, headers, body: json !== undefined ? JSON.stringify(json) : body, credentials: "same-origin" });
  if (response.status === 204) return undefined as T;
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new ApiError(payload.error?.message ?? "No se pudo completar la operación.", response.status, payload.error?.code);
  return payload.data as T;
}

export const message = (error: unknown) => (error instanceof Error ? error.message : "Error inesperado.");

const massFormat = new Intl.NumberFormat("es-AR", { maximumFractionDigits: 3 });
export const kg = (grams: number) => `${massFormat.format(grams / 1000)} kg`;

export const dateTime = (iso: string) =>
  new Date(iso).toLocaleString("es-AR", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "America/Argentina/Jujuy" });

export const shortId = (id: string) => id.slice(0, 8).toUpperCase();
export const shortHash = (hash: string) => (hash.length > 20 ? `${hash.slice(0, 10)}…${hash.slice(-8)}` : hash);

export const eventLabels: Record<LotEvent["type"], string> = {
  extraction_declared: "Extracción declarada",
  measurement_recorded: "Pesaje registrado",
  lot_split: "Fraccionamiento",
  sublot_created: "Sublote creado",
  evidence_attached: "Evidencia adjunta",
  lot_published: "Ficha publicada",
  anchor_confirmed: "Anclaje registrado",
  processing_recorded: "Procesamiento",
  transfer_reserved: "Transferencia reservada",
  transfer_received: "Transferencia recibida",
  transfer_cancelled: "Transferencia cancelada",
  verification_recorded: "Verificación registrada",
  corrected: "Corrección",
};

export const geofenceLabels = { inside: "Dentro del área de estudio", outside: "Fuera del área de estudio", uncertain: "Ubicación incierta" } as const;

const K = Uint32Array.from([
  0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5, 0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3,
  0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174, 0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
  0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967, 0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13,
  0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85, 0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
  0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3, 0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208,
  0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
]);

/** SHA-256 en JavaScript puro, para navegadores sin crypto.subtle. */
export function sha256Fallback(data: Uint8Array) {
  const bitLength = data.length * 8;
  const padded = new Uint8Array(Math.ceil((data.length + 9) / 64) * 64);
  padded.set(data);
  padded[data.length] = 0x80;
  const view = new DataView(padded.buffer);
  view.setUint32(padded.length - 8, Math.floor(bitLength / 2 ** 32));
  view.setUint32(padded.length - 4, bitLength >>> 0);
  const hash = Uint32Array.from([0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19]);
  const w = new Uint32Array(64);
  const rotr = (value: number, bits: number) => (value >>> bits) | (value << (32 - bits));
  for (let offset = 0; offset < padded.length; offset += 64) {
    for (let i = 0; i < 16; i++) w[i] = view.getUint32(offset + i * 4);
    for (let i = 16; i < 64; i++) {
      const s0 = rotr(w[i - 15], 7) ^ rotr(w[i - 15], 18) ^ (w[i - 15] >>> 3);
      const s1 = rotr(w[i - 2], 17) ^ rotr(w[i - 2], 19) ^ (w[i - 2] >>> 10);
      w[i] = (w[i - 16] + s0 + w[i - 7] + s1) >>> 0;
    }
    let [a, b, c, d, e, f, g, h] = hash;
    for (let i = 0; i < 64; i++) {
      const t1 = (h + (rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25)) + ((e & f) ^ (~e & g)) + K[i] + w[i]) >>> 0;
      const t2 = ((rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22)) + ((a & b) ^ (a & c) ^ (b & c))) >>> 0;
      [h, g, f, e, d, c, b, a] = [g, f, e, (d + t1) >>> 0, c, b, a, (t1 + t2) >>> 0];
    }
    [a, b, c, d, e, f, g, h].forEach((value, i) => { hash[i] = (hash[i] + value) >>> 0; });
  }
  return [...hash].map(value => value.toString(16).padStart(8, "0")).join("");
}

export async function sha256File(file: Blob) {
  const bytes = new Uint8Array(await file.arrayBuffer());
  if (!globalThis.crypto?.subtle) return sha256Fallback(bytes);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)].map(byte => byte.toString(16).padStart(2, "0")).join("");
}
