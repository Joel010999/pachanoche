# Contrato REST v1

Prefijo `/api/v1`. Salvo evidencias binarias, intercambiar JSON UTF-8. Mutaciones incluyen `Idempotency-Key` (1–128 caracteres); el mismo actor, ruta, clave y cuerpo recuperan la respuesta, mientras un cuerpo diferente devuelve 409. Respuestas exitosas en `{data}`, errores en `{error:{code,message,requestId}}`. Fechas UTC, UUID internos y masa en gramos positivos. [Tipos compartidos](../../src/contracts/v1.ts)

| Método y ruta | Entrada | Resultado |
| --- | --- | --- |
| GET /lots | sesión productora o compradora autorizada | 200, lotes permitidos |
| POST /lots | productCode, extractedAt, location | 201, lote y evento de extracción |
| GET /lots/{id} | UUID y sesión autorizada | 200, lote |
| POST /lots/{id}/measurements | grams, measuredAt, instrument; evidenceId opcional | 201, lote actualizado y evento de pesaje |
| POST /lots/{id}/evidence | multipart file con MIME permitido y visibilidad | 201, EvidenceSummary |
| POST /lots/{id}/splits | grams | 201, parent y child |
| GET /lots/{id}/events | UUID y sesión autorizada | 200, eventos en secuencia |
| POST /lots/{id}/publish | consentimiento explícito y campos aprobados | 201, PublicLot |
| GET /public/lots/{code} | código opaco | 200, PublicLot |
| GET /extraction-sites/{id}/observations | UUID | 200, SatelliteObservation[] |
| POST /lots/{id}/anchors | evidenceId | 202, AnchorSummary |
| GET /lots/{id}/anchors/{anchorId} | ID de anclaje | 200, AnchorSummary |
| POST /lots/{id}/transfers | buyerId, grams | 201, reserva P1 |
| POST /transfers/{id}/receive | ID de reserva | 200, recepción P1 |
| POST /lots/{id}/laboratory-reports | evidenceId, sampleId, method, testedAt, scope, analytes | 201, informe P1 |
| POST /lots/{id}/verifications | reportId, status, scope y signatureRef | 201, verificación P1 |

`location` contiene latitude, longitude, recordedAt, accuracyM opcional y siteId opcional. Identidad del responsable desde la sesión. El QR codifica `PUBLIC_BASE_URL/lotes/{code}`. La ficha permite obtener un digest público cuando se autorizó su publicación y compararlo con bytes locales.

Errores: 400 VALIDATION_ERROR, 401 UNAUTHENTICATED, 403 FORBIDDEN, 404 NOT_FOUND, 409 INSUFFICIENT_MASS, IDEMPOTENCY_CONFLICT o CONFLICT, 413 PAYLOAD_TOO_LARGE, 415 UNSUPPORTED_MEDIA_TYPE, 429 RATE_LIMITED, 500 INTERNAL_ERROR, 503 PROVIDER_UNAVAILABLE. La proyección pública excluye usuarios, coordenadas precisas y archivos. Para un lote ajeno responder 404. La demo base expone listado, alta, consulta, pesaje, fraccionamiento e historial sin sesión con datos sintéticos.
