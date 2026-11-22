import { createLotSchema, measurementSchema, splitSchema } from "../../contracts/v1.ts";
import { demoLots } from "../../domain/demo-fixture.ts";
import { handle, idempotencyKey, notFound, ok, parse, readJson, digest } from "../http.ts";

type LotParams = { id: string };

async function mutate(request: Request, scope: string, run: (input: unknown) => unknown) {
  const key = idempotencyKey(request);
  const { raw, input } = await readJson(request);
  return ok(demoLots.idempotent(scope, key, digest(raw), () => run(input)), 201);
}

export const listLots = () => handle(() => ok(demoLots.list()));

export const getLot = (_request: Request, { id }: LotParams) => handle(() => ok(demoLots.get(id)));

export const lotEvents = (_request: Request, { id }: LotParams) => handle(() => ok(demoLots.events(id)));

export const createLot = (request: Request) =>
  handle(() => mutate(request, "lots", input => demoLots.create(parse(createLotSchema, input))));

export const recordMeasurement = (request: Request, { id }: LotParams) =>
  handle(() => mutate(request, `lots/${id}/measurements`, input => {
    const measurement = parse(measurementSchema, input);
    if (measurement.evidenceId) notFound();
    return demoLots.measure(id, measurement);
  }));

export const splitLot = (request: Request, { id }: LotParams) =>
  handle(() => mutate(request, `lots/${id}/splits`, input => demoLots.split(id, parse(splitSchema, input).grams)));
