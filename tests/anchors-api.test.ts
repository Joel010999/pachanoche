import assert from "node:assert/strict";
import test from "node:test";
import { createAnchor, listAnchors } from "../src/server/api/anchors.ts";
import { uploadEvidence } from "../src/server/api/evidence.ts";
import { projectPublicLot } from "../src/server/api/publication.ts";
import { verifyDocument } from "../src/server/api/verify.ts";
import { createContainer, setContainer } from "../src/server/container.ts";

const pdf = new TextEncoder().encode("%PDF-1.7\nCertificado químico de pureza: 99.2% NaCl\n%%EOF");
let keys = 0;

function uploadReq(lotId: string, persona = "productor-salinas") {
  const form = new FormData();
  form.set("file", new File([pdf], "analisis.pdf", { type: "application/pdf" }));
  form.set("visibility", "digest_public");
  return new Request("http://localhost", {
    method: "POST",
    headers: {
      "Idempotency-Key": `upload-${++keys}`,
      Cookie: `sdo_persona=${persona}`,
    },
    body: form,
  });
}

function anchorReq(evidenceId: string, persona: string | null = "productor-salinas", key?: string) {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "Idempotency-Key": key ?? `anchor-${++keys}`,
  };
  if (persona) headers.Cookie = `sdo_persona=${persona}`;
  return new Request("http://localhost", {
    method: "POST",
    headers,
    body: JSON.stringify({ evidenceId }),
  });
}

function getReq(persona: string | null = "productor-salinas") {
  const headers: Record<string, string> = {};
  if (persona) headers.Cookie = `sdo_persona=${persona}`;
  return new Request("http://localhost", { headers });
}

function setup() {
  const app = createContainer();
  setContainer(app);
  const lotId = app.lots.list()[0].id;
  return { app, lotId };
}

test("C3: ancla evidencia a Avalanche Fuji y devuelve recibo confirmado", async () => {
  const { app, lotId } = setup();

  // 1. Subir evidencia
  const uploadRes = await uploadEvidence(uploadReq(lotId), { id: lotId });
  assert.equal(uploadRes.status, 201);
  const { data: evidence } = await uploadRes.json();

  // 2. Anclar evidencia en Avalanche Fuji
  const anchorRes = await createAnchor(anchorReq(evidence.id), { id: lotId });
  assert.equal(anchorRes.status, 201);
  const { data: anchor } = await anchorRes.json();

  assert.equal(anchor.evidenceId, evidence.id);
  assert.equal(anchor.status, "confirmed");
  assert.equal(anchor.chainId, 43113);
  assert.ok(anchor.txHash);
  assert.ok(anchor.txHash.startsWith("0x"));

  // 3. Listar anclajes del lote
  const listRes = await listAnchors(getReq(), { id: lotId });
  assert.equal(listRes.status, 200);
  const { data: anchorsList } = await listRes.json();
  assert.equal(anchorsList.length, 1);
  assert.equal(anchorsList[0].id, anchor.id);

  // 4. Proyección pública incluye el anclaje
  const actor = { actorId: "actor-1", organizationId: app.lots.list()[0].organizationId };
  const pub = app.lots.publish(actor, lotId, ["evidence"]);
  const publicLot = await projectPublicLot(pub);
  const publicEvidence = publicLot.evidence.find(e => e.id === evidence.id);
  assert.ok(publicEvidence);
  assert.ok(publicEvidence.anchor);
  assert.equal(publicEvidence.anchor.status, "confirmed");
  assert.equal(publicEvidence.anchor.txHash, anchor.txHash);
});

test("C3: anclaje es idempotente con la misma Idempotency-Key", async () => {
  const { lotId } = setup();
  const uploadRes = await uploadEvidence(uploadReq(lotId), { id: lotId });
  const { data: evidence } = await uploadRes.json();

  const key = "key-anclaje-idempotente-1";
  const res1 = await createAnchor(anchorReq(evidence.id, "productor-salinas", key), { id: lotId });
  const res2 = await createAnchor(anchorReq(evidence.id, "productor-salinas", key), { id: lotId });

  assert.equal(res1.status, 201);
  assert.equal(res2.status, 201);
  const d1 = (await res1.json()).data;
  const d2 = (await res2.json()).data;
  assert.equal(d1.id, d2.id);
  assert.equal(d1.txHash, d2.txHash);
});

test("C3: rechaza anclaje sin sesión o con rol no autorizado", async () => {
  const { lotId } = setup();
  const uploadRes = await uploadEvidence(uploadReq(lotId), { id: lotId });
  const { data: evidence } = await uploadRes.json();

  // Sin sesión -> 401
  const noSession = await createAnchor(anchorReq(evidence.id, null), { id: lotId });
  assert.equal(noSession.status, 401);

  // Comprador -> 403
  const buyer = await createAnchor(anchorReq(evidence.id, "comprador-andina"), { id: lotId });
  assert.equal(buyer.status, 403);
});

test("C3: endpoint de verificación pública confirma documento original y rechaza alterado", async () => {
  const { lotId } = setup();
  const uploadRes = await uploadEvidence(uploadReq(lotId), { id: lotId });
  const { data: evidence } = await uploadRes.json();

  // Anclar
  await createAnchor(anchorReq(evidence.id), { id: lotId });

  // Verificación con hash original
  const verifyOriginal = new Request("http://localhost/api/v1/verify", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ sha256: evidence.sha256 }),
  });
  const resValid = await verifyDocument(verifyOriginal);
  assert.equal(resValid.status, 200);
  const dataValid = (await resValid.json()).data;
  assert.equal(dataValid.verified, true);
  assert.equal(dataValid.status, "confirmed");
  assert.equal(dataValid.lotId, lotId);

  // Verificación con hash falso/alterado
  const verifyTampered = new Request("http://localhost/api/v1/verify", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ sha256: "0000000000000000000000000000000000000000000000000000000000000000" }),
  });
  const resInvalid = await verifyDocument(verifyTampered);
  assert.equal(resInvalid.status, 200);
  const dataInvalid = (await resInvalid.json()).data;
  assert.equal(dataInvalid.verified, false);
  assert.equal(dataInvalid.status, "unanchored");
});
