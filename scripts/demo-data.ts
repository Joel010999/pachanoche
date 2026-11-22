import { rmSync } from "node:fs";
import { dataFiles, defaultDataDir, seededLots } from "../src/server/container.ts";
import { writeJsonFile } from "../src/integrations/local-store/json-file.ts";

const command = process.argv[2];
const files = dataFiles(defaultDataDir());

if (command === "reset") {
  rmSync(files.state, { force: true });
  rmSync(files.evidence, { recursive: true, force: true });
  console.log("Datos demo borrados. El próximo arranque vuelve al estado inicial.");
} else if (command === "seed") {
  rmSync(files.evidence, { recursive: true, force: true });
  writeJsonFile(files.state, seededLots().snapshot());
  console.log(`Datos demo iniciales escritos en ${files.state}.`);
} else {
  console.error("Uso: demo-data.ts reset|seed");
  process.exitCode = 1;
}
