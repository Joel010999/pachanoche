# Equipo backend

Rama `feature/backend`. Responsable: Joel.

Núcleo de inventario y roles. Mantiene la fuente de verdad para masa, auditoría y movimientos. Transferencias y recepción quedan en P1.

## [B1 · Persistir lotes, extracción y mediciones](https://github.com/Joel010999/pachanoche/issues/5)

Crear migraciones PostgreSQL, roles demo, alta, pesaje y geolocalización con auditoría.

- Aceptación. Esquema arranca desde cero, valida datos, aísla organizaciones y devuelve eventos en orden.
- Dependencias. Contratos v1.
- Entregable. Migraciones, API y fixture.

## [B2 · Adjuntar evidencia privada y publicar proyección](https://github.com/Joel010999/pachanoche/issues/6)

Guardar bytes privados, SHA-256, metadatos y evento. Generar proyección pública mediante consentimiento y código opaco.

- Aceptación. Hash reproducible, duplicado idempotente y respuesta pública sin archivos, PII ni coordenadas exactas.
- Dependencias. B1 para integración.
- Entregable. Servicio de evidencia y endpoint público.

## [B3 · Fraccionar con saldo transaccional](https://github.com/Joel010999/pachanoche/issues/7)

Bloquear lote origen, crear hijo, descontar saldo y auditar con idempotencia en una transacción.

- Aceptación. Dos solicitudes concurrentes no dejan saldo negativo. Reintentos devuelven el mismo resultado. Se conserva masa y filiación.
- Dependencias. B1 para integración.
- Entregable. Servicio, restricciones y tests de concurrencia.
