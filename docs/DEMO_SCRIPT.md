# Guion de la demo

1. Abrir el entorno demo y crear un lote con datos sintéticos, fecha de extracción y ubicación declarada cerca del área de estudio.
2. Registrar 100 kg, instrumento y responsable demo. Adjuntar el documento sintético y conservar el original.
3. Mostrar una escena real con fecha UTC, fuente, nube y resolución. Explicar que contextualiza el sitio y que la coordenada fue declarada.
4. Solicitar anclaje en Fuji, abrir el recibo confirmado y cotejar el SHA-256 del original. Cambiar un byte y verificar que falle.
5. Fraccionar 30 kg, abrir el sublote y revisar los 70 kg restantes en el padre junto con ambos historiales.
6. Escanear el QR público desde otro dispositivo. Revisar la proyección y repetir la comprobación de integridad.

En el bootstrap se puede consultar el lote sintético, abrir la imagen histórica de contexto y probar alta, peso y fraccionamiento vía API. La ficha STAC, el documento, el anclaje y el QR se cierran con los issues P0. Si falla un proveedor durante el ensayo, registrar el estado real y mostrar recibos o metadatos previamente obtenidos con su fecha, cuando existan.
