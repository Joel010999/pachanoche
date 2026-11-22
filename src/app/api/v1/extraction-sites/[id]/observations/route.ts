import { getExtractionSiteObservations } from "@/server/api/extraction-sites";

type Context = RouteContext<"/api/v1/extraction-sites/[id]/observations">;

export const GET = async (request: Request, context: Context) =>
  getExtractionSiteObservations(request, await context.params);
