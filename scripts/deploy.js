const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

const deploymentsPath = path.join(__dirname, "../frontend/src/deployments.json");
const supportedChains = new Set([31337n, 11155111n]);

async function main() {
  const network = await hre.ethers.provider.getNetwork();
  const chainId = network.chainId;
  if (!supportedChains.has(chainId)) throw new Error(`Réseau non pris en charge (chain ID ${chainId}).`);
  if (chainId === 11155111n && process.env.CONFIRM_SEPOLIA_DEPLOY !== "true") {
    throw new Error("Déploiement Sepolia bloqué. Ajoutez CONFIRM_SEPOLIA_DEPLOY=true dans .env après autorisation explicite.");
  }
  const [expert] = await hre.ethers.getSigners();
  const balance = await hre.ethers.provider.getBalance(expert.address);
  if (balance === 0n) throw new Error("Le compte expert ne possède aucun ETH pour payer le gas.");
  console.log(`Réseau : ${network.name} (${chainId})`);
  console.log(`Expert / déployeur : ${expert.address}`);
  console.log(`Solde : ${hre.ethers.formatEther(balance)} ETH`);

  const Registre = await hre.ethers.getContractFactory("RegistreAntiquites", expert);
  const registre = await Registre.deploy();
  const transaction = registre.deploymentTransaction();
  console.log(`Transaction de déploiement : ${transaction.hash}`);
  await registre.waitForDeployment();
  const address = await registre.getAddress();

  const deployments = JSON.parse(fs.readFileSync(deploymentsPath, "utf8"));
  const key = chainId.toString();
  deployments[key] = { ...deployments[key], address };
  fs.writeFileSync(deploymentsPath, JSON.stringify(deployments, null, 2) + "\n");
  console.log(`Registre déployé : ${address}`);
  console.log("Adresse frontend mise à jour pour ce réseau uniquement.");
}
main().catch(error => { console.error(error.message || error); process.exitCode = 1; });
