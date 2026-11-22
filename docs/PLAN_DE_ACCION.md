# Plan de acción y trabajo en paralelo

Objetivo: una **demo local funcional** que recorra el [guion](DEMO_SCRIPT.md) completo en una notebook, con el QR escaneado desde un celular en la misma red. Producción queda fuera de alcance: sin hosting, sin PostgreSQL ni almacenamiento en la nube. La arquitectura objetivo de [ARCHITECTURE](ARCHITECTURE.md) y [DATA_MODEL](technical/DATA_MODEL.md) sigue de referencia para después del piloto.

Este plan agrega una **Fase 0 de plataforma** (lo que hoy bloquea el paralelismo) y adapta los issues existentes (F1–F3, B1–B3, C1–C3, G1–G3) al alcance local.

## 1. Estado actual

- Base verde: `npm test` (3 tests), `lint` y `typecheck` pasan.
- Funciona: alta, pesaje, fraccionamiento e historial en memoria vía API (`src/domain/demo-lots.ts`), contratos zod en `src/contracts/v1.ts`, portada estática.
- Falta: UI de flujo, sesión demo, evidencias, anclaje, datos satelitales, QR.

## 2. Simplificaciones por ser demo local

| Arquitectura objetivo | Demo local |
| --- | --- |
| PostgreSQL con transacciones | Almacén en memoria con volcado opcional a `.data/demo.json` para sobrevivir reinicios |
| PostGIS para geofencing | Función TypeScript de punto en polígono + radio de precisión |
| Almacenamiento de objetos privado | Carpeta local `.data/evidence/` (fuera de `public/`) |
| Worker de outbox aparte | Cola en el mismo proceso de Next |
| Concurrencia entre instancias | Un solo proceso Node: el fraccionamiento ya es atómico |
| Hosting con URL pública | `next dev -H 0.0.0.0` y `PUBLIC_BASE_URL=http://<IP-de-la-notebook>:3000` |
| Consulta STAC en vivo | Escena elegida una vez y guardada en el repo (`public/geo/` + metadatos) |
| Fuji | **Se mantiene** (red de prueba gratuita, es parte del P0). Plan B: recibo guardado o red local con `anvil` |

## 3. Mejoras detectadas

| # | Problema | Impacto | Acción |
| --- | --- | --- | --- |
| M1 | Toda la API vive en un único `src/app/api/v1/[...segments]/route.ts` | Los 4 frentes editan el mismo archivo → conflictos | **P2** |
| M2 | API y página usan `DemoLots` directo | Cada integración toca código ajeno | **P3**: interfaces (puertos) + contenedor |
| M3 | Sin sesión ni roles | Bloquea F1 (selector de sesión) y la ficha pública vs. vista productora | **P6** |
| M4 | Contratos incompletos: sin schemas para publicar, evidencia, anclaje, sesión ni geofencing | Cada equipo inventa su forma | **P1** |
| M5 | Idempotencia sin actor y mapa sin límite | Menor en demo local; corregir al sumar sesión | P6 |
| M6 | Sin CI | Merges paralelos sin red de seguridad | **P5** |
| M7 | Datos se pierden al reiniciar el servidor | Un reinicio en el ensayo borra la demo | **P4**: volcado a JSON + script `demo:reset` |
| M8 | El QR apunta a `localhost` | El celular no puede abrirlo | **P7**: acceso por red local |
| M9 | Toolchain Solidity no definido; docs citan `src/integrations/*` que no existe | C1 toca `package.json`/lock | Foundry en `chain/`; ABI exportado a `src/integrations/blockchain/` |
| M10 | Imagen satelital por hotlink externo | Sin internet o si cae el sitio, falla la demo | G3 guarda el render en `public/geo/` con atribución |
| M11 | La capa HTTP no tiene tests | Regresiones al dividir el router | P2 incluye tests de rutas |
| M12 | "Ver historial" abre JSON crudo | Demo poco legible | F1/F2 |
| M13 | `package-lock.json` es punto de conflicto | Rebases dolorosos | Cada frente agrega sus dependencias en su **primer** PR |

