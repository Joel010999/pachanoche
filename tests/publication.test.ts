import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";
import { personas, sessionOf } from "../src/domain/personas.ts";
import { uploadEvidence } from "../src/server/api/evidence.ts";
import { splitLot } from "../src/server/api/lots.ts";
import { publicLot, publishLot } from "../src/server/api/publication.ts";
import { createContainer, setContainer } from "../src/server/container.ts";

const producer = sessionOf(personas[0]);
let keys = 0;

function json(body: unknown, persona: string | null = "productor-salinas", key = `pub-${++keys}`) {
  const headers: Record<string, string> = { "Content-Type": "application/json", "Idempotency-Key": key };
  if (persona) headers.Cookie = `sdo_persona=${persona}`;
  return new Request("http://localhost", { method: "POST", headers, body: JSON.stringify(body) });
}

async function attach(id: string, text: string, visibility: string) {
  const form = new FormData();
  const bytes = new TextEncoder().encode(`%PDF-1.7\n${text}`);
  form.set("file", new File([bytes], "doc.pdf", { type: "application/pdf" }));
  form.set("visibility", visibility);
  const request = new Request("http://localhost", { method: "POST", headers: { Cookie: "sdo_persona=productor-salinas", "Idempotency-Key": `ev-${++keys}` }, body: form });
  return { bytes, data: (await (await uploadEvidence(request, { id })).json()).data };
}

const anonymous = (code: string) => publicLot(new Request("http://localhost"), { code });

test("publicar exige consentimiento y devuelve una ficha con código opaco", async () => {
  const app = createContainer();
  setContainer(app);
  const [lot] = app.lots.list();
  assert.equal((await publishLot(json({ fields: ["events"] }), { id: lot.id })).status, 400);
  assert.equal((await publishLot(json({ consent: false, fields: [] }), { id: lot.id })).status, 400);
  assert.equal((await publishLot(json({ consent: true, fields: [] }, null), { id: lot.id })).status, 401);
  assert.equal((await publishLot(json({ consent: true, fields: [] }, "comprador-andina"), { id: lot.id })).status, 403);
  assert.equal((await publishLot(json({ consent: true, fields: [] }, "productor-puna"), { id: lot.id })).status, 404);
  const response = await publishLot(json({ consent: true, fields: [] }), { id: lot.id });
  assert.equal(response.status, 201);
  const { data } = await response.json();
  assert.match(data.code, /^[2-9A-HJKMNP-Z]{10}$/);
  assert.equal(data.productCode, "sal-artesanal");
  assert.equal(data.declaredArea, "Salinas Grandes · área de estudio (demo)");
  assert.deepEqual([data.events, data.evidence, data.observations, data.geofence], [[], [], [], undefined]);
});

test("la ficha pública muestra sólo lo autorizado y nunca datos privados", async () => {
  const app = createContainer();
  setContainer(app);
  const [lot] = app.lots.list();
  const shared = await attach(lot.id, "informe compartible", "digest_public");
  await attach(lot.id, "documento privado", "private");
  const fields = ["events", "evidence", "observations", "geofence"];
  const { code } = (await (await publishLot(json({ consent: true, fields }), { id: lot.id })).json()).data;
  const response = await anonymous(code);
  assert.equal(response.status, 200);
  const { data } = await response.json();
  assert.deepEqual(data.evidence, [{ id: shared.data.id, sha256: shared.data.sha256 }]);
  assert.deepEqual(data.events.map((event: { type: string }) => event.type),
    ["extraction_declared", "measurement_recorded", "evidence_attached", "evidence_attached", "lot_published"]);
  assert.ok(data.events.every((event: object) => Object.keys(event).join() === "type,occurredAt"));
  assert.equal(data.observations[0].collection, "sentinel-2-l2a");
  assert.equal(data.geofence.status, "inside");
  const text = JSON.stringify(data);
  for (const secret of ["-23.64", "-66.01", "latitude", producer.actorId, producer.organizationId, lot.id, "Balanza"]) {
    assert.equal(text.includes(secret), false, secret);
  }
  const altered = new Uint8Array(shared.bytes);
  altered[altered.length - 1] ^= 1;
  assert.equal(createHash("sha256").update(shared.bytes).digest("hex"), data.evidence[0].sha256);
  assert.notEqual(createHash("sha256").update(altered).digest("hex"), data.evidence[0].sha256);
});

test("republicar conserva el código y actualiza las secciones", async () => {
  const app = createContainer();
  setContainer(app);
  const [lot] = app.lots.list();
  const first = (await (await publishLot(json({ consent: true, fields: ["geofence"] }), { id: lot.id })).json()).data;
  const second = (await (await publishLot(json({ consent: true, fields: ["events"] }), { id: lot.id })).json()).data;
  assert.equal(second.code, first.code);
  const { data } = await (await anonymous(first.code)).json();
  assert.equal(data.geofence, undefined);
  assert.ok(data.events.length > 0);
});

test("el sublote publicado hereda historial y evidencia pública de su origen", async () => {
  const app = createContainer();
  setContainer(app);
  const [lot] = app.lots.list();
  const shared = await attach(lot.id, "remito de extracción", "digest_public");
  const split = await splitLot(json({ grams: 30_000 }), { id: lot.id });
  const child = (await split.json()).data.child;
  const { code } = (await (await publishLot(json({ consent: true, fields: ["events", "evidence"] }), { id: child.id })).json()).data;
  const { data } = await (await anonymous(code)).json();
  assert.equal(data.evidence[0].sha256, shared.data.sha256);
  const types = data.events.map((event: { type: string }) => event.type);
  assert.equal(types[0], "extraction_declared");
  assert.ok(types.includes("sublot_created"));
});

test("códigos inexistentes o malformados responden 404", async () => {
  setContainer(createContainer());
  for (const code of ["ABCDEFGHJK", "abc", "../../etc", ""]) assert.equal((await anonymous(code)).status, 404);
});
