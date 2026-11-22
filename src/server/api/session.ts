import { sessionSelectSchema } from "../../contracts/v1.ts";
import { AppError } from "../../domain/errors.ts";
import { findPersona, personas } from "../../domain/personas.ts";
import { handle, parse, readJson } from "../http.ts";
import { clearSessionCookie, currentPersona, setSessionCookie } from "../session.ts";

export const readSession = (request: Request) =>
  handle(() => Response.json({ data: { persona: currentPersona(request) ?? null, personas } }));

export const selectSession = (request: Request) =>
  handle(async () => {
    const { personaId } = parse(sessionSelectSchema, (await readJson(request)).input);
    const persona = findPersona(personaId);
    if (!persona) throw new AppError("VALIDATION_ERROR", 400, "Persona demo inexistente.");
    return Response.json({ data: { persona } }, { headers: { "Set-Cookie": setSessionCookie(persona.id) } });
  });

export const endSession = () =>
  handle(() => new Response(null, { status: 204, headers: { "Set-Cookie": clearSessionCookie() } }));
