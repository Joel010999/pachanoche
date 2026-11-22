import type { SatelliteObservation } from "../../contracts/v1.ts";
import type { GeofenceService, SatelliteSource } from "../../server/ports.ts";

// Recorte exploratorio de docs/technical/SATELLITE_SPEC.md: oeste, sur, este, norte.
export const studyArea = { version: "demo-bbox-2026-11", bbox: [-66.10, -23.76, -65.88, -23.54] } as const;

export const demoGeofence: GeofenceService = {
  classify({ latitude, longitude, accuracyM }) {
    const [west, south, east, north] = studyArea.bbox;
    const inside = longitude >= west && longitude <= east && latitude >= south && latitude <= north;
    if (accuracyM === undefined) return { status: "uncertain", polygonVersion: studyArea.version, reason: "Falta la precisión del GPS." };
    return { status: inside ? "inside" : "outside", polygonVersion: studyArea.version };
  },
};

const salinasGrandes: Omit<SatelliteObservation, "siteId"> = {
  id: "8f0b6c52-6f43-4d3c-9a57-3c1b1f7f2a10",
  collection: "sentinel-2-l2a",
  itemId: "copernicuslac-salinas-grandes-2025-02-23",
  acquiredAt: "2025-02-23T00:00:00.000Z",
  previewUrl: "https://copernicuslac-chile.eu/wp-content/uploads/2026/04/Salinas-Grandes.jpg",
  attribution: "Contiene datos modificados de Copernicus Sentinel (2025), vía CopernicusLAC Chile.",
  resolutionM: 10,
};

export const demoSatellite: SatelliteSource = {
  async observations(siteId) {
    return [{ ...salinasGrandes, siteId }];
  },
};
