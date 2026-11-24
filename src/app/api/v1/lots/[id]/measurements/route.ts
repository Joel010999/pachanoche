import { recordMeasurement } from "@/server/api/lots";

export const POST = async (request: Request, context: RouteContext<"/api/v1/lots/[id]/measurements">) =>
  recordMeasurement(request, await context.params);
