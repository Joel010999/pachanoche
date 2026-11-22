import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";
import { maxEvidenceBytes } from "../src/contracts/v1.ts";
import { personas } from "../src/domain/personas.ts";
import { downloadEvidence, listEvidence, uploadEvidence } from "../src/server/api/evidence.ts";
import { lotEvents, recordMeasurement } from "../src/server/api/lots.ts";
import { createContainer, setContainer } from "../src/server/container.ts";

const pdf = new TextEncoder().encode("%PDF-1.7\nremito sintético de demostración\n%%EOF");
const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 13]);
const sha256 = (bytes: Uint8Array) => createHash("sha256").update(bytes).digest("hex");
let keys = 0;

type Upload = { bytes?: Uint8Array; type?: string; visibility?: string | null; persona?: string | null; key?: string };

function upload({ bytes = pdf, type = "application/pdf", visibility = "private", persona = "productor-salinas", key }: Upload = {}) {
  const form = new FormData();
  form.set("file", new File([bytes as Uint8Array<ArrayBuffer>], "remito.pdf", { type }));
  if (visibility) form.set("visibility", visibility);
  const headers: Record<string, string> = { "Idempotency-Key": key ?? `evidencia-${++keys}` };
  if (persona) headers.Cookie = `sdo_persona=${persona}`;
  return new Request("http://localhost", { method: "POST", headers, body: form });
}

const get = (persona = "productor-salinas") => new Request("http://localhost", { headers: { Cookie: `sdo_persona=${persona}` } });

function setup() {
  const app = createContainer();
  setContainer(app);
  return { app, id: app.lots.list()[0].id };
}

test("sube el original privado, conserva su SHA-256 y lo devuelve sin cambios", async () => {
  const { id } = setup();
  const response = await uploadEvidence(upload(), { id });
  assert.equal(response.status, 201);
  const { data } = await response.json();
  assert.equal(data.sha256, sha256(pdf));
  assert.equal(data.mediaType, "application/pdf");
  assert.equal(data.sizeBytes, pdf.length);
  assert.equal(data.visibility, "private");
  const listed = await (await listEvidence(get(), { id })).json();
  assert.deepEqual(listed.data, [data]);
  const file = await downloadEvidence(get(), { id, evidenceId: data.id });
  assert.equal(file.status, 200);
  assert.equal(file.headers.get("x-evidence-sha256"), sha256(pdf));
  assert.deepEqual(new Uint8Array(await file.arrayBuffer()), pdf);
  const events = (await (await lotEvents(get(), { id })).json()).data;
  assert.deepEqual(events.at(-1).payload, { evidenceId: data.id });
});

test("un archivo duplicado o un reintento no crean otra evidencia", async () => {
  const { app, id } = setup();
  const first = (await (await uploadEvidence(upload({ key: "misma" }), { id })).json()).data;
  const retry = (await (await uploadEvidence(upload({ key: "misma" }), { id })).json()).data;
  const duplicate = (await (await uploadEvidence(upload(), { id })).json()).data;
  assert.equal(retry.id, first.id);
  assert.equal(duplicate.id, first.id);
  assert.equal(app.lots.evidence(id).length, 1);
  assert.equal(app.lots.events(id).filter(event => event.type === "evidence_attached").length, 1);
  assert.equal((await uploadEvidence(upload({ key: "misma", bytes: png, type: "image/png" }), { id })).status, 409);
});

test("rechaza MIME, contenido, tamaño y formulario inválidos", async () => {
  const { id } = setup();
  const cases: Array<[Request, number]> = [
    [upload({ type: "text/html" }), 415],
    [upload({ bytes: png, type: "application/pdf" }), 415],
    [upload({ bytes: pdf, type: "image/png" }), 415],
    [upload({ bytes: new Uint8Array(maxEvidenceBytes + 1), type: "application/pdf" }), 413],
    [upload({ bytes: new Uint8Array(0) }), 400],
    [upload({ visibility: "public" }), 400],
    [upload({ visibility: null }), 400],
    [new Request("http://localhost", { method: "POST", headers: { Cookie: "sdo_persona=productor-salinas", "Idempotency-Key": "k", "Content-Type": "application/json" }, body: "{}" }), 415],
  ];
  for (const [request, status] of cases) assert.equal((await uploadEvidence(request, { id })).status, status);
  assert.equal((await uploadEvidence(upload({ bytes: png, type: "image/png" }), { id })).status, 201);
});

test("permisos: sin sesión 401, comprador 403, otra organización 404", async () => {
  const { id } = setup();
  const evidenceId = (await (await uploadEvidence(upload(), { id })).json()).data.id;
  assert.equal((await uploadEvidence(upload({ persona: null }), { id })).status, 401);
  assert.equal((await uploadEvidence(upload({ persona: "comprador-andina" }), { id })).status, 403);
  assert.equal((await uploadEvidence(upload({ persona: "productor-puna" }), { id })).status, 404);
  assert.equal((await listEvidence(get("productor-puna"), { id })).status, 404);
  assert.equal((await downloadEvidence(get("productor-puna"), { id, evidenceId })).status, 404);
  assert.equal((await downloadEvidence(get(), { id, evidenceId: "otra" })).status, 404);
  assert.equal((await downloadEvidence(get("admin-salinas"), { id, evidenceId })).status, 200);
});

test("el pesaje puede referenciar sólo evidencia del mismo lote", async () => {
  const { app } = setup();
  const producer = personas[0];
  const actor = { actorId: producer.actorId, organizationId: producer.organization.id };
  const lot = app.lots.create(actor, { productCode: "sal-fina", extractedAt: "2026-10-16T12:00:00.000Z", location: { latitude: -23.6, longitude: -66, recordedAt: "2026-10-16T12:00:00.000Z" } });
  const evidenceId = (await (await uploadEvidence(upload(), { id: lot.id })).json()).data.id;
  const measure = (body: object) => recordMeasurement(new Request("http://localhost", {
    method: "POST",
    headers: { Cookie: "sdo_persona=productor-salinas", "Content-Type": "application/json", "Idempotency-Key": `pesaje-${++keys}` },
    body: JSON.stringify({ grams: 50_000, measuredAt: "2026-10-16T12:00:00.000Z", instrument: "Balanza", ...body }),
  }), { id: lot.id });
  assert.equal((await measure({ evidenceId: "00000000-0000-4000-8000-000000000000" })).status, 404);
  assert.equal((await measure({ evidenceId })).status, 201);
});
