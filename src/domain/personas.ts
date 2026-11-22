import type { DemoPersona, Organization, Session } from "../contracts/v1.ts";

export const organizations = {
  salinas: { id: "e8f1ef36-0252-41ba-8ee1-f23c2370c92f", name: "Cooperativa Salinas Grandes (demo)" },
  puna: { id: "3c0a9f4e-7b1d-4a52-8e6f-2d9b5c1a7e43", name: "Salinera Puna Norte (demo)" },
  andina: { id: "6d2e8b17-94c3-4f0a-b5e6-0a7c3d9f1b28", name: "Distribuidora Andina (demo)" },
  altiplano: { id: "9a4f1c6b-2e7d-4b83-a0d5-5f8e2c7b3a91", name: "Laboratorio Altiplano (demo)" },
} satisfies Record<string, Organization>;

export const personas: DemoPersona[] = [
  { id: "productor-salinas", label: "Productora · Cooperativa Salinas Grandes", actorId: "15ba8a42-cb18-471b-9330-ba23d4f35efc", role: "producer", organization: organizations.salinas },
  { id: "admin-salinas", label: "Administración · Cooperativa Salinas Grandes", actorId: "4c6e8a0b-2d4f-4b19-8c3e-5a7d9f1b3c62", role: "admin", organization: organizations.salinas },
  { id: "productor-puna", label: "Productor · Salinera Puna Norte", actorId: "5e7c2a9d-1f4b-4c86-9d3e-8b0a6f2c4e17", role: "producer", organization: organizations.puna },
  { id: "comprador-andina", label: "Compradora · Distribuidora Andina", actorId: "2b8d4f6a-0c1e-4a97-b3d5-7e9f1a2c6b84", role: "buyer", organization: organizations.andina },
  { id: "verificador-altiplano", label: "Verificador · Laboratorio Altiplano", actorId: "7f1a3c5e-9b2d-4e68-a0c4-6d8b2f4a1e93", role: "verifier", organization: organizations.altiplano },
];

export const findPersona = (id: string) => personas.find(persona => persona.id === id);

export const sessionOf = (persona: DemoPersona): Session =>
  ({ actorId: persona.actorId, organizationId: persona.organization.id, role: persona.role });

export type ExtractionSite = { id: string; organizationId: string; label: string };

export const extractionSites: ExtractionSite[] = [
  { id: "c4d2a8e6-1b3f-4a59-8e7c-0d2f4b6a8c13", organizationId: organizations.salinas.id, label: "Salinas Grandes · área de estudio (demo)" },
  { id: "a7e9c1b3-5d2f-4e84-9a6b-3c5e7a9d1f24", organizationId: organizations.puna.id, label: "Puna jujeña · área de estudio (demo)" },
];

export const findSite = (id: string) => extractionSites.find(site => site.id === id);
