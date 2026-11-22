# Especificación Técnica: C3 · Exponer Verificación de Integridad y Recibo Blockchain

## Problem Statement
En la plataforma "Sal de Origen", los compradores B2B, auditores de calidad y consumidores finales necesitan comprobar la autenticidad e integridad de los documentos emitidos (pesajes de báscula y análisis químicos de laboratorio). Actualmente:
1. Existen los contratos inteligentes (C1) y el adaptador de Avalanche Fuji (C2), pero no existe un endpoint HTTP en la API (`/api/v1/lots/[id]/anchors`) para que los productores soliciten formalmente el anclaje de una evidencia a la blockchain.
2. No existe un servicio de verificación documental que tome un archivo subido por un tercero, calcule su huella digital SHA-256 y la compare contra el registro inmutable de Avalanche Fuji.
3. La proyección del lote (`PublicLot`) no expone de forma explícita los estados intermedios del anclaje (`submitted` vs. `confirmed`), ni vincula el identificador de la transacción (`txHash`) al explorador de bloques Snowtrace.

## Solution
1. Implementar la ruta de API `POST /api/v1/lots/[id]/anchors` en `src/app/api/v1/lots/[id]/anchors/route.ts`, restringida a la organización titular del lote con rol `producer` o `admin`.
2. Crear el servicio de verificación de integridad `src/integrations/blockchain/verification.ts` con la función `verifyDocumentIntegrity(fileBytes, expectedSha256, anchor)`:
   - Comprueba el hash en microsegundos y valida contra el contrato de Avalanche Fuji.
   - Si el archivo es idéntico al original: retorna `{ matches: true, status: "confirmed", digest, txHash }`.
   - Si el archivo fue alterado (incluso por un único byte): retorna `{ matches: false, expectedDigest, actualDigest, reason: "El contenido no coincide con el anclaje certificado" }`.
3. Actualizar la asociación de evidencias en el almacén de lotes para vincular el `AnchorSummary` resultante, garantizando que tanto la vista privada como la proyección pública (`PublicLot.evidence[].anchor`) expongan red (`chainId: 43113`), dirección del contrato, estado y transacción.
4. Exponer la verificación mediante el endpoint `POST /api/v1/lots/[id]/evidence/[evidenceId]/verify` permitiendo auditorías independientes tanto con archivos originales como alterados.

## User Stories
1. Como productor que subió el PDF de análisis químico de su sal, quiero llamar a `POST /api/v1/lots/[id]/anchors` con `{ evidenceId }`, para que el sistema envíe la huella digital a Avalanche Fuji y devuelva el recibo de confirmación.
2. Como comprador gastronómico gourmet, quiero escanear el código QR de un paquete de sal y ver en la ficha pública la evidencia con estado `confirmed`, el hash SHA-256 y el botón de enlace directo a la transacción en Snowtrace.
3. Como auditor de inocuidad alimentaria, quiero subir un certificado PDF al endpoint de verificación y que el sistema me confirme que el archivo es 100% auténtico y no sufrió manipulaciones.
4. Como auditor de seguridad, si alguien intenta presentar un PDF con el porcentaje de pureza de NaCl adulterado, quiero que el sistema rechace el documento indicando `matches: false` y mostrando la discrepancia exacta de hashes.
5. Como desarrollador del frontend (Raúl), quiero que la API me devuelva estados tipados (`submitted`, `confirmed`, `failed`) para mostrar spinners de carga o medallas de verificación en la interfaz.

## Implementation Decisions
- **Ubicación de Rutas y Código:**
  - Endpoint de anclaje: `src/app/api/v1/lots/[id]/anchors/route.ts`
  - Endpoint de verificación: `src/app/api/v1/lots/[id]/evidence/[evidenceId]/verify/route.ts`
  - Servicio de verificación: `src/integrations/blockchain/verification.ts`
- **Flujo de `POST /api/v1/lots/[id]/anchors`:**
  1. Validar sesión: `requireSession(request, "producer")`.
  2. Parsear body con `anchorRequestSchema` (`{ evidenceId }`).
  3. Obtener el lote con `container().lots.get(id, organizationId)`.
  4. Obtener las evidencias del lote con `container().lots.evidence(id, organizationId)` y verificar que `evidenceId` exista.
  5. Determinar `eventKind`: si `mediaType === "application/pdf"` ➔ `2` (Laboratorio), si `image/*` ➔ `1` (Campo).
  6. Llamar a `container().blockchain.submit({ anchorId: randomUUID(), lotId: id, evidenceId, sha256: evidence.sha256, eventKind })`.
  7. Asociar el anclaje a la evidencia en el almacén de lotes.
  8. Responder HTTP 201 con el `AnchorSummary`.
- **Servicio de Verificación (`verifyDocumentIntegrity`):**
  - Calcula `createHash("sha256").update(bytes).digest("hex")`.
  - Si coincide con `evidence.sha256`: consulta `blockchain.verifyDigest(sha256)` para confirmar presencia en la red.
  - Retorna el objeto de auditoría tipado.

## Testing Decisions
- **Prueba de Documento Original Coincidente:** Subir el buffer exacto de un archivo previamente anclado ➔ Debe responder `matches: true` con `status: "confirmed"` y el `txHash`.
- **Prueba de Documento Alterado:** Modificar un byte del archivo ➔ Debe responder `matches: false` con la discrepancia de hashes.
- **Prueba de Permisos:** Intentar anclar una evidencia sin sesión (401) o perteneciendo a otra organización (404/403) ➔ Debe ser rechazado.
- **Prueba de Proyección:** Consultar el lote tras el anclaje y comprobar que `PublicLot.evidence` contiene el objeto `anchor` con `chainId: 43113` y estado `confirmed`.

## Out of Scope
- Firma digital de claves privadas del lado del cliente en billeteras tipo Metamask (la custodia y firma se realiza desde la wallet del servidor).
- Soporte para redes distintas a Avalanche Fuji en esta versión.
