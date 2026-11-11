import { ethers } from "ethers";
import info from "./contract-info.json";
import deployments from "./deployments.json";

export const NETWORKS = {
  31337: { chainId: 31337, chainHex: "0x7a69", name: "Hardhat Local", rpcUrl: deployments[31337].rpcUrl, nativeCurrency: { name: "ETH", symbol: "ETH", decimals: 18 } },
  11155111: { chainId: 11155111, chainHex: "0xaa36a7", name: "Sepolia", rpcUrl: import.meta.env.VITE_SEPOLIA_RPC_URL || deployments[11155111].rpcUrl, nativeCurrency: { name: "SepoliaETH", symbol: "ETH", decimals: 18 } }
};
let activeChainId = 31337;
export const short = address => address ? `${address.slice(0, 6)}…${address.slice(-4)}` : "—";
export const eth = value => Number(ethers.formatEther(value)).toLocaleString("fr-FR", { maximumFractionDigits: 4 });
export const imageUrl = value => value?.startsWith("ipfs://") ? `https://gateway.pinata.cloud/ipfs/${value.slice(7)}` : value;
export const supportedNetwork = chainId => NETWORKS[Number(chainId)];
export const deploymentFor = chainId => deployments[String(chainId)];
export function setActiveChain(chainId) { if (!supportedNetwork(chainId)) throw Error("Réseau non pris en charge. Sélectionnez Hardhat Local ou Sepolia dans MetaMask."); activeChainId = Number(chainId); }
export function activeNetwork() { return NETWORKS[activeChainId]; }
function contractAddress(chainId) { const address = deploymentFor(chainId)?.address; if (!ethers.isAddress(address || "")) throw Error(`Contrat non déployé sur ${supportedNetwork(chainId)?.name || "ce réseau"}.`); return address; }
function rpcProvider(chainId) { const network = supportedNetwork(chainId); if (!network?.rpcUrl) throw Error(`RPC ${network?.name || "réseau"} absent. Configurez VITE_SEPOLIA_RPC_URL dans .env puis relancez Vite.`); return new ethers.JsonRpcProvider(network.rpcUrl); }
export async function readContract(chainId = activeChainId) { return new ethers.Contract(contractAddress(chainId), info.abi, rpcProvider(chainId)); }
export async function walletContract() {
  if (!window.ethereum) throw Error("MetaMask est introuvable.");
  const provider = new ethers.BrowserProvider(window.ethereum);
  const network = await provider.getNetwork(); setActiveChain(network.chainId);
  const signer = await provider.getSigner();
  return { contract: new ethers.Contract(contractAddress(network.chainId), info.abi, signer), signer, provider, network };
}
export async function switchNetwork(chainId) {
  if (!window.ethereum) throw Error("MetaMask est introuvable.");
  const network = supportedNetwork(chainId); if (!network) throw Error("Réseau non pris en charge.");
  try { await window.ethereum.request({ method: "wallet_switchEthereumChain", params: [{ chainId: network.chainHex }] }); }
  catch (error) {
    if (error.code !== 4902) throw error;
    if (!network.rpcUrl) throw Error(`Ajoutez ${network.name} manuellement dans MetaMask : son RPC frontend n’est pas configuré.`);
    await window.ethereum.request({ method: "wallet_addEthereumChain", params: [{ chainId: network.chainHex, chainName: network.name, rpcUrls: [network.rpcUrl], nativeCurrency: network.nativeCurrency }] });
  }
}
