import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const root = dirname(fileURLToPath(import.meta.url));
const staticDemo = process.env.VITE_STATIC_DEMO === "true";

export default defineConfig({
  plugins: [react()],
  root,
  envPrefix: "VITE_",
  define: {
    "import.meta.env.VITE_STATIC_DEMO": JSON.stringify(staticDemo ? "true" : "false"),
  },
  build: {
    outDir: staticDemo ? "dist-static" : "dist",
    emptyOutDir: true,
  },
  server: {
    host: "127.0.0.1",
    port: 43141,
    strictPort: true,
  },
});
