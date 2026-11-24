import { createHash } from "node:crypto";
import { type AnchorSummary, type BlockchainAdapter } from "../../contracts/v1.ts";
import { uuidToBytes32, sha256ToBytes32 } from "./codec.ts";
import artifact from "./AnchorRegistry.json" with { type: "json" };
import { AppError } from "../../domain/errors.ts";

export interface FujiAdapterOptions {
  rpcUrl?: string;
  contractAddress?: `0x${string}`;
  privateKey?: `0x${string}`;
  forceMock?: boolean;
}

/**
 * Adaptador blockchain para la red Avalanche Fuji (Chain ID 43113).
 * Soporta ejecución real contra el contrato inteligente y modo resiliente determinístico para demos offline.
 */
export class FujiBlockchainAdapter implements BlockchainAdapter {
  readonly chainId = 43113 as const;
  private readonly rpcUrl: string;
  private readonly contractAddress?: `0x${string}`;
  private readonly privateKey?: `0x${string}`;
  private readonly forceMock: boolean;

  // Cola secuencial en memoria para evitar colisiones de nonce con una sola cuenta firmante
  private queue: Promise<unknown> = Promise.resolve();

  // Almacén en memoria para consultas rápidas y modo offline
  private readonly memoryAnchors = new Map<string, {
    anchorId: string;
    lotId: string;
    evidenceId: string;
    sha256: string;
    eventKind: 1 | 2;
    txHash: string;
    contractAddress: string;
    timestamp: string;
  }>();

  constructor(options: FujiAdapterOptions = {}) {
    this.rpcUrl = options.rpcUrl || process.env.FUJI_RPC_URL || "https://api.avax-test.network/ext/bc/C/rpc";
    this.contractAddress = options.contractAddress || (process.env.FUJI_CONTRACT_ADDRESS as `0x${string}` | undefined);
    this.privateKey = options.privateKey || (process.env.FUJI_PRIVATE_KEY as `0x${string}` | undefined);
    this.forceMock = options.forceMock ?? (!this.contractAddress || !this.privateKey);
  }

  get isLive(): boolean {
    return !this.forceMock && Boolean(this.contractAddress && this.privateKey);
  }

  /**
   * Envía un anclaje a la blockchain (o simulación determinística si no hay credenciales activas).
   */
  async submit(input: {
    anchorId: string;
    lotId: string;
    evidenceId: string;
    sha256: string;
    eventKind: 1 | 2;
  }): Promise<AnchorSummary> {
    const { anchorId, lotId, evidenceId, sha256, eventKind } = input;

    // Validación de entrada
    if (!anchorId || !lotId || !evidenceId || !sha256) {
      throw new Error("Parámetros incompletos para el anclaje");
    }
    if (eventKind !== 1 && eventKind !== 2) {
      throw new Error(`eventKind inválido: ${eventKind}. Solo se permite 1 o 2`);
    }

    // Normalizar tipos a bytes32
    const anchorIdBytes32 = anchorId.includes("-") ? uuidToBytes32(anchorId) : sha256ToBytes32(anchorId);
    const lotRefBytes32 = uuidToBytes32(lotId);
    const digestBytes32 = sha256ToBytes32(sha256);

    // Encolar ejecución secuencial
    return new Promise((resolve, reject) => {
      this.queue = this.queue
        .then(async () => {
          // Idempotencia en memoria: si ya existe para este anchorId, devolver el existente
          const existing = this.memoryAnchors.get(anchorId);
          if (existing) {
            if (existing.sha256 === sha256.toLowerCase() && existing.lotId === lotId) {
              resolve({
                id: anchorId,
                evidenceId,
                status: "confirmed",
                chainId: this.chainId,
                contractAddress: existing.contractAddress,
                txHash: existing.txHash,
              });
              return;
            }
            throw new Error(`Conflicto de anclaje: el anchorId ${anchorId} ya fue registrado con datos diferentes.`);
          }

          if (this.isLive) {
            try {
              const liveSummary = await this.submitLive({
                anchorIdBytes32,
                lotRefBytes32,
                digestBytes32,
                eventKind,
                anchorId,
                lotId,
                evidenceId,
                sha256,
              });
              resolve(liveSummary);
              return;
            } catch (err) {
              // En modo real nunca se devuelve un recibo simulado: el error se informa y se puede reintentar.
              console.error("Fuji RPC no disponible o transacción rechazada:", err);
              reject(new AppError("PROVIDER_UNAVAILABLE", 503, "Avalanche Fuji no confirmó el anclaje. Reintentá en unos segundos."));
              return;
            }
          }

          // Modo demo / contingencia determinística
          const fallbackSummary = this.submitMock({
            anchorId,
            lotId,
            evidenceId,
            sha256,
            eventKind,
          });
          resolve(fallbackSummary);
        })
        .catch(reject);
    });
  }

