import { DemoLots } from "../domain/demo-lots.ts";
import { seed } from "../domain/seed.ts";
import { demoBlockchain } from "../integrations/blockchain/demo.ts";
import { demoGeofence, demoSatellite } from "../integrations/geospatial/demo.ts";
import { MemoryEvidenceStore } from "../integrations/local-store/memory-evidence.ts";
import type { Container } from "./ports.ts";

export function createContainer(overrides: Partial<Container> = {}): Container {
  return {
    lots: overrides.lots ?? seed(new DemoLots()),
    evidence: overrides.evidence ?? new MemoryEvidenceStore(),
    geofence: overrides.geofence ?? demoGeofence,
    blockchain: overrides.blockchain ?? demoBlockchain,
    satellite: overrides.satellite ?? demoSatellite,
  };
}

const global = globalThis as typeof globalThis & { salDeOrigen?: Container };

export function container(): Container {
  return global.salDeOrigen ??= createContainer();
}

export function setContainer(next: Container) {
  global.salDeOrigen = next;
}
