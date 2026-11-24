import { currentPublication, publishLot } from "@/server/api/publication";

type Context = RouteContext<"/api/v1/lots/[id]/publish">;

export const GET = async (request: Request, context: Context) => currentPublication(request, await context.params);
export const POST = async (request: Request, context: Context) => publishLot(request, await context.params);
