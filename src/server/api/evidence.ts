import { randomUUID } from "node:crypto";
import { AppError } from "../../domain/errors.ts";
import { container } from "../container.ts";
import { handle, idempotencyKey, ok } from "../http.ts";
import { requireSession } from "../session.ts";
import { readUpload } from "../uploads.ts";

type LotParams = { id: string };
type FileParams = LotParams & { evidenceId: string };

export const uploadEvidence = (request: Request, { id }: LotParams) =>
  handle(async () => {
    const actor = { ...requireSession(request, "producer"), requestId: randomUUID() };
    const key = idempotencyKey(request);
    const { lots, evidence } = container();
    lots.get(id, actor.organizationId);
    const { bytes, sha256, mediaType, sizeBytes, visibility } = await readUpload(request);
    await evidence.put(sha256, bytes);
    const data = lots.idempotent(actor, `lots/${id}/evidence`, key, `${sha256}:${visibility}`,
      () => lots.attachEvidence(actor, id, { sha256, mediaType, sizeBytes, visibility }));
    return ok(data, 201);
  });

export const listEvidence = (request: Request, { id }: LotParams) =>
  handle(() => ok(container().lots.evidence(id, requireSession(request).organizationId)));

export const downloadEvidence = (request: Request, { id, evidenceId }: FileParams) =>
  handle(async () => {
    const { lots, evidence } = container();
    const file = lots.evidence(id, requireSession(request).organizationId).find(item => item.id === evidenceId);
    const bytes = file && await evidence.get(file.sha256);
    if (!file || !bytes) throw new AppError("NOT_FOUND", 404, "Evidencia inexistente.");
    return new Response(new Blob([bytes as Uint8Array<ArrayBuffer>], { type: file.mediaType }), {
      headers: {
        "Content-Disposition": `attachment; filename="${file.id}"`,
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
        "X-Evidence-SHA256": file.sha256,
      },
    });
  });
