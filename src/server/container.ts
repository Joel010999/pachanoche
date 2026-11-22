import { join, resolve } from "node:path";
import { DemoLots, type DemoSnapshot } from "../domain/demo-lots.ts";
import { seed } from "../domain/seed.ts";
import { demoBlockchain } from "../integrations/blockchain/demo.ts";
import { demoGeofence, demoSatellite } from "../integrations/geospatial/demo.ts";
import { FileEvidenceStore } from "../integrations/local-store/file-evidence.ts";
import { readJsonFile, writeJsonFile } from "../integrations/local-store/json-file.ts";
import { MemoryEvidenceStore } from "../integrations/local-store/memory-evidence.ts";
import type { Container } from "./ports.ts";

export const defaultDataDir = () => resolve(process.env.DEMO_DATA_DIR ?? ".data");
export const dataFiles = (dataDir: string) => ({ state: join(dataDir, "demo.json"), evidence: join(dataDir, "evidence") });

export function seededLots(onChange?: (snapshot: DemoSnapshot) => void) {
  const store = seed(new DemoLots());
  return onChange ? new DemoLots({ snapshot: store.snapshot(), onChange }) : store;
}

function persistentLots(file: string) {
  const save = (snapshot: DemoSnapshot) => writeJsonFile(file, snapshot);
  const snapshot = readJsonFile<DemoSnapshot>(file);
  if (snapshot) return new DemoLots({ snapshot, onChange: save });
  const store = seededLots(save);
  save(store.snapshot());
  return store;
}

export function createContainer(overrides: Partial<Container> & { dataDir?: string } = {}): Container {
  const files = overrides.dataDir ? dataFiles(overrides.dataDir) : undefined;
  return {
    lots: overrides.lots ?? (files ? persistentLots(files.state) : seededLots()),
    evidence: overrides.evidence ?? (files ? new FileEvidenceStore(files.evidence) : new MemoryEvidenceStore()),
    geofence: overrides.geofence ?? demoGeofence,
    blockchain: overrides.blockchain ?? demoBlockchain,
    satellite: overrides.satellite ?? demoSatellite,
  };
}

const global = globalThis as typeof globalThis & { salDeOrigen?: Container };

export function container(): Container {
  return global.salDeOrigen ??= createContainer({ dataDir: defaultDataDir() });
}

export function setContainer(next: Container) {
  global.salDeOrigen = next;
}
