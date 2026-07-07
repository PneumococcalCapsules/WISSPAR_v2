import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "node:path";
import { readFile } from "node:fs/promises";

// Dev-only: serve the repo's ../data folder at /data/* so `npm run dev` can load
// the same JSON the deployed Quarto site serves. Not used in the production build.
function serveRepoData(): Plugin {
  return {
    name: "serve-repo-data",
    apply: "serve",
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (!req.url || !req.url.startsWith("/data/")) return next();
        try {
          const rel = req.url.split("?")[0].replace(/^\/data\//, "");
          const buf = await readFile(resolve(__dirname, "../data", rel));
          res.setHeader("Content-Type", "application/json");
          res.end(buf);
        } catch {
          next();
        }
      });
    },
  };
}

// Builds the interactive tool into ../assets/app as a self-contained bundle.
// The Quarto page (graphical-view.qmd) loads assets/app/wisspar.js + wisspar.css
// with its own <script>/<link> tags, so we use relative asset URLs (base: './')
// and stable output filenames.
export default defineConfig({
  base: "./",
  plugins: [react(), serveRepoData()],
  build: {
    outDir: resolve(__dirname, "../assets/app"),
    emptyOutDir: true,
    sourcemap: false,
    rollupOptions: {
      // Build the module entry directly (not index.html) so the output folder
      // only contains wisspar.js + wisspar.css — the Quarto page provides the HTML.
      input: resolve(__dirname, "src/main.tsx"),
      output: {
        inlineDynamicImports: true,
        entryFileNames: "wisspar.js",
        assetFileNames: "wisspar.[ext]",
      },
    },
  },
});
