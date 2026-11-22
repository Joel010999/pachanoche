# Coordinación técnica

| Frente | Rama propuesta | Área de trabajo | Plan e issues |
| --- | --- | --- | --- |
| Frontend | `feature/frontend` | UI en `src/app` y componentes | [Frontend](teams/FRONTEND.md) |
| Backend | `feature/backend` | `src/app/api`, dominio y migraciones | [Backend](teams/BACKEND.md) |
| Blockchain | `feature/blockchain` | `src/integrations/blockchain` y contratos | [Blockchain](teams/BLOCKCHAIN.md) |
| Geoespacial | `feature/geospatial` | `src/integrations/geospatial` y dataset | [Geoespacial](teams/GEOSPATIAL.md) |

Asignar responsables al recibir los usuarios de GitHub. Iniciar ramas desde la migración o desde main una vez integrado el PR. Abrir PR pequeños. Coordinar cambios a `src/contracts/v1.ts` en un PR previo con revisión de consumidores.

La [API](technical/API_SPEC.md), el [modelo](technical/DATA_MODEL.md) y los [permisos](technical/SECURITY.md) gobiernan el trabajo compartido. Los equipos usan fixtures antes de la integración. B1 habilita B2 y B3, C1 habilita C2, G1 y G2 habilitan G3. F3 se valida con las tres integraciones en el ensayo final.

El [milestone Hackathon — Sal de Origen MVP](https://github.com/Joel010999/pachanoche/milestone/1) reúne 12 issues P0. Mantener issues abiertos hasta verificar sus criterios. Las etiquetas de equipo permiten agrupar el trabajo. Para un futuro GitHub Project usar los estados Pendiente, En curso, En revisión y Hecho.
