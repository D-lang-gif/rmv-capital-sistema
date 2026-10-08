/**
 * Build ESTÁTICO para GitHub Pages (https://d-lang-gif.github.io/rmv-capital-sistema/).
 *   npm run build:pages   →  sitio/  (solo html, js, css, svg; sin binarios)
 * - Sin TanStack Start / Nitro: las consultas Bitcoin van directo desde el navegador.
 * - Fuente Inter (solo subconjunto latino) incrustada en el CSS como texto (data: URI),
 *   para no publicar archivos binarios .woff2.
 * - 404.html = copia de index.html (respaldo SPA si alguien abre una ruta sin "#").
 */
import { copyFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import type { Plugin } from "vite";
import { defineConfig } from "vite";
import viteReact from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

const RAIZ = import.meta.dirname;
const SALIDA = resolve(RAIZ, "sitio");

/**
 * Ajustes del CSS solo para este build:
 *  - @fontsource/inter/NNN.css (todos los alfabetos, woff2 + woff) → una @font-face por peso
 *    con el subconjunto latino en woff2 (cubre todo el español). Vite la incrusta como data: URI.
 *  - @source "./" para que Tailwind lea las clases de src/ (la raíz de este build es estatico/).
 */
function cssPages(): Plugin {
  return {
    name: "rmv:css-pages",
    enforce: "pre",
    transform(code, id) {
      if (!id.split("?")[0].endsWith("/src/styles.css")) return null;
      const fuentes = code.replace(
        /@import "@fontsource\/inter\/(\d{3})\.css";/g,
        (_m, peso: string) =>
          `@font-face { font-family: "Inter"; font-style: normal; font-display: swap; font-weight: ${peso}; ` +
          `src: url("../node_modules/@fontsource/inter/files/inter-latin-${peso}-normal.woff2") format("woff2"); ` +
          `unicode-range: U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, ` +
          `U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD; }`,
      );
      return fuentes.replace('@import "tw-animate-css";', '@import "tw-animate-css";\n@source "./";');
    },
  };
}

/** Copia index.html → 404.html y agrega .nojekyll. */
function respaldoSpa(): Plugin {
  return {
    name: "rmv:respaldo-spa",
    apply: "build",
    closeBundle() {
      copyFileSync(resolve(SALIDA, "index.html"), resolve(SALIDA, "404.html"));
      writeFileSync(resolve(SALIDA, ".nojekyll"), "");
    },
  };
}

export default defineConfig({
  root: resolve(RAIZ, "estatico"),
  base: "/rmv-capital-sistema/",
  publicDir: resolve(RAIZ, "public"),
  envDir: RAIZ,
  resolve: { alias: { "@": resolve(RAIZ, "src") } },
  plugins: [cssPages(), tailwindcss(), viteReact(), respaldoSpa()],
  build: {
    outDir: SALIDA,
    emptyOutDir: true,
    // Todo lo que no sea JS/CSS se incrusta como texto (fuentes woff2 → base64 dentro del CSS).
    assetsInlineLimit: 400_000,
    sourcemap: false,
    chunkSizeWarningLimit: 1500,
  },
  server: { host: "127.0.0.1", port: 8098, strictPort: true },
  preview: { host: "127.0.0.1", port: 8099, strictPort: true },
});
