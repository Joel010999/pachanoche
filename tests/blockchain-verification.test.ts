import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";
import type { AnchorSummary } from "../src/contracts/v1.ts";
import { verifyDocumentIntegrity } from "../src/integrations/blockchain/verification.ts";

const sampleFile = Buffer.from("Certificado Oficial de Pureza: 99.4% NaCl - Salinas Grandes");
const sampleSha = createHash("sha256").update(sampleFile).digest("hex");

test("C3: verifyDocumentIntegrity valida coincidencia exacta del documento original", () => {
  const anchor: AnchorSummary = {
    id: "e8f1ef36-0252-41ba-8ee1-f23c2370c92f",
    evidenceId: "b8c3d9a1-0252-41ba-8ee1-f23c2370c92f",
    status: "confirmed",
    chainId: 43113,
    txHash: "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
  };

  const result = verifyDocumentIntegrity(sampleFile, sampleSha, anchor);
  assert.equal(result.matches, true);
  assert.equal(result.status, "confirmed");
  assert.equal(result.actualSha256, sampleSha);
  assert.equal(result.anchor?.txHash, anchor.txHash);
});

test("C3: verifyDocumentIntegrity detecta alteración si se modifica un byte", () => {
  const tamperedFile = Buffer.from("Certificado Oficial de Pureza: 98.4% NaCl - Salinas Grandes"); // 98.4 en vez de 99.4
  const anchor: AnchorSummary = {
    id: "e8f1ef36-0252-41ba-8ee1-f23c2370c92f",
    evidenceId: "b8c3d9a1-0252-41ba-8ee1-f23c2370c92f",
    status: "confirmed",
    chainId: 43113,
    txHash: "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
  };

  const result = verifyDocumentIntegrity(tamperedFile, sampleSha, anchor);
  assert.equal(result.matches, false);
  assert.notEqual(result.actualSha256, sampleSha);
  assert.ok(result.reason?.includes("alterado"));
});

test("C3: proyección distingue estado submitted vs confirmed", () => {
  const pendingAnchor: AnchorSummary = {
    id: "e8f1ef36-0252-41ba-8ee1-f23c2370c92f",
    evidenceId: "b8c3d9a1-0252-41ba-8ee1-f23c2370c92f",
    status: "submitted",
    chainId: 43113,
  };

  const result = verifyDocumentIntegrity(sampleFile, sampleSha, pendingAnchor);
  assert.equal(result.matches, true);
  assert.equal(result.status, "submitted");
});
