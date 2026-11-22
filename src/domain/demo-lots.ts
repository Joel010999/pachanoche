import { randomBytes, randomUUID } from "node:crypto";
import {
  maxGrams, type AnchorSummary, type CreateLot, type EvidenceSummary, type Lot, type LotEvent, type Measurement, type PublicField, type SplitResult,
} from "../contracts/v1.ts";
import type { Actor, AnchorRecord, AuditAction, AuditEntry, EvidenceInput, EvidenceRecord, Publication } from "../server/ports.ts";
import { AppError } from "./errors.ts";
import { findSite } from "./personas.ts";

type Replay = { fingerprint: string; data: unknown };
export type DemoSnapshot = {
  version: 1;
  lots: Array<[string, Lot]>;
  history: Array<[string, LotEvent[]]>;
  replay: Array<[string, Replay]>;
  audit?: AuditEntry[];
  evidence?: Array<[string, EvidenceRecord]>;
  publications?: Array<[string, Publication]>;
  anchors?: Array<[string, AnchorRecord]>;
};
type Options = { snapshot?: DemoSnapshot; onChange?: (snapshot: DemoSnapshot) => void };

const codeAlphabet = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";
export const publicCodePattern = /^[2-9A-HJKMNP-Z]{10}$/;

const summary = ({ id, sha256, mediaType, sizeBytes, visibility }: EvidenceRecord): EvidenceSummary =>
  ({ id, sha256, mediaType, sizeBytes, visibility });

export class DemoLots {
  private lots: Map<string, Lot>;
  private history: Map<string, LotEvent[]>;
  private replay: Map<string, Replay>;
  private auditLog: AuditEntry[];
  private files: Map<string, EvidenceRecord>;
  private publications: Map<string, Publication>;
  private anchorRecords: Map<string, AnchorRecord>;
  private onChange?: (snapshot: DemoSnapshot) => void;

  constructor({ snapshot, onChange }: Options = {}) {
    if (snapshot && snapshot.version !== 1) throw new Error("Versión de datos demo desconocida.");
    this.lots = new Map(structuredClone(snapshot?.lots ?? []));
    this.history = new Map(structuredClone(snapshot?.history ?? []));
    this.replay = new Map(structuredClone(snapshot?.replay ?? []));
    this.auditLog = structuredClone(snapshot?.audit ?? []);
    this.files = new Map(structuredClone(snapshot?.evidence ?? []));
    this.publications = new Map(structuredClone(snapshot?.publications ?? []));
    this.anchorRecords = new Map(structuredClone(snapshot?.anchors ?? []));
    this.onChange = onChange;
  }

  snapshot(): DemoSnapshot {
    return structuredClone({
      version: 1, lots: [...this.lots], history: [...this.history], replay: [...this.replay],
      audit: this.auditLog, evidence: [...this.files], publications: [...this.publications],
      anchors: [...this.anchorRecords],
    });
  }

  private changed() {
    this.onChange?.(this.snapshot());
  }

  list(organizationId?: string): Lot[] {
    const lots = [...this.lots.values()];
    return structuredClone(organizationId ? lots.filter(lot => lot.organizationId === organizationId) : lots);
  }

  get(id: string, organizationId?: string): Lot {
    const lot = this.lots.get(id);
    if (!lot || (organizationId && lot.organizationId !== organizationId)) throw new AppError("NOT_FOUND", 404, "Lote inexistente.");
    return structuredClone(lot);
  }

  events(id: string, organizationId?: string): LotEvent[] {
    this.get(id, organizationId);
    return structuredClone(this.history.get(id) ?? []);
  }

  lineage(id: string): Lot[] {
    const chain: Lot[] = [];
    for (let lot: Lot | undefined = this.get(id); lot; lot = lot.parentId ? this.lots.get(lot.parentId) : undefined) chain.unshift(lot);
    return structuredClone(chain);
  }

  create(actor: Actor, input: CreateLot): Lot {
    const site = input.location.siteId ? findSite(input.location.siteId) : undefined;
    if (input.location.siteId && site?.organizationId !== actor.organizationId) {
      throw new AppError("VALIDATION_ERROR", 400, "El sitio de extracción no pertenece a tu organización.");
    }
    const lot = { ...structuredClone(input), id: randomUUID(), organizationId: actor.organizationId, parentId: null, availableGrams: 0 };
    this.lots.set(lot.id, lot);
    this.record(actor, lot.id, input.extractedAt, { type: "extraction_declared", payload: input });
    this.audited(actor, "lot.create", lot.id);
    this.changed();
    return structuredClone(lot);
  }

  measure(actor: Actor, id: string, input: Measurement): Lot {
    const lot = this.get(id, actor.organizationId);
    if (lot.parentId || this.events(id).some(event => event.type === "measurement_recorded")) {
      throw new AppError("CONFLICT", 409, "El lote ya tiene una masa inicial.");
    }
    if (!Number.isSafeInteger(input.grams) || input.grams < 1 || input.grams > maxGrams) {
      throw new AppError("VALIDATION_ERROR", 400, "La masa registrada es inválida.");
    }
    if (input.evidenceId && this.files.get(input.evidenceId)?.lotId !== id) {
      throw new AppError("NOT_FOUND", 404, "Evidencia inexistente para este lote.");
    }
    lot.availableGrams = input.grams;
    this.lots.set(id, lot);
    this.record(actor, id, input.measuredAt, { type: "measurement_recorded", payload: input });
    this.audited(actor, "lot.measure", id);
    this.changed();
    return structuredClone(lot);
  }

