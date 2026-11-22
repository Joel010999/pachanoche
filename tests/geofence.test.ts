import assert from "node:assert/strict";
import test from "node:test";
import {
  checkGeofence,
  distanceToPolygonBoundaryMeters,
  haversineDistanceMeters,
  isPointInPolygon,
} from "../src/integrations/geospatial/geofence.ts";

test("G2: haversineDistance calcula distancia razonable en metros", () => {
  // Distancia entre dos puntos conocidos a ~111 km (1 grado de latitud)
  const dist = haversineDistanceMeters(-23.0, -65.0, -24.0, -65.0);
  assert.ok(dist > 110000 && dist < 112000, `Distancia esperada ~111km, dio ${dist}`);
});

test("G2: punto dentro de Salinas Grandes se clasifica como inside", () => {
  // Centro aproximado de Salinas Grandes
  const result = checkGeofence({
    latitude: -23.65,
    longitude: -65.99,
    accuracyMeters: 15,
  });

  assert.equal(result.status, "inside");
  assert.equal(result.polygonVersion, "2026-11-salinas-grandes");
  assert.equal(result.reason, undefined);
});

test("G2: punto fuera de Salinas Grandes se clasifica como outside", () => {
  // San Salvador de Jujuy
  const capital = checkGeofence({
    latitude: -24.185,
    longitude: -65.30,
    accuracyMeters: 10,
  });

  assert.equal(capital.status, "outside");
  assert.equal(capital.polygonVersion, "2026-11-salinas-grandes");
  assert.ok(capital.reason?.includes("fuera"));

  // Purmamarca
  const purma = checkGeofence({
    latitude: -23.74,
    longitude: -65.49,
    accuracyMeters: 20,
  });

  assert.equal(purma.status, "outside");
});

test("G2: punto cercano al borde con radio de error que cruza límite es uncertain", () => {
  // Justo a pocos metros del borde este (-65.88)
  const borderPoint = checkGeofence({
    latitude: -23.65,
    longitude: -65.8805,
    accuracyMeters: 80, // 80m de error abarca ambos lados del borde
  });

  assert.equal(borderPoint.status, "uncertain");
  assert.ok(borderPoint.reason?.includes("intersecta"));
});

test("G2: punto con GPS muy impreciso (> 500m) se clasifica como uncertain", () => {
  const inaccurate = checkGeofence({
    latitude: -23.65,
    longitude: -65.99,
    accuracyMeters: 850,
  });

  assert.equal(inaccurate.status, "uncertain");
  assert.ok(inaccurate.reason?.includes("supera el umbral"));
});

test("G2: coordenadas geográficas inválidas arrojan error", () => {
  assert.throws(() => checkGeofence({ latitude: 95, longitude: -65 }), /Latitud inválida/);
  assert.throws(() => checkGeofence({ latitude: -23, longitude: 200 }), /Longitud inválida/);
  assert.throws(() => checkGeofence({ latitude: NaN, longitude: -65 }), /Latitud inválida/);
});

test("G2: funciones geométricas puras operan correctamente", () => {
  const box: [number, number][] = [
    [0, 0],
    [10, 0],
    [10, 10],
    [0, 10],
    [0, 0],
  ];

  assert.equal(isPointInPolygon([5, 5], box), true);
  assert.equal(isPointInPolygon([15, 5], box), false);
  assert.equal(isPointInPolygon([-2, 5], box), false);

  const distInside = distanceToPolygonBoundaryMeters([5, 5], box);
  assert.ok(distInside > 0);
});
