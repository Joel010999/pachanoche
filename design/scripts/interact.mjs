// Maneja Edge headless por CDP: mueve el mouse, hace clic y captura cada estado.
// Uso: node design/scripts/interact.mjs <salida-dir> "accion:x,y" ...  (accion = hover | click | shot)
import { spawn } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { setTimeout as wait } from "node:timers/promises";

const [outDir, ...steps] = process.argv.slice(2);
mkdirSync(outDir, { recursive: true });
const edge = "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe";
const port = 9333;
const proc = spawn(edge, ["--headless=new", "--disable-gpu", "--hide-scrollbars", `--remote-debugging-port=${port}`,
  "--window-size=1600,1000", `--user-data-dir=${process.env.TEMP}/edge-cdp`, "about:blank"], { stdio: "ignore" });
let targets;
for (let i = 0; i < 50 && !targets; i++) {
  try { targets = await (await fetch(`http://127.0.0.1:${port}/json`)).json(); } catch { await wait(200); }
}
const page = targets.find(t => t.type === "page");
const ws = new WebSocket(page.webSocketDebuggerUrl);
await new Promise(r => ws.addEventListener("open", r));
let id = 0; const pending = new Map();
ws.addEventListener("message", e => { const m = JSON.parse(e.data); if (pending.has(m.id)) { pending.get(m.id)(m.result); pending.delete(m.id); } });
const send = (method, params = {}) => new Promise(r => { pending.set(++id, r); ws.send(JSON.stringify({ id, method, params })); });
await send("Emulation.setDeviceMetricsOverride", { width: 1600, height: 1000, deviceScaleFactor: 1, mobile: false });
await send("Page.enable");
await send("Page.navigate", { url: process.env.URL ?? "http://localhost:3000/" });
await wait(6000);
let n = 0;
for (const step of steps) {
  const [action, xy] = step.split(":");
  const [x, y] = (xy ?? "0,0").split(",").map(Number);
  if (action === "hover" || action === "click") await send("Input.dispatchMouseEvent", { type: "mouseMoved", x, y });
  if (action === "click") {
    await send("Input.dispatchMouseEvent", { type: "mousePressed", x, y, button: "left", clickCount: 1 });
    await send("Input.dispatchMouseEvent", { type: "mouseReleased", x, y, button: "left", clickCount: 1 });
  }
  await wait(500);
  const shot = await send("Page.captureScreenshot", { format: "png" });
  const file = `${outDir}/${String(++n).padStart(2, "0")}-${action}-${x}-${y}.png`;
  writeFileSync(file, Buffer.from(shot.data, "base64"));
  console.log(file);
}
ws.close(); proc.kill();
