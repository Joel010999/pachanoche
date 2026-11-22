# Evidencia satelital

Recorte exploratorio WGS84 `[-66.10,-23.76,-65.88,-23.54]` en orden oeste, sur, este, norte. Confirmar cobertura visual y ajustar con actores locales. Es una ventana de estudio, sin alcance catastral.

La portada muestra una imagen Sentinel-2 de contexto del 23 de febrero de 2025, servida por CopernicusLAC Chile. La publicación permite verificar fuente y fecha. La ficha STAC, huella y resolución del recorte siguen pendientes. La fecha de extracción sintética es independiente de la fecha de captura. [Imagen de Salinas Grandes](https://copernicuslac-chile.eu/imagen/salinas-grandes-argentina/)

Consultar STAC `https://stac.dataspace.copernicus.eu/v1/search` con bbox, fecha ISO en intervalo, colección y paginación. Comenzar con ventana de ±30 días alrededor de la fecha de extracción demo. Seleccionar `sentinel-2-l2a` por cobertura del recorte, fecha y nubes. `eo:cloud_cover` describe el producto completo. Revisar nubes y sombras sobre el área con SCL. Mostrar RGB B04/B03/B02 a 10 m y documentar fecha, recorte, reescalado y método. Consultar `sentinel-1-grd` para una capa SAR complementaria. Para comparación temporal usar misma órbita relativa, dirección y polarización, registrar calibración, corrección de terreno y tratamiento del speckle si se procesan valores.

Guardar STAC Item, colección, identificador, fecha UTC, huella, cobertura, procesamiento, versión, resolución y crédito de Copernicus. Exportar una vista apta para demo y guardar referencia de la escena original. STAC se consulta desde el módulo espacial con caché; la interfaz recibe metadatos y una URL de vista autorizada.

Calcular geofencing con el polígono versionado y el radio GPS. Clasificar dentro, fuera o incierto si el radio toca el borde, falta precisión o hay datos insuficientes. Coordenadas proveen evidencia declarativa. Las observaciones sirven para contexto y cambios visibles, con límites de resolución y fecha. La pureza, la masa extraída y la procedencia física requieren otras mediciones.

- [Catálogo Copernicus](https://documentation.dataspace.copernicus.eu/APIs/STAC.html)
- [Sentinel-2 L2A](https://documentation.dataspace.copernicus.eu/APIs/SentinelHub/Data/S2L2A.html)
- [Sentinel-1 GRD](https://documentation.dataspace.copernicus.eu/APIs/SentinelHub/Data/S1GRD.html)
