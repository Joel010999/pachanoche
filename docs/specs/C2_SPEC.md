# Especificación Técnica: C2 · Adaptador Avalanche Fuji y Cola de Anclaje

## Problem Statement
El backend de "Sal de Origen" necesita comunicar los eventos de trazabilidad (pesaje de sal, fotos de extracción y análisis químicos) con el contrato inteligente `AnchorRegistry` desplegado en la red de pruebas Avalanche Fuji (C-Chain ID 43113).
Actualmente:
1. No existe un adaptador Web3 en TypeScript que implemente la interfaz `BlockchainAdapter` definida en `src/contracts/v1.ts`.
2. Las transacciones en blockchain requieren gestionar claves criptográficas, nonces secuenciales, cálculo de gas y serialización de tipos (conversión de UUIDs a `bytes32`).
3. En el contexto de una demo de hackathon, si la conexión Wi-Fi es inestable, el RPC público de Avalanche tiene latencia o un miembro del equipo corre la app sin configurar credenciales privadas en `.env.local`, el sistema no debe romperse ni bloquear el flujo de usuario.

## Solution
1. Implementar `FujiBlockchainAdapter` en `src/integrations/blockchain/adapter.ts`, cumpliendo estrictamente con la interfaz canónica `BlockchainAdapter`.
2. Utilizar `viem` como librería Web3 ligera y fuertemente tipada para conectarse a Avalanche Fuji (`https://api.avax-test.network/ext/bc/C/rpc`, Chain ID 43113).
3. Proveer utilidades puras y determinísticas de serialización bidireccional entre UUIDs canónicos y `bytes32` (`uuidToBytes32` y `bytes32ToUuid`).
4. Implementar una cola de despacho en memoria que ordene las solicitudes, prevenga colisiones de nonce con una sola cuenta firmante y espere la confirmación del bloque.
5. Incorporar un modo de resiliencia / fallback automático: si no se configuran credenciales en el entorno o la red no responde, el adaptador genera un recibo simulado determinístico con estado `confirmed` y un identificador sintético para garantizar continuidad en la demo.

## User Stories
1. Como desarrollador del backend (Joel), quiero invocar `blockchainAdapter.submit(...)` pasando el ID de lote, evidencia, hash SHA-256 y tipo de evento, para recibir un `AnchorSummary` con el `txHash` y estado `confirmed` sin lidiar con los detalles de bajo nivel de la blockchain.
2. Como evaluador o jurado de la hackathon, quiero que al confirmarse un anclaje se devuelva un enlace verificable de Avalanche Fuji (Snowtrace Testnet), para auditar en tiempo real el bloque y costo en gas de la transacción.
3. Como operador de la cooperativa en Salinas Grandes, quiero registrar dos pesajes seguidos sin que fallen por problemas de nonce en la wallet, gracias a la cola ordenada de transacciones en memoria.
4. Como desarrollador del frontend (Raúl), quiero levantar la aplicación localmente sin necesidad de configurar una wallet privada de prueba, para que la demo funcione inmediatamente con el fallback simulado sin arrojar errores no capturados.
5. Como auditor de seguridad, quiero que la clave privada `FUJI_PRIVATE_KEY` resida exclusivamente en `.env.local` y esté excluida por `.gitignore`, para evitar filtraciones de credenciales en repositorios públicos.

## Implementation Decisions
- **Ubicación del Código:**
  - Adaptador principal: `src/integrations/blockchain/adapter.ts`.
  - Serializador de tipos: `src/integrations/blockchain/codec.ts`.
  - Tipos y fixture demo: `src/integrations/blockchain/demo.ts`.
- **Contrato de Interfaz (`BlockchainAdapter` de `src/contracts/v1.ts`):**
  ```ts
  export interface BlockchainAdapter {
    submit(input: {
      anchorId: string;
      lotId: string;
      evidenceId: string;
      sha256: string;
      eventKind: 1 | 2;
    }): Promise<AnchorSummary>;
  }
  ```
- **Serialización UUID a `bytes32` (`codec.ts`):**
  - Entrada: UUID estándar de 36 caracteres (ej. `e8f1ef36-0252-41ba-8ee1-f23c2370c92f`).
  - Proceso: Eliminar guiones (32 caracteres hexadecimales = 16 bytes).
  - Relleno: 16 bytes de ceros a la izquierda para completar los 32 bytes (`0x` + 32 ceros + 32 caracteres hex).
  - Salida: `0x00000000000000000000000000000000e8f1ef36025241ba8ee1f23c2370c92f`.
- **Manejo de Transacciones con `viem`:**
  - Cliente público: `createPublicClient` configurado con la cadena `avalancheFuji` y transporte HTTP con reintentos.
  - Cliente de cuenta: `createWalletClient` inicializado con `privateKeyToAccount` a partir de `FUJI_PRIVATE_KEY`.
  - Parámetros de llamada: Invocación de `anchor(bytes32,bytes32,bytes32,uint8)`.
  - Confirmación: Esperar recibo con `waitForTransactionReceipt` y extraer `blockNumber`, `transactionHash` y `gasUsed`.
- **Variables de Entorno (`.env.example` y `.env.local`):**
  - `FUJI_RPC_URL`: Endpoint RPC (default: `https://api.avax-test.network/ext/bc/C/rpc`).
  - `FUJI_CONTRACT_ADDRESS`: Dirección del contrato `AnchorRegistry` desplegado.
  - `FUJI_PRIVATE_KEY`: Llave privada hexadecimal de 32 bytes para firmar transacciones de prueba.

## Testing Decisions
- **Pruebas de Serialización (`codec.test.ts`):** Validar conversión bidireccional idempotente entre UUIDs y `bytes32`. Verificar rechazo ante UUIDs malformados.
- **Pruebas Unitarias del Adaptador (`adapter.test.ts`):**
  - Validar que `submit()` en modo demo devuelve un `AnchorSummary` válido con `chainId: 43113`, `status: "confirmed"`, y un `txHash` determinístico.
  - Validar idempotencia: invocar dos veces con los mismos parámetros devuelve la misma referencia de anclaje.
  - Validar manejo de errores: rechazo ante hashes SHA-256 no hexadecimales o de longitud incorrecta.

## Out of Scope
- Gestión de gas tokenizado o intercambio de divisas (AVAX de prueba se obtiene gratuitamente del faucet oficial).
- Despliegue de contratos proxy actualizables (Upgradeability via Diamonds o ERC-1967) para la etapa de hackathon.

## Further Notes
- Faucet oficial de Avalanche Fuji: `https://core.app/tools/testnet-faucet/` (permite solicitar 2 AVAX de prueba cada 24 horas por dirección).
- Para pruebas de integración completas en vivo se requerirá una wallet con fondos de testnet y el contrato C1 desplegado.
