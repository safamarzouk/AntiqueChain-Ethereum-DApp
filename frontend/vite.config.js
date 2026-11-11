const path = require("path");
const { defineConfig, loadEnv } = require("vite");

module.exports = defineConfig(({ mode }) => {
  // Vite sert frontend/, tandis que .env demeure à la racine du projet.
  const projectRoot = path.resolve(__dirname, "..");
  const env = loadEnv(mode, projectRoot, "VITE_");
  return {
    envDir: projectRoot,
    define: { "import.meta.env.VITE_SEPOLIA_RPC_URL": JSON.stringify(env.VITE_SEPOLIA_RPC_URL || "") },
    server: { proxy: { "/api": "http://127.0.0.1:8787" } }
  };
});
