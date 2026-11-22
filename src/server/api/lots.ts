import { randomUUID } from "node:crypto";
import { createLotSchema, measurementSchema, splitSchema } from "../../contracts/v1.ts";
import { container } from "../container.ts";
import { digest, handle, idempotencyKey, notFound, ok, parse, readJson } from "../http.ts";
import type { Actor } from "../ports.ts";
import { requireSession } from "../session.ts";

type LotParams = { id: string };

async function mutate(request: Request, scope: string, run: (actor: Actor, input: unknown) => unknown) {
  const actor = { ...requireSession(request, "producer"), requestId: randomUUID() };
  const key = idempotencyKey(request);
  const { raw, input } = await readJson(request);
  return ok(container().lots.idempotent(actor, scope, key, digest(raw), () => run(actor, input)), 201);
}

export const listLots = (request: Request) =>
  handle(() => ok(container().lots.list(requireSession(request).organizationId)));

export const getLot = (request: Request, { id }: LotParams) =>
  handle(() => ok(container().lots.get(id, requireSession(request).organizationId)));

export const lotEvents = (request: Request, { id }: LotParams) =>
  handle(() => ok(container().lots.events(id, requireSession(request).organizationId)));

export const createLot = (request: Request) =>
  handle(() => mutate(request, "lots", (actor, input) => container().lots.create(actor, parse(createLotSchema, input))));

export const recordMeasurement = (request: Request, { id }: LotParams) =>
  handle(() => mutate(request, `lots/${id}/measurements`, (actor, input) => {
    const measurement = parse(measurementSchema, input);
    if (measurement.evidenceId) notFound();
    return container().lots.measure(actor, id, measurement);
  }));

export const splitLot = (request: Request, { id }: LotParams) =>
  handle(() => mutate(request, `lots/${id}/splits`, (actor, input) => container().lots.split(actor, id, parse(splitSchema, input).grams)));
