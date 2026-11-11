import "./style.css";
import { ethers } from "ethers";
import { readContract, walletContract, switchNetwork, setActiveChain, activeNetwork, supportedNetwork, short, eth, imageUrl, IS_GITHUB_PAGES } from "./contract.js";

let registre, account = "", expert = "", selectedImage;
const $ = selector => document.querySelector(selector);
const esc = value => String(value).replace(/[&<>\"]/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[char]));
const toast = message => { const node = $("#toast"); node.textContent = message; node.classList.add("show"); setTimeout(() => node.classList.remove("show"), 4500); };
const metLocalImages = { 1: 468468, 2: 468469, 3: 468472, 4: 468471, 5: 468470, 6: 468467 };
const assetUrl = file => `${import.meta.env.BASE_URL}images/${file}`;
const fallbackImage = assetUrl("placeholder.svg");

function imageMarkup(obj, className = "") {
  if (!obj.imageUrl && !metLocalImages[Number(obj.id)]) return `<div class="noimage ${className}" role="img" aria-label="Image non fournie">AntiqueChain<br/><small>Image non fournie</small></div>`;
  const local = metLocalImages[Number(obj.id)] ? assetUrl(`${metLocalImages[Number(obj.id)]}.jpg`) : imageUrl(obj.imageUrl);
  const remote = imageUrl(obj.imageUrl);
  return `<img class="${className}" src="${esc(local)}" data-fallback="${esc(remote)}" data-placeholder="${fallbackImage}" alt="${esc(obj.nom)}"/>`;
}
document.addEventListener("error", event => {
  const img = event.target;
  if (!img.matches("img[data-fallback]")) return;
  const next = img.dataset.fallback && img.src !== img.dataset.fallback ? img.dataset.fallback : img.dataset.placeholder;
  delete img.dataset.fallback;
  img.src = next;
}, true);

async function load() {
  try {
    registre = await readContract(); expert = await registre.expert();
    $("#network").textContent = activeNetwork().name;
    const objets = await registre.listerObjets();
    $("#gallery").innerHTML = objets.map(card).join("") || "<p>Le registre est vide.</p>";
    if (location.hash.startsWith("#/objet/")) show(Number(location.hash.split("/").pop()));
  } catch (error) { $("#gallery").innerHTML = `<p class="error">${esc(error.message)}</p>`; }
}
function card(o) { return `<article class="card" data-id="${o.id}">${imageMarkup(o)}<div class="cardbody"><small>REGISTRE N°${o.id}</small><h3>${esc(o.nom)}</h3><p>${esc(o.origine)} · ${esc(o.epoque)}</p><div><span>${short(o.proprietaire)}</span>${o.enVente ? `<strong>En vente · ${eth(o.prix)} ETH</strong>` : ""}</div></div></article>`; }
function ownerActions(o) { return `<div class="actions"><div class="action-group"><label for="to">Transfert gratuit</label><input id="to" placeholder="Adresse destinataire"/><button type="button" id="transfer" data-id="${o.id}">Transférer</button></div>${o.enVente ? `<div class="action-group"><label>Vente</label><button type="button" id="remove" data-id="${o.id}">Retirer de la vente</button></div>` : `<div class="action-group"><label for="price">Mise en vente</label><input id="price" inputmode="decimal" placeholder="Prix en ETH"/><button type="button" id="sell" data-id="${o.id}">Mettre en vente</button></div>`}</div>`; }
async function show(id) {
  try {
    const o = await registre.consulterObjet(id), history = await registre.consulterHistorique(id);
    location.hash = `#/objet/${id}`;
    const isOwner = account && o.proprietaire.toLowerCase() === account.toLowerCase();
    const canBuy = account && o.enVente && !isOwner;
    $("#detail").innerHTML = `<div class="detailhead">${imageMarkup(o)}<div><small>REGISTRE N°${o.id}</small><h2>${esc(o.nom)}</h2><p>${esc(o.origine)} · ${esc(o.epoque)}</p><p>${esc(o.description)}</p><a href="${esc(o.sourceUrl)}" target="_blank">Voir la fiche officielle du Met ↗</a></div></div><hr/><p><b>Propriétaire</b> ${short(o.proprietaire)} · <b>Certifié par</b> ${short(o.certifiePar)}</p>${o.enVente ? `<p class="sale">En vente : ${eth(o.prix)} ETH</p>` : ""}${isOwner ? ownerActions(o) : canBuy ? `<button class="buy" data-id="${o.id}" data-price="${o.prix}">Acheter (${eth(o.prix)} ETH)</button>` : ""}<h3>Historique infalsifiable</h3><ol class="timeline">${history.map(x => `<li><b>${x.typeEvenement}</b><br/><span>${short(x.de)} → ${short(x.vers)}${x.prix > 0n ? ` · ${eth(x.prix)} ETH` : ""}</span><br/><small>${new Date(Number(x.date) * 1000).toLocaleString("fr-FR")}</small></li>`).join("")}</ol><p class="credit">Source : The Metropolitan Museum of Art, Open Access (domaine public). Legs d’Ada Small Moore, 1955.</p>`;
    $("#modal").showModal();
  } catch (error) { toast(error.message); }
}
async function tx(action) { try { toast("En attente de signature MetaMask…"); const { contract } = await walletContract(); const transaction = await action(contract); toast(`Transaction envoyée : ${short(transaction.hash)}`); await transaction.wait(); toast("Transaction confirmée."); await load(); if ($("#modal").open) await show(Number(location.hash.split("/").pop())); } catch (error) { toast(error.code === 4001 ? "Signature refusée par l’utilisateur." : `Action refusée : ${error.shortMessage || error.reason || error.message}`); } }
async function uploadImage(file) {
  const data = new FormData(); data.append("image", file);
  toast("Téléversement et épinglage IPFS en cours…");
  const response = await fetch("/api/ipfs", { method: "POST", body: data }); const body = await response.json();
  if (!response.ok) throw new Error(body.error || "Téléversement IPFS impossible.");
  return body.uri;
}

$("#gallery").onclick = event => { const card = event.target.closest(".card"); if (card) show(card.dataset.id); };
$("#close").onclick = () => $("#modal").close();
$("#detail").onclick = event => { const action = event.target.closest("button"); if (!action) return; const id = action.dataset.id; if (action.id === "transfer") tx(c => c.transfererPropriete(id, $("#to").value.trim())); else if (action.id === "sell") { const prix = $("#price").value.trim(); if (!prix) return toast("Indiquez un prix en ETH pour mettre l’objet en vente."); try { tx(c => c.mettreEnVente(id, ethers.parseEther(prix))); } catch { toast("Le prix doit être un nombre ETH valide."); } } else if (action.id === "remove") tx(c => c.retirerDeLaVente(id)); else if (action.classList.contains("buy")) tx(c => c.acheter(id, { value: action.dataset.price })); };
$("#searchBtn").onclick = () => { const id = Number($("#search").value); if (id) show(id); };
$("#imageFile").onchange = event => { const file = event.target.files[0]; const preview = $("#imagePreview"); selectedImage = undefined; preview.hidden = true; preview.replaceChildren(); if (!file) return; if (!["image/jpeg", "image/png", "image/webp"].includes(file.type) || file.size > 5 * 1024 * 1024) { event.target.value = ""; return toast("Choisissez une image JPG, PNG ou WebP de 5 Mo maximum."); } selectedImage = file; const img = document.createElement("img"); img.src = URL.createObjectURL(file); img.onload = () => URL.revokeObjectURL(img.src); preview.append(img); preview.hidden = false; };
if (IS_GITHUB_PAGES) { $(".file-picker").hidden = true; }
$("#expertForm").onsubmit = async event => { event.preventDefault(); try { const d = Object.fromEntries(new FormData(event.target)); const uri = selectedImage ? await uploadImage(selectedImage) : ""; tx(c => c.enregistrerObjet(d.nom, d.origine, d.epoque, d.description, uri, d.sourceUrl, d.proprietaire)); } catch (error) { toast(error.message); } };
// Ne force plus Hardhat : le réseau sélectionné dans MetaMask détermine le contrat actif.
$("#connect").onclick = async () => {
  try {
    if (!window.ethereum) throw Error("Installez MetaMask pour signer.");
    await window.ethereum.request({ method: "eth_requestAccounts" });
    const { provider, network } = await walletContract();
    if (!supportedNetwork(network.chainId)) throw Error("Réseau non pris en charge. Sélectionnez Hardhat Local ou Sepolia dans MetaMask.");
    setActiveChain(network.chainId);
    account = await (await provider.getSigner()).getAddress();
    $("#connect").textContent = short(account);
    await load();
    $("#network").textContent = `${activeNetwork().name} · ${account.toLowerCase() === expert.toLowerCase() ? "Expert" : "Propriétaire / acheteur"}`;
    $("#expertPanel").hidden = account.toLowerCase() !== expert.toLowerCase();
  } catch (error) { toast(error.message); }
};
document.querySelectorAll("[data-switch-network]").forEach(button => button.onclick = async () => {
  try {
    const chainId = Number(button.dataset.switchNetwork);
    if (account) await switchNetwork(chainId);
    else { setActiveChain(chainId); await load(); }
  }
  catch (error) { toast(error.code === 4001 ? "Changement de réseau refusé." : error.message); }
});
if (window.ethereum) { window.ethereum.on("accountsChanged", () => location.reload()); window.ethereum.on("chainChanged", () => location.reload()); }
load();
