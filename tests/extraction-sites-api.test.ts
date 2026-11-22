import assert from "node:assert/strict";
import test from "node:test";
import { extractionSites } from "../src/domain/personas.ts";
import { getExtractionSiteObservations, listExtractionSites } from "../src/server/api/extraction-sites.ts";
import { publishLot, publicLot } from "../src/server/api/publication.ts";
import { createContainer, setContainer } from "../src/server/container.ts";

function authReq(persona: string | null = "productor-salinas", body?: unknown) {
  const headers: Record<string, string> = {};
  if (persona) headers.Cookie = `sdo_persona=${persona}`;
  if (body) {
    headers["Content-Type"] = "application/json";
    headers["Idempotency-Key"] = "test-key-g3";
    return new Request("http://localhost", { method: "POST", headers, body: JSON.stringify(body) });
  }
  return new Request("http://localhost", { headers });
}

function setup() {
  const app = createContainer();
  setContainer(app);
  const lotId = app.lots.list()[0].id;
  return { app, lotId };
}

test("G3: listExtractionSites rechaza sin sesión con 401", async () => {
  setup();
  const res = await listExtractionSites(authReq(null));
  assert.equal(res.status, 401);
});

test("G3: listExtractionSites devuelve los sitios de la organización del productor", async () => {
  setup();
  const res = await listExtractionSites(authReq("productor-salinas"));
  assert.equal(res.status, 200);
  const json = await res.json();
  assert.ok(Array.isArray(json.data));
  assert.equal(json.data.length, 1);
  assert.equal(json.data[0].id, extractionSites[0].id);
  assert.equal(json.data[0].label, "Salinas Grandes · área de estudio (demo)");
});

test("G3: listExtractionSites permite al rol verifier listar todos los sitios", async () => {
  setup();
  const res = await listExtractionSites(authReq("verificador-altiplano"));
  assert.equal(res.status, 200);
  const json = await res.json();
  assert.equal(json.data.length, 2);
});

test("G3: getExtractionSiteObservations devuelve observaciones STAC del sitio", async () => {
  setup();
  const salinasId = extractionSites[0].id;
  const res = await getExtractionSiteObservations(authReq(), { id: salinasId });
  assert.equal(res.status, 200);
  const json = await res.json();
  assert.equal(json.data.length, 2);

  const s2 = json.data.find((o: { collection: string }) => o.collection === "sentinel-2-l2a");
  assert.ok(s2);
  assert.equal(s2.previewUrl, "/geo/salinas-grandes.jpg");
  assert.equal(s2.resolutionM, 10.0);
  assert.equal(s2.cloudCoverPercent, 0.0);
});

test("G3: getExtractionSiteObservations responde 404 para sitio inexistente", async () => {
  setup();
  const res = await getExtractionSiteObservations(authReq(), { id: "00000000-0000-0000-0000-000000000000" });
  assert.equal(res.status, 404);
  const json = await res.json();
  assert.equal(json.error.code, "NOT_FOUND");
});

test("G3: Ficha pública incluye observaciones de Sentinel-2 cuando se autoriza su publicación", async () => {
  const { lotId } = setup();

  // Publicar lote autorizando observaciones
  const pubReq = authReq("productor-salinas", {
    consent: true,
    fields: ["observations"],
  });
  const pubRes = await publishLot(pubReq, { id: lotId });
  assert.equal(pubRes.status, 201);
  const { code } = (await pubRes.json()).data;

  // Consultar ficha pública
  const getPubRes = await publicLot(authReq(null), { code });
  assert.equal(getPubRes.status, 200);
  const pubData = (await getPubRes.json()).data;

  assert.ok(pubData.observations.length >= 1);
  assert.equal(pubData.observations[0].collection, "sentinel-2-l2a");
  assert.equal(pubData.observations[0].previewUrl, "/geo/salinas-grandes.jpg");
  assert.ok(pubData.observations[0].attribution.includes("Copernicus"));
});
