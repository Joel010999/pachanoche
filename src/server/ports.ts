import type { BlockchainAdapter, CreateLot, GeofenceResult, Lot, LotEvent, Measurement, SatelliteSource, SplitResult } from "../contracts/v1.ts";

export type { BlockchainAdapter, SatelliteSource };
export type DeclaredLocation = CreateLot["location"];

export interface LotStore {
  list(): Lot[];
  get(id: string): Lot;
  events(id: string): LotEvent[];
  create(input: CreateLot): Lot;
  measure(id: string, input: Measurement): Lot;
  split(id: string, grams: number): SplitResult;
  idempotent(scope: string, key: string, fingerprint: string, operation: () => unknown): unknown;
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