## 4. Fases

### Fase 0 · Plataforma (bloqueante, ~medio día)

| ID | Tarea | Archivos | Depende de | Aceptación | Sugerido |
| --- | --- | --- | --- | --- | --- |
| **P1** | Contratos v1.1: `sessionSchema` (actorId, organizationId, role), `publishSchema`, `anchorRequestSchema`, reglas de evidencia (MIME, tamaño, visibilidad), `GeofenceResult` (`inside`/`outside`/`uncertain` + versión del polígono), `geofence` en `PublicLot` | `src/contracts/v1.ts` | — | Revisado por los 4 frentes; tests de schemas | Backend |
| **P2** | Dividir API: un archivo por ruta y helpers en `src/server/http.ts` (errores, parse, JSON, idempotencia) | `src/app/api/v1/**`, `src/server/http.ts`, `tests/api.test.ts` | — | Mismas respuestas que hoy; tests de 201, 400, 404, 409, 413, 415 | Backend |
| **P3** | Puertos y contenedor: `LotStore`, `EvidenceStore`, `GeofenceService`, `BlockchainAdapter`, `SatelliteSource` en `src/server/ports.ts`; `src/server/container.ts` arma las implementaciones; versión demo (fixture) de cada puerto | `src/server/`, `src/integrations/*/demo.ts` | P1 | Todo funciona con fixtures sin configurar nada | Backend |
| **P4** | Persistencia local: volcado del almacén a `.data/demo.json`, `npm run demo:reset` y `npm run demo:seed` | `src/integrations/local-store/`, `scripts/` | P3 | Reiniciar el servidor conserva lotes; reset vuelve al estado inicial | Geoespacial |
| **P5** | CI: `npm ci`, lint, typecheck, test, build en cada PR | `.github/workflows/ci.yml` | — | Check en PRs a `main` | Blockchain |
| **P6** | Sesión demo: selector de rol/organización guardado en cookie, `getSession()` en servidor, idempotencia con actor | `src/server/session.ts` | P1, P2 | Lote de otra organización → 404; anónimo sólo ve la ficha pública | Backend |
| **P7** | Acceso por red local: script `npm run demo` (`next dev -H 0.0.0.0`), detección o configuración de la IP en `PUBLIC_BASE_URL`, instrucciones en README | `package.json`, README | — | La portada abre desde un celular en la misma wifi | Frontend |

Orden: P1, P2, P5 y P7 en paralelo → P3 → P4 y P6.

### Arranque inmediato (sin esperar Fase 0)

- **G1** Cuenta Copernicus, búsqueda STAC y selección de escena.
- **C1** Contrato Solidity + tests con Foundry en `chain/`; pedir AVAX de prueba en el faucet de Fuji.
- **F1 (diseño)** Pantallas contra los tipos de `v1.ts`.
- **G2 (algoritmo)** Clasificación dentro/fuera/incierto como función pura con tests.

### Fase 1 · Frentes en paralelo

Cada frente es dueño de sus carpetas. Tocar carpetas ajenas sólo con PR revisado por su dueño.

| Frente | Carpetas propias | Tareas |
| --- | --- | --- |
| Backend | `src/server/`, `src/domain/`, `src/integrations/local-store/`, `src/app/api/v1/lots/**` (salvo anchors) | P1 → P2 → P3 → P6 → **B1** → **B2** ∥ **B3** |
| Frontend | `src/app/(app)/**`, `src/app/lotes/**`, `src/components/**` | P7 → **F1** → **F2** ∥ **F3** |
| Blockchain | `chain/`, `src/integrations/blockchain/`, `src/app/api/v1/lots/[id]/anchors/**` | P5 → **C1** → **C2** → **C3** |
| Geoespacial | `src/integrations/geospatial/`, `data/geo/`, `public/geo/`, `src/app/api/v1/extraction-sites/**` | P4 → **G1** ∥ **G2** → **G3** |

