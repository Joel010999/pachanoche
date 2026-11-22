import { splitLot } from "@/server/api/lots";

export const POST = async (request: Request, context: RouteContext<"/api/v1/lots/[id]/splits">) =>
  splitLot(request, await context.params);
