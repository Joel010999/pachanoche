import { z } from "zod";

export const roles = ["producer", "verifier", "buyer", "admin"] as const;
export const verificationStates = ["requested", "under_review", "verified", "rejected", "superseded"] as const;
export const anchorStates = ["queued", "submitted", "confirmed", "failed"] as const;
export type Role = typeof roles[number];
export type VerificationStatus = typeof verificationStates[number];
export type AnchorStatus = typeof anchorStates[number];

export const maxGrams = 1_000_000_000_000;
const grams = z.number().int().positive().max(maxGrams);
const utcDate = z.iso.datetime();
export const locationSchema = z.strictObject({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  recordedAt: utcDate,
  accuracyM: z.number().positive().optional(),
  siteId: z.uuid().optional(),
});
export const createLotSchema = z.strictObject({
  productCode: z.string().regex(/^[a-z0-9][a-z0-9-]{0,39}$/),
  extractedAt: utcDate,
  location: locationSchema,
});
export const measurementSchema = z.strictObject({
  grams,
  measuredAt: utcDate,
  instrument: z.string().trim().min(1).max(120),
  evidenceId: z.uuid().optional(),
});
export const splitSchema = z.strictObject({ grams });
export type CreateLot = z.infer<typeof createLotSchema>;
export type Measurement = z.infer<typeof measurementSchema>;
export type SplitLot = z.infer<typeof splitSchema>;

export type Lot = CreateLot & {
  id: string;
  organizationId: string;
  parentId: string | null;
  availableGrams: number;
};
type EventBase = { id: string; lotId: string; sequence: number; occurredAt: string; recordedAt: string; actorId: string };
type EventPayloads = {
  extraction_declared: CreateLot;
  measurement_recorded: Measurement;
  lot_split: { childId: string; grams: number };
  sublot_created: { parentId: string; grams: number };
  evidence_attached: { evidenceId: string };
  lot_published: { publicCode: string };
  anchor_confirmed: { anchorId: string };
  processing_recorded: { description: string };
  transfer_reserved: { transferId: string; grams: number };
  transfer_received: { transferId: string };
  transfer_cancelled: { transferId: string };
  verification_recorded: { verificationId: string };
  corrected: { supersedesId: string; reason: string };
};
export type LotEvent = {
  [K in keyof EventPayloads]: EventBase & { type: K; payload: EventPayloads[K] };
}[keyof EventPayloads];
export type SplitResult = { parent: Lot; child: Lot };

export type EvidenceSummary = { id: string; sha256: string; mediaType: string; sizeBytes: number; visibility: "private" | "digest_public" };
export type AnchorSummary = { id: string; evidenceId: string; status: AnchorStatus; chainId: 43113; contractAddress?: string; txHash?: string };
export type SatelliteObservation = {
  id: string;
  siteId: string;
  collection: "sentinel-1-grd" | "sentinel-2-l2a";
  itemId: string;
  acquiredAt: string;
  previewUrl?: string;
  attribution: string;
  resolutionM?: number;
  cloudCoverPercent?: number;
};
export type PublicLot = {
  code: string;
  productCode: string;
  declaredArea: string;
  extractedAt: string;
  events: Array<{ type: LotEvent["type"]; occurredAt: string }>;
  evidence: Array<{ id: string; sha256: string; anchor?: AnchorSummary }>;
  observations: SatelliteObservation[];
};
export interface BlockchainAdapter {
  submit(input: { anchorId: string; lotId: string; evidenceId: string; sha256: string; eventKind: 1 | 2 }): Promise<AnchorSummary>;
  reconcile(anchor: AnchorSummary): Promise<AnchorSummary>;
}
export interface SatelliteSource {
  observations(siteId: string): Promise<SatelliteObservation[]>;
}
export type ApiErrorCode = "VALIDATION_ERROR" | "UNAUTHENTICATED" | "FORBIDDEN" | "NOT_FOUND" |
  "INSUFFICIENT_MASS" | "IDEMPOTENCY_CONFLICT" | "CONFLICT" | "PAYLOAD_TOO_LARGE" |
  "UNSUPPORTED_MEDIA_TYPE" | "RATE_LIMITED" | "PROVIDER_UNAVAILABLE" | "INTERNAL_ERROR";
export type ApiResponse<T> = { data: T } | { error: { code: ApiErrorCode; message: string; requestId: string } };
