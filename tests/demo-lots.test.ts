import assert from "node:assert/strict";
import test from "node:test";
import { createLotSchema, splitSchema, type CreateLot } from "../src/contracts/v1.ts";
import { DemoLots } from "../src/domain/demo-lots.ts";
import type { AppError } from "../src/domain/errors.ts";
import { organizations, personas, sessionOf } from "../src/domain/personas.ts";

const at = "2026-10-15T15:00:00.000Z";
const input: CreateLot = {
  productCode: "sal-artesanal", extractedAt: at,
  location: { latitude: -23.64, longitude: -66.01, recordedAt: at },
};
const producer = sessionOf(personas[0]);
const otherProducer = sessionOf(personas[2]);

test("el fraccionamiento conserva masa, filiación e historial", () => {
  const store = new DemoLots();
  const lot = store.create(producer, input);
  store.measure(producer, lot.id, { grams: 100_000, measuredAt: at, instrument: "Balanza demo" });
  const { parent, child } = store.split(producer, lot.id, 30_000);
  assert.equal(parent.availableGrams, 70_000);
  assert.equal(child.availableGrams, 30_000);
  assert.equal(child.parentId, parent.id);
  assert.deepEqual(store.events(parent.id).map(event => event.sequence), [1, 2, 3]);
  assert.equal(store.events(child.id)[0].type, "sublot_created");
  assert.throws(() => store.split(producer, parent.id, 70_001), (error: AppError) => error.code === "INSUFFICIENT_MASS");
  assert.throws(() => store.measure(producer, parent.id, { grams: 100_000, measuredAt: at, instrument: "Otra balanza" }),
    (error: AppError) => error.code === "CONFLICT");
  assert.equal(store.get(parent.id).availableGrams, 70_000);
});

test("la misma clave responde con la operación original y rechaza otro cuerpo", () => {
  const store = new DemoLots();
  const create = () => store.create(producer, input);
  const first = store.idempotent(producer, "lots", "demo", "cuerpo-1", create);
  assert.deepEqual(store.idempotent(producer, "lots", "demo", "cuerpo-1", create), first);
  assert.throws(() => store.idempotent(producer, "lots", "demo", "cuerpo-2", create),
    (error: AppError) => error.code === "IDEMPOTENCY_CONFLICT");
  assert.equal(store.list().length, 1);
});

test("la clave de idempotencia se separa por actor", () => {
  const store = new DemoLots();
  store.idempotent(producer, "lots", "misma", "cuerpo", () => store.create(producer, input));
  store.idempotent(otherProducer, "lots", "misma", "cuerpo", () => store.create(otherProducer, input));
  assert.equal(store.list().length, 2);
});

test("cada organización ve y modifica sólo sus lotes", () => {
  const store = new DemoLots();
  const own = store.create(producer, input);
  store.create(otherProducer, input);
  assert.equal(own.organizationId, organizations.salinas.id);
  assert.deepEqual(store.list(organizations.salinas.id).map(lot => lot.id), [own.id]);
  assert.throws(() => store.get(own.id, organizations.puna.id), (error: AppError) => error.code === "NOT_FOUND");
  assert.throws(() => store.events(own.id, organizations.puna.id), (error: AppError) => error.code === "NOT_FOUND");
  assert.throws(() => store.measure(otherProducer, own.id, { grams: 1, measuredAt: at, instrument: "x" }),
    (error: AppError) => error.code === "NOT_FOUND");
  assert.equal(store.events(own.id)[0].actorId, producer.actorId);
});

test("los contratos rechazan coordenadas, tiempos y masas inválidos", () => {
  assert.equal(createLotSchema.safeParse({ ...input, location: { ...input.location, latitude: 91 } }).success, false);
  assert.equal(createLotSchema.safeParse({ ...input, extractedAt: "ayer" }).success, false);
  assert.equal(splitSchema.safeParse({ grams: -1 }).success, false);
  assert.equal(splitSchema.safeParse({ grams: 1.5 }).success, false);
});
