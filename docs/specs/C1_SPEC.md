# Especificación Técnica: C1 · Smart Contract de Anclaje Documental en Avalanche Fuji

## Problem Statement
En la cadena de comercialización de la sal de Jujuy, los productores y cooperativas necesitan garantizar a compradores premium e industrias que los datos de pesaje, fotos de extracción y análisis químicos (% NaCl y humedad) no fueron alterados ni manipulados con posterioridad a su emisión.
Actualmente:
1. No existe un mecanismo de certificación criptográfica inmutable en el repositorio.
2. La arquitectura requiere registrar huellas digitales (hashes SHA-256) en la red de pruebas Avalanche Fuji (C-Chain ID 43113) sin exponer datos privados ni personales (PII) on-chain.
3. El entorno de desarrollo local en Windows no cuenta con el binario de Foundry (`forge`), por lo que se requiere una solución de compilación y pruebas nativa, ligera y reproducible que no bloquee al equipo.

## Solution
1. Diseñar e implementar el contrato inteligente Solidity `AnchorRegistry.sol` con control de acceso (`onlyWriter`), almacenamiento de huellas digitales SHA-256 (`digest`), identificador de lote (`lotRef`) y clasificación de evento (`eventKind`).
2. Configurar el toolchain de compilación en `chain/` utilizando el compilador oficial de Solidity (`solc`) y pruebas unitarias automáticas en Node.js, exportando el ABI compilado a `src/integrations/blockchain/AnchorRegistry.json`.
3. Proveer funciones de consulta de lectura pública tanto por identificador (`getAnchor`) como por huella digital (`verifyDigest`), permitiendo la validación pública desde el frontend y el escaneo de códigos QR.

## User Stories
1. Como operario del sistema o backend de Sal de Origen, quiero registrar un anclaje documental invocando `anchor(...)` con la firma de la wallet autorizada, para certificar la existencia e integridad de una evidencia en un bloque inmutable de Avalanche Fuji.
2. Como comprador o auditor B2B, quiero consultar la función `verifyDigest(digest)` pasando el SHA-256 de un certificado de laboratorio en PDF, para comprobar si el documento es auténtico y a qué lote pertenece sin intermediarios.
3. Como desarrollador del backend (Joel), quiero que si la cola de envíos reintenta una transacción con los mismos parámetros exactos, el contrato responda de manera idempotente sin fallar, para evitar bloqueos por latencia de red.
4. Como auditor de seguridad, quiero que el contrato rechace transacciones de cuentas no autorizadas o que intenten registrar un `anchorId` preexistente con un hash diferente, para evitar fraudes y colisiones maliciosas.
5. Como desarrollador del equipo (Dani/Raúl), quiero ejecutar `npm run test:chain` o los tests de Node y verificar la compilación y cobertura de Solidity en menos de 2 segundos, sin instalar herramientas externas pesadas.

## Implementation Decisions
- **Ubicación del Módulo:** El contrato inteligente vivirá en `chain/contracts/AnchorRegistry.sol`.
- **Estructura del Contrato (`AnchorRegistry`):**
  - `address public writer;`: Dirección de la wallet autorizada para emitir anclajes.
  - `struct AnchorRecord`:
    - `bytes32 lotRef`: Identificador del lote (UUID rellenado a la izquierda).
    - `bytes32 digest`: Hash criptográfico SHA-256 de la evidencia.
    - `uint8 eventKind`: Clasificación del evento (`1` = evidencia de campo/pesaje, `2` = laboratorio/calidad).
    - `uint64 timestamp`: Marca de tiempo del bloque de Avalanche.
    - `uint64 blockNumber`: Número de bloque de la red.
  - `mapping(bytes32 => AnchorRecord) public anchors;`
  - `mapping(bytes32 => bytes32) public digestToAnchorId;`
  - Evento: `event Anchored(bytes32 indexed anchorId, bytes32 indexed lotRef, bytes32 digest, uint8 eventKind);`
- **Reglas de Negocio en Solidity:**
  - Solo el escritor autorizado (`onlyWriter`) puede llamar a `anchor()`.
  - Validación de campos no nulos: `anchorId != 0`, `lotRef != 0`, `digest != 0`.
  - Validación estricta de `eventKind`: debe ser exactamente `1` o `2`.
  - Idempotencia: si el `anchorId` ya existe y sus datos coinciden exactamente, la función retorna exitosa sin revertir. Si los datos difieren, revierte con el error tipado `AnchorConflict(anchorId)`.
- **Funciones de Lectura Pública:**
  - `getAnchor(bytes32 anchorId) external view returns (bytes32 lotRef, bytes32 digest, uint8 eventKind, uint64 timestamp, uint64 blockNumber)`
  - `verifyDigest(bytes32 digest) external view returns (bool exists, bytes32 anchorId, bytes32 lotRef, uint8 eventKind, uint64 timestamp)`
- **Exportación de Artefactos:** El script de compilación generará el ABI y Bytecode en `src/integrations/blockchain/AnchorRegistry.json`.

## Testing Decisions
- **Pruebas de Escritura y Emisión de Eventos:** Validar que un anclaje válido almacena el registro y emite el evento `Anchored` con los datos esperados.
- **Pruebas de Idempotencia y Reintentos:** Comprobar que dos llamadas idénticas consecutivas se resuelven con éxito.
- **Pruebas de Colisión:** Verificar que llamar con el mismo `anchorId` y un `digest` distinto revierte con `AnchorConflict`.
- **Pruebas de Control de Acceso:** Confirmar que una llamada desde una cuenta distinta a `writer` revierte con `Unauthorized()`.
- **Pruebas de Parámetros Inválidos:** Probar que valores cero o `eventKind` inválidos (ej. `0` o `3`) revierten con error.

## Out of Scope
- Emisión de tokens ERC-20 o NFTs para representar la sal (la solución es puramente notarial/documental, sin activos financieros).
- Almacenamiento de archivos PDF o imágenes en la blockchain (los archivos residen off-chain en `.data/evidence/`).
- Integración en tiempo real con el RPC de testnet en este issue (eso corresponde a C2).

## Further Notes
- La red de destino para C2 será Avalanche Fuji C-Chain (Chain ID 43113, explorador Snowtrace).
