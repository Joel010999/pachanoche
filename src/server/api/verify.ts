import { z } from "zod";
import { maxEvidenceBytes, type DigestVerificationResult } from "../../contracts/v1.ts";
import { FujiBlockchainAdapter } from "../../integrations/blockchain/adapter.ts";
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
    const stored = lots.anchoredDigest(sha256);
    let result: DigestVerificationResult = stored;
    let source: "fuji" | "registro-local" = "registro-local";
    if (blockchainMode === "fuji" && blockchain instanceof FujiBlockchainAdapter) {
      const chain = await blockchain.onChainDigest(sha256).catch(() => null);
      if (chain) {
        source = "fuji";
        result = !chain.exists ? chain : stored.exists ? stored : {
          exists: true, anchorId: chain.anchorId, lotId: "", evidenceId: "", sha256, eventKind: chain.eventKind,
          txHash: "", contractAddress: process.env.FUJI_CONTRACT_ADDRESS ?? "", timestamp: chain.timestamp,
        };
      }
    } else {
      const fromAdapter = await blockchain.verifyDigest(sha256);
      if (fromAdapter.exists) result = fromAdapter;
    }
    if (!result.exists) {
      return ok({
        verified: false, status: "unanchored", sha256, mode: blockchainMode, source,
        reason: "La huella digital no coincide con ningún registro anclado.",
      });
    }
    return ok({
      verified: true, status: "confirmed", sha256, mode: blockchainMode, source,
      anchorId: result.anchorId, lotId: result.lotId, evidenceId: result.evidenceId, eventKind: result.eventKind,
      chainId: 43113, contractAddress: result.contractAddress, txHash: result.txHash, timestamp: result.timestamp,
    });
  });
