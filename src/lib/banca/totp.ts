/** Token dinámico de 6 dígitos (TOTP, RFC 6238: HMAC-SHA1, ventana de 30 s). */
const CLAVE = "rmv-banca-token-secreto";

function secreto(): Uint8Array<ArrayBuffer> {
  try {
    const s = localStorage.getItem(CLAVE);
    if (s) {
      const bytes = Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
      if (bytes.length === 20) return new Uint8Array(bytes.buffer as ArrayBuffer);
    }
  } catch {
    /* sin almacenamiento */
  }
  const nuevo = crypto.getRandomValues(new Uint8Array(new ArrayBuffer(20)));
  try {
    localStorage.setItem(CLAVE, btoa(String.fromCharCode(...nuevo)));
  } catch {
    /* sin almacenamiento */
  }
  return nuevo;
}

export const PERIODO = 30;

export async function codigoTotp(ahoraMs = Date.now()): Promise<string> {
  const contador = Math.floor(ahoraMs / 1000 / PERIODO);
  const msg = new ArrayBuffer(8);
  const view = new DataView(msg);
  view.setUint32(0, Math.floor(contador / 2 ** 32));
  view.setUint32(4, contador >>> 0);
  const key = await crypto.subtle.importKey("raw", secreto(), { name: "HMAC", hash: "SHA-1" }, false, ["sign"]);
  const h = new Uint8Array(await crypto.subtle.sign("HMAC", key, msg));
  const off = h[h.length - 1] & 0x0f;
  const bin = ((h[off] & 0x7f) << 24) | (h[off + 1] << 16) | (h[off + 2] << 8) | h[off + 3];
  return String(bin % 1_000_000).padStart(6, "0");
}

export function segundosRestantes(ahoraMs = Date.now()): number {
  return PERIODO - (Math.floor(ahoraMs / 1000) % PERIODO);
}
