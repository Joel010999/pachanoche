import { createHash } from "node:crypto";
import { container } from "../container.ts";
import { handle, ok } from "../http.ts";

/**
 * Endpoint de verificación pública de autenticidad documental contra Avalanche Fuji.
 * Admite verificación por hash SHA-256 o por archivo binario directo.
 */
export const verifyDocument = (request: Request) =>
  handle(async () => {
    let sha256: string;

    const contentType = request.headers.get("content-type") ?? "";
    if (contentType.includes("application/json")) {
      const body = await request.json();
      if (!body.sha256 || typeof body.sha256 !== "string") {
        throw new Error("Se requiere el campo 'sha256' en formato hexadecimal.");
      }
      sha256 = body.sha256.toLowerCase().replace(/^0x/, "");
    } else {
      // Recibir bytes de archivo directo
      const buffer = await request.arrayBuffer();
      if (buffer.byteLength === 0) {
        throw new Error("El archivo enviado está vacío.");
      }
      sha256 = createHash("sha256").update(Buffer.from(buffer)).digest("hex");
    }

    const { blockchain } = container();
    const result = await blockchain.verifyDigest(sha256);

    if (result.exists) {
      return ok({
        verified: true,
        status: "confirmed",
        sha256,
        anchorId: result.anchorId,
        lotId: result.lotId,
        evidenceId: result.evidenceId,
        eventKind: result.eventKind,
        chainId: 43113,
        contractAddress: result.contractAddress,
        txHash: result.txHash,
        timestamp: result.timestamp,
      });
    }

    return ok({
      verified: false,
      status: "unanchored",
      sha256,
      reason: "La huella digital no coincide con ningún registro certificado en Avalanche Fuji.",
    });
  });
