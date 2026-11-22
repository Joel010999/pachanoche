import { createLotSchema, measurementSchema, splitSchema } from "../../contracts/v1.ts";
import { container } from "../container.ts";
import { handle, idempotencyKey, notFound, ok, parse, readJson, digest } from "../http.ts";

type LotParams = { id: string };

async function mutate(request: Request, scope: string, run: (input: unknown) => unknown) {
  const key = idempotencyKey(request);
  const { raw, input } = await readJson(request);
  return ok(container().lots.idempotent(scope, key, digest(raw), () => run(input)), 201);
}

export const listLots = () => handle(() => ok(container().lots.list()));

export const getLot = (_request: Request, { id }: LotParams) => handle(() => ok(container().lots.get(id)));

export const lotEvents = (_request: Request, { id }: LotParams) => handle(() => ok(container().lots.events(id)));

export const createLot = (request: Request) =>
  handle(() => mutate(request, "lots", input => container().lots.create(parse(createLotSchema, input))));

export const recordMeasurement = (request: Request, { id }: LotParams) =>
  handle(() => mutate(request, `lots/${id}/measurements`, input => {
    const measurement = parse(measurementSchema, input);
    if (measurement.evidenceId) notFound();
    return container().lots.measure(id, measurement);
  }));

export const splitLot = (request: Request, { id }: LotParams) =>
  handle(() => mutate(request, `lots/${id}/splits`, input => container().lots.split(id, parse(splitSchema, input).grams)));
