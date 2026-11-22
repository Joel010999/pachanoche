import { publicLot } from "@/server/api/publication";

export const GET = async (request: Request, context: RouteContext<"/api/v1/public/lots/[code]">) =>
  publicLot(request, await context.params);