Alcance local de cada issue:

| Issue | Qué cambia respecto del issue original |
| --- | --- |
| B1 | En vez de migraciones PostgreSQL: modelo de dominio completo (organizaciones, roles demo, ubicación, auditoría) sobre el almacén local |
| B2 | Archivos en `.data/evidence/`, SHA-256 del original, proyección pública con código opaco |
| B3 | Sin tests de concurrencia entre instancias; mantener idempotencia, conservación de masa y filiación |
| C2 | Cola de anclaje en el mismo proceso; recibo real en Fuji |
| G2 | Punto en polígono en TypeScript, sin PostGIS |
| G3 | Imagen y metadatos servidos desde el repo |
| F3 | QR con la IP local; verificación SHA-256 en el navegador |

### Fase 2 · Integración

| ID | Integración | Requiere | Verifica |
| --- | --- | --- | --- |
| I1 | UI productora completa | F1, F2, B1–B3 | 100 kg → fraccionar 30 kg → padre con 70 kg, sobrevive a un reinicio |
| I2 | Evidencia → anclaje | B2, C2 | Se guarda txHash y se confirma el recibo en Fuji |
| I3 | Ficha pública | F3, B2, C3, G3 | QR desde el celular; original coincide y archivo alterado falla |
| I4 | Geofencing en alta | B1, G2 | El lote muestra resultado y versión del polígono |

### Fase 3 · Ensayo

1. `npm run demo:reset`, levantar con `npm run demo` y recorrer el guion con el celular.
2. Guardar evidencias: ID de escena, txHash y costo Fuji, capturas.
3. Plan B sin internet: escena ya en el repo y recibo Fuji guardado para mostrar.

## 5. Camino crítico

```
P1 ─► P2 ─► P3 ─► P6 ─► B1 ─► B2 ─► C3 ─► F3 ─► I3 ─► Ensayo
                                     ▲     ▲
C1 ─► C2 ────────────────────────────┘     │
G1 ─┬─► G3 ────────────────────────────────┘
G2 ─┘
```

Riesgos principales: **B2** (evidencia + proyección pública) y **C2** (depende de RPC, faucet y firmante). Empezar ambos temprano.

## 6. Asignación sugerida

### Equipo

Tres personas desarrollan y una arma el contenido comercial. Los 4 frentes técnicos se agrupan en 3 roles. La asignación de nombres a roles es una propuesta: intercambiar según preferencia.

| Persona | Rol | Tareas | Integraciones que lidera |
| --- | --- | --- | --- |
| **Joel** | Backend + plataforma | P1, P2, P3, P4, P6, B1, B2, B3 | I1 |
| **Raúl** | Frontend + demo | P7, F1, F2, F3, mapa de G3 | I3, ensayo |
| **Dani** | Integraciones (blockchain + geo) | P5, C1, C2, C3, G1, G2, datos de G3 | I2, I4 |
| **Flor** | Contenido comercial | Ver abajo | — |

Notas de carga:

- Joel tiene el camino crítico (P1 → B2). Si se atrasa, B3 pasa a Raúl (la UI de fraccionamiento ya es suya) y P4 a Dani.
- Raúl arranca con P7 y el diseño de F1 contra los tipos de `v1.ts` mientras Joel termina P1–P3.
- Dani arranca ya con G1 y C1 (cuenta Copernicus y faucet de Fuji son lo más lento). G3 se reparte: Dani entrega imagen y metadatos en `public/geo/` y `data/geo/`; Raúl hace el mapa en la UI.
- Revisión cruzada: cada PR lo revisa otra persona dev. Los cambios de contratos (P1) los revisan los tres.

### Contenido comercial (Flor)

