import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { crx } from "@crxjs/vite-plugin";
import { viteStaticCopy } from "vite-plugin-static-copy";
import path from "node:path";
import manifest from "./src/manifest";

export default defineConfig({
  plugins: [
    react(),
    crx({ manifest }),
    viteStaticCopy({
      // eng.traineddata.gz lives in public/tesseract/ (vite copies public/ automatically).
      // Only pull the runtime worker + wasm cores from node_modules here.
      targets: [
        {
          src: "node_modules/tesseract.js/dist/worker.min.js",
          dest: "tesseract",
        },
        {
          src: "node_modules/tesseract.js-core/tesseract-core*.{js,wasm}",
          dest: "tesseract",
        },
      ],
    }),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
      "@shared": path.resolve(__dirname, "src/shared"),
    },
  },
  server: { port: 5173, strictPort: true, hmr: { port: 5173 } },
  build: {
    target: "es2022",
    sourcemap: true,
    rollupOptions: {
      input: {
        popup: "src/popup/index.html",
        options: "src/options/index.html",
      },
    },
  },
});
