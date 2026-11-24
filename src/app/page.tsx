import { connection } from "next/server";
import { Visor } from "@/components/visor/Visor";
import { container } from "@/server/container";
import { buildVisorModel } from "./visor-model";

export default async function Home() {
  await connection();
  return <Visor model={buildVisorModel(container().lots)} />;
}
