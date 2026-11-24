import assert from "node:assert/strict";
import { createHash, randomBytes } from "node:crypto";
import test from "node:test";
import { sha256Fallback, uuid } from "../src/components/app/client.ts";

test("el SHA-256 de respaldo coincide con el de Node en distintos tamaños", () => {
  for (const size of [0, 1, 55, 56, 63, 64, 65, 1000, 100_003]) {
    const bytes = new Uint8Array(randomBytes(size));
    assert.equal(sha256Fallback(bytes), createHash("sha256").update(bytes).digest("hex"), `tamaño ${size}`);
  }
});

test("uuid genera identificadores v4 válidos", () => {
  assert.match(uuid(), /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
});
