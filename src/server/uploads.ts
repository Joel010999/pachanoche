import { evidenceMetadataSchema, evidenceRequestSchema, maxEvidenceBytes, type EvidenceMetadata } from "../contracts/v1.ts";
import { AppError } from "../domain/errors.ts";
import { digest, mediaType, parse } from "./http.ts";

const multipartOverhead = 64 * 1024;
const ascii = (bytes: Uint8Array, start: number, text: string) =>
  [...text].every((char, index) => bytes[start + index] === char.charCodeAt(0));

const signatures: Record<EvidenceMetadata["mediaType"], (bytes: Uint8Array) => boolean> = {
  "application/pdf": bytes => ascii(bytes, 0, "%PDF-"),
  "image/jpeg": bytes => bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff,
  "image/png": bytes => [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a].every((value, index) => bytes[index] === value),
  "image/webp": bytes => ascii(bytes, 0, "RIFF") && ascii(bytes, 8, "WEBP"),
};

export type Upload = EvidenceMetadata & { bytes: Uint8Array; sha256: string };

export async function readUpload(request: Request): Promise<Upload> {
  if (mediaType(request) !== "multipart/form-data") throw new AppError("UNSUPPORTED_MEDIA_TYPE", 415, "Enviar multipart/form-data.");
  if (Number(request.headers.get("content-length") ?? 0) > maxEvidenceBytes + multipartOverhead) {
    throw new AppError("PAYLOAD_TOO_LARGE", 413, "El archivo supera el límite.");
  }
  const form = await request.formData().catch(() => {
    throw new AppError("VALIDATION_ERROR", 400, "Formulario inválido.");
  });
  const file = form.get("file");
  if (!(file instanceof File) || file.size === 0) throw new AppError("VALIDATION_ERROR", 400, "Falta el archivo.");
  if (file.size > maxEvidenceBytes) throw new AppError("PAYLOAD_TOO_LARGE", 413, "El archivo supera el límite.");
  const { visibility } = parse(evidenceRequestSchema, { visibility: form.get("visibility") ?? undefined });
  const declared = evidenceMetadataSchema.safeParse({ mediaType: file.type.split(";")[0].trim().toLowerCase(), sizeBytes: file.size, visibility });
  const bytes = new Uint8Array(await file.arrayBuffer());
  if (!declared.success || !signatures[declared.data.mediaType](bytes)) {
    throw new AppError("UNSUPPORTED_MEDIA_TYPE", 415, "Tipo de archivo no permitido o contenido no coincide.");
  }
  return { ...declared.data, bytes, sha256: digest(bytes) };
}
