import type { SatelliteObservation } from "../../contracts/v1.ts";
import type { SatelliteSource } from "../../server/ports.ts";
import scene from "../../../data/geo/sentinel-scene.json" with { type: "json" };

/**
 * Proveedor de observaciones satelitales territoriales basado en datos de Copernicus (Sentinel-2 y Sentinel-1).
 * Opera con la escena local oficial verificada en G1 como garantía offline/contingencia.
 */
export class CopernicusSatelliteSource implements SatelliteSource {
  async observations(siteId: string): Promise<SatelliteObservation[]> {
    // Observación óptica principal (Sentinel-2 L2A)
    const opticalObservation: SatelliteObservation = {
      id: "8f0b6c52-6f43-4d3c-9a57-3c1b1f7f2a10",
      siteId,
      collection: "sentinel-2-l2a",
      itemId: scene.id,
      acquiredAt: new Date(scene.properties.datetime).toISOString(),
      previewUrl: scene.assets.visual.href,
      attribution: scene.properties.attribution,
      resolutionM: scene.properties.gsd,
      cloudCoverPercent: scene.properties["eo:cloud_cover"],
    };

    // Observación de radar complementaria (Sentinel-1 SAR GRD)
    const radarObservation: SatelliteObservation = {
      id: "2d3e4f5a-6b7c-8d9e-0f1a-2b3c4d5e6f7a",
      siteId,
      collection: "sentinel-1-grd",
      itemId: scene.complementary_radar_scene.id,
      acquiredAt: new Date(scene.complementary_radar_scene.datetime).toISOString(),
      attribution: scene.properties.attribution,
      resolutionM: scene.complementary_radar_scene.resolution_meters,
    };

    return [opticalObservation, radarObservation];
  }
}

export const copernicusSatellite = new CopernicusSatelliteSource();
