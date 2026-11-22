import type { LotStore } from "../server/ports.ts";

const date = "2026-10-15T15:00:00.000Z";

export function seed(store: LotStore) {
  const lot = store.create({
    productCode: "sal-artesanal",
    extractedAt: date,
    location: { latitude: -23.64, longitude: -66.01, recordedAt: date, accuracyM: 12 },
  });
  store.measure(lot.id, { grams: 100_000, measuredAt: date, instrument: "Balanza de demostración" });
  return store;
}
