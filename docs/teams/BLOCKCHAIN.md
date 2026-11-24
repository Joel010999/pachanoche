# Equipo blockchain

Rama `feature/blockchain`. Responsable: Dani.

Verificabilidad documental en Fuji con mínimos datos públicos. El registro representa información documental. Quedan fuera propiedad, derechos de extracción e instrumentos financieros.

## [C1 · Diseñar y probar contrato de anclaje](https://github.com/Joel010999/saldeorigen/issues/8)

Implementar registro Solidity de IDs, digest SHA-256 y eventos mínimos, con rol de escritor y protección contra duplicados.

- Aceptación. Pruebas de escritura, lectura, colisión y acceso. Sin token ni PII.
- Dependencias. Especificación Fuji.
- Entregable. Contrato, pruebas y scripts.

## [C2 · Integrar adaptador Fuji y outbox](https://github.com/Joel010999/saldeorigen/issues/9)

Validar chain ID, enviar desde firmante de prueba, registrar nonce y txHash y reconciliar recibos.

- Aceptación. La misma solicitud no duplica registros. Demostrar confirmación y costo de una transacción Fuji.
- Dependencias. C1 y acceso a RPC, contrato y AVAX de prueba.
- Entregable. Adaptador, despliegue y recibo reproducible.

## [C3 · Exponer verificación de integridad y recibo](https://github.com/Joel010999/saldeorigen/issues/10)

Vincular hash confirmado a evidencia y exponer estado, red, contrato y transacción en la proyección.

- Aceptación. El documento original coincide. Una modificación falla. La proyección distingue pendiente de confirmado.
- Dependencias. B2 y C2 para integración.
- Entregable. Servicio de verificación y fixture de estados.
