/**
 * Paso final del build: ofusca los .js de sitio/assets (javascript-obfuscator) y les pone el aviso de
 * derechos de autor. Vite ya los minifica y no genera mapas de código (sourcemap: false).
 * Nota honesta: el código que corre en el navegador se puede volver difícil de leer, no imposible.
 */
import { readdirSync, readFileSync, writeFileSync, rmSync } from "node:fs";
import { join, resolve } from "node:path";
import JavaScriptObfuscator from "javascript-obfuscator";

const ASSETS = resolve(import.meta.dirname, "..", "sitio", "assets");
const AVISO =
  "/*! RMV Capital · © 2026 Raúl Muñoz Villa. Todos los derechos reservados. " +
  "Prohibida su copia, modificación o reutilización sin permiso escrito del autor. */\n";

const OPCIONES = {
  compact: true,
  target: "browser",
  identifierNamesGenerator: "hexadecimal",
  renameGlobals: false,
  stringArray: true,
  stringArrayEncoding: ["base64"],
  stringArrayThreshold: 0.75,
  stringArrayRotate: true,
  stringArrayShuffle: true,
  stringArrayWrappersCount: 1,
  splitStrings: false,
  controlFlowFlattening: false,
  deadCodeInjection: false,
  selfDefending: false,
  debugProtection: false,
  disableConsoleOutput: false,
  numbersToExpressions: false,
  transformObjectKeys: false,
  unicodeEscapeSequence: false,
  sourceMap: false,
  seed: 2026,
};

let n = 0;
for (const nombre of readdirSync(ASSETS)) {
  const ruta = join(ASSETS, nombre);
  if (nombre.endsWith(".map")) {
    rmSync(ruta);
    continue;
  }
  if (!nombre.endsWith(".js")) continue;
  const original = readFileSync(ruta, "utf8");
  const ofuscado = JavaScriptObfuscator.obfuscate(original, OPCIONES).getObfuscatedCode();
  writeFileSync(ruta, AVISO + ofuscado);
  n++;
  console.log(`ofuscado ${nombre}: ${original.length} → ${ofuscado.length + AVISO.length} bytes`);
}
if (n === 0) {
  console.error("No se encontró ningún .js en sitio/assets");
  process.exit(1);
}
