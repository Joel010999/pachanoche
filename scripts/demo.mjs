// Levanta la demo para la red local: detecta la IP de la notebook, la usa en el QR y escucha en todas las interfaces.
import { spawn, spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { networkInterfaces } from "node:os";

const port = process.env.PORT ?? "3000";
const virtual = /vethernet|virtual|vmware|vbox|wsl|docker|hyper-v|loopback|bluetooth/i;
const rank = address => (address.startsWith("192.168.") ? 0 : address.startsWith("10.") ? 1 : 2);
const candidates = Object.entries(networkInterfaces())
  .filter(([name]) => !virtual.test(name))
  .flatMap(([name, list]) => (list ?? []).filter(item => item.family === "IPv4" && !item.internal).map(item => ({ name, address: item.address })))
  .sort((a, b) => rank(a.address) - rank(b.address));
const ip = candidates[0]?.address;
const publicBaseUrl = process.env.PUBLIC_BASE_URL ?? (ip ? `http://${ip}:${port}` : `http://localhost:${port}`);
const next = ["node_modules/next/dist/bin/next"];

if (!existsSync(".next/BUILD_ID") || process.argv.includes("--build")) {
  console.log("Compilando la demo (npm run build)…");
  const build = spawnSync(process.execPath, [...next, "build"], { stdio: "inherit" });
  if (build.status !== 0) process.exit(build.status ?? 1);
}

console.log(`\nSal de Origen · demo local\n  En esta notebook: http://localhost:${port}\n  Desde el celular (misma wifi): ${publicBaseUrl}\n  Panel del productor: ${publicBaseUrl}/productor`);
if (!ip) console.log("  No se detectó una IP de red local: el QR apuntará a localhost.");
if (candidates.length > 1) console.log(`  Otras interfaces: ${candidates.slice(1).map(item => `${item.name} ${item.address}`).join(", ")}. Si el QR no abre, definí PUBLIC_BASE_URL.`);
console.log("  Si el celular no conecta, permití Node.js en el firewall para redes privadas.\n");

const server = spawn(process.execPath, [...next, "start", "-H", "0.0.0.0", "-p", port], {
  stdio: "inherit",
  env: { ...process.env, PUBLIC_BASE_URL: publicBaseUrl },
});
server.on("exit", code => process.exit(code ?? 0));
for (const signal of ["SIGINT", "SIGTERM"]) process.on(signal, () => server.kill(signal));
