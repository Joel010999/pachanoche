# Especificación Técnica: G2 · Validación de Coordenadas y Geofencing de Salinas Grandes

## Problem Statement
Cuando un productor registra la extracción de un lote de sal en la plataforma "Sal de Origen", declara unas coordenadas geográficas obtenidas por el GPS de su teléfono o dispositivo móvil. Actualmente:
1. No existe un mecanismo en el código para verificar si esas coordenadas corresponden realmente al área geográfica de Salinas Grandes (Jujuy) o si fueron tomadas fuera del salar.
2. La arquitectura objetivo prevé PostGIS en PostgreSQL, pero para la demo local de la hackathon (`PLAN_DE_ACCION.md`) no hay bases de datos espaciales ni servidores externos disponibles.
3. El GPS de campo tiene margen de error (radio de incertidumbre en metros). Si el operario está cerca del borde del salar o la señal es imprecisa, clasificar simplemente como "adentro" o "afuera" puede generar falsos positivos o rechazos injustificados.

## Solution
1. Implementar un servicio geoespacial puro en TypeScript (`src/integrations/geospatial/geofence.ts`) que no requiera PostGIS ni dependencias nativas de C.
2. Definir el polígono canónico versionado de Salinas Grandes (`polygonVersion: "2026-11-salinas-grandes"`) basado en el recorte territorial de estudio WGS84 `[-66.10, -23.76, -65.88, -23.54]`.
3. Aplicar el algoritmo clásico de **Ray Casting (Even-Odd Rule)** para determinar la contención del punto, combinado con el cálculo de distancia geodésica mínima al borde del polígono.
4. Clasificar el resultado según la incertidumbre del GPS:
   - `inside`: El punto está dentro del polígono y su radio de precisión no toca ningún límite.
   - `outside`: El punto está fuera del polígono y su radio de precisión está completamente alejado de los límites.
   - `uncertain`: El radio de precisión del GPS intersecta el borde del salar o la precisión declarada es deficiente (> 500 metros), detallando el motivo en el campo `reason`.
5. Retornar un objeto estrictamente compatible con `GeofenceResult` definido en `src/contracts/v1.ts`.

## User Stories
1. Como productor que registra un lote en medio del salar (-23.65, -65.99 con 15m de precisión), quiero que el sistema valide mi ubicación como `inside`, para que mi lote obtenga la certificación de origen de Salinas Grandes.
2. Como comprador o auditor, quiero ver el estado `geofence` en la ficha pública del lote (`PublicLot`), para corroborar que la extracción ocurrió efectivamente dentro del polígono oficial versionado.
3. Como desarrollador del backend (Joel), quiero invocar `geofenceService.checkLocation({ latitude, longitude, accuracyMeters })` al dar de alta un lote y recibir el resultado tipado sin preocuparme por PostGIS ni consultas SQL.
4. Como evaluador de calidad, si un lote se registra en Salta o en San Salvador de Jujuy (-24.18, -65.30), quiero que el sistema lo clasifique como `outside` con el motivo explícito correspondiente.
5. Como auditor de campo, si una medición se toma en el límite exacto del salar con un GPS de baja precisión (50m de error que solapa el borde), quiero que el estado sea `uncertain` para solicitar una verificación adicional o revisión de fotos satelitales.

## Implementation Decisions
- **Ubicación del Módulo:**
  - `src/integrations/geospatial/geofence.ts`
  - Polígonos de referencia en: `data/geo/salinas-grandes-polygon.json`
- **Algoritmo de Punto en Polígono (Ray Casting):**
  - Trazar un rayo horizontal desde el punto hacia el infinito este y contar el número de intersecciones con los segmentos del polígono.
  - Número impar de intersecciones = Dentro del polígono.
  - Número par de intersecciones = Fuera del polígono.
- **Cálculo de Distancia al Borde (Fórmula de Haversine / Segment Distance):**
  - Para cada segmento del polígono, calcular la distancia geodésica mínima en metros desde el punto GPS hasta el segmento.
  - Si `distanciaMinimaAlBorde <= accuracyMeters`:
    - El círculo de error del GPS toca o cruza el límite del salar ➔ `status = "uncertain"`, `reason = "El radio de precisión del GPS (${accuracyMeters}m) intersecta el límite del salar"`.
  - Si `accuracyMeters > 500`:
    - Precisión insuficiente ➔ `status = "uncertain"`, `reason = "La precisión del GPS (${accuracyMeters}m) es insuficiente para certificar el perímetro"`.
  - Si no hay intersección de borde:
    - `isInside ? "inside" : "outside"`.
- **Estructura de Retorno (según `v1.ts`):**
  ```ts
  export type GeofenceResult = {
    status: "inside" | "outside" | "uncertain";
    polygonVersion: string;
    reason?: string;
  };
  ```

## Testing Decisions
- **Punto Interior Puro:** Coordenadas en el centro del salar (-23.65, -65.95) con precisión de 10m ➔ Debe retornar `inside` con versión `"2026-11-salinas-grandes"`.
- **Punto Exterior Puro:** Coordenadas en San Salvador de Jujuy (-24.185, -65.30) o Purmamarca (-23.74, -65.49) ➔ Debe retornar `outside`.
- **Punto en el Borde con Margen:** Coordenadas a 20 metros del límite este (-65.88) con radio de precisión de 50 metros ➔ Debe retornar `uncertain` con motivo descriptivo.
- **GPS Impreciso:** Punto interior pero con radio de error de 800 metros ➔ Debe retornar `uncertain` por precisión deficiente.
- **Parámetros Inválidos:** Latitudes fuera del rango [-90, 90] o longitudes fuera de [-180, 180] deben arrojar error de validación.

## Out of Scope
- Soporte para geometrías 3D o altimetría (la validación es planar 2D sobre el elipsoide WGS84).
- Conexión con servidores de bases de datos espaciales (PostGIS / GDAL).

## Further Notes
- El polígono se versióna de forma inmutable para que lotes históricos mantengan la referencia exacta al polígono vigente en la fecha de su extracción.
