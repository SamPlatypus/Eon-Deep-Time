import { resolve } from "node:path";
import { defineConfig } from "vite";
import viteReact from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

/** Static bundle for GitHub Pages at /Eon-Deep-Time/. The dev server stays on the TanStack app. */
export default defineConfig({
  base: "/Eon-Deep-Time/",
  publicDir: "public",
  resolve: { tsconfigPaths: true },
  plugins: [tailwindcss(), viteReact()],
  build: {
    outDir: "dist-pages",
    emptyOutDir: true,
    rollupOptions: {
      input: resolve("index.pages.html"),
    },
  },
});
