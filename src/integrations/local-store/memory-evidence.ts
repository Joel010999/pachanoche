import type { EvidenceStore } from "../../server/ports.ts";

export class MemoryEvidenceStore implements EvidenceStore {
  private files = new Map<string, Uint8Array>();

  async put(id: string, bytes: Uint8Array) {
    this.files.set(id, new Uint8Array(bytes));
  }

  async get(id: string) {
    const bytes = this.files.get(id);
    return bytes ? new Uint8Array(bytes) : null;
  }
}
