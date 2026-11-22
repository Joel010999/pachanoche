# PachaNoche

**Convertimos datos del espacio en experiencias turísticas en la Tierra.**

Prototipo para la hackathon del 22 de noviembre de 2026 en Jujuy, Argentina. Reúne en una consulta señales que hoy se buscan por separado: pronóstico, geometría del cielo y contexto de iluminación satelital.

## Ejecutar

Requiere Node.js 22.16+ y un navegador actual. No hay dependencias de ejecución.

```sh
npm run dev
```

Abrí http://127.0.0.1:3000. Probá **Tilcara**, **22/11/2026**, **22:00**, **Luna**, con **meteorología de muestra**. El modo de muestra funciona sin red (la imagen del mapa requiere conexión).

Copiá `.env.example` a `.env` para cambiar host o puerto. `OPEN_METEO_KEY` es opcional y habilita el endpoint comercial si contás con un plan. Las claves quedan en el servidor.

```sh
npm install
npm run lint
npm run typecheck
npm test
npm run build
npm start
```

`npm install` sólo se necesita para el verificador TypeScript. `npm start` sirve el resultado de `npm run build`.

## Validación local

Con Node 22.16 y TypeScript 5.9.3 pasaron el lint básico, el chequeo estricto del dominio, 5 pruebas automatizadas, el build y una prueba HTTP del artefacto de producción. Se ejecutaron los scripts por Node porque la instalación local de npm estaba incompleta. La prueba de flujo cubre la API y la entrega de archivos. Queda pendiente comprobar las interacciones visualmente en navegador y consultar NASA GIBS y Open-Meteo desde una red habilitada.

## Qué incluye

- Portada y planificador por lugar, fecha, hora local y objetivo.
- Cinco localidades o zonas candidatas y mapa WMS NASA EOSDIS GIBS. La capa Black Marble usa un compuesto Suomi NPP/VIIRS de 2016.
- Pronóstico Open-Meteo cuando hay cobertura, modo explícito de muestra y evaluación parcial ante ausencia.
- Sol, Luna, cuatro planetas y centro galáctico mediante cálculos aproximados. El índice detalla factores, pesos y alternativas.
- Tres experiencias ficticias en ARS de ejemplo y reserva simulada sin cobro ni datos personales.

La estimación de oscuridad usa supuestos demo. VIIRS aporta contexto visual y no entra al cálculo actual. Los lugares requieren validar permisos y acceso, y la recomendación se refiere a la geometría del cielo.

## Tecnología y documentación

JavaScript modular, Node HTTP, HTML/CSS, WMS EPSG:4326, Open-Meteo y TypeScript estricto para el dominio. Pruebas de dominio y flujo HTTP con Node Test Runner.

- [Producto](docs/PRODUCT_SPEC.md), [alcance](docs/MVP_SCOPE.md) y [hoja de ruta](docs/ROADMAP.md)
- [Fuentes espaciales y terrestres](docs/research/DATA_SOURCES.md), [arquitectura](docs/ARCHITECTURE.md), [índice](docs/technical/PACHANOCHE_INDEX.md), [API](docs/technical/API_DESIGN.md) y [decisiones](docs/technical/DECISIONS.md)
- [Modelo de negocio](docs/business/BUSINESS_MODEL.md), [canvas](docs/business/BUSINESS_MODEL_CANVAS.md) y [go-to-market](docs/business/GO_TO_MARKET.md)
- [Guion de demo](docs/DEMO_SCRIPT.md) y [pitch de 60 segundos](docs/HACKATHON_PITCH.md)

El modelo comercial propone comisión por reserva completada, con SaaS para prestadores y API B2B como hipótesis. La siguiente etapa requiere validar datos, sitios, demanda e inventario antes de operar ventas.
