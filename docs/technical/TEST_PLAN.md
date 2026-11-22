# Plan de pruebas

| Capa | Criterios |
| --- | --- |
| Bootstrap | Lint, typecheck, build y tests de creación, medición, saldo, idempotencia y validación |
| Base de datos | Migración vacía, fraccionamientos concurrentes, rollback y replay; conciliación padre e hijos |
| API y permisos | Aislamiento entre organizaciones, foco en IDs ajenos, tamaño y MIME, errores v1 |
| Archivos | Hash del original, alteraciones, recuperación autorizada y proyección sin datos privados |
| Blockchain | Roles, duplicados, recibo revertido, timeout, reconciliación y recibo confirmado en Fuji |
| Espacial | Cobertura, borde e incertidumbre, no disponibilidad de escena y atribución reproducible |
| Demo | Flujo completo, QR desde otro dispositivo, revisión móvil y comparación del archivo |

Ejecutar `npm run lint`, `npm run typecheck`, `npm test` y `npm run build`. Para cerrar los P0 aportar resultados y, donde corresponda, ID de escena, recibo de Fuji y evidencia del ensayo.
