import { container } from "../container.ts";
import { handle, ok } from "../http.ts";
import { requireSession } from "../session.ts";

export const listAudit = (request: Request) =>
  handle(() => ok(container().lots.audit(requireSession(request, "admin").organizationId)));
