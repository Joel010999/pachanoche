import { endSession, readSession, selectSession } from "@/server/api/session";

export const GET = (request: Request) => readSession(request);
export const POST = (request: Request) => selectSession(request);
export const DELETE = () => endSession();
