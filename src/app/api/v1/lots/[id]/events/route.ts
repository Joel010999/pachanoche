import { lotEvents } from "@/server/api/lots";

export const GET = async (request: Request, context: RouteContext<"/api/v1/lots/[id]/events">) =>
  lotEvents(request, await context.params);
