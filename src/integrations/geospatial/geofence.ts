import defaultPolygon from "../../../data/geo/salinas-grandes-polygon.json" with { type: "json" };
import type { GeofenceService } from "../../server/ports.ts";

export type GeofenceStatus = "inside" | "outside" | "uncertain";

export interface GeofenceResult {
  status: GeofenceStatus;
  polygonVersion: string;
  reason?: string;
}

export interface LocationInput {
  latitude: number;
  longitude: number;
  accuracyMeters?: number;
}

export interface GeofenceOptions {
  polygonCoordinates?: [number, number][]; // [lon, lat][]
  polygonVersion?: string;
  maxAcceptableAccuracyMeters?: number;
}

const EARTH_RADIUS_METERS = 6371000;

/**
 * Calcula la distancia ortodrómica en metros entre dos coordenadas (Fórmula de Haversine).
 */
export function haversineDistanceMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const rLat1 = (lat1 * Math.PI) / 180;
  const rLat2 = (lat2 * Math.PI) / 180;

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(rLat1) * Math.cos(rLat2) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return EARTH_RADIUS_METERS * c;
}

/**
 * Determina si un punto [lon, lat] cae dentro de un polígono usando Ray Casting (Even-Odd Rule).
 */
export function isPointInPolygon(
  point: [number, number],
  polygon: [number, number][]
): boolean {
  const [px, py] = point; // px = lon, py = lat
  let inside = false;

  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const [xi, yi] = polygon[i];
    const [xj, yj] = polygon[j];

    const intersect =
      yi > py !== yj > py &&
      px < ((xj - xi) * (py - yi)) / (yj - yi) + xi;

    if (intersect) {
      inside = !inside;
    }
  }

  return inside;
}

/**
 * Calcula la distancia mínima en metros desde un punto [lon, lat] al segmento formado por a y b.
 */
function distanceToSegmentMeters(
  p: [number, number],
  a: [number, number],
  b: [number, number]
): number {
  const [px, py] = p; // lon, lat
  const [ax, ay] = a;
  const [bx, by] = b;

  // Proyección plana local aproximada
  const midLat = ((ay + by + py) / 3 * Math.PI) / 180;
  const kx = Math.cos(midLat) * 111320; // metros por grado de longitud
  const ky = 110540; // metros por grado de latitud

  const dx = (bx - ax) * kx;
  const dy = (by - ay) * ky;
  const segLenSq = dx * dx + dy * dy;

  if (segLenSq === 0) {
    return haversineDistanceMeters(py, px, ay, ax);
  }

  // Factor de proyección t en [0, 1]
  const dpx = (px - ax) * kx;
  const dpy = (py - ay) * ky;
  const t = Math.max(0, Math.min(1, (dpx * dx + dpy * dy) / segLenSq));

  const projLon = ax + (t * (bx - ax));
  const projLat = ay + (t * (by - ay));

  return haversineDistanceMeters(py, px, projLat, projLon);
}

/**
 * Calcula la distancia mínima en metros desde un punto hasta el borde de un polígono.
 */
export function distanceToPolygonBoundaryMeters(
  point: [number, number],
  polygon: [number, number][]
): number {
  let minDistance = Infinity;

  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const dist = distanceToSegmentMeters(point, polygon[i], polygon[j]);
    if (dist < minDistance) {
      minDistance = dist;
    }
  }

  return minDistance;
}

/**
 * Servicio de Geofencing para Sal de Origen.
 * Clasifica la ubicación de extracción en 'inside', 'outside' o 'uncertain'.
 */
export function checkGeofence(
  location: LocationInput,
  options: GeofenceOptions = {}
): GeofenceResult {
  const { latitude, longitude, accuracyMeters = defaultPolygon.thresholds.defaultAccuracyMeters } = location;

  // Validaciones geográficas básicas
  if (typeof latitude !== "number" || isNaN(latitude) || latitude < -90 || latitude > 90) {
    throw new Error(`Latitud inválida: ${latitude}. Debe estar entre -90 y 90.`);
  }
  if (typeof longitude !== "number" || isNaN(longitude) || longitude < -180 || longitude > 180) {
    throw new Error(`Longitud inválida: ${longitude}. Debe estar entre -180 y 180.`);
  }

  const polygonVersion = options.polygonVersion || defaultPolygon.version;
  const coords = (options.polygonCoordinates || defaultPolygon.coordinates) as [number, number][];
  const maxAccuracy = options.maxAcceptableAccuracyMeters || defaultPolygon.thresholds.maxAcceptableAccuracyMeters;

  const point: [number, number] = [longitude, latitude];
  const inside = isPointInPolygon(point, coords);
  const distToBoundary = distanceToPolygonBoundaryMeters(point, coords);

  // Caso 1: Precisión del GPS deficiente
  if (accuracyMeters > maxAccuracy) {
    return {
      status: "uncertain",
      polygonVersion,
      reason: `La precisión del GPS (${accuracyMeters}m) supera el umbral máximo aceptable (${maxAccuracy}m).`,
    };
  }

  // Caso 2: El radio de error del GPS toca o cruza el borde del polígono
  if (distToBoundary <= accuracyMeters) {
    return {
      status: "uncertain",
      polygonVersion,
      reason: `El radio de precisión del GPS (${accuracyMeters}m) intersecta el límite del salar (distancia al borde: ${Math.round(distToBoundary)}m).`,
    };
  }

  // Caso 3: Dentro del salar con certeza
  if (inside) {
    return {
      status: "inside",
      polygonVersion,
    };
  }

  // Caso 4: Fuera del salar con certeza
  return {
    status: "outside",
    polygonVersion,
    reason: `La coordenada declarada está a ${Math.round(distToBoundary)}m fuera de los límites de Salinas Grandes.`,
  };
}

/** Adaptador del puerto GeofenceService con el polígono versionado de Salinas Grandes. */
export const salinasGeofence: GeofenceService = {
  classify: ({ latitude, longitude, accuracyM }) => checkGeofence({ latitude, longitude, accuracyMeters: accuracyM }),
};
