import { createLot, listLots } from "@/server/api/lots";

export const GET = () => listLots();
export const POST = (request: Request) => createLot(request);
