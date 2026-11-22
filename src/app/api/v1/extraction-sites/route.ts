import { listExtractionSites } from "@/server/api/extraction-sites";

export const GET = (request: Request) => listExtractionSites(request);
