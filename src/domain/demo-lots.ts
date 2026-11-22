import { randomUUID } from "node:crypto";
import { maxGrams, type ApiErrorCode, type CreateLot, type Lot, type LotEvent, type Measurement, type SplitResult } from "../contracts/v1.ts";

const organizationId = "e8f1ef36-0252-41ba-8ee1-f23c2370c92f";
const actorId = "15ba8a42-cb18-471b-9330-ba23d4f35efc";

export class LotError extends Error {
  readonly code: ApiErrorCode;
  readonly status: number;

  constructor(code: ApiErrorCode, status: number, message: string) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

export class DemoLots {
  private lots = new Map<string, Lot>();
  private history = new Map<string, LotEvent[]>();
  private replay = new Map<string, { fingerprint: string; data: unknown }>();

  list(): Lot[] {
    return structuredClone([...this.lots.values()]);
  }

  get(id: string): Lot {
    const lot = this.lots.get(id);
    if (!lot) throw new LotError("NOT_FOUND", 404, "Lote inexistente.");
    return structuredClone(lot);
  }

  events(id: string): LotEvent[] {
    this.get(id);
    return structuredClone(this.history.get(id) ?? []);
  }

  create(input: CreateLot): Lot {
    const lot = { ...structuredClone(input), id: randomUUID(), organizationId, parentId: null, availableGrams: 0 };
    this.lots.set(lot.id, lot);
    this.record(lot.id, input.extractedAt, { type: "extraction_declared", payload: input });
    return structuredClone(lot);
  }

  measure(id: string, input: Measurement): Lot {
    const lot = this.get(id);
    if (lot.parentId || this.events(id).some(event => event.type === "measurement_recorded")) {
      throw new LotError("CONFLICT", 409, "El lote ya tiene una masa inicial.");
    }
    if (!Number.isSafeInteger(input.grams) || input.grams < 1 || input.grams > maxGrams) {
      throw new LotError("VALIDATION_ERROR", 400, "La masa registrada es inválida.");
    }
    lot.availableGrams = input.grams;
    this.lots.set(id, lot);
    this.record(id, input.measuredAt, { type: "measurement_recorded", payload: input });
    return structuredClone(lot);
  }

  split(id: string, grams: number): SplitResult {
    const parent = this.get(id);
    if (!Number.isSafeInteger(grams) || grams < 1) {
      throw new LotError("VALIDATION_ERROR", 400, "La masa del fraccionamiento es inválida.");
    }
    if (grams > parent.availableGrams) {
      throw new LotError("INSUFFICIENT_MASS", 409, "El saldo del lote es insuficiente.");
    }
    parent.availableGrams -= grams;
    const child = { ...parent, id: randomUUID(), parentId: parent.id, availableGrams: grams };
    const now = new Date().toISOString();
    this.lots.set(parent.id, parent);
    this.lots.set(child.id, child);
    this.record(parent.id, now, { type: "lot_split", payload: { childId: child.id, grams } });
    this.record(child.id, now, { type: "sublot_created", payload: { parentId: id, grams } });
    return structuredClone({ parent, child });
  }

  idempotent(scope: string, key: string, fingerprint: string, operation: () => unknown): unknown {
    const replayKey = JSON.stringify([scope, key]);
    const previous = this.replay.get(replayKey);
    if (previous) {
      if (previous.fingerprint !== fingerprint) {
        throw new LotError("IDEMPOTENCY_CONFLICT", 409, "La clave ya se usó con otro cuerpo.");
      }
      return structuredClone(previous.data);
    }
    const data = operation();
    this.replay.set(replayKey, { fingerprint, data: structuredClone(data) });
    return data;
  }

  private record(lotId: string, occurredAt: string, detail: {
    [K in LotEvent["type"]]: Pick<Extract<LotEvent, { type: K }>, "type" | "payload">;
  }[LotEvent["type"]]) {
    const events = this.history.get(lotId) ?? [];
    events.push({
      ...structuredClone(detail), id: randomUUID(), lotId, sequence: events.length + 1,
      occurredAt, recordedAt: new Date().toISOString(), actorId,
    });
    this.history.set(lotId, events);
  }
}
