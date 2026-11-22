import type { BlockchainAdapter, CreateLot, GeofenceResult, Lot, LotEvent, Measurement, SatelliteSource, SplitResult } from "../contracts/v1.ts";

export type { BlockchainAdapter, SatelliteSource };
export type DeclaredLocation = CreateLot["location"];
export type Actor = { actorId: string; organizationId: string };

export interface LotStore {
  list(organizationId?: string): Lot[];
  get(id: string, organizationId?: string): Lot;
  events(id: string, organizationId?: string): LotEvent[];
  create(actor: Actor, input: CreateLot): Lot;
  measure(actor: Actor, id: string, input: Measurement): Lot;
  split(actor: Actor, id: string, grams: number): SplitResult;
  idempotent(actor: Actor, scope: string, key: string, fingerprint: string, operation: () => unknown): unknown;
}

export interface EvidenceStore {
  put(id: string, bytes: Uint8Array): Promise<void>;
  get(id: string): Promise<Uint8Array | null>;
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
};
