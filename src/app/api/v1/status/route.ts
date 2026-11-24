import { readStatus } from "@/server/api/status";

export const GET = (request: Request) => readStatus(request);
