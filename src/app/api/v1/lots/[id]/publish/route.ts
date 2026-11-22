import { publishLot } from "@/server/api/publication";

export const POST = async (request: Request, context: RouteContext<"/api/v1/lots/[id]/publish">) =>
  publishLot(request, await context.params);
