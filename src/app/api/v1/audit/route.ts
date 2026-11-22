import { listAudit } from "@/server/api/audit";

export const GET = (request: Request) => listAudit(request);
