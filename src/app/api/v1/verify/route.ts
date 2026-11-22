import { verifyDocument } from "@/server/api/verify";

export const POST = (request: Request) => verifyDocument(request);
