# Arquitectura

Next.js App Router aloja la interfaz y los Route Handlers bajo `/api/v1`. React consume los contratos compartidos. Las decisiones de disponibilidad, custodia y autorización residen en el servicio backend.

| Componente | Implementación objetivo | Interfaz |
| --- | --- | --- |
| Datos productivos | PostgreSQL con transacciones y restricciones | Servicio de lotes e inventario |
| Documentos | Almacenamiento de objetos privado | ID opaco, SHA-256 del original y acceso temporal |
| Territorial | Worker STAC y PostGIS para intersecciones | Observaciones por sitio de extracción |
| Anclaje | Worker de outbox y adaptador Fuji | Solicitud idempotente y recibo verificado |
| Consulta pública | Proyección autorizada | QR con URI estable del código opaco |

Las mutaciones guardan el evento de lote, la auditoría y la outbox en la misma transacción. Los workers operan fuera de ella y actualizan sus proyecciones. El coprocesamiento territorial o blockchain puede quedar pendiente mientras la historia productiva sigue disponible. El frontend usa fixtures o la API demo hasta que exista PostgreSQL.

Las fechas viajan en UTC ISO 8601. Masa canónica en gramos enteros, coordenadas WGS84, UUID para identificadores internos y códigos opacos para enlaces públicos. La v1 mantiene campos existentes al incorporar extensiones.