Trabaja en paralelo sin depender del código hasta la última etapa. Fuentes: [pitch](HACKATHON_PITCH.md), [modelo de negocio](BUSINESS_MODEL.md), [canvas](BUSINESS_MODEL_CANVAS.md), [go-to-market](GO_TO_MARKET.md), [problema](research/PROBLEM_VALIDATION.md) y [competencia](research/COMPETITOR_ANALYSIS.md).

| ID | Entregable | Depende de | Cuándo |
| --- | --- | --- | --- |
| K1 | Mensaje central, público objetivo y guion del pitch (problema → solución → demo → modelo → pedido) | Docs actuales | Ya |
| K2 | Presentación (estructura y textos; capturas como placeholders) | K1 | Ya |
| K3 | Guion y storyboard del video demo, alineado con [DEMO_SCRIPT](DEMO_SCRIPT.md) | K1 | Ya |
| K4 | Identidad visual básica (colores, tipografía, logo) compartida con Raúl para la UI | — | Primeras horas |
| K5 | Capturas reales para la presentación | F1/F2 listos | Mitad del proyecto |
| K6 | Grabación y edición del video demo | Ensayo de Fase 3 | Final |
| K7 | Ensayo del pitch con el equipo y ajuste de tiempos | K2, K6 | Final |

Puntos de contacto con el equipo dev:

- **Raúl** le pasa capturas y graba la pantalla del recorrido; Flor le pasa la identidad visual (K4).
- **Dani** le confirma los datos que se muestran: ID de escena y fecha, txHash y costo Fuji.
- **Joel** valida que el pitch no prometa más de lo que la demo hace (ver límites en [README](../README.md) y [regulación](research/REGULATORY_CONSIDERATIONS.md)).

### Agentes en paralelo

Un agente por tarea, cada uno en su worktree y rama (`feature/<id>-<slug>`). Instrucción base:

> Trabajás en la tarea `<ID>` de `docs/PLAN_DE_ACCION.md`. Es una demo local: no agregues bases de datos, hosting ni servicios en la nube. Sólo podés editar estas carpetas: `<carpetas>`. Usá los tipos de `src/contracts/v1.ts` sin cambiarlos; si necesitás cambiarlos, frená y reportá la propuesta. Desarrollá contra las implementaciones demo de `src/server/container.ts`. Terminá con `npm run lint`, `npm run typecheck`, `npm test` y `npm run build` en verde y un PR chico con el criterio de aceptación verificado.

Olas:

1. **Ola 1**: P1, P2, P5, P7, C1, G1, G2-algoritmo, F1-diseño.
2. **Ola 2**: P3, P4, P6, B1, C2, F1-integración.
3. **Ola 3**: B2, B3, G3, F2, C3, F3.
4. **Ola 4**: I1–I4 y ensayo, mejor con personas (celular, faucet, revisión visual).

## 7. Decisiones abiertas

| Decisión | Recomendación |
| --- | --- |
| Persistencia | Memoria + volcado JSON. Si hace falta más, SQLite local (sin servidor) |
| Toolchain Solidity | Foundry en `chain/`, no toca el `package-lock` de la app |
| Firmante Fuji | Llave de prueba en `.env.local`, con fondos mínimos y nunca commiteada |
| Anclaje sin internet | Mostrar recibo guardado; opcional `anvil` como red local |

## 8. Reglas de trabajo en paralelo

1. **Contratos primero**: cambios a `src/contracts/v1.ts` en PR propio, revisado por quienes lo consumen. Sólo agregar campos.
2. **Carpetas con dueño** (§4). Ruta de API nueva = archivo nuevo.
3. **Fixtures antes que integración**: cada puerto tiene versión demo; nadie espera a otro.
4. **Dependencias en el primer PR** de cada frente.
5. **PR chicos**, rebase diario sobre `main`, CI en verde para mergear.
6. **Definición de hecho**: criterio del issue verificado + lint, typecheck, test y build en verde + evidencia en el PR (captura, txHash o ID de escena).
