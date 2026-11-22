import assert from "node:assert/strict";
import test from "node:test";
import { FujiBlockchainAdapter } from "../src/integrations/blockchain/adapter.ts";
import { demoBlockchainAdapter } from "../src/integrations/blockchain/demo.ts";

const uuid1 = "e8f1ef36-0252-41ba-8ee1-f23c2370c92f";
const uuid2 = "12345678-1234-1234-1234-1234567890ab";
const sampleSha = "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855";

test("C2: adaptador genera recibo válido en Avalanche Fuji (modo demo)", async () => {
  const adapter = new FujiBlockchainAdapter({ forceMock: true });
  const result = await adapter.submit({
    anchorId: uuid1,
    lotId: uuid2,
    evidenceId: "b8c3d9a1-0252-41ba-8ee1-f23c2370c92f",
    sha256: sampleSha,
    eventKind: 1,
  });

  assert.equal(result.id, uuid1);
  assert.equal(result.status, "confirmed");
  assert.equal(result.chainId, 43113);
  assert.ok(result.txHash);
  assert.ok(result.txHash.startsWith("0x"));
  assert.equal(result.txHash.length, 66);
});

test("C2: adaptador es idempotente ante reintentos idénticos", async () => {
  const adapter = new FujiBlockchainAdapter({ forceMock: true });
  const input = {
    anchorId: uuid1,
    lotId: uuid2,
    evidenceId: "b8c3d9a1-0252-41ba-8ee1-f23c2370c92f",
    sha256: sampleSha,
    eventKind: 1 as const,
  };

  const first = await adapter.submit(input);
  const second = await adapter.submit(input);

  assert.equal(first.txHash, second.txHash);
  assert.equal(second.status, "confirmed");
});

test("C2: adaptador rechaza colisión con mismo anchorId y diferente digest", async () => {
  const adapter = new FujiBlockchainAdapter({ forceMock: true });
  await adapter.submit({
    anchorId: uuid1,
    lotId: uuid2,
    evidenceId: "b8c3d9a1-0252-41ba-8ee1-f23c2370c92f",
    sha256: sampleSha,
    eventKind: 1,
  });

  await assert.rejects(
    async () => {
      await adapter.submit({
        anchorId: uuid1,
        lotId: uuid2,
        evidenceId: "b8c3d9a1-0252-41ba-8ee1-f23c2370c92f",
        sha256: "ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff",
        eventKind: 1,
      });
    },
    /Conflicto de anclaje/
  );
});

test("C2: adaptador permite verificar digest registrado", async () => {
  const adapter = new FujiBlockchainAdapter({ forceMock: true });
  await adapter.submit({
    anchorId: uuid1,
    lotId: uuid2,
    evidenceId: "b8c3d9a1-0252-41ba-8ee1-f23c2370c92f",
    sha256: sampleSha,
    eventKind: 2,
  });

  const check = adapter.verifyDigest(sampleSha);
  assert.equal(check.exists, true);
  if (check.exists) {
    assert.equal(check.lotId, uuid2);
    assert.equal(check.eventKind, 2);
  }

  const notFound = adapter.verifyDigest("0000000000000000000000000000000000000000000000000000000000000000");
  assert.equal(notFound.exists, false);
});

test("C2: adaptador reconcile actualiza estado si está pendiente", async () => {
  const adapter = new FujiBlockchainAdapter({ forceMock: true });
  await adapter.submit({
    anchorId: uuid1,
    lotId: uuid2,
    evidenceId: "b8c3d9a1-0252-41ba-8ee1-f23c2370c92f",
    sha256: sampleSha,
    eventKind: 1,
  });

  const reconciled = await adapter.reconcile({
    id: uuid1,
    evidenceId: "b8c3d9a1-0252-41ba-8ee1-f23c2370c92f",
    status: "submitted",
    chainId: 43113,
  });

  assert.equal(reconciled.status, "confirmed");
  assert.ok(reconciled.txHash);
});

test("C2: demoBlockchainAdapter singleton está configurado", () => {
  assert.equal(demoBlockchainAdapter.chainId, 43113);
  assert.equal(demoBlockchainAdapter.isLive, false);
});
