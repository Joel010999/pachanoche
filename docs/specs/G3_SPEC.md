# G3: Especificación Técnica - Servir Capa Satelital y Servicio Territorial

## 1. Contexto y Objetivos

El frente geoespacial (**G3**) provee la capa de visualización e información satelital de soporte a la trazabilidad territorial para la cuenca de Salinas Grandes. 

Basado en las escenas reales catalogadas en **G1** (`data/geo/sentinel-scene.json` y `public/geo/salinas-grandes.jpg`) y el modelo espacial de **G2**, este issue entrega:
1. Endpoints de la API REST para consultar sitios de extracción autorizados y sus observaciones satelitales asociadas (`GET /api/v1/extraction-sites` y `GET /api/v1/extraction-sites/:id/observations`).
2. Adaptador satelital robusto (`CopernicusSatelliteSource`) que implementa la interfaz `SatelliteSource` de `src/server/ports.ts`.
3. Metadatos oficiales STAC (fecha UTC de adquisición, resolución espacial de 10 m, nubosidad 0.0%, atribución obligatoria a Copernicus y ESA, y rol visual RGB B04/B03/B02 más escena complementaria Sentinel-1 SAR).
4. Manejo explícito de contingencia y estado offline para asegurar una demo 100% confiable y sin caídas por falta de conexión a internet o saturación del API remoto.
5. Inyección en el contenedor (`container.ts`) para alimentar la ficha pública (`PublicLot.observations`).

---

## 2. Definición de Endpoints

### 2.1 `GET /api/v1/extraction-sites`
- **Descripción**: Lista los sitios de extracción de salmuera/sal autorizados para la organización en sesión (o todos los sitios de estudio si es consulta pública o admin).
- **Seguridad**: Requiere sesión activa (`producer`, `admin`, `buyer`, `verifier`).
- **Respuesta 200 OK**:
  ```json
  {
    "data": [
      {
        "id": "c4d2a8e6-1b3f-4a59-8e7c-0d2f4b6a8c13",
        "organizationId": "e8f1ef36-0252-41ba-8ee1-f23c2370c92f",
        "label": "Salinas Grandes · área de estudio (demo)"
      }
    ]
  }
  ```

### 2.2 `GET /api/v1/extraction-sites/:id/observations`
- **Descripción**: Obtiene las observaciones satelitales STAC registradas para el sitio de extracción indicado.
- **Parámetros**: `id` (UUID del sitio de extracción).
- **Respuesta 200 OK**:
  ```json
  {
    "data": [
      {
        "id": "8f0b6c52-6f43-4d3c-9a57-3c1b1f7f2a10",
        "siteId": "c4d2a8e6-1b3f-4a59-8e7c-0d2f4b6a8c13",
        "collection": "sentinel-2-l2a",
        "itemId": "S2A_MSIL2A_20250223T143000_N0511_R096_T19KFA_20250223T180000",
        "acquiredAt": "2025-02-23T14:30:00.000Z",
        "previewUrl": "/geo/salinas-grandes.jpg",
        "attribution": "Copernicus Sentinel data [2025] procesado por CopernicusLAC Chile y Sal de Origen",
        "resolutionM": 10.0,
        "cloudCoverPercent": 0.0
      },
      {
        "id": "2d3e4f5a-6b7c-8d9e-0f1a-2b3c4d5e6f7a",
        "siteId": "c4d2a8e6-1b3f-4a59-8e7c-0d2f4b6a8c13",
        "collection": "sentinel-1-grd",
        "itemId": "S1A_IW_GRDH_1SDV_20250220T224500_058000_06E400_7F20",
        "acquiredAt": "2025-02-20T22:45:00.000Z",
        "attribution": "Copernicus Sentinel data [2025] procesado por Copernicus Data Space Ecosystem",
        "resolutionM": 10.0
      }
    ]
  }
  ```
- **Respuesta 404 NOT_FOUND**: Si el `siteId` no corresponde a ningún sitio registrado en el dominio.

---

## 3. Integración Arquitectural

```
[ Cliente HTTP / UI ] 
         │
         ▼
[ /api/v1/extraction-sites/:id/observations ]
         │
         ▼
[ CopernicusSatelliteSource (src/integrations/geospatial/satellite.ts) ]
         │
         ├──► Lee escena oficial STAC de Salinas Grandes (data/geo/sentinel-scene.json)
         ├──► Valida existencia de assets visuales en repo local (/geo/salinas-grandes.jpg)
         └──► Devuelve colección tipada SatelliteObservation[] con metadatos y contingencia
```

---

## 4. Criterios de Aceptación y Pruebas

1. **Consulta de observaciones**: Retorna array con escena óptica Sentinel-2 L2A y escena SAR Sentinel-1 GRD para el sitio de Salinas Grandes.
2. **Atribución y resolución**: Cada observación incluye crédito explícito a Copernicus y resolución nominal de 10 m.
3. **Manejo de errores**: `GET /api/v1/extraction-sites/:id/observations` con ID inexistente devuelve 404 NOT_FOUND con requestId.
4. **Listado de sitios**: `GET /api/v1/extraction-sites` devuelve los sitios autorizados de la organización o rechaza sin sesión con 401.
5. **Ficha Pública**: Al publicar un lote con sección `"observations"`, la proyección pública en `GET /api/v1/public/lots/:code` incluye las observaciones reales de la cuenca.
