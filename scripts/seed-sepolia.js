const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  const network = await hre.ethers.provider.getNetwork();
  if (network.chainId !== 11155111n) throw new Error("Ce script est réservé à Sepolia (chain ID 11155111).");
  if (process.env.CONFIRM_SEPOLIA_SEED !== "true") throw new Error("Seed Sepolia bloqué. Ajoutez CONFIRM_SEPOLIA_SEED=true dans .env après vérification.");
  const owners = [process.env.SEPOLIA_OWNER_1, process.env.SEPOLIA_OWNER_2, process.env.SEPOLIA_OWNER_3];
  if (owners.some(address => !hre.ethers.isAddress(address || ""))) throw new Error("Configurez trois adresses Sepolia valides : SEPOLIA_OWNER_1, _2, _3.");
  const deployments = JSON.parse(fs.readFileSync(path.join(__dirname, "../frontend/src/deployments.json"), "utf8"));
  const address = deployments["11155111"]?.address;
  if (!hre.ethers.isAddress(address || "")) throw new Error("Contrat Sepolia absent : déployez-le d’abord.");
  const [expert] = await hre.ethers.getSigners();
  const registre = await hre.ethers.getContractAt("RegistreAntiquites", address, expert);
  if (await registre.nombreObjets() !== 0n) throw new Error("Seed annulé : le registre Sepolia contient déjà des objets.");
  const objets = JSON.parse(fs.readFileSync(path.join(__dirname, "../data/objets.json"), "utf8"));
  console.log(`Expert : ${expert.address}. Enregistrement contrôlé de ${objets.length} objets…`);
  for (const [index, objet] of objets.entries()) {
    const tx = await registre.enregistrerObjet(objet.nom, objet.origine, objet.epoque, objet.description, objet.imageUrl, objet.sourceUrl, owners[index % owners.length]);
    await tx.wait(); console.log(`Objet ${index + 1}/${objets.length} confirmé : ${tx.hash}`);
  }
}
main().catch(error => { console.error(error.message || error); process.exitCode = 1; });
