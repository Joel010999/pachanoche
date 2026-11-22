// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title AnchorRegistry
 * @notice Registro notarial inmutable en Avalanche Fuji para Sal de Origen.
 * Asocia identificadores de trabajo (anchorId), referencias de lotes (lotRef)
 * y huellas digitales criptográficas (digest SHA-256) de evidencias físicas y de laboratorio.
 */
contract AnchorRegistry {
    // --- Errores tipados ---
    error ZeroAddress();
    error ZeroBytes32(string param);
    error InvalidEventKind(uint8 kind);
    error Unauthorized(address caller);
    error AnchorConflict(bytes32 anchorId);

    // --- Estructuras ---
    struct AnchorRecord {
        bytes32 lotRef;
        bytes32 digest;
        uint8 eventKind;
        uint64 timestamp;
        uint64 blockNumber;
    }

    // --- Estado ---
    address public writer;
    mapping(bytes32 => AnchorRecord) public anchors;
    mapping(bytes32 => bytes32) public digestToAnchorId;

    // --- Eventos ---
    event Anchored(
        bytes32 indexed anchorId,
        bytes32 indexed lotRef,
        bytes32 digest,
        uint8 eventKind
    );
    event WriterTransferred(address indexed oldWriter, address indexed newWriter);

    // --- Modificadores ---
    modifier onlyWriter() {
        if (msg.sender != writer) {
            revert Unauthorized(msg.sender);
        }
        _;
    }

    /**
     * @notice Constructor del registro.
     * @param _writer Dirección autorizada para firmar y emitir anclajes.
     */
    constructor(address _writer) {
        if (_writer == address(0)) {
            revert ZeroAddress();
        }
        writer = _writer;
    }

    /**
     * @notice Registra un anclaje documental.
     * @param anchorId Identificador único del trabajo/evento (32 bytes).
     * @param lotRef Identificador del lote (UUID alineado a la izquierda, 32 bytes).
     * @param digest Hash SHA-256 de la evidencia física o digital (32 bytes).
     * @param eventKind Tipo de evento (1 = evidencia de campo/pesaje, 2 = análisis de laboratorio).
     */
    function anchor(
        bytes32 anchorId,
        bytes32 lotRef,
        bytes32 digest,
        uint8 eventKind
    ) external onlyWriter {
        if (anchorId == bytes32(0)) revert ZeroBytes32("anchorId");
        if (lotRef == bytes32(0)) revert ZeroBytes32("lotRef");
        if (digest == bytes32(0)) revert ZeroBytes32("digest");
        if (eventKind != 1 && eventKind != 2) revert InvalidEventKind(eventKind);

        AnchorRecord storage existing = anchors[anchorId];

        // Manejo de idempotencia y colisiones
        if (existing.digest != bytes32(0)) {
            if (
                existing.lotRef == lotRef &&
                existing.digest == digest &&
                existing.eventKind == eventKind
            ) {
                // Idempotente: mismos datos exactos, no revierte
                return;
            } else {
                // Conflicto: mismo anchorId con datos diferentes
                revert AnchorConflict(anchorId);
            }
        }

        anchors[anchorId] = AnchorRecord({
            lotRef: lotRef,
            digest: digest,
            eventKind: eventKind,
            timestamp: uint64(block.timestamp),
            blockNumber: uint64(block.number)
        });

        // Registrar mapeo inverso para verificación por digest
        if (digestToAnchorId[digest] == bytes32(0)) {
            digestToAnchorId[digest] = anchorId;
        }

        emit Anchored(anchorId, lotRef, digest, eventKind);
    }

    /**
     * @notice Consulta un anclaje por su identificador.
     */
    function getAnchor(bytes32 anchorId)
        external
        view
        returns (
            bytes32 lotRef,
            bytes32 digest,
            uint8 eventKind,
            uint64 timestamp,
            uint64 blockNumber
        )
    {
        AnchorRecord storage rec = anchors[anchorId];
        return (
            rec.lotRef,
            rec.digest,
            rec.eventKind,
            rec.timestamp,
            rec.blockNumber
        );
    }

    /**
     * @notice Verifica si un hash (digest) de documento fue anclado.
     */
    function verifyDigest(bytes32 digest)
        external
        view
        returns (
            bool exists,
            bytes32 anchorId,
            bytes32 lotRef,
            uint8 eventKind,
            uint64 timestamp
        )
    {
        bytes32 aId = digestToAnchorId[digest];
        if (aId == bytes32(0)) {
            return (false, bytes32(0), bytes32(0), 0, 0);
        }
        AnchorRecord storage rec = anchors[aId];
        return (true, aId, rec.lotRef, rec.eventKind, rec.timestamp);
    }

    /**
     * @notice Permite transferir el rol de escritor a otra cuenta.
     */
    function transferWriter(address newWriter) external onlyWriter {
        if (newWriter == address(0)) {
            revert ZeroAddress();
        }
        emit WriterTransferred(writer, newWriter);
        writer = newWriter;
    }
}
