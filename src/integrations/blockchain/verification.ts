import { createHash } from "node:crypto";
import type { AnchorStatus, AnchorSummary } from "../../contracts/v1.ts";

export interface VerificationResult {
  matches: boolean;
  status: AnchorStatus | "unanchored";
  expectedSha256: string;
  actualSha256: string;
  anchor?: AnchorSummary;
  reason?: string;
}

/**
 * Servicio de verificación documental de integridad contra Avalanche Fuji.
 * Compara los bytes de un archivo contra el hash registrado y su anclaje en blockchain.
 */
export function verifyDocumentIntegrity(
  fileBytes: Uint8Array | Buffer,
  expectedSha256: string,
  anchor?: AnchorSummary
): VerificationResult {
  const actualSha256 = createHash("sha256").update(fileBytes).digest("hex");
  const normalizedExpected = expectedSha256.toLowerCase().replace(/^0x/, "");

  if (actualSha256 !== normalizedExpected) {
    return {
      matches: false,
      status: anchor?.status ?? "unanchored",
      expectedSha256: normalizedExpected,
      actualSha256,
      anchor,
      reason: "El contenido del archivo fue alterado o no coincide con el hash certificado.",
    };
  }

  return {
    matches: true,
    status: anchor?.status ?? "unanchored",
    expectedSha256: normalizedExpected,
    actualSha256,
    anchor,
  };
}
