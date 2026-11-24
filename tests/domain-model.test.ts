import assert from "node:assert/strict";
import test from "node:test";
import type { CreateLot } from "../src/contracts/v1.ts";
import { DemoLots } from "../src/domain/demo-lots.ts";
import type { AppError } from "../src/domain/errors.ts";
import { extractionSites, organizations, personas, sessionOf } from "../src/domain/personas.ts";
import { listAudit } from "../src/server/api/audit.ts";
import { createContainer, setContainer } from "../src/server/container.ts";

const at = "2026-10-15T15:00:00.000Z";
const producer = { ...sessionOf(personas[0]), requestId: "0e1d2c3b-4a59-4687-9a1b-2c3d4e5f6a7b" };
const input = (siteId?: string): CreateLot => ({
  productCode: "sal-artesanal", extractedAt: at,
  location: { latitude: -23.64, longitude: -66.01, recordedAt: at, accuracyM: 8, ...(siteId ? { siteId } : {}) },
});

test("el modelo arranca vacío y personas, organizaciones y sitios son coherentes", () => {
  const store = new DemoLots();
  assert.deepEqual(store.list(), []);
  assert.deepEqual(store.audit(organizations.salinas.id), []);
  const orgIds = new Set(Object.values(organizations).map(org => org.id));
  assert.ok(personas.every(persona => orgIds.has(persona.organization.id)));
  assert.ok(extractionSites.every(site => orgIds.has(site.organizationId)));
  assert.equal(new Set(personas.map(persona => persona.actorId)).size, personas.length);
});

test("la ubicación declarada conserva sitio y precisión, y el sitio debe ser propio", () => {
  const store = new DemoLots();
  const lot = store.create(producer, input(extractionSites[0].id));
  assert.equal(lot.location.siteId, extractionSites[0].id);
  assert.equal(lot.location.accuracyM, 8);
  assert.throws(() => store.create(producer, input(extractionSites[1].id)), (error: AppError) => error.code === "VALIDATION_ERROR");
  assert.throws(() => store.create(producer, input("00000000-0000-4000-8000-000000000000")), (error: AppError) => error.code === "VALIDATION_ERROR");
  assert.equal(store.list().length, 1);
});

test("cada mutación queda auditada con actor, organización y requestId", () => {
  const store = new DemoLots();
  const lot = store.create(producer, input());
  store.measure(producer, lot.id, { grams: 5_000, measuredAt: at, instrument: "Balanza" });
  store.split(producer, lot.id, 1_000);
  assert.throws(() => store.split(producer, lot.id, 10_000));
  const audit = store.audit(organizations.salinas.id);
  assert.deepEqual(audit.map(entry => entry.action), ["lot.create", "lot.measure", "lot.split"]);
  assert.ok(audit.every(entry => entry.actorId === producer.actorId && entry.requestId === producer.requestId && entry.entityId === lot.id));
  assert.deepEqual(store.audit(organizations.puna.id), []);
  assert.equal(new DemoLots({ snapshot: store.snapshot() }).audit(organizations.salinas.id).length, 3);
});

test("la auditoría por API es sólo para administración de la propia organización", async () => {
  setContainer(createContainer());
  const as = (persona: string) => new Request("http://localhost/api/v1/audit", { headers: { Cookie: `sdo_persona=${persona}` } });
  const admin = await listAudit(as("admin-salinas"));
  assert.equal(admin.status, 200);
  const { data } = await admin.json();
  assert.deepEqual(data.map((entry: { action: string }) => entry.action), ["lot.create", "lot.measure"]);
  assert.equal((await listAudit(as("productor-salinas"))).status, 403);
  assert.equal((await listAudit(new Request("http://localhost/api/v1/audit"))).status, 401);
});
