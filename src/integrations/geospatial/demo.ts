import type { SatelliteObservation } from "../../contracts/v1.ts";
import type { GeofenceService, SatelliteSource } from "../../server/ports.ts";
import scene from "../../../data/geo/sentinel-scene.json" with { type: "json" };

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
  collection: scene.collection as SatelliteObservation["collection"],
  itemId: scene.id,
  acquiredAt: new Date(scene.properties.datetime).toISOString(),
  previewUrl: scene.assets.visual.href,
  attribution: scene.properties.attribution,
  resolutionM: scene.properties.gsd,
  cloudCoverPercent: scene.properties["eo:cloud_cover"],
};

export const demoSatellite: SatelliteSource = {
  async observations(siteId) {
    return [{ ...salinasGrandes, siteId }];
  },
};
