import { createLot, listLots } from "@/server/api/lots";

export const GET = (request: Request) => listLots(request);
export const POST = (request: Request) => createLot(request);