  split(actor: Actor, id: string, grams: number): SplitResult {
    const parent = this.get(id, actor.organizationId);
    if (!Number.isSafeInteger(grams) || grams < 1) {
      throw new AppError("VALIDATION_ERROR", 400, "La masa del fraccionamiento es inválida.");
    }
    if (grams > parent.availableGrams) {
      throw new AppError("INSUFFICIENT_MASS", 409, "El saldo del lote es insuficiente.");
    }
    parent.availableGrams -= grams;
    const child = { ...parent, id: randomUUID(), parentId: parent.id, availableGrams: grams };
    const now = new Date().toISOString();
    this.lots.set(parent.id, parent);
    this.lots.set(child.id, child);
    this.record(actor, parent.id, now, { type: "lot_split", payload: { childId: child.id, grams } });
    this.record(actor, child.id, now, { type: "sublot_created", payload: { parentId: id, grams } });
    this.audited(actor, "lot.split", id);
    this.changed();
    return structuredClone({ parent, child });
  }

  attachEvidence(actor: Actor, lotId: string, input: EvidenceInput): EvidenceSummary {
    this.get(lotId, actor.organizationId);
    const existing = [...this.files.values()].find(file => file.lotId === lotId && file.sha256 === input.sha256);
    if (existing) return summary(existing);
    const now = new Date().toISOString();
    const record: EvidenceRecord = { ...structuredClone(input), id: randomUUID(), lotId, organizationId: actor.organizationId, actorId: actor.actorId, createdAt: now };
    this.files.set(record.id, record);
    this.record(actor, lotId, now, { type: "evidence_attached", payload: { evidenceId: record.id } });
    this.audited(actor, "lot.evidence", lotId);
    this.changed();
    return summary(record);
  }

  evidence(lotId: string, organizationId?: string): EvidenceSummary[] {
    this.get(lotId, organizationId);
    return [...this.files.values()].filter(file => file.lotId === lotId).map(summary);
  }

  attachAnchor(actor: Actor, lotId: string, anchor: AnchorSummary): AnchorSummary {
    this.get(lotId, actor.organizationId);
    const now = new Date().toISOString();
    const record: AnchorRecord = {
      ...structuredClone(anchor),
      lotId,
      organizationId: actor.organizationId,
      actorId: actor.actorId,
      createdAt: now,
    };
    this.anchorRecords.set(anchor.id, record);
    this.record(actor, lotId, now, { type: "anchor_confirmed", payload: { anchorId: anchor.id } });
    this.audited(actor, "lot.anchor", lotId);
    this.changed();
    return structuredClone(anchor);
  }

  anchors(lotId: string, organizationId?: string): AnchorSummary[] {
    if (organizationId) {
      this.get(lotId, organizationId);
    }
    return [...this.anchorRecords.values()]
      .filter(item => item.lotId === lotId)
      .map(({ id, evidenceId, status, chainId, contractAddress, txHash }) => ({
        id,
        evidenceId,
        status,
        chainId,
        contractAddress,
        txHash,
      }));
  }

  publish(actor: Actor, lotId: string, fields: PublicField[]): Publication {
    this.get(lotId, actor.organizationId);
    const previous = [...this.publications.values()].find(item => item.lotId === lotId);
    const publication: Publication = {
      code: previous?.code ?? this.newCode(), lotId, fields: [...new Set(fields)], publishedAt: new Date().toISOString(),
    };
    this.publications.set(publication.code, publication);
    this.record(actor, lotId, publication.publishedAt, { type: "lot_published", payload: { publicCode: publication.code } });
    this.audited(actor, "lot.publish", lotId);
    this.changed();
    return structuredClone(publication);
  }

  publication(code: string): Publication | undefined {
    const publication = publicCodePattern.test(code) ? this.publications.get(code) : undefined;
    return publication && structuredClone(publication);
  }

  idempotent(actor: Actor, scope: string, key: string, fingerprint: string, operation: () => unknown): unknown {
    const replayKey = JSON.stringify([actor.organizationId, actor.actorId, scope, key]);
    const previous = this.replay.get(replayKey);
    if (previous) {
      if (previous.fingerprint !== fingerprint) {
        throw new AppError("IDEMPOTENCY_CONFLICT", 409, "La clave ya se usó con otro cuerpo.");
      }
      return structuredClone(previous.data);
    }
    const result = operation();
    if (result instanceof Promise) {
      return result.then(data => {
        this.replay.set(replayKey, { fingerprint, data: structuredClone(data) });
        this.changed();
        return data;
      });
    }
    this.replay.set(replayKey, { fingerprint, data: structuredClone(result) });
    this.changed();
    return result;
  }

  audit(organizationId: string): AuditEntry[] {
    return structuredClone(this.auditLog.filter(entry => entry.organizationId === organizationId));
  }

  private newCode() {
    let code: string;
    do {
      code = [...randomBytes(10)].map(byte => codeAlphabet[byte % codeAlphabet.length]).join("");
    } while (this.publications.has(code));
    return code;
  }

  private audited(actor: Actor, action: AuditAction, entityId: string) {
    this.auditLog.push({
      id: randomUUID(), organizationId: actor.organizationId, actorId: actor.actorId, action, entityId,
      requestId: actor.requestId ?? null, occurredAt: new Date().toISOString(), outcome: "success",
    });
  }

  private record(actor: Actor, lotId: string, occurredAt: string, detail: {
    [K in LotEvent["type"]]: Pick<Extract<LotEvent, { type: K }>, "type" | "payload">;
  }[LotEvent["type"]]) {
    const events = this.history.get(lotId) ?? [];
    events.push({
      ...structuredClone(detail), id: randomUUID(), lotId, sequence: events.length + 1,
      occurredAt, recordedAt: new Date().toISOString(), actorId: actor.actorId,
    });
    this.history.set(lotId, events);
  }
}
