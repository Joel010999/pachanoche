import { DemoLots } from "./demo-lots.ts";

const date = "2026-10-15T15:00:00.000Z";
const store = new DemoLots();
const lot = store.create({
  productCode: "sal-artesanal",
  extractedAt: date,
  location: { latitude: -23.64, longitude: -66.01, recordedAt: date, accuracyM: 12 },
});
store.measure(lot.id, { grams: 100_000, measuredAt: date, instrument: "Balanza de demostración" });
store.split(lot.id, 30_000);

const globalDemo = globalThis as typeof globalThis & { salDeOrigenDemo?: DemoLots };
export const demoLots = globalDemo.salDeOrigenDemo ??= store;
