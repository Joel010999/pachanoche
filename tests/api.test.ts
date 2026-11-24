import assert from "node:assert/strict";
import test from "node:test";
import { createLot, getLot, listLots, lotEvents, recordMeasurement, splitLot } from "../src/server/api/lots.ts";
import { endSession, readSession, selectSession } from "../src/server/api/session.ts";
import { createContainer, setContainer } from "../src/server/container.ts";

setContainer(createContainer());

const at = "2026-10-15T15:00:00.000Z";
const lotBody = { productCode: "sal-artesanal", extractedAt: at, location: { latitude: -23.64, longitude: -66.01, recordedAt: at } };
let keys = 0;

type Init = { key?: string | null; type?: string; persona?: string | null };

function headers({ persona = "productor-salinas" }: Init = {}): Record<string, string> {
  return persona ? { Cookie: `otra=1; sdo_persona=${persona}` } : {};
}

function get(init: Init = {}) {
  return new Request("http://localhost/api/v1", { headers: headers(init) });
}

function post(body: unknown, init: Init = {}) {
  const all: Record<string, string> = { ...headers(init), "Content-Type": init.type ?? "application/json" };
  const key = init.key === undefined ? `test-${++keys}` : init.key;
  if (key) all["Idempotency-Key"] = key;
  return new Request("http://localhost/api/v1", { method: "POST", headers: all, body: typeof body === "string" ? body : JSON.stringify(body) });
}

async function read(response: Response) {
  return { status: response.status, body: response.status === 204 ? null : await response.json() };
}

test("alta, pesaje, fraccionamiento e historial responden 201 y 200", async () => {
  const created = await read(await createLot(post(lotBody)));
  assert.equal(created.status, 201);
  const id = created.body.data.id;
  assert.equal((await read(await recordMeasurement(post({ grams: 100_000, measuredAt: at, instrument: "Balanza" }), { id }))).status, 201);
  const split = await read(await splitLot(post({ grams: 30_000 }), { id }));
  assert.equal(split.status, 201);
  assert.equal(split.body.data.parent.availableGrams, 70_000);
  assert.equal((await read(await getLot(get(), { id }))).body.data.availableGrams, 70_000);
  const events = await read(await lotEvents(get(), { id }));
  assert.deepEqual(events.body.data.map((event: { type: string }) => event.type), ["extraction_declared", "measurement_recorded", "lot_split"]);
  assert.ok((await read(await listLots(get()))).body.data.some((lot: { id: string }) => lot.id === id));
});

test("errores v1: 400, 404, 409, 413 y 415 con requestId", async () => {
  const id = (await read(await createLot(post(lotBody)))).body.data.id;
  const cases: Array<[Response, number, string]> = [
    [await createLot(post(lotBody, { key: null })), 400, "VALIDATION_ERROR"],
    [await createLot(post({ ...lotBody, productCode: "SAL" })), 400, "VALIDATION_ERROR"],
    [await createLot(post("{no-json")), 400, "VALIDATION_ERROR"],
    [await getLot(get(), { id: "inexistente" }), 404, "NOT_FOUND"],
    [await splitLot(post({ grams: 1 }), { id }), 409, "INSUFFICIENT_MASS"],
    [await createLot(post("x".repeat(20_000))), 413, "PAYLOAD_TOO_LARGE"],
    [await createLot(post(lotBody, { type: "text/plain" })), 415, "UNSUPPORTED_MEDIA_TYPE"],
  ];
  for (const [response, status, code] of cases) {
    const { body } = await read(response);
    assert.equal(response.status, status, code);
    assert.equal(body.error.code, code);
    assert.match(body.error.requestId, /^[0-9a-f-]{36}$/);
  }
});

test("la misma clave de idempotencia repite la respuesta y otro cuerpo da 409", async () => {
  const first = await read(await createLot(post(lotBody, { key: "repetida" })));
  const again = await read(await createLot(post(lotBody, { key: "repetida" })));
  assert.deepEqual(again.body.data, first.body.data);
  const conflict = await read(await createLot(post({ ...lotBody, productCode: "otra-sal" }, { key: "repetida" })));
  assert.equal(conflict.status, 409);
  assert.equal(conflict.body.error.code, "IDEMPOTENCY_CONFLICT");
});

test("sin sesión 401, rol sin permiso 403 y lote de otra organización 404", async () => {
  const id = (await read(await createLot(post(lotBody)))).body.data.id;
  assert.equal((await listLots(get({ persona: null }))).status, 401);
  assert.equal((await listLots(get({ persona: "desconocida" }))).status, 401);
  assert.equal((await createLot(post(lotBody, { persona: null }))).status, 401);
  assert.equal((await createLot(post(lotBody, { persona: "comprador-andina" }))).status, 403);
  assert.equal((await splitLot(post({ grams: 1 }, { persona: "admin-salinas" }), { id })).status, 403);
  assert.equal((await getLot(get({ persona: "productor-puna" }), { id })).status, 404);
  assert.equal((await lotEvents(get({ persona: "productor-puna" }), { id })).status, 404);
  assert.equal((await splitLot(post({ grams: 1 }, { persona: "productor-puna" }), { id })).status, 404);
  assert.equal((await getLot(get({ persona: "admin-salinas" }), { id })).status, 200);
  const foreign = (await read(await listLots(get({ persona: "productor-puna" })))).body.data;
  assert.equal(foreign.some((lot: { id: string }) => lot.id === id), false);
});

test("la sesión demo se elige, se lee y se cierra con cookie HttpOnly", async () => {
  const anonymous = await read(await readSession(get({ persona: null })));
  assert.equal(anonymous.body.data.persona, null);
  assert.equal(anonymous.body.data.personas.length, 5);
  const chosen = await selectSession(post({ personaId: "comprador-andina" }, { persona: null }));
  assert.equal(chosen.status, 200);
  assert.match(chosen.headers.get("set-cookie") ?? "", /^sdo_persona=comprador-andina;.*HttpOnly/);
  assert.equal((await selectSession(post({ personaId: "intrusa" }, { persona: null }))).status, 400);
  const current = await read(await readSession(get({ persona: "comprador-andina" })));
  assert.equal(current.body.data.persona.role, "buyer");
  const ended = await endSession();
  assert.equal(ended.status, 204);
  assert.match(ended.headers.get("set-cookie") ?? "", /Max-Age=0/);
});
