import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

test("C1: artefacto del contrato AnchorRegistry fue compilado con éxito", () => {
  const artifactPath = path.resolve("src/integrations/blockchain/AnchorRegistry.json");
  assert.equal(fs.existsSync(artifactPath), true, "AnchorRegistry.json debe existir");

  const raw = fs.readFileSync(artifactPath, "utf-8");
  const artifact = JSON.parse(raw);

  assert.equal(artifact.contractName, "AnchorRegistry");
  assert.ok(Array.isArray(artifact.abi), "ABI debe ser un array");
  assert.ok(artifact.bytecode.length > 100, "Bytecode debe ser válido y no vacío");

  type AbiItem = { type?: string; name?: string };

  const functionNames = (artifact.abi as AbiItem[])
    .filter(item => item.type === "function")
    .map(item => item.name);

  assert.ok(functionNames.includes("anchor"), "Debe contener función anchor");
  assert.ok(functionNames.includes("getAnchor"), "Debe contener función getAnchor");
  assert.ok(functionNames.includes("verifyDigest"), "Debe contener función verifyDigest");
  assert.ok(functionNames.includes("transferWriter"), "Debe contener función transferWriter");
  assert.ok(functionNames.includes("writer"), "Debe contener getter writer");

  const errorNames = (artifact.abi as AbiItem[])
    .filter(item => item.type === "error")
    .map(item => item.name);

  assert.ok(errorNames.includes("AnchorConflict"), "Debe contener error AnchorConflict");
  assert.ok(errorNames.includes("InvalidEventKind"), "Debe contener error InvalidEventKind");
  assert.ok(errorNames.includes("Unauthorized"), "Debe contener error Unauthorized");
  assert.ok(errorNames.includes("ZeroAddress"), "Debe contener error ZeroAddress");
  assert.ok(errorNames.includes("ZeroBytes32"), "Debe contener error ZeroBytes32");

  const eventNames = (artifact.abi as AbiItem[])
    .filter(item => item.type === "event")
    .map(item => item.name);

  assert.ok(eventNames.includes("Anchored"), "Debe contener evento Anchored");
  assert.ok(eventNames.includes("WriterTransferred"), "Debe contener evento WriterTransferred");
});
