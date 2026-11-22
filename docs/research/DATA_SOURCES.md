# Fuentes de datos

Revisión documental para la demo del 22 de noviembre de 2026.

## Fuentes verificadas documentalmente

| Fuente | Cobertura, resolución y formato | Acceso y condiciones | Uso previsto |
|---|---|---|---|
| [NASA LAADS Black Marble](https://ladsweb.modaps.eosdis.nasa.gov/missions-and-measurements/science-domain/nighttime-lights) y [guía colección 2](https://landweb.modaps.eosdis.nasa.gov/data/userguide/BlackMarbleUserGuide_Collection2.0_20241203.pdf) | Global, incluye Jujuy. VNP46A1 diario radiancia al sensor, A2 diario corregido con relleno, A3 mensual, A4 anual. Cuadrícula de 15 segundos de arco, unos 500 m en el ecuador, HDF-EOS5. | Descarga LAADS con [Earthdata Login](https://urs.earthdata.nasa.gov/) y token, sin tarifa publicada para los datos públicos. Atribuir producto y colección, consultar [política NASA](https://www.earthdata.nasa.gov/engage/open-data-services-and-software/data-and-information-policy). | A3 para un futuro indicador multimensual, con QA, máscaras, escala y unidades verificadas. |
| [NASA GIBS](https://nasa-gibs.github.io/gibs-api-docs/access-basics/) y [metadatos VIIRS](https://github.com/nasa-gibs/worldview-options-eosdis/blob/master/common/config/metadata/viirs/EarthAtNight.md) | Compuesto histórico 2016 global, representación visual WMTS/WMS. | Endpoint público sin token. Atribución NASA EOSDIS GIBS, Suomi NPP/VIIRS. | Capa cartográfica directa. Sus colores no se convierten en valores de radiancia. |
| [Open-Meteo](https://open-meteo.com/en/docs) y [precios](https://open-meteo.com/en/pricing) | Pronóstico global horario en JSON. Nubosidad, probabilidad de precipitación, viento, temperatura y humedad. Resolución y horizonte dependen del modelo. | Endpoint gratuito sin clave para uso no comercial sujeto a límites. Datos CC BY 4.0, servicio comercial requiere revisar el plan y usar endpoint con clave. | Ventana acotada a seis días. Un pronóstico de grilla puede diferir del sitio, especialmente en relieve complejo. |
| [NASA POWER](https://power.larc.nasa.gov/docs/services/api/) | Meteorología y radiación históricas, globales, por punto y período. | API pública sin token ni cargo publicado. Citar NASA POWER y sus fuentes. | Evaluación histórica, sin uso como pronóstico. |
| [Astronomy Engine](https://github.com/cosinekitty/astronomy) | JavaScript, Python y otros. Efemérides, fases, ascensos y descenso, coordenadas y crepúsculos. | MIT, local sin claves. | Opción preferida para ampliar precisión y objetos. |
| [Skyfield](https://rhodesmill.org/skyfield/) | Python, efemérides JPL descargables, objetos y coordenadas topocéntricas. | Biblioteca MIT, sin API key, requiere archivos de efemérides. | Validación de referencia offline. |
| [JPL SSD](https://ssd.jpl.nasa.gov/planets/approx_pos.html) y [modelo orbital de Schlyter](https://stjarnhimlen.se/comp/ppcomp.html) | Posiciones aproximadas. El segundo incluye Luna y elementos de planetas en función de la fecha. | Fórmulas públicas, sin autenticar ni consultar en ejecución. | Implementación local de baja precisión tolerante a falta de dependencias. |
| [Turismo Jujuy](https://www.turismo.jujuy.gob.ar/), [Visit Argentina](https://www.argentina.travel/provincia/jujuy), [Ruta Natural](https://larutanatural.gob.ar/es/imperdible/82/salinas-grandes) | Contexto regional de capital, Tilcara, Purmamarca, Salinas Grandes y corredor hacia Susques. | Consulta pública. No se reutilizan fotos o textos de los portales. | Centroides aproximados para explorar, sin afirmaciones operativas. |

## Validación pendiente

- Descargar escenas LAADS y contrastar el indicador con mediciones SQM, observadores y horizonte local. Radiancia ascendente no equivale a brillo del cielo. Nieve, luces temporales, topografía, atmósfera y derrame desde ciudades cambian la relación.
- Ejecutar GIBS y Open-Meteo desde una red habilitada. El entorno de desarrollo bloqueó las conexiones HTTP directas.
- Considerar imágenes GOES para situación reciente y SMN para contraste regional. Revisar latencia, disponibilidad, licencia y autenticación antes de integrar.
- Confirmar cada sitio con prestadores registrados y responsables comunitarios o de áreas protegidas. Los puntos representan localidades o zonas, sin validación nocturna, permisos, accesos ni rutas.
- Incorporar catálogo de constelaciones y contrastar eventos planetarios, fases y crepúsculos contra Horizons/Skyfield antes de comercializar.
