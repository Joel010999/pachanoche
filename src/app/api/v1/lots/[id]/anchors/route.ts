import { createAnchor, listAnchors } from "@/server/api/anchors";

type Context = RouteContext<"/api/v1/lots/[id]/anchors">;

export const GET = async (request: Request, context: Context) => listAnchors(request, await context.params);
export const POST = async (request: Request, context: Context) => createAnchor(request, await context.params);
