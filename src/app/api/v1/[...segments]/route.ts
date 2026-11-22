import { createHash, randomUUID } from "node:crypto";
import { z } from "zod";
import { createLotSchema, measurementSchema, splitSchema } from "@/contracts/v1";
import { demoLots } from "@/domain/demo-fixture";
import { LotError } from "@/domain/demo-lots";

type Context = RouteContext<"/api/v1/[...segments]">;

function notFound(): never {
  throw new LotError("NOT_FOUND", 404, "Recurso inexistente.");
}

function failure(error: unknown) {
  const requestId = randomUUID();
  if (!(error instanceof LotError)) {
    console.error("Error de API", requestId, error);
    return Response.json({ error: { code: "INTERNAL_ERROR", message: "Error interno.", requestId } }, { status: 500 });
  }
  return Response.json({ error: { code: error.code, message: error.message, requestId } }, { status: error.status });
}

function parse<T>(schema: z.ZodType<T>, input: unknown): T {
  const result = schema.safeParse(input);
  if (!result.success) throw new LotError("VALIDATION_ERROR", 400, "Los campos enviados son inválidos.");
  return result.data;
}

export async function GET(_request: Request, context: Context) {
  try {
    const [resource, id, action, ...rest] = (await context.params).segments;
    if (resource !== "lots" || rest.length) notFound();
    if (!id) return Response.json({ data: demoLots.list() });
    if (!action) return Response.json({ data: demoLots.get(id) });
    if (action === "events") return Response.json({ data: demoLots.events(id) });
    notFound();
  } catch (error) {
    return failure(error);
  }
}

export async function POST(request: Request, context: Context) {
  try {
    const { segments } = await context.params;
    const [resource, id, action] = segments;
    if (resource !== "lots" || (segments.length !== 1 && (segments.length !== 3 || !["measurements", "splits"].includes(action)))) {
      notFound();
    }
    const key = request.headers.get("Idempotency-Key");
    if (!key || key.length > 128) throw new LotError("VALIDATION_ERROR", 400, "Falta una clave de idempotencia válida.");
    const contentType = request.headers.get("content-type")?.split(";")[0].trim().toLowerCase();
    if (contentType !== "application/json") throw new LotError("UNSUPPORTED_MEDIA_TYPE", 415, "Enviar JSON.");
    const raw = await request.text();
    if (Buffer.byteLength(raw) > 16_384) throw new LotError("PAYLOAD_TOO_LARGE", 413, "El cuerpo supera el límite.");
    let input: unknown;
    try { input = JSON.parse(raw); }
    catch { throw new LotError("VALIDATION_ERROR", 400, "JSON inválido."); }
    const fingerprint = createHash("sha256").update(raw).digest("hex");
    const data = demoLots.idempotent(segments.join("/"), key, fingerprint, () => {
      if (!id) return demoLots.create(parse(createLotSchema, input));
      if (action === "measurements") {
        const measurement = parse(measurementSchema, input);
        if (measurement.evidenceId) notFound();
        return demoLots.measure(id, measurement);
      }
      return demoLots.split(id, parse(splitSchema, input).grams);
    });
    return Response.json({ data }, { status: 201 });
  } catch (error) {
    return failure(error);
  }
}
