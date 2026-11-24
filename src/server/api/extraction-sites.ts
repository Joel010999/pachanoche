import { AppError } from "../../domain/errors.ts";
import { extractionSites, findSite } from "../../domain/personas.ts";
import { container } from "../container.ts";
import { handle, ok } from "../http.ts";
import { requireSession } from "../session.ts";

type SiteParams = { id: string };

/**
 * Lista los sitios de extracción autorizados para la organización en sesión.
 */
export const listExtractionSites = (request: Request) =>
  handle(() => {
    const session = requireSession(request);
    const sites = session.role === "verifier"
      ? extractionSites
      : extractionSites.filter(site => site.organizationId === session.organizationId);
    return ok(sites);
  });

/**
 * Retorna las observaciones satelitales territoriales asociadas al sitio de extracción.
 */
export const getExtractionSiteObservations = (_request: Request, { id }: SiteParams) =>
  handle(async () => {
    const site = findSite(id);
    if (!site) {
      throw new AppError("NOT_FOUND", 404, "Sitio de extracción inexistente.");
    }

    const { satellite } = container();
    const observations = await satellite.observations(id);
    return ok(observations);
  });
