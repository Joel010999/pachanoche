# Especificación Técnica: G1 · Escena Satelital Copernicus y Metadatos Territoriales

## Problem Statement
La aplicación de trazabilidad de sal "Sal de Origen" depende de evidencia territorial para situar los lotes declarados de Salinas Grandes en su contexto geográfico real. Actualmente:
1. La imagen satelital se carga desde un hotlink externo a un servidor web de terceros (`copernicuslac-chile.eu`). Si la conexión a internet es inestable durante la hackathon o el servidor externo no responde, la interfaz falla y la demo se rompe.
2. No existen metadatos técnicos estructurados (identificador de satélite, fecha exacta de adquisición, bandas espectrales, coordenadas BBOX y porcentaje de nubosidad) disponibles localmente para ser consumidos por la API o el frontend.
3. No se documenta la escena complementaria de radar (Sentinel-1 GRD) requerida para la verificación de condiciones de salmuera y rugosidad del salar.

## Solution
1. Descargar y alojar el recorte óptico de alta resolución procesado de Sentinel-2 L2A en el almacenamiento público local de la aplicación, garantizando resiliencia 100% offline.
2. Crear un archivo canónico de metadatos geoespaciales con especificación compatible con STAC (SpatioTemporal Asset Catalog) que documente la escena de Sentinel-2 L2A y la escena complementaria candidata de Sentinel-1 GRD.
3. Actualizar la vista principal y los contratos de consumo para servir los metadatos y la imagen desde la ruta local estática, con atribución legal explícita a Copernicus.

## User Stories
1. Como evaluador o jurado de la hackathon, quiero abrir la aplicación sin conexión a internet externa y ver la imagen satelital de Salinas Grandes de inmediato, para comprobar que el sistema es resiliente a fallas de red.
2. Como comprador o auditor B2B, quiero consultar la ficha técnica de la escena satelital (fecha de toma, satélite, resolución y nivel de nubes), para verificar la rigurosidad científica de la evidencia territorial.
3. Como desarrollador del frontend (Raúl), quiero disponer de una ruta local estática `/geo/salinas-grandes.jpg` y un objeto de metadatos tipado, para integrar el visor territorial y el mapa sin depender de servicios externos.
4. Como productor de sal, quiero que la plataforma muestre claramente que los datos satelitales provienen del programa oficial Copernicus de la Agencia Espacial Europea (ESA), para respaldar el prestigio y origen de mi producto.
5. Como especialista geoespacial, quiero que los metadatos incluyan la escena candidata de radar Sentinel-1 GRD, para permitir comparaciones futuras de humedad y salmuera independientemente de la cobertura nubosa.

## Implementation Decisions
- **Alojamiento de la Imagen:** El activo visual RGB optimizado se almacenará como recurso estático servido directamente por el framework web en la ruta pública `/geo/salinas-grandes.jpg`.
- **Estructura de Metadatos STAC:** Se creará un documento de metadatos estructurado en formato JSON con la siguiente información:
  - Colección óptica: `sentinel-2-l2a` (Level-2A, reflectancia de fondo de atmósfera).
  - Fecha de adquisición: `2025-02-23T14:30:00Z` (verano austral, alta radiación solar).
  - Bounding Box geográfico (WGS84): `[-66.10, -23.76, -65.88, -23.54]` (oeste, sur, este, norte).
  - Resolución espacial: 10 metros por píxel en bandas visibles (B04 Rojo, B03 Verde, B02 Azul).
  - Cobertura de nubes en área de interés: `0.0%`.
  - Escena complementaria de radar: `sentinel-1-grd` (modo IW, polarización VV+VH, resolución 10m).
  - Atribución legal: *"Copernicus Sentinel data [2025] procesado por CopernicusLAC Chile y Sal de Origen"*.
- **Enlace de la UI:** La portada principal modificará su componente de imagen para consumir el recurso local relativo, preservando las dimensiones de aspecto y textos de accesibilidad alt/figcaption.

## Testing Decisions
- **Verificación de existencia e integridad:** Prueba automatizada que verifique que el archivo de imagen existe en disco, no está vacío y supera un tamaño mínimo razonable (> 100 KB).
- **Validación de esquema de metadatos:** Prueba unitaria que valide que el archivo de metadatos JSON existe, es parseable y contiene todos los campos obligatorios: id, satélite, fecha ISO válida, BBOX de 4 coordenadas y créditos de atribución.
- **Validación de renderizado local:** Prueba de integración HTTP asegurando que la ruta pública `/geo/salinas-grandes.jpg` responde con código de estado HTTP 200 y encabezado `content-type: image/jpeg`.

## Out of Scope
- Descarga automatizada en tiempo real de gigabytes de archivos crudos `.SAFE` de la API de Copernicus durante la ejecución de la demo.
- Procesamiento multiespectral en tiempo real en el navegador (cálculo de índices NDVI o NDWI al vuelo).
- Descarga de múltiples recortes temporales históricos fuera de la escena canónica establecida para la demo.

## Further Notes
- La escena del 23 de febrero de 2025 fue seleccionada debido a sus condiciones atmosféricas impecables (cero nubosidad sobre el salar) y excelente contraste visual de las costras salinas y caminos de acceso.
- La escena de Sentinel-1 GRD queda referenciada para la fase de expansión post-hackathon cuando se incorporen capas de monitoreo de salmuera profunda.
