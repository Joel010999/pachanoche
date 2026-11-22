import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import type { EvidenceStore } from "../../server/ports.ts";

const safeId = /^[0-9a-f-]{36}$/;

export class FileEvidenceStore implements EvidenceStore {
  private directory: string;

  constructor(directory: string) {
    this.directory = directory;
  }

  private path(id: string) {
    if (!safeId.test(id)) throw new Error("Identificador de evidencia inválido.");
    return join(this.directory, id);
  }

  async put(id: string, bytes: Uint8Array) {
    const path = this.path(id);
    await mkdir(this.directory, { recursive: true });
    await writeFile(path, bytes, { flag: "wx" }).catch((error: NodeJS.ErrnoException) => {
      if (error.code !== "EEXIST") throw error;
    });
  }

  async get(id: string) {
    if (!safeId.test(id)) return null;
    return readFile(this.path(id)).then(buffer => new Uint8Array(buffer), () => null);
  }
}
