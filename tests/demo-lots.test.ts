import assert from "node:assert/strict";
import test from "node:test";
import { createLotSchema, splitSchema, type CreateLot } from "../src/contracts/v1.ts";
import { DemoLots, LotError } from "../src/domain/demo-lots.ts";

const at = "2026-10-15T15:00:00.000Z";
const input: CreateLot = {
  productCode: "sal-artesanal", extractedAt: at,
  location: { latitude: -23.64, longitude: -66.01, recordedAt: at },
};

test("el fraccionamiento conserva masa, filiación e historial", () => {
  const store = new DemoLots();
  const lot = store.create(input);
  store.measure(lot.id, { grams: 100_000, measuredAt: at, instrument: "Balanza demo" });
  const { parent, child } = store.split(lot.id, 30_000);
  assert.equal(parent.availableGrams, 70_000);
  assert.equal(child.availableGrams, 30_000);
  assert.equal(child.parentId, parent.id);
  assert.deepEqual(store.events(parent.id).map(event => event.sequence), [1, 2, 3]);
  assert.equal(store.events(child.id)[0].type, "sublot_created");
  assert.throws(() => store.split(parent.id, 70_001), (error: LotError) => error.code === "INSUFFICIENT_MASS");
  assert.throws(() => store.measure(parent.id, { grams: 100_000, measuredAt: at, instrument: "Otra balanza" }),
    (error: LotError) => error.code === "CONFLICT");
  assert.equal(store.get(parent.id).availableGrams, 70_000);
});

test("la misma clave responde con la operación original y rechaza otro cuerpo", () => {
  const store = new DemoLots();
  const create = () => store.create(input);
  const first = store.idempotent("lots", "demo", "cuerpo-1", create);
  assert.deepEqual(store.idempotent("lots", "demo", "cuerpo-1", create), first);
  assert.throws(() => store.idempotent("lots", "demo", "cuerpo-2", create),
    (error: LotError) => error.code === "IDEMPOTENCY_CONFLICT");
  assert.equal(store.list().length, 1);
});

test("los contratos rechazan coordenadas, tiempos y masas inválidos", () => {
  assert.equal(createLotSchema.safeParse({ ...input, location: { ...input.location, latitude: 91 } }).success, false);
  assert.equal(createLotSchema.safeParse({ ...input, extractedAt: "ayer" }).success, false);
  assert.equal(splitSchema.safeParse({ grams: -1 }).success, false);
  assert.equal(splitSchema.safeParse({ grams: 1.5 }).success, false);
});
