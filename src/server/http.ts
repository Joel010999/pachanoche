import { createHash, randomUUID } from "node:crypto";
import type { z } from "zod";
import { AppError } from "../domain/errors.ts";

export const maxJsonBytes = 16_384;

export function ok(data: unknown, status = 200) {
  return Response.json({ data }, { status });
}

export function notFound(): never {
  throw new AppError("NOT_FOUND", 404, "Recurso inexistente.");
}

export function failure(error: unknown) {
  const requestId = randomUUID();
  if (!(error instanceof AppError)) {
    console.error("Error de API", requestId, error);
    return Response.json({ error: { code: "INTERNAL_ERROR", message: "Error interno.", requestId } }, { status: 500 });
  }
  return Response.json({ error: { code: error.code, message: error.message, requestId } }, { status: error.status });
}

export async function handle(run: () => Response | Promise<Response>) {
  try {
    return await run();
  } catch (error) {
    return failure(error);
  }
}

export function parse<T>(schema: z.ZodType<T>, input: unknown): T {
  const result = schema.safeParse(input);
  if (!result.success) throw new AppError("VALIDATION_ERROR", 400, "Los campos enviados son inválidos.");
  return result.data;
}

export function idempotencyKey(request: Request) {
  const key = request.headers.get("Idempotency-Key");
  if (!key || key.length > 128) throw new AppError("VALIDATION_ERROR", 400, "Falta una clave de idempotencia válida.");
  return key;
}

export function mediaType(request: Request) {
  return request.headers.get("content-type")?.split(";")[0].trim().toLowerCase();
}

export async function readJson(request: Request) {
  if (mediaType(request) !== "application/json") throw new AppError("UNSUPPORTED_MEDIA_TYPE", 415, "Enviar JSON.");
  const raw = await request.text();
  if (Buffer.byteLength(raw) > maxJsonBytes) throw new AppError("PAYLOAD_TOO_LARGE", 413, "El cuerpo supera el límite.");
  try {
    return { raw, input: JSON.parse(raw) as unknown };
  } catch {
    throw new AppError("VALIDATION_ERROR", 400, "JSON inválido.");
  }
}

export function digest(bytes: string | Uint8Array) {
  return createHash("sha256").update(bytes).digest("hex");
}
