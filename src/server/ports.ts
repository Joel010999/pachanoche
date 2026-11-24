import type {
  AnchorSummary, BlockchainAdapter, CreateLot, DigestVerificationResult, EvidenceSummary, GeofenceResult, Lot, LotEvent, Measurement, PublicField, SatelliteSource, SplitResult,
} from "../contracts/v1.ts";

export type { BlockchainAdapter, SatelliteSource };
export type DeclaredLocation = CreateLot["location"];
export type Actor = { actorId: string; organizationId: string; requestId?: string };
export type AuditAction = "lot.create" | "lot.measure" | "lot.split" | "lot.evidence" | "lot.publish" | "lot.anchor";
export type AuditEntry = {
  id: string;
  organizationId: string;
  actorId: string;
  action: AuditAction;
  entityId: string;
  requestId: string | null;
  occurredAt: string;
  outcome: "success";
};
export type EvidenceInput = Omit<EvidenceSummary, "id">;
export type EvidenceRecord = EvidenceSummary & { lotId: string; organizationId: string; actorId: string; createdAt: string };
export type AnchorRecord = AnchorSummary & { lotId: string; organizationId: string; actorId: string; createdAt: string };
export type Publication = { code: string; lotId: string; fields: PublicField[]; publishedAt: string };

export interface LotStore {
  list(organizationId?: string): Lot[];
  get(id: string, organizationId?: string): Lot;
  events(id: string, organizationId?: string): LotEvent[];
  lineage(id: string): Lot[];
  create(actor: Actor, input: CreateLot): Lot;
  measure(actor: Actor, id: string, input: Measurement): Lot;
  split(actor: Actor, id: string, grams: number): SplitResult;
  attachEvidence(actor: Actor, lotId: string, input: EvidenceInput): EvidenceSummary;
  evidence(lotId: string, organizationId?: string): EvidenceSummary[];
  attachAnchor(actor: Actor, lotId: string, anchor: AnchorSummary): AnchorSummary;
  anchors(lotId: string, organizationId?: string): AnchorSummary[];
  anchoredDigest(sha256: string): DigestVerificationResult;
  publish(actor: Actor, lotId: string, fields: PublicField[]): Publication;
  publication(code: string): Publication | undefined;
  publicationOf(lotId: string, organizationId: string): Publication | undefined;
  idempotent(actor: Actor, scope: string, key: string, fingerprint: string, operation: () => unknown): unknown;
  audit(organizationId: string): AuditEntry[];
}

/** Guarda bytes originales direccionados por su SHA-256. */
export interface EvidenceStore {
  put(sha256: string, bytes: Uint8Array): Promise<void>;
  get(sha256: string): Promise<Uint8Array | null>;
}

export interface GeofenceService {
  classify(location: DeclaredLocation): GeofenceResult;
}

export type Container = {
  lots: LotStore;
  evidence: EvidenceStore;
  geofence: GeofenceService;
  blockchain: BlockchainAdapter;
  satellite: SatelliteSource;
  blockchainMode: "fuji" | "simulado";
};
