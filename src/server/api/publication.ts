import { randomUUID } from "node:crypto";
import { publishSchema, type PublicLot } from "../../contracts/v1.ts";
import { AppError } from "../../domain/errors.ts";
import { findSite } from "../../domain/personas.ts";
import { container } from "../container.ts";
import { digest, handle, idempotencyKey, ok, parse, readJson } from "../http.ts";
import type { Publication } from "../ports.ts";
import { requireSession } from "../session.ts";

type LotParams = { id: string };
const rounded = (value: number) => (Math.round(value * 10) / 10).toFixed(1);

export async function projectPublicLot({ code, lotId, fields }: Publication): Promise<PublicLot> {
  const { lots, geofence, satellite } = container();
  const chain = lots.lineage(lotId);
  const lot = chain[chain.length - 1];
  const { location } = lot;
  const site = location.siteId ? findSite(location.siteId) : undefined;
  const show = (field: Publication["fields"][number]) => fields.includes(field);
  return {
    code,
    productCode: lot.productCode,
    declaredArea: site?.label ?? `Área declarada ≈ ${rounded(location.latitude)}, ${rounded(location.longitude)}`,
    extractedAt: lot.extractedAt,
    events: show("events") ? chain.flatMap(item => lots.events(item.id)).map(({ type, occurredAt }) => ({ type, occurredAt })) : [],
    evidence: show("evidence")
      ? chain.flatMap(item => {
          const lotAnchors = lots.anchors(item.id);
          return lots
            .evidence(item.id)
            .filter(file => file.visibility === "digest_public")
            .map(({ id, sha256 }) => {
              const anchor = lotAnchors.find(a => a.evidenceId === id);
              return { id, sha256, ...(anchor ? { anchor } : {}) };
            });
        })
      : [],
    observations: show("observations") && site ? await satellite.observations(site.id).catch(() => []) : [],
    ...(show("geofence") ? { geofence: geofence.classify(location) } : {}),
  };
}

export const publishLot = (request: Request, { id }: LotParams) =>
  handle(async () => {
    const actor = { ...requireSession(request, "producer"), requestId: randomUUID() };
    const key = idempotencyKey(request);
    const { raw, input } = await readJson(request);
    const { lots } = container();
    const publication = lots.idempotent(actor, `lots/${id}/publish`, key, digest(raw),
      () => lots.publish(actor, id, parse(publishSchema, input).fields)) as Publication;
    return ok(await projectPublicLot(publication), 201);
  });

export const publicLot = (_request: Request, { code }: { code: string }) =>
  handle(async () => {
    const publication = container().lots.publication(code);
    if (!publication) throw new AppError("NOT_FOUND", 404, "Ficha inexistente.");
    return ok(await projectPublicLot(publication));
  });

export const currentPublication = (request: Request, { id }: LotParams) =>
  handle(async () => {
    const publication = container().lots.publicationOf(id, requireSession(request).organizationId);
    if (!publication) throw new AppError("NOT_FOUND", 404, "El lote no está publicado.");
    return ok(await projectPublicLot(publication));
  });
