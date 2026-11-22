import { listEvidence, uploadEvidence } from "@/server/api/evidence";

type Context = RouteContext<"/api/v1/lots/[id]/evidence">;

export const GET = async (request: Request, context: Context) => listEvidence(request, await context.params);
export const POST = async (request: Request, context: Context) => uploadEvidence(request, await context.params);
