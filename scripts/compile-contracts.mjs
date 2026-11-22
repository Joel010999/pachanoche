import fs from "node:fs";
import path from "node:path";
import solc from "solc";

const contractPath = path.resolve("chain/contracts/AnchorRegistry.sol");
const source = fs.readFileSync(contractPath, "utf-8");

const input = {
  language: "Solidity",
  sources: {
    "AnchorRegistry.sol": {
      content: source,
    },
  },
  settings: {
    optimizer: {
      enabled: true,
      runs: 200,
    },
    outputSelection: {
      "*": {
        "*": ["abi", "evm.bytecode"],
      },
    },
  },
};

console.log("Compiling AnchorRegistry.sol with solc...");
const output = JSON.parse(solc.compile(JSON.stringify(input)));

if (output.errors) {
  let hasErrors = false;
  for (const error of output.errors) {
    console.error(error.formattedMessage);
    if (error.severity === "error") {
      hasErrors = true;
    }
  }
  if (hasErrors) {
    process.exit(1);
  }
}

const contract = output.contracts["AnchorRegistry.sol"]["AnchorRegistry"];
const artifact = {
  contractName: "AnchorRegistry",
  abi: contract.abi,
  bytecode: contract.evm.bytecode.object,
};

// Guardar artefactos
const chainArtifactsDir = path.resolve("chain/artifacts");
const integrationDir = path.resolve("src/integrations/blockchain");

fs.mkdirSync(chainArtifactsDir, { recursive: true });
fs.mkdirSync(integrationDir, { recursive: true });

fs.writeFileSync(
  path.join(chainArtifactsDir, "AnchorRegistry.json"),
  JSON.stringify(artifact, null, 2)
);

fs.writeFileSync(
  path.join(integrationDir, "AnchorRegistry.json"),
  JSON.stringify(artifact, null, 2)
);

console.log("Compilation successful!");
console.log(`- Saved to: ${path.join(chainArtifactsDir, "AnchorRegistry.json")}`);
console.log(`- Exported to: ${path.join(integrationDir, "AnchorRegistry.json")}`);
