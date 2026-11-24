/**
 * Utilidades de serialización bidireccional entre identificadores de Sal de Origen y tipos Solidity bytes32.
 */

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const HEX_32_REGEX = /^0x[0-9a-f]{64}$/i;
const SHA256_HEX_REGEX = /^[0-9a-f]{64}$/i;

/**
 * Convierte un UUID estándar (36 chars con guiones) a un bytes32 hexadecimal de Solidity.
 * El UUID de 16 bytes se coloca al final (alineado a la derecha, con 16 bytes de relleno cero a la izquierda).
 * Formato: 0x + 32 ceros + 32 caracteres hex del UUID sin guiones.
 */
export function uuidToBytes32(uuid: string): `0x${string}` {
  if (!UUID_REGEX.test(uuid)) {
    throw new Error(`UUID inválido: ${uuid}`);
  }
  const cleanHex = uuid.replace(/-/g, "").toLowerCase();
  const padded = cleanHex.padStart(64, "0");
  return `0x${padded}`;
}

/**
 * Convierte un bytes32 hexadecimal de Solidity a su UUID canónico con guiones.
 */
export function bytes32ToUuid(bytes32: string): string {
  if (!HEX_32_REGEX.test(bytes32)) {
    throw new Error(`Formato bytes32 inválido: ${bytes32}`);
  }
  // Tomamos los últimos 32 caracteres (16 bytes)
  const hex = bytes32.slice(34).toLowerCase();
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`;
}

/**
 * Normaliza un hash SHA-256 hexadecimal (con o sin prefijo 0x) a un bytes32 tipado.
 */
export function sha256ToBytes32(sha256: string): `0x${string}` {
  const clean = sha256.startsWith("0x") ? sha256.slice(2) : sha256;
  if (!SHA256_HEX_REGEX.test(clean)) {
    throw new Error(`Hash SHA-256 inválido: ${sha256}`);
  }
  return `0x${clean.toLowerCase()}`;
}
