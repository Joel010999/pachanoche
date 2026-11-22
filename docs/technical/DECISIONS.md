# Decisiones técnicas

- Node 22 y módulos ES para ejecutar con cero dependencias de producción en el entorno de la demo. TypeScript estricto sirve para verificar el dominio mediante JSDoc.
- WMS en lugar de un SDK cartográfico para alinear cinco puntos y dos imágenes con una sola extensión geográfica. Migrar a MapLibre cuando se necesiten vista libre, más capas o vectores.
- Compuesto VIIRS como evidencia espacial visual. Migrar oscuridad a VNP46A3 con QA y calibración antes de afirmar precisión.
- Pronóstico consultado sólo dentro de seis días desde el instante actual. Escenario demo explícito, ausencia marcada y pesos redistribuidos.
- Efemérides locales aproximadas para disponibilidad offline. Evaluar Astronomy Engine y un corpus de referencia antes de producción.
- Reserva demo sin persistencia para demostrar fecha, cupo, cotización y confirmación sin datos personales.
