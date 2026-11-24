import type { DemoPersona, Role, Session } from "../contracts/v1.ts";
import { findPersona, sessionOf } from "../domain/personas.ts";
import { AppError } from "../domain/errors.ts";

export const sessionCookie = "sdo_persona";
const maxAgeSeconds = 12 * 60 * 60;

function cookieValue(request: Request, name: string) {
  for (const part of request.headers.get("cookie")?.split(";") ?? []) {
    const [key, ...value] = part.trim().split("=");
    if (key === name) return decodeURIComponent(value.join("="));
  }
}

export function currentPersona(request: Request): DemoPersona | undefined {
  const id = cookieValue(request, sessionCookie);
  return id ? findPersona(id) : undefined;
}

export function getSession(request: Request): Session | null {
  const persona = currentPersona(request);
  return persona ? sessionOf(persona) : null;
}

export function requireSession(request: Request, ...allowed: Role[]): Session {
  const session = getSession(request);
  if (!session) throw new AppError("UNAUTHENTICATED", 401, "Elegí una sesión demo.");
  if (allowed.length && !allowed.includes(session.role)) throw new AppError("FORBIDDEN", 403, "Tu rol no permite esta operación.");
  return session;
}

export function setSessionCookie(personaId: string) {
  return `${sessionCookie}=${encodeURIComponent(personaId)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAgeSeconds}`;
}

export function clearSessionCookie() {
  return `${sessionCookie}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`;
}
