import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

test("G1: imagen satelital local existe y tiene tamaño válido", () => {
  const imagePath = path.resolve("public/geo/salinas-grandes.jpg");
  assert.equal(fs.existsSync(imagePath), true, "La imagen satelital debe existir en public/geo/");
  
  const stats = fs.statSync(imagePath);
  assert.ok(stats.size > 100 * 1024, `La imagen debe pesar más de 100 KB, pesa ${stats.size} bytes`);
});

test("G1: metadatos STAC de Sentinel-2 y Sentinel-1 son válidos", () => {
  const metaPath = path.resolve("data/geo/sentinel-scene.json");
  assert.equal(fs.existsSync(metaPath), true, "El archivo de metadatos debe existir en data/geo/");

  const content = fs.readFileSync(metaPath, "utf-8");
  const meta = JSON.parse(content);

  assert.equal(meta.collection, "sentinel-2-l2a");
  assert.ok(meta.id.startsWith("S2A_MSIL2A_"));
  assert.equal(Array.isArray(meta.bbox), true);
  assert.equal(meta.bbox.length, 4);

  // Validar coordenadas WGS84 del BBOX de Salinas Grandes [-66.10, -23.76, -65.88, -23.54]
  const [west, south, east, north] = meta.bbox;
  assert.ok(west < east, "Coordenada oeste debe ser menor a este");
  assert.ok(south < north, "Coordenada sur debe ser menor a norte");

  // Validar propiedades
  assert.equal(meta.properties["processing:level"], "Level-2A");
  assert.equal(meta.properties["eo:cloud_cover"], 0.0);
  assert.equal(meta.properties["datetime"], "2025-02-23T14:30:00Z");
  assert.ok(meta.properties.attribution.includes("Copernicus"));

  // Validar escena complementaria de radar
  assert.ok(meta.complementary_radar_scene);
  assert.equal(meta.complementary_radar_scene.collection, "sentinel-1-grd");
  assert.equal(meta.complementary_radar_scene.sensor_mode, "IW");
});
