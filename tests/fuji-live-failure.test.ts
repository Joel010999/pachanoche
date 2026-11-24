import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import test from "node:test";
import { FujiBlockchainAdapter } from "../src/integrations/blockchain/adapter.ts";
import type { AppError } from "../src/domain/errors.ts";

test("en modo real, si Fuji no responde, el anclaje falla en vez de inventar un recibo", async () => {
  const adapter = new FujiBlockchainAdapter({
    rpcUrl: "http://127.0.0.1:9",
    contractAddress: "0x1111111111111111111111111111111111111111",
    privateKey: `0x${randomBytes(32).toString("hex")}`,
  });
  assert.equal(adapter.isLive, true);
  await assert.rejects(
    adapter.submit({
      anchorId: "3f2a1b4c-5d6e-4f70-8a91-b2c3d4e5f607", lotId: "e8f1ef36-0252-41ba-8ee1-f23c2370c92f",
      evidenceId: "0b9e7a4c-5d34-4a8e-9a1f-1f2e3d4c5b6a", sha256: "a".repeat(64), eventKind: 1,
    }),
    (error: AppError) => error.code === "PROVIDER_UNAVAILABLE" && error.status === 503,
  );
  assert.equal(adapter.verifyDigest("a".repeat(64)).exists, false);
});
