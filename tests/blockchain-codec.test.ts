import assert from "node:assert/strict";
import test from "node:test";
import { bytes32ToUuid, sha256ToBytes32, uuidToBytes32 } from "../src/integrations/blockchain/codec.ts";

test("C2: codec convierte UUID a bytes32 y viceversa de forma determinística", () => {
  const originalUuid = "e8f1ef36-0252-41ba-8ee1-f23c2370c92f";
  const bytes32 = uuidToBytes32(originalUuid);

  // Formato: 0x + 32 ceros (16 bytes) + 32 caracteres hex (16 bytes) = 66 caracteres
  assert.equal(bytes32.length, 66);
  assert.ok(bytes32.startsWith("0x00000000000000000000000000000000"));
  assert.ok(bytes32.endsWith("e8f1ef36025241ba8ee1f23c2370c92f"));

  const recovered = bytes32ToUuid(bytes32);
  assert.equal(recovered, originalUuid);
});

test("C2: codec rechaza UUIDs malformados", () => {
  assert.throws(() => uuidToBytes32("no-un-uuid"), /UUID inválido/);
  assert.throws(() => uuidToBytes32("e8f1ef36-0252-41ba-8ee1"), /UUID inválido/);
});

test("C2: codec normaliza hashes SHA-256 a bytes32", () => {
  const sha = "a591a6d40bf420404a011733cfb7b190d62c65bf0bcda32b57b277d9ad9f146e";
  const b32 = sha256ToBytes32(sha);
  assert.equal(b32, `0x${sha}`);

  const withPrefix = sha256ToBytes32(`0x${sha}`);
  assert.equal(withPrefix, `0x${sha}`);

  assert.throws(() => sha256ToBytes32("corto"), /Hash SHA-256 inválido/);
});
