/**
 * Banca Soberana · utilidades criptográficas (Web Crypto) del módulo Pasarela y conciliación.
 * - Firma SHA-256 de operaciones de pasarela.
 * - Bóveda: AES-GCM con llave derivada por PBKDF2-SHA256 de la "clave de bóveda" (nunca se guarda).
 * - Firma HMAC-SHA256 del estado de cuenta con una llave derivada de la misma clave (sal distinta).
 */
const te = new TextEncoder();
const td = new TextDecoder();
export const ITERACIONES_BOVEDA = 310_000;

const hex = (b: ArrayBuffer) => [...new Uint8Array(b)].map((x) => x.toString(16).padStart(2, "0")).join("");
export const aB64 = (b: ArrayBuffer | Uint8Array) => btoa(String.fromCharCode(...new Uint8Array(b instanceof Uint8Array ? b : new Uint8Array(b))));
export const deB64 = (s: string) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));

/** Folio de pasarela: "PS-" + 12 hex en mayúsculas. */
export function folioPasarela(): string {
  const r = crypto.getRandomValues(new Uint8Array(6));
  return "PS-" + hex(r.buffer).toUpperCase();
}

/** JSON canónico (llaves ordenadas) para firmar. */
export function canonico(o: Record<string, unknown>): string {
  return JSON.stringify(Object.keys(o).sort().reduce<Record<string, unknown>>((a, k) => ((a[k] = o[k]), a), {}));
}

export async function sha256Hex(texto: string): Promise<string> {
  return hex(await crypto.subtle.digest("SHA-256", te.encode(texto)));
}

export async function hmacHex(llave: CryptoKey, texto: string): Promise<string> {
  return hex(await crypto.subtle.sign("HMAC", llave, te.encode(texto)));
}

export type LlavesBoveda = { cifrado: CryptoKey; firma: CryptoKey; salB64: string };

/** Deriva las llaves AES-GCM (cifrado) y HMAC-SHA256 (firma) a partir de la clave de bóveda y una sal. */
export async function derivarLlaves(claveBoveda: string, salB64?: string): Promise<LlavesBoveda> {
  const sal = salB64 ? deB64(salB64) : crypto.getRandomValues(new Uint8Array(16));
  const base = await crypto.subtle.importKey("raw", te.encode(claveBoveda), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt: sal, iterations: ITERACIONES_BOVEDA }, base, 512);
  const b = new Uint8Array(bits);
  const cifrado = await crypto.subtle.importKey("raw", b.slice(0, 32), "AES-GCM", false, ["encrypt", "decrypt"]);
  const firma = await crypto.subtle.importKey("raw", b.slice(32), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return { cifrado, firma, salB64: aB64(sal) };
}

export async function cifrar(llave: CryptoKey, texto: string): Promise<{ iv: string; datos: string }> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, llave, te.encode(texto));
  return { iv: aB64(iv), datos: aB64(ct) };
}

/** Lanza si la clave de bóveda no corresponde (la etiqueta GCM no valida). */
export async function descifrar(llave: CryptoKey, iv: string, datos: string): Promise<string> {
  return td.decode(await crypto.subtle.decrypt({ name: "AES-GCM", iv: deB64(iv) }, llave, deB64(datos)));
}

/** Muestra solo los últimos 4 dígitos. */
export function ultimos4(v: string): string {
  const d = v.replace(/\s|-/g, "");
  return d.length <= 4 ? "••••" : "•••• " + d.slice(-4);
}
