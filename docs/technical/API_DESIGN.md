# API HTTP

| Operación | Contrato |
|---|---|
| GET /api/catalog | Devuelve sitios y experiencias demo. |
| GET /api/recommend | Query obligatoria `site`, `date` ISO entre 2020 y 2049, `time` HH:mm local Jujuy, `target` galaxia/luna/planetas, `mode` live/demo. |
| POST /api/reservations | JSON hasta 2048 bytes con `experience`, `date` y `guests` entero positivo con límite por experiencia. Devuelve 201 con referencia y total en ARS de muestra. |

La evaluación devuelve `instant` UTC, `target`, `result`, `alternatives` y `events`. `conditions.source` tiene valor `forecast`, `demo` o `unavailable`. Las condiciones ausentes se representan como null. Las rutas usan 400 para entrada inválida, 404 para ruta desconocida, 413 para cuerpo excesivo y 500 para errores internos. JSON de error incluye `error`.

La simulación es efímera. No modifica inventario ni acepta identidad o pago. El POST exitoso crea una referencia nueva cada vez.
