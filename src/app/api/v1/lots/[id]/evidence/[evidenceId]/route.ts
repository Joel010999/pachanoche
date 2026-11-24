import { downloadEvidence } from "@/server/api/evidence";

export const GET = async (request: Request, context: RouteContext<"/api/v1/lots/[id]/evidence/[evidenceId]">) =>
  downloadEvidence(request, await context.params);
