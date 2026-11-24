import { connection } from "next/server";
import { Visor } from "@/components/visor/Visor";
import { demoLots } from "@/domain/demo-fixture";
import { buildVisorModel } from "./visor-model";

export default async function Home() {
  await connection();
  return <Visor model={buildVisorModel(demoLots)} />;
}
