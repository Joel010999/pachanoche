import assert from "node:assert/strict";
import test from "node:test";
import { createContainer } from "../src/server/container.ts";

const at = "2026-10-15T15:00:00.000Z";

test("el contenedor arma todo con fixtures y sin configuración", async () => {
  const app = createContainer();
  const [lot] = app.lots.list();
  assert.equal(lot.availableGrams, 100_000);
  await app.evidence.put("e1", new Uint8Array([1, 2, 3]));
  assert.deepEqual(await app.evidence.get("e1"), new Uint8Array([1, 2, 3]));
  assert.equal(await app.evidence.get("nada"), null);
  const [observation] = await app.satellite.observations("sitio");
  assert.equal(observation.collection, "sentinel-2-l2a");
  assert.equal(observation.siteId, "sitio");
  const anchor = await app.blockchain.submit({ anchorId: "a1", lotId: lot.id, evidenceId: "e1", sha256: "00", eventKind: 1 });
  assert.equal(anchor.status, "queued");
  assert.equal(anchor.chainId, 43113);
});

test("el geofence demo clasifica dentro, fuera e incierto con versión", () => {
  const { geofence } = createContainer();
  assert.equal(geofence.classify({ latitude: -23.64, longitude: -66.01, recordedAt: at, accuracyM: 10 }).status, "inside");
  assert.equal(geofence.classify({ latitude: -24.19, longitude: -65.3, recordedAt: at, accuracyM: 10 }).status, "outside");
  const uncertain = geofence.classify({ latitude: -23.64, longitude: -66.01, recordedAt: at });
  assert.equal(uncertain.status, "uncertain");
  assert.equal(uncertain.polygonVersion, "demo-bbox-2026-11");
});

test("los overrides reemplazan sólo el puerto indicado", () => {
  const geofence = { classify: () => ({ status: "outside" as const, polygonVersion: "test" }) };
  const app = createContainer({ geofence });
  assert.equal(app.geofence, geofence);
  assert.equal(app.lots.list().length, 1);
});
