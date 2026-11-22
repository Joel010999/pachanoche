import assert from "node:assert/strict";
import test from "node:test";
import type { Lot } from "../src/contracts/v1.ts";
import { DemoLots } from "../src/domain/demo-lots.ts";
import { organizations, personas, sessionOf } from "../src/domain/personas.ts";
import { splitLot } from "../src/server/api/lots.ts";
import { createContainer, setContainer } from "../src/server/container.ts";

const at = "2026-10-15T15:00:00.000Z";
const producer = sessionOf(personas[0]);

function measuredLot(store: DemoLots, grams: number) {
  const lot = store.create(producer, { productCode: "sal-artesanal", extractedAt: at, location: { latitude: -23.64, longitude: -66.01, recordedAt: at } });
  return store.measure(producer, lot.id, { grams, measuredAt: at, instrument: "Balanza" });
}

function split(id: string, grams: number, key: string) {
  return splitLot(new Request("http://localhost", {
    method: "POST",
    headers: { Cookie: "sdo_persona=productor-salinas", "Content-Type": "application/json", "Idempotency-Key": key },
    body: JSON.stringify({ grams }),
  }), { id });
}

test("fraccionamientos concurrentes nunca dejan saldo negativo", async () => {
  const app = createContainer();
  setContainer(app);
  const [lot] = app.lots.list();
  const responses = await Promise.all(Array.from({ length: 5 }, (_, index) => split(lot.id, 30_000, `concurrente-${index}`)));
  const statuses = responses.map(response => response.status).sort();
  assert.deepEqual(statuses, [201, 201, 201, 409, 409]);
  const parent = app.lots.get(lot.id);
  assert.equal(parent.availableGrams, 10_000);
  const children = app.lots.list().filter(item => item.parentId === lot.id);
  assert.equal(children.length, 3);
  assert.equal(children.reduce((sum, child) => sum + child.availableGrams, 0) + parent.availableGrams, 100_000);
});

test("reintentar con la misma clave devuelve el mismo sublote sin descontar dos veces", async () => {
  const app = createContainer();
  setContainer(app);
  const [lot] = app.lots.list();
  const [first, second] = await Promise.all([split(lot.id, 25_000, "reintento"), split(lot.id, 25_000, "reintento")]);
  const a = await first.json();
  const b = await second.json();
  assert.equal(first.status, 201);
  assert.equal(second.status, 201);
  assert.equal(a.data.child.id, b.data.child.id);
  assert.equal(app.lots.get(lot.id).availableGrams, 75_000);
  assert.equal((await split(lot.id, 1, "reintento")).status, 409);
  assert.equal(app.lots.audit(organizations.salinas.id).filter(entry => entry.action === "lot.split").length, 1);
});

test("fraccionar sublotes conserva la masa total y la cadena de filiación", () => {
  const store = new DemoLots();
  const root = measuredLot(store, 100_000);
  const { child } = store.split(producer, root.id, 40_000);
  const { child: grandchild } = store.split(producer, child.id, 15_000);
  const all = store.list();
  const byId = new Map(all.map(lot => [lot.id, lot]));
  assert.equal(all.reduce((sum, lot) => sum + lot.availableGrams, 0), 100_000);
  const chain: Lot[] = [];
  for (let current: Lot | undefined = byId.get(grandchild.id); current; current = current.parentId ? byId.get(current.parentId) : undefined) chain.push(current);
  assert.deepEqual(chain.map(lot => lot.id), [grandchild.id, child.id, root.id]);
  assert.equal(grandchild.location.latitude, root.location.latitude);
  assert.equal(grandchild.extractedAt, root.extractedAt);
  assert.deepEqual(store.events(child.id).map(event => event.type), ["sublot_created", "lot_split"]);
});

test("un fraccionamiento rechazado no modifica nada ni persiste", () => {
  const writes: unknown[] = [];
  const store = new DemoLots({ onChange: snapshot => writes.push(snapshot) });
  const lot = measuredLot(store, 1_000);
  const before = store.snapshot();
  const count = writes.length;
  for (const grams of [0, -5, 1.5, 1_001]) assert.throws(() => store.split(producer, lot.id, grams));
  assert.deepEqual(store.snapshot(), before);
  assert.equal(writes.length, count);
});
