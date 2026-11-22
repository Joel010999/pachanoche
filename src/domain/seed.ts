import type { LotStore } from "../server/ports.ts";
import { personas, sessionOf } from "./personas.ts";

const date = "2026-10-15T15:00:00.000Z";

export function seed<T extends LotStore>(store: T): T {
  const producer = sessionOf(personas[0]);
  const lot = store.create(producer, {
    productCode: "sal-artesanal",
    extractedAt: date,
    location: { latitude: -23.64, longitude: -66.01, recordedAt: date, accuracyM: 12 },
  });
  store.measure(producer, lot.id, { grams: 100_000, measuredAt: date, instrument: "Balanza de demostración" });
  return store;
}
