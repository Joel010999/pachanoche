import { z } from "zod";
import { maxEvidenceBytes } from "../../contracts/v1.ts";
import { AppError } from "../../domain/errors.ts";
import { container } from "../container.ts";
import { digest, handle, mediaType, ok, parse, readJson } from "../http.ts";

const digestSchema = z.strictObject({ sha256: z.string().trim().toLowerCase().regex(/^(0x)?[0-9a-f]{64}$/) });

async function requestedDigest(request: Request) {
  if (mediaType(request) === "application/json") {
    return parse(digestSchema, (await readJson(request)).input).sha256.replace(/^0x/, "");
  }
  const bytes = new Uint8Array(await request.arrayBuffer());
  if (bytes.byteLength === 0) throw new AppError("VALIDATION_ERROR", 400, "El archivo enviado está vacío.");
  if (bytes.byteLength > maxEvidenceBytes) throw new AppError("PAYLOAD_TOO_LARGE", 413, "El archivo supera el límite.");
  return digest(bytes);
}

/**
 * Verificación pública de un documento por hash SHA-256 o por sus bytes.
 * Consulta el adaptador y, si se reinició el servidor, los anclajes guardados en el almacén.
 */
export const verifyDocument = (request: Request) =>
  handle(async () => {
    const sha256 = await requestedDigest(request);
    const { blockchain, lots, blockchainMode } = container();
    const fromAdapter = await blockchain.verifyDigest(sha256);
    const result = fromAdapter.exists ? fromAdapter : lots.anchoredDigest(sha256);
    if (!result.exists) {
      return ok({
        verified: false, status: "unanchored", sha256, mode: blockchainMode,
        reason: "La huella digital no coincide con ningún registro anclado.",
      });
    }
    return ok({
      verified: true, status: "confirmed", sha256, mode: blockchainMode,
      anchorId: result.anchorId, lotId: result.lotId, evidenceId: result.evidenceId, eventKind: result.eventKind,
      chainId: 43113, contractAddress: result.contractAddress, txHash: result.txHash, timestamp: result.timestamp,
    });
  });
