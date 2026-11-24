import assert from "node:assert/strict";
import test from "node:test";
import {
  anchorRequestSchema,
  evidenceMetadataSchema,
  evidenceRequestSchema,
  geofenceResultSchema,
  maxEvidenceBytes,
  publishSchema,
  sessionSchema,
  sessionSelectSchema,
} from "../src/contracts/v1.ts";

const uuid = "e8f1ef36-0252-41ba-8ee1-f23c2370c92f";

test("sesión exige actor, organización y rol válidos", () => {
  const valid = { actorId: uuid, organizationId: uuid, role: "producer" };
  assert.equal(sessionSchema.safeParse(valid).success, true);
  assert.equal(sessionSchema.safeParse({ ...valid, role: "root" }).success, false);
  assert.equal(sessionSchema.safeParse({ ...valid, actorId: "joel" }).success, false);
  assert.equal(sessionSchema.safeParse({ actorId: uuid, role: "producer" }).success, false);
  assert.equal(sessionSchema.safeParse({ ...valid, extra: 1 }).success, false);
  assert.equal(sessionSelectSchema.safeParse({ personaId: "productor-salinas" }).success, true);
  assert.equal(sessionSelectSchema.safeParse({ personaId: "../admin" }).success, false);
});

test("evidencia limita visibilidad, MIME permitido y tamaño", () => {
  const meta = { mediaType: "application/pdf", sizeBytes: 2048, visibility: "private" };
  assert.equal(evidenceMetadataSchema.safeParse(meta).success, true);
  assert.equal(evidenceMetadataSchema.safeParse({ ...meta, sizeBytes: maxEvidenceBytes }).success, true);
  assert.equal(evidenceMetadataSchema.safeParse({ ...meta, mediaType: "text/html" }).success, false);
  assert.equal(evidenceMetadataSchema.safeParse({ ...meta, sizeBytes: maxEvidenceBytes + 1 }).success, false);
  assert.equal(evidenceMetadataSchema.safeParse({ ...meta, sizeBytes: 0 }).success, false);
  assert.equal(evidenceRequestSchema.safeParse({ visibility: "digest_public" }).success, true);
  assert.equal(evidenceRequestSchema.safeParse({ visibility: "public" }).success, false);
  assert.equal(evidenceRequestSchema.safeParse({}).success, false);
});

test("publicar exige consentimiento explícito y secciones conocidas", () => {
  assert.equal(publishSchema.safeParse({ consent: true, fields: ["events", "evidence"] }).success, true);
  assert.equal(publishSchema.safeParse({ consent: true, fields: [] }).success, true);
  assert.equal(publishSchema.safeParse({ consent: false, fields: ["events"] }).success, false);
  assert.equal(publishSchema.safeParse({ fields: ["events"] }).success, false);
  assert.equal(publishSchema.safeParse({ consent: true, fields: ["passwordHash"] }).success, false);
});

test("anclaje exige un evidenceId uuid", () => {
  assert.equal(anchorRequestSchema.safeParse({ evidenceId: uuid }).success, true);
  assert.equal(anchorRequestSchema.safeParse({ evidenceId: "abc" }).success, false);
  assert.equal(anchorRequestSchema.safeParse({ evidenceId: uuid, digest: "ff" }).success, false);
});

test("geofence reporta estado, versión de polígono y motivo opcional", () => {
  assert.equal(geofenceResultSchema.safeParse({ status: "inside", polygonVersion: "2026-11" }).success, true);
  assert.equal(geofenceResultSchema.safeParse({ status: "uncertain", polygonVersion: "2026-11", reason: "radio toca el borde" }).success, true);
  assert.equal(geofenceResultSchema.safeParse({ status: "maybe", polygonVersion: "2026-11" }).success, false);
  assert.equal(geofenceResultSchema.safeParse({ status: "inside" }).success, false);
});
