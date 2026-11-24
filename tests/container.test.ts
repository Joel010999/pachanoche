import assert from "node:assert/strict";
import test from "node:test";
import { anchorStates } from "../src/contracts/v1.ts";
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
  const anchorId = "3f2a1b4c-5d6e-4f70-8a91-b2c3d4e5f607";
  const anchor = await app.blockchain.submit({ anchorId, lotId: lot.id, evidenceId: "0b9e7a4c-5d34-4a8e-9a1f-1f2e3d4c5b6a", sha256: "a".repeat(64), eventKind: 1 });
  assert.ok(anchorStates.includes(anchor.status));
  assert.equal(anchor.chainId, 43113);
  assert.equal(anchor.id, anchorId);
});

test("el contenedor usa el geofence real de Salinas Grandes", () => {
  const { geofence } = createContainer();
  assert.equal(geofence.classify({ latitude: -23.64, longitude: -66.01, recordedAt: at, accuracyM: 10 }).status, "inside");
  assert.equal(geofence.classify({ latitude: -24.19, longitude: -65.3, recordedAt: at, accuracyM: 10 }).status, "outside");
  const uncertain = geofence.classify({ latitude: -23.64, longitude: -66.01, recordedAt: at, accuracyM: 600 });
  assert.equal(uncertain.status, "uncertain");
  assert.equal(uncertain.polygonVersion, "2026-11-salinas-grandes");
});

test("los overrides reemplazan sólo el puerto indicado", () => {
  const geofence = { classify: () => ({ status: "outside" as const, polygonVersion: "test" }) };
  const app = createContainer({ geofence });
  assert.equal(app.geofence, geofence);
  assert.equal(app.lots.list().length, 1);
});