  /**
   * Envío real contra el contrato en Avalanche Fuji C-Chain con viem.
   */
  private async submitLive(params: {
    anchorIdBytes32: `0x${string}`;
    lotRefBytes32: `0x${string}`;
    digestBytes32: `0x${string}`;
    eventKind: 1 | 2;
    anchorId: string;
    lotId: string;
    evidenceId: string;
    sha256: string;
  }): Promise<AnchorSummary> {
    const { createPublicClient, createWalletClient, http } = await import("viem");
    const { privateKeyToAccount } = await import("viem/accounts");
    const { avalancheFuji } = await import("viem/chains");

    const account = privateKeyToAccount(this.privateKey!);
    const publicClient = createPublicClient({
      chain: avalancheFuji,
      transport: http(this.rpcUrl),
    });
    const walletClient = createWalletClient({
      account,
      chain: avalancheFuji,
      transport: http(this.rpcUrl),
    });

    const txHash = await walletClient.writeContract({
      address: this.contractAddress!,
      abi: artifact.abi,
      functionName: "anchor",
      args: [
        params.anchorIdBytes32,
        params.lotRefBytes32,
        params.digestBytes32,
        params.eventKind,
      ],
    });

    // Esperar recibo y exigir que la transacción no haya revertido
    const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });
    if (receipt.status !== "success") throw new Error(`La transacción ${txHash} revirtió.`);

    this.memoryAnchors.set(params.anchorId, {
      anchorId: params.anchorId,
      lotId: params.lotId,
      evidenceId: params.evidenceId,
      sha256: params.sha256.toLowerCase(),
      eventKind: params.eventKind,
      txHash,
      contractAddress: this.contractAddress!,
      timestamp: new Date().toISOString(),
    });

    return {
      id: params.anchorId,
      evidenceId: params.evidenceId,
      status: "confirmed",
      chainId: this.chainId,
      contractAddress: this.contractAddress,
      txHash,
    };
  }

  /**
   * Generación de recibo determinístico para modo offline o testing.
   */
  private submitMock(params: {
    anchorId: string;
    lotId: string;
    evidenceId: string;
    sha256: string;
    eventKind: 1 | 2;
  }): AnchorSummary {
    const hash = createHash("sha256")
      .update(`FUJI_43113:${params.anchorId}:${params.sha256}`)
      .digest("hex");
    const mockTxHash = `0x${hash}`;
    const contract = this.contractAddress || "0x742d35Cc6634C0532925a3b844Bc454e4438f44e";

    this.memoryAnchors.set(params.anchorId, {
      anchorId: params.anchorId,
      lotId: params.lotId,
      evidenceId: params.evidenceId,
      sha256: params.sha256.toLowerCase(),
      eventKind: params.eventKind,
      txHash: mockTxHash,
      contractAddress: contract,
      timestamp: new Date().toISOString(),
    });

    return {
      id: params.anchorId,
      evidenceId: params.evidenceId,
      status: "confirmed",
      chainId: this.chainId,
      contractAddress: contract,
      txHash: mockTxHash,
    };
  }

  /**
   * Reconcilia el estado de un anclaje consultando la red o el almacén local.
   */
  async reconcile(anchor: AnchorSummary): Promise<AnchorSummary> {
    if (anchor.status === "confirmed") {
      return anchor;
    }

    if (this.isLive && anchor.txHash) {
      try {
        const { createPublicClient, http } = await import("viem");
        const { avalancheFuji } = await import("viem/chains");
        const publicClient = createPublicClient({
          chain: avalancheFuji,
          transport: http(this.rpcUrl),
        });
        const receipt = await publicClient.getTransactionReceipt({ hash: anchor.txHash as `0x${string}` });
        if (receipt.status === "success") {
          return { ...anchor, status: "confirmed" };
        }
        if (receipt.status === "reverted") {
          return { ...anchor, status: "failed" };
        }
      } catch {
        // En caso de error de red, mantener estado
      }
    }

    // Modo contingencia / memoria
    const record = this.memoryAnchors.get(anchor.id);
    if (record) {
      return { ...anchor, status: "confirmed", txHash: record.txHash };
    }

    return anchor;
  }

  /**
   * Consulta el registro de anclaje almacenado en el adaptador.
   */
  getAnchor(anchorId: string) {
    return this.memoryAnchors.get(anchorId);
  }

  /**
   * Verifica si un digest SHA-256 está registrado.
   */
  verifyDigest(sha256: string):
    | {
        exists: true;
        anchorId: string;
        lotId: string;
        evidenceId: string;
        sha256: string;
        eventKind: 1 | 2;
        txHash: string;
        contractAddress: string;
        timestamp: string;
      }
    | { exists: false } {
    const clean = (sha256.startsWith("0x") ? sha256.slice(2) : sha256).toLowerCase();
    for (const record of this.memoryAnchors.values()) {
      if (record.sha256 === clean) {
        return { exists: true, ...record };
      }
    }
    return { exists: false };
  }

  /**
   * Consulta el contrato AnchorRegistry en Fuji: fuente de verdad en modo real.
   */
  async onChainDigest(sha256: string): Promise<{ exists: false } | { exists: true; anchorId: string; eventKind: 1 | 2; timestamp: string }> {
    if (!this.isLive) return { exists: false };
    const { createPublicClient, http } = await import("viem");
    const { avalancheFuji } = await import("viem/chains");
    const client = createPublicClient({ chain: avalancheFuji, transport: http(this.rpcUrl) });
    const [exists, anchorId, , eventKind, timestamp] = await client.readContract({
      address: this.contractAddress!,
      abi: artifact.abi,
      functionName: "verifyDigest",
      args: [sha256ToBytes32(sha256)],
    }) as [boolean, `0x${string}`, `0x${string}`, number, bigint];
    if (!exists) return { exists: false };
    return { exists: true, anchorId, eventKind: eventKind === 2 ? 2 : 1, timestamp: new Date(Number(timestamp) * 1000).toISOString() };
  }
}
