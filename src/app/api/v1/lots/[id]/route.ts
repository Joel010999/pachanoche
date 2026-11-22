import { getLot } from "@/server/api/lots";

export const GET = async (request: Request, context: RouteContext<"/api/v1/lots/[id]">) => getLot(request, await context.params);
