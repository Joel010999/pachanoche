import type { BlockchainAdapter } from "../../server/ports.ts";

export const demoBlockchain: BlockchainAdapter = {
  async submit({ anchorId, evidenceId }) {
    return { id: anchorId, evidenceId, status: "queued", chainId: 43113 };
  },
  async reconcile(anchor) {
    return { ...anchor };
  },
};
