// Prepara Avalanche Fuji para la demo. Uso: node scripts/fuji.mjs wallet | balance | deploy | status
// La llave de prueba vive sólo en .env.local (ignorado por git) y nunca se imprime.
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { createPublicClient, createWalletClient, formatEther, http } from "viem";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import { avalancheFuji } from "viem/chains";

const envFile = ".env.local";
const artifact = JSON.parse(readFileSync("src/integrations/blockchain/AnchorRegistry.json", "utf8"));
const explorer = "https://testnet.snowtrace.io";
const faucet = "https://faucet-community.avax-test.network/ (alternativas: https://faucets.chain.link/fuji o https://faucet.quicknode.com/avalanche/fuji)";

function readEnv() {
  const lines = existsSync(envFile) ? readFileSync(envFile, "utf8").split(/\r?\n/) : [];
  const values = Object.fromEntries(lines.map(line => line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)).filter(Boolean).map(match => [match[1], match[2]]));
  return { lines, values: { ...values, ...Object.fromEntries(["FUJI_PRIVATE_KEY", "FUJI_CONTRACT_ADDRESS", "FUJI_RPC_URL"].filter(key => process.env[key]).map(key => [key, process.env[key]])) } };
}

function writeEnv(updates) {
  const { lines } = readEnv();
  const pending = { ...updates };
  const next = lines.map(line => {
    const key = line.match(/^\s*([A-Z0-9_]+)\s*=/)?.[1];
    if (key && key in pending) { const value = pending[key]; delete pending[key]; return `${key}=${value}`; }
    return line;
  }).filter((line, index, all) => line !== "" || index < all.length - 1);
  for (const [key, value] of Object.entries(pending)) next.push(`${key}=${value}`);
  writeFileSync(envFile, `${next.join("\n")}\n`, { mode: 0o600 });
}

const { values } = readEnv();
const rpc = values.FUJI_RPC_URL || "https://api.avax-test.network/ext/bc/C/rpc";
const publicClient = createPublicClient({ chain: avalancheFuji, transport: http(rpc) });
const account = () => {
  if (!/^0x[0-9a-fA-F]{64}$/.test(values.FUJI_PRIVATE_KEY ?? "")) {
    console.error("No hay FUJI_PRIVATE_KEY válida en .env.local. Ejecutá primero: npm run fuji -- wallet");
    process.exit(1);
  }
  return privateKeyToAccount(values.FUJI_PRIVATE_KEY);
};

async function balance(address) {
  const wei = await publicClient.getBalance({ address });
  console.log(`Saldo de ${address}: ${formatEther(wei)} AVAX (Fuji)`);
  return wei;
}

const command = process.argv[2];
if (command === "wallet") {
  if (!values.FUJI_PRIVATE_KEY) {
    writeEnv({ FUJI_PRIVATE_KEY: generatePrivateKey() });
    Object.assign(values, readEnv().values);
    console.log("Wallet de prueba creada y guardada en .env.local (no se sube al repositorio).");
  }
  const { address } = account();
  console.log(`Dirección del firmante: ${address}`);
  await balance(address);
  console.log(`\n1. Cargá AVAX de prueba en ${faucet}\n2. Después ejecutá: npm run fuji -- deploy`);
} else if (command === "balance") {
  await balance(account().address);
} else if (command === "deploy") {
  const signer = account();
  if ((await balance(signer.address)) === 0n) {
    console.error(`La wallet no tiene AVAX de prueba. Cargala en ${faucet} y reintentá.`);
    process.exit(1);
  }
  const wallet = createWalletClient({ account: signer, chain: avalancheFuji, transport: http(rpc) });
  console.log("Desplegando AnchorRegistry con esta wallet como escritor autorizado…");
  const hash = await wallet.deployContract({ abi: artifact.abi, bytecode: artifact.bytecode, args: [signer.address] });
  const receipt = await publicClient.waitForTransactionReceipt({ hash });
  if (receipt.status !== "success" || !receipt.contractAddress) throw new Error(`El despliegue revirtió: ${hash}`);
  writeEnv({ FUJI_CONTRACT_ADDRESS: receipt.contractAddress });
  const cost = receipt.gasUsed * receipt.effectiveGasPrice;
  console.log(`Contrato: ${receipt.contractAddress}\nTransacción: ${explorer}/tx/${hash}\nCosto: ${formatEther(cost)} AVAX\nGuardado en .env.local. Reiniciá npm run demo: la interfaz pasa a "Fuji en vivo".`);
} else if (command === "status") {
  if (!values.FUJI_CONTRACT_ADDRESS) {
    console.log("Sin contrato desplegado: el anclaje es simulado.");
  } else {
    const writer = await publicClient.readContract({ address: values.FUJI_CONTRACT_ADDRESS, abi: artifact.abi, functionName: "writer" });
    const signer = values.FUJI_PRIVATE_KEY ? account().address : undefined;
    console.log(`Contrato ${values.FUJI_CONTRACT_ADDRESS} · escritor ${writer}${signer ? ` · firmante local ${signer === writer ? "autorizado" : "NO autorizado"}` : ""}`);
    console.log(`${explorer}/address/${values.FUJI_CONTRACT_ADDRESS}`);
    if (signer) await balance(signer);
  }
} else {
  console.error("Uso: npm run fuji -- wallet | balance | deploy | status");
  process.exitCode = 1;
}
