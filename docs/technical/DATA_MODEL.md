# Modelo de datos

PostgreSQL usa UUID internos, fechas `timestamptz`, claves foráneas y masa `bigint` en gramos. Incluir organización en las referencias dependientes para evitar cruces de tenant.

| Tabla | Campos y relaciones |
| --- | --- |
| organizations | id, name, status |
| users | id, subject, status |
| roles | id, code; tabla organization_memberships con user_id, organization_id, role_id |
| extraction_sites | id, organization_id, label, study_area_version, private_geometry |
| lots | id, organization_id, site_id, parent_id, product_code, public_code único, extracted_at, available_g, published_at |
| lot_measurements | id, lot_id, value_g, original_unit, measured_at, instrument, actor_id, evidence_id |
| evidence_files | id, lot_id, object_key, sha256, mime, size_bytes, created_at, visibility |
| laboratory_reports | id, lot_id, evidence_id, lab_org_id, sample_id, method, tested_at, scope, analytes |
| verifications | id, lot_id, report_id, verifier_id, status, scope, signature_ref, supersedes_id |
| lot_events | id, lot_id, sequence, event_type, occurred_at, recorded_at, actor_id, payload, supersedes_id |
| lot_splits | id, parent_id, child_id único, quantity_g, event_id |
| transfers | id, lot_id, source_org_id, buyer_id, quantity_g, state, event_id |
| buyers | id, organization_id, status |
| blockchain_records | id, event_id, evidence_id, anchor_id, chain_id, contract_address, tx_hash, state, gas_used |
| satellite_observations | id, site_id, collection, item_id, acquired_at, footprint, metadata, preview_ref |
| audit_logs | id, organization_id, actor_id, action, entity_id, request_id, occurred_at, outcome |
| idempotency_keys | organization_id, actor_id, route, key, request_digest, response |
| outbox | id, event_id, destination, state, available_at, attempts |

Eventos por lote con clave única `(lot_id, sequence)`. Observaciones únicas por sitio, colección e ítem. Confirmaciones son append-only y las correcciones referencian el evento anterior. Restringir saldo a valores no negativos. Bloquear el lote con `SELECT ... FOR UPDATE` y verificar saldo dentro de la transacción antes de crear un hijo o reservar una transferencia. Registrar movimientos, auditoría, respuesta idempotente y outbox en la misma transacción. Una recepción confirma una reserva existente. Una cancelación libera la reserva mediante evento compensatorio.

Conservar SHA-256 del archivo original. Usar políticas de acceso de backend y de almacenamiento. PostGIS con SRID 4326 para geometría y `geography` para distancias en metros.
