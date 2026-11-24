import { FujiBlockchainAdapter } from "./adapter.ts";

/**
 * Adaptador de demostración en memoria para pruebas y desarrollo local.
 */
export const demoBlockchainAdapter = new FujiBlockchainAdapter({
  forceMock: true,
  contractAddress: "0x742d35Cc6634C0532925a3b844Bc454e4438f44e",
});
