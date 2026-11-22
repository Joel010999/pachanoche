# Equipo geospatial

Rama `feature/geospatial`. Responsable: Dani.

Contexto territorial, escenas reales, geofencing y mapa. Las observaciones se vinculan al sitio declarado.

## [G1 · Seleccionar y documentar escenas Copernicus reales](https://github.com/Joel010999/pachanoche/issues/11)

Consultar STAC Sentinel-2 L2A y Sentinel-1 GRD para el área de estudio. Guardar ítem, fecha, cobertura y atribución.

- Aceptación. Hay una escena S2 apta con cobertura y revisión visual, y una candidata S1 con metadatos.
- Dependencias. Acceso al catálogo Copernicus.
- Entregable. Dataset y registro de selección.

## [G2 · Validar coordenadas declaradas y precisión](https://github.com/Joel010999/pachanoche/issues/12)

Definir recorte de estudio versionado y aplicar intersección con PostGIS y radio de precisión.

- Aceptación. Cubre punto interior, exterior y borde. Registra incertidumbre y versión del polígono.
- Dependencias. B1 para integración. Puede empezar con fixtures.
- Entregable. Servicio espacial y pruebas.

## [G3 · Servir capa satelital y mapa de demostración](https://github.com/Joel010999/pachanoche/issues/13)

Preparar recorte visual, API por zona y mapa con coordenadas demo autorizadas.

- Aceptación. Mapa muestra imagen real, fecha, límite de resolución y atribución. La caída del proveedor tiene estado explícito.
- Dependencias. G1 y G2 para integración.
- Entregable. Capa, servicio y demo territorial.
