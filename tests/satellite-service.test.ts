import assert from "node:assert/strict";
import test from "node:test";
import { copernicusSatellite, CopernicusSatelliteSource } from "../src/integrations/geospatial/satellite.ts";

const salinasSiteId = "c4d2a8e6-1b3f-4a59-8e7c-0d2f4b6a8c13";

test("G3: CopernicusSatelliteSource retorna escenas Sentinel-2 y Sentinel-1 reales", async () => {
  const source = new CopernicusSatelliteSource();
  const observations = await source.observations(salinasSiteId);

  assert.equal(observations.length, 2);

  // 1. Escena óptica principal Sentinel-2 L2A
  const s2 = observations.find(o => o.collection === "sentinel-2-l2a");
  assert.ok(s2, "Debe incluir observación Sentinel-2");
  assert.equal(s2.siteId, salinasSiteId);
  assert.equal(s2.resolutionM, 10.0);
  assert.equal(s2.cloudCoverPercent, 0.0);
  assert.equal(s2.previewUrl, "/geo/salinas-grandes.jpg");
  assert.ok(s2.attribution.includes("Copernicus Sentinel data"));
  assert.ok(s2.itemId.startsWith("S2A_MSIL2A_"));

  // 2. Escena radar complementaria Sentinel-1 GRD
  const s1 = observations.find(o => o.collection === "sentinel-1-grd");
  assert.ok(s1, "Debe incluir observación de radar Sentinel-1");
  assert.equal(s1.siteId, salinasSiteId);
  assert.equal(s1.resolutionM, 10.0);
  assert.ok(s1.attribution.includes("Copernicus Sentinel data"));
  assert.ok(s1.itemId.startsWith("S1A_IW_GRDH_"));
});

test("G3: copernicusSatellite opera en modo local offline sin dependencias de red", async () => {
  // Garantía de contingencia para la demo local
  const observations = await copernicusSatellite.observations("sitio-cualquiera");
  assert.equal(observations.length, 2);
  assert.equal(observations[0].siteId, "sitio-cualquiera");
});
