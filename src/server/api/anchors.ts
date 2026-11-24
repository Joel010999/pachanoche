import { randomUUID } from "node:crypto";
import { anchorRequestSchema } from "../../contracts/v1.ts";
import { AppError } from "../../domain/errors.ts";
import { container } from "../container.ts";
import { digest, handle, idempotencyKey, ok, parse, readJson } from "../http.ts";
import { requireSession } from "../session.ts";

type LotParams = { id: string };

/**
 * Registra y envía un anclaje a la blockchain de Avalanche Fuji para una evidencia del lote.
 */
export const createAnchor = (request: Request, { id }: LotParams) =>
  handle(async () => {
    const actor = { ...requireSession(request, "producer"), requestId: randomUUID() };
    const key = idempotencyKey(request);
    const { raw, input } = await readJson(request);
    const { evidenceId } = parse(anchorRequestSchema, input);
    const { lots, blockchain } = container();

    return ok(
      await lots.idempotent(actor, `lots/${id}/anchors`, key, digest(raw), async () => {
        // Verificar que el lote pertenezca a la organización
        lots.get(id, actor.organizationId);

        // Buscar la evidencia correspondiente
        const evidenceList = lots.evidence(id, actor.organizationId);
        const evidence = evidenceList.find(e => e.id === evidenceId);
        if (!evidence) {
          throw new AppError("NOT_FOUND", 404, "Evidencia no encontrada en este lote.");
        }

        // Determinar tipo de evento según la naturaleza del archivo
        // 2 = Informe de laboratorio / pureza (PDF), 1 = Evidencia de campo / pesaje (imágenes u otros)
        const eventKind: 1 | 2 = evidence.mediaType === "application/pdf" ? 2 : 1;
        const anchorId = randomUUID();

        // Enviar a Avalanche Fuji
        const summary = await blockchain.submit({
          anchorId,
          lotId: id,
          evidenceId: evidence.id,
          sha256: evidence.sha256,
          eventKind,
        });

        // Vincular en el almacén de lotes
        lots.attachAnchor(actor, id, summary);
        return summary;
      }),
      201
    );
  });

/**
 * Lista los anclajes asociados a un lote.
 */
export const listAnchors = (request: Request, { id }: LotParams) =>
  handle(async () => {
    const session = requireSession(request);
    const { lots } = container();
    return ok(lots.anchors(id, session.organizationId));
  });
