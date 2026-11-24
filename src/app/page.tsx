import { connection } from "next/server";
import { Visor } from "@/components/visor/Visor";
import { extractionSites } from "@/domain/personas";
import { container } from "@/server/container";
import { buildVisorModel } from "./visor-model";

export default async function Home() {
  await connection();
  const { lots, geofence, blockchainMode, satellite } = container();
  const observations = await satellite.observations(extractionSites[0].id).catch(() => []);
  const scene = observations.find(item => item.collection === "sentinel-2-l2a");
  return <Visor model={buildVisorModel({ lots, geofence, blockchainMode, scene })} />;
}
