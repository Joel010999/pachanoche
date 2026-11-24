import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { personas, sessionOf } from "../src/domain/personas.ts";
import { createContainer, dataFiles } from "../src/server/container.ts";

const producer = sessionOf(personas[0]);

function temporaryDir(t: test.TestContext) {
  const dir = mkdtempSync(join(tmpdir(), "sal-de-origen-"));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  return dir;
}

test("los lotes sobreviven a un reinicio del contenedor", t => {
  const dataDir = temporaryDir(t);
  const first = createContainer({ dataDir });
  assert.ok(existsSync(dataFiles(dataDir).state));
  const [lot] = first.lots.list();
  const { child } = first.lots.split(producer, lot.id, 30_000);
  first.lots.idempotent(producer, "scope", "clave", "cuerpo", () => "respuesta");

  const restarted = createContainer({ dataDir });
  assert.equal(restarted.lots.get(lot.id).availableGrams, 70_000);
  assert.equal(restarted.lots.get(child.id).parentId, lot.id);
  assert.equal(restarted.lots.events(lot.id).length, 3);
  assert.equal(restarted.lots.idempotent(producer, "scope", "clave", "cuerpo", () => "otra"), "respuesta");
});

test("las evidencias se guardan en disco y rechazan identificadores inseguros", async t => {
  const dataDir = temporaryDir(t);
  const id = "a".repeat(64);
  const bytes = new Uint8Array([37, 80, 68, 70]);
  await createContainer({ dataDir }).evidence.put(id, bytes);
  assert.deepEqual(await createContainer({ dataDir }).evidence.get(id), bytes);
  assert.deepEqual(new Uint8Array(readFileSync(join(dataFiles(dataDir).evidence, id))), bytes);
  assert.equal(await createContainer({ dataDir }).evidence.get("../demo.json"), null);
  await assert.rejects(createContainer({ dataDir }).evidence.put("../escape", bytes));
});

test("demo:seed y demo:reset regeneran y borran los datos", t => {
  const dataDir = temporaryDir(t);
  const run = (command: string) => spawnSync(process.execPath,
    ["--disable-warning=ExperimentalWarning", "--experimental-strip-types", "scripts/demo-data.ts", command],
    { env: { ...process.env, DEMO_DATA_DIR: dataDir }, encoding: "utf8" });
  const app = createContainer({ dataDir });
  app.lots.split(producer, app.lots.list()[0].id, 1_000);
  assert.equal(run("seed").status, 0);
  const seeded = createContainer({ dataDir }).lots.list();
  assert.equal(seeded.length, 1);
  assert.equal(seeded[0].availableGrams, 100_000);
  assert.equal(run("reset").status, 0);
  assert.equal(existsSync(dataFiles(dataDir).state), false);
  assert.equal(run("otro").status, 1);
});
