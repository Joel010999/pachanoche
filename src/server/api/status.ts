import { container } from "../container.ts";
import { handle, ok } from "../http.ts";

export function publicBaseUrl(request: Request) {
  return (process.env.PUBLIC_BASE_URL || new URL(request.url).origin).replace(/\/+$/, "");
}

export const readStatus = (request: Request) =>
  handle(() => ok({ blockchainMode: container().blockchainMode, publicBaseUrl: publicBaseUrl(request) }));
