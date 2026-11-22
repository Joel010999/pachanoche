# Equipo frontend

Rama `feature/frontend`. Responsable: Raúl.

Interfaz responsive, identidad, sesión demo y flujo de trazabilidad. Consume la API v1 y proyecciones públicas. Las integraciones espaciales y blockchain viven en servicios.

## [F1 · Construir alta y tablero de lotes](https://github.com/Joel010999/pachanoche/issues/2)

Implementar selector de sesión demo y formulario de alta, medición y GPS con contrato v1.

- Aceptación. Personas productoras pueden crear un lote y registrar 100 kg. Renderizar carga, éxito, error y estados vacíos en móvil.
- Dependencias. B1. Desarrollar contra fixture v1.
- Entregable. Pantallas y componentes reutilizables.

## [F2 · Integrar evidencias, historial y sublotes](https://github.com/Joel010999/pachanoche/issues/3)

Agregar selección y subida de archivo, historial por secuencia y formulario de fraccionamiento.

- Aceptación. Tras fraccionar 30 kg de 100 kg se muestran saldo, hijo y eventos. Se presentan errores de saldo.
- Dependencias. B2 y B3. Desarrollar contra fixtures.
- Entregable. Flujo productor integrado.

## [F3 · Publicar ficha QR y verificación local](https://github.com/Joel010999/pachanoche/issues/4)

Implementar ficha pública, QR con URL canónica, foto territorial y estados del anclaje. Calcular SHA-256 local del archivo seleccionado.

- Aceptación. El QR escanea desde otro dispositivo. El original coincide y una copia alterada falla. La ficha omite PII y muestra atribución.
- Dependencias. B2, C3 y G3 para integración.
- Entregable. Ficha pública y ensayo del recorrido.
