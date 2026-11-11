require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();
const networks = { hardhat: { chainId: 31337 }, localhost: { url: "http://127.0.0.1:8545" } };
if (process.env.SEPOLIA_RPC_URL && process.env.SEPOLIA_PRIVATE_KEY) networks.sepolia = { chainId: 11155111, url: process.env.SEPOLIA_RPC_URL, accounts: [process.env.SEPOLIA_PRIVATE_KEY] };
module.exports = { solidity: { version: "0.8.20", settings: { optimizer: { enabled: true, runs: 200 }, viaIR: true } }, networks, etherscan: { apiKey: process.env.ETHERSCAN_API_KEY || "" } };
