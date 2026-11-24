import assert from "node:assert/strict";
import test from "node:test";
import { createAnchor } from "../src/server/api/anchors.ts";
import { uploadEvidence } from "../src/server/api/evidence.ts";
import { verifyDocument } from "../src/server/api/verify.ts";
import { createContainer, setContainer } from "../src/server/container.ts";
import { FujiBlockchainAdapter } from "../src/integrations/blockchain/adapter.ts";

const pdf = new TextEncoder().encode("%PDF-1.7\nremito para verificar\n");
const cookie = { Cookie: "sdo_persona=productor-salinas" };
const verify = (body: BodyInit, type?: string) =>
  verifyDocument(new Request("http://localhost/api/v1/verify", { method: "POST", headers: type ? { "Content-Type": type } : {}, body }));

async function anchoredLot() {
  const app = createContainer();
  setContainer(app);
  const id = app.lots.list()[0].id;
  const form = new FormData();
  form.set("file", new File([pdf], "remito.pdf", { type: "application/pdf" }));
  form.set("visibility", "digest_public");
  const evidence = (await (await uploadEvidence(new Request("http://localhost", { method: "POST", headers: { ...cookie, "Idempotency-Key": "ev" }, body: form }), { id })).json()).data;
  await createAnchor(new Request("http://localhost", {
    method: "POST", headers: { ...cookie, "Idempotency-Key": "an", "Content-Type": "application/json" }, body: JSON.stringify({ evidenceId: evidence.id }),
  }), { id });
  return app;
}

test("la verificación sigue funcionando después de reiniciar el adaptador", async () => {
  const app = await anchoredLot();
  assert.equal((await (await verify(pdf, "application/octet-stream")).json()).data.verified, true);
  setContainer({ ...app, blockchain: new FujiBlockchainAdapter({ forceMock: true }) });
  const after = (await (await verify(pdf, "application/octet-stream")).json()).data;
  assert.equal(after.verified, true);
  assert.equal(after.mode, "simulado");
  const altered = new Uint8Array(pdf);
  altered[altered.length - 2] ^= 1;
  assert.equal((await (await verify(altered, "application/octet-stream")).json()).data.verified, false);
});

test("entradas inválidas responden 400 y no 500", async () => {
  setContainer(createContainer());
  for (const [body, type] of [["{}", "application/json"], ['{"sha256":"zz"}', "application/json"], ["{no-json", "application/json"], ["", "application/octet-stream"]]) {
    const response = await verify(body, type);
    assert.equal(response.status, 400, body);
    assert.equal((await response.json()).error.code, "VALIDATION_ERROR");
  }
});
