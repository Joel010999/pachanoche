import assert from "node:assert/strict";
import test from "node:test";
import { createLot, getLot, listLots, lotEvents, recordMeasurement, splitLot } from "../src/server/api/lots.ts";
import { createContainer, setContainer } from "../src/server/container.ts";

setContainer(createContainer());

const at = "2026-10-15T15:00:00.000Z";
const lotBody = { productCode: "sal-artesanal", extractedAt: at, location: { latitude: -23.64, longitude: -66.01, recordedAt: at } };
let keys = 0;

function post(body: unknown, init: { key?: string | null; type?: string } = {}) {
  const headers: Record<string, string> = { "Content-Type": init.type ?? "application/json" };
  const key = init.key === undefined ? `test-${++keys}` : init.key;
  if (key) headers["Idempotency-Key"] = key;
  return new Request("http://localhost/api/v1", { method: "POST", headers, body: typeof body === "string" ? body : JSON.stringify(body) });
}

async function read(response: Response) {
  return { status: response.status, body: await response.json() };
}

test("alta, pesaje, fraccionamiento e historial responden 201 y 200", async () => {
  const created = await read(await createLot(post(lotBody)));
  assert.equal(created.status, 201);
  const id = created.body.data.id;
  assert.equal((await read(await recordMeasurement(post({ grams: 100_000, measuredAt: at, instrument: "Balanza" }), { id }))).status, 201);
  const split = await read(await splitLot(post({ grams: 30_000 }), { id }));
  assert.equal(split.status, 201);
  assert.equal(split.body.data.parent.availableGrams, 70_000);
  assert.equal((await read(await getLot(new Request("http://localhost"), { id }))).body.data.availableGrams, 70_000);
  const events = await read(await lotEvents(new Request("http://localhost"), { id }));
  assert.deepEqual(events.body.data.map((event: { type: string }) => event.type), ["extraction_declared", "measurement_recorded", "lot_split"]);
  assert.ok((await read(await listLots())).body.data.some((lot: { id: string }) => lot.id === id));
});

test("errores v1: 400, 404, 409, 413 y 415 con requestId", async () => {
  const id = (await read(await createLot(post(lotBody)))).body.data.id;
  const cases: Array<[Response, number, string]> = [
    [await createLot(post(lotBody, { key: null })), 400, "VALIDATION_ERROR"],
    [await createLot(post({ ...lotBody, productCode: "SAL" })), 400, "VALIDATION_ERROR"],
    [await createLot(post("{no-json")), 400, "VALIDATION_ERROR"],
    [await getLot(new Request("http://localhost"), { id: "inexistente" }), 404, "NOT_FOUND"],
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
