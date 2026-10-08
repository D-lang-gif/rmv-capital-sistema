import { CREDENCIAL } from "./credencial";

function b64ToBytes(b64: string): Uint8Array<ArrayBuffer> {
  const bin = atob(b64);
  const out = new Uint8Array(new ArrayBuffer(bin.length));
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

function toHex(buf: ArrayBuffer): string {
  return Array.from(new Uint8Array(buf), (b) => b.toString(16).padStart(2, "0")).join("");
}

/** Comparación en tiempo constante de dos cadenas hex. */
function igual(a: string, b: string): boolean {
  let dif = a.length ^ b.length;
  const n = Math.max(a.length, b.length);
  for (let i = 0; i < n; i++) dif |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0);
  return dif === 0;
}

export async function verificarAcceso(usuario: string, clave: string): Promise<boolean> {
  if (typeof crypto === "undefined" || !crypto.subtle) {
    throw new Error("sin-webcrypto");
  }
  const llave = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(clave),
    "PBKDF2",
    false,
    ["deriveBits"],
  );
  const bits = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      hash: "SHA-256",
      salt: b64ToBytes(CREDENCIAL.sal),
      iterations: CREDENCIAL.iteraciones,
    },
    llave,
    256,
  );
  const okHash = igual(toHex(bits), CREDENCIAL.hash);
  const okUser = usuario.trim().toLowerCase() === CREDENCIAL.usuario;
  return okHash && okUser;
}
