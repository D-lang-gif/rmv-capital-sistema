/**
 * Banca Soberana · STP / SPEI (solo administrador "soberano").
 * Firestore (reglas: match /soberano/{ruta=**} → esAdmin()):
 *   soberano/stp                      (doc) campo config: { empresa, cuentaOrdenante, ambiente, relay }
 *   soberano/stp/ordenes/{claveRastreo}
 *   soberano/stp/abonos/{claveRastreo}
 * La llave privada de STP NUNCA se guarda en Firestore ni en el navegador: la firma RSA-SHA256
 * la realiza el servidor relay (carpeta servidor_stp/).
 */
import { collection, doc, getDoc, getDocs, limit, orderBy, query, runTransaction, setDoc, writeBatch } from "firebase/firestore";
import { db } from "@/lib/firebase/app";

const refStp = () => doc(db, "soberano", "stp");
const colOrdenes = () => collection(db, "soberano", "stp", "ordenes");
const colAbonos = () => collection(db, "soberano", "stp", "abonos");
const colOperaciones = () => collection(db, "soberano", "pasarela", "operaciones");
const ahora = () => new Date().toISOString();

/* ─────────── Catálogo de instituciones (clave SPEI) ─────────── */
export const INSTITUCIONES: Array<{ clave: string; nombre: string }> = [
  { clave: "40002", nombre: "BANAMEX" },
  { clave: "40012", nombre: "BBVA MEXICO" },
  { clave: "40014", nombre: "SANTANDER" },
  { clave: "40021", nombre: "HSBC" },
  { clave: "40030", nombre: "BAJIO" },
  { clave: "40036", nombre: "INBURSA" },
  { clave: "40044", nombre: "SCOTIABANK" },
  { clave: "40058", nombre: "BANREGIO" },
  { clave: "40072", nombre: "BANORTE" },
  { clave: "40127", nombre: "AZTECA" },
  { clave: "40137", nombre: "BANCOPPEL" },
  { clave: "40138", nombre: "UALA" },
  { clave: "40152", nombre: "BANCREA" },
  { clave: "40166", nombre: "BANCO DEL BIENESTAR" },
  { clave: "90638", nombre: "NU MEXICO" },
  { clave: "90646", nombre: "STP" },
  { clave: "90722", nombre: "MERCADO PAGO W" },
];

/** Deriva la institución a partir de los 3 primeros dígitos de la CLABE. */
export function institucionDeClabe(clabe: string): string | null {
  if (clabe.length < 3) return null;
  const p = clabe.slice(0, 3);
  return INSTITUCIONES.find((i) => i.clave.slice(2) === p)?.clave ?? null;
}

/** Valida CLABE de 18 dígitos con dígito verificador (pesos 3,7,1). */
export function clabeValida(clabe: string): boolean {
  if (!/^\d{18}$/.test(clabe)) return false;
  const pesos = [3, 7, 1];
  let suma = 0;
  for (let i = 0; i < 17; i++) suma += (Number(clabe[i]) * pesos[i % 3]) % 10;
  return (10 - (suma % 10)) % 10 === Number(clabe[17]);
}

/* ─────────── Configuración ─────────── */
export type Ambiente = "pruebas" | "produccion";
export type ConfigStp = { empresa: string; cuentaOrdenante: string; ambiente: Ambiente; relay: string; actualizado_at?: string };
export const CONFIG_VACIA: ConfigStp = { empresa: "", cuentaOrdenante: "", ambiente: "pruebas", relay: "" };

export async function leerConfig(): Promise<ConfigStp> {
  const s = await getDoc(refStp());
  return { ...CONFIG_VACIA, ...((s.data()?.config as Partial<ConfigStp>) ?? {}) };
}
export async function guardarConfig(c: ConfigStp): Promise<void> {
  const limpia: ConfigStp = {
    empresa: c.empresa.trim().toUpperCase(),
    cuentaOrdenante: c.cuentaOrdenante.trim(),
    ambiente: c.ambiente === "produccion" ? "produccion" : "pruebas",
    relay: c.relay.trim().replace(/\/+$/, ""),
    actualizado_at: ahora(),
  };
  await conTiempo(setDoc(refStp(), { config: limpia }, { merge: true }));
}

/* ─────────── Órdenes (registraOrden) ─────────── */
export type OrdenStp = {
  claveRastreo: string;
  conceptoPago: string;
  cuentaBeneficiario: string;
  nombreBeneficiario: string;
  rfcCurpBeneficiario: string;
  institucionContraparte: string;
  institucionOperante: string;
  monto: number;
  referenciaNumerica: number;
  tipoPago: number;
  tipoCuentaBeneficiario: number;
  tipoCuentaOrdenante: number;
  cuentaOrdenante: string;
  empresa: string;
  cadenaOriginal: string;
  estado: string;
  stp_id: string | null;
  respuesta: string | null;
  creado_at: string;
  enviado_at: string | null;
};
export type NuevaOrden = Pick<OrdenStp, "conceptoPago" | "cuentaBeneficiario" | "nombreBeneficiario" | "rfcCurpBeneficiario" | "institucionContraparte" | "monto" | "referenciaNumerica">;

export function nuevaClaveRastreo(): string {
  const d = new Date();
  const f = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
  const r = Array.from(crypto.getRandomValues(new Uint8Array(6)), (b) => (b % 36).toString(36)).join("").toUpperCase();
  return `RMV${f}${r}`;
}
export const nuevaReferencia = () => 1000000 + (crypto.getRandomValues(new Uint32Array(1))[0] % 9000000);

/**
 * Orden de campos de la cadena original de registraOrden, tal como la documenta STP y la
 * implementa el cliente público stpmex-python (stpmex/auth.py → ORDEN_FIELDNAMES, join_fields):
 * "||" + campos unidos con "|" + "||"; vacíos como ""; monto con 2 decimales.
 * Fuentes: https://stpmex.zendesk.com/hc/es (Manual API STP) ·
 *          https://github.com/cuenca-mx/stpmex-python/blob/main/stpmex/auth.py
 */
export const ORDEN_CAMPOS = [
  "institucionContraparte", "empresa", "fechaOperacion", "folioOrigen", "claveRastreo", "institucionOperante",
  "monto", "tipoPago", "tipoCuentaOrdenante", "nombreOrdenante", "cuentaOrdenante", "rfcCurpOrdenante",
  "tipoCuentaBeneficiario", "nombreBeneficiario", "cuentaBeneficiario", "rfcCurpBeneficiario", "emailBeneficiario",
  "tipoCuentaBeneficiario2", "nombreBeneficiario2", "cuentaBeneficiario2", "rfcCurpBeneficiario2",
  "conceptoPago", "conceptoPago2", "claveCatUsuario1", "claveCatUsuario2", "clavePago", "referenciaCobranza",
  "referenciaNumerica", "tipoOperacion", "topologia", "usuario", "medioEntrega", "prioridad", "iva",
] as const;

export function cadenaOriginal(o: Record<string, unknown>): string {
  const v = ORDEN_CAMPOS.map((k) => {
    const x = o[k];
    if (x === undefined || x === null) return "";
    if (k === "monto") return Number(x).toFixed(2);
    return String(x);
  });
  return `||${v.join("|")}||`;
}

export function armarOrden(n: NuevaOrden, cfg: ConfigStp, claveRastreo: string): Omit<OrdenStp, "estado" | "stp_id" | "respuesta" | "creado_at" | "enviado_at"> {
  const base = {
    claveRastreo,
    conceptoPago: n.conceptoPago.trim(),
    cuentaBeneficiario: n.cuentaBeneficiario.trim(),
    nombreBeneficiario: n.nombreBeneficiario.trim(),
    rfcCurpBeneficiario: n.rfcCurpBeneficiario.trim().toUpperCase() || "ND",
    institucionContraparte: n.institucionContraparte,
    institucionOperante: "90646",
    monto: Math.round(n.monto * 100) / 100,
    referenciaNumerica: n.referenciaNumerica,
    tipoPago: 1,
    tipoCuentaBeneficiario: 40,
    tipoCuentaOrdenante: 40,
    cuentaOrdenante: cfg.cuentaOrdenante,
    empresa: cfg.empresa,
  };
  return { ...base, cadenaOriginal: cadenaOriginal(base) };
}

/** Evita esperas infinitas cuando la nube no responde (sin sesión o sin red). */
function conTiempo<T>(p: Promise<T>, ms = 15000): Promise<T> {
  return Promise.race([p, new Promise<T>((_, rej) => setTimeout(() => rej(Object.assign(new Error("La nube no respondió. Revisa tu conexión e inicia sesión de nuevo como soberano."), { code: "unavailable" })), ms))]);
}

export async function guardarOrden(o: ReturnType<typeof armarOrden>): Promise<OrdenStp> {
  const r: OrdenStp = { ...o, estado: "PENDIENTE_FIRMA", stp_id: null, respuesta: null, creado_at: ahora(), enviado_at: null };
  await conTiempo(setDoc(doc(colOrdenes(), r.claveRastreo), r));
  return r;
}

export async function listarOrdenes(): Promise<OrdenStp[]> {
  const s = await getDocs(query(colOrdenes(), orderBy("creado_at", "desc"), limit(300)));
  return s.docs.map((d) => d.data() as OrdenStp);
}

/** POST al relay; guarda id y estado devueltos. */
export async function enviarAStp(relay: string, o: OrdenStp): Promise<OrdenStp> {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { estado, stp_id, respuesta, creado_at, enviado_at, cadenaOriginal: _c, ...payload } = o;
  let cuerpo: Record<string, unknown> = {};
  let nuevoEstado = "ERROR_ENVIO";
  try {
    const res = await fetch(`${relay}/stp/registraOrden`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    cuerpo = await res.json().catch(() => ({}));
    if (res.ok) nuevoEstado = String(cuerpo.estado ?? "ENVIADA");
  } catch (e) {
    cuerpo = { error: e instanceof Error ? e.message : String(e) };
  }
  const id = cuerpo.id ?? (cuerpo.resultado as { id?: unknown } | undefined)?.id;
  const act = { estado: nuevoEstado, stp_id: id != null ? String(id) : null, respuesta: JSON.stringify(cuerpo).slice(0, 2000), enviado_at: ahora() };
  await conTiempo(setDoc(doc(colOrdenes(), o.claveRastreo), act, { merge: true }));
  return { ...o, ...act };
}

/* ─────────── Abonos recibidos ─────────── */
export type AbonoStp = { claveRastreo: string; fechaOperacion: string; monto: number; ordenante: string; concepto: string; conciliado: boolean; folio_pasarela: string | null; importado_at: string };

export async function listarAbonos(): Promise<AbonoStp[]> {
  const s = await getDocs(query(colAbonos(), orderBy("fechaOperacion", "desc"), limit(300)));
  return s.docs.map((d) => d.data() as AbonoStp);
}

function partir(l: string): string[] {
  const sep = l.includes(";") && !l.includes(",") ? ";" : ",";
  const out: string[] = [];
  let cur = "", q = false;
  for (const c of l) {
    if (c === '"') q = !q;
    else if (c === sep && !q) { out.push(cur); cur = ""; }
    else cur += c;
  }
  out.push(cur);
  return out.map((x) => x.trim());
}

/** CSV: fechaOperacion,claveRastreo,monto,ordenante,concepto (encabezado opcional). */
export function parsearCsvAbonos(texto: string): { abonos: Array<Omit<AbonoStp, "conciliado" | "folio_pasarela" | "importado_at">>; errores: number } {
  const lineas = texto.replace(/^\uFEFF/, "").split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  let idx = { fecha: 0, clave: 1, monto: 2, ordenante: 3, concepto: 4 };
  if (lineas.length && /fecha|clave/i.test(lineas[0])) {
    const h = partir(lineas.shift()!).map((x) => x.toLowerCase());
    const f = (n: string, d: number) => { const i = h.findIndex((x) => x.startsWith(n)); return i < 0 ? d : i; };
    idx = { fecha: f("fecha", 0), clave: f("clave", 1), monto: f("monto", 2), ordenante: f("ordenante", 3), concepto: f("concepto", 4) };
  }
  const abonos: Array<Omit<AbonoStp, "conciliado" | "folio_pasarela" | "importado_at">> = [];
  let errores = 0;
  for (const l of lineas) {
    const c = partir(l);
    const monto = Number((c[idx.monto] ?? "").replace(/[$\s,]/g, ""));
    const clave = (c[idx.clave] ?? "").replace(/[^\w-]/g, "");
    const fecha = c[idx.fecha] ?? "";
    if (!clave || !Number.isFinite(monto) || !fecha) { errores++; continue; }
    abonos.push({ fechaOperacion: fecha, claveRastreo: clave, monto, ordenante: c[idx.ordenante] ?? "", concepto: c[idx.concepto] ?? "" });
  }
  return { abonos, errores };
}

/** Importa sin sobrescribir el estado de conciliación de abonos ya existentes. */
export async function importarAbonos(abonos: ReturnType<typeof parsearCsvAbonos>["abonos"]): Promise<number> {
  const existentes = new Set((await listarAbonos()).map((a) => a.claveRastreo));
  const nuevos = abonos.filter((a) => !existentes.has(a.claveRastreo));
  const importado_at = ahora();
  for (let i = 0; i < nuevos.length; i += 400) {
    const b = writeBatch(db);
    for (const a of nuevos.slice(i, i + 400)) b.set(doc(colAbonos(), a.claveRastreo), { ...a, conciliado: false, folio_pasarela: null, importado_at });
    await b.commit();
  }
  return nuevos.length;
}

/**
 * Concilia abonos con soberano/pasarela/operaciones: coincide monto (±0.005) y
 * referencia_externa === claveRastreo (o folio === claveRastreo). Idempotente.
 */
export async function conciliarConPasarela(): Promise<{ conciliados: number; sinCoincidencia: number; yaConciliados: number }> {
  const abonos = await listarAbonos();
  const ops = (await getDocs(query(colOperaciones(), limit(1000)))).docs.map((d) => d.data() as { folio: string; monto: number; referencia_externa?: string; conciliado?: boolean });
  let conciliados = 0, sinCoincidencia = 0, yaConciliados = 0;
  for (const a of abonos) {
    if (a.conciliado) { yaConciliados++; continue; }
    const op = ops.find((o) => Math.abs(Number(o.monto) - a.monto) < 0.005 && ((o.referencia_externa ?? "").trim() === a.claveRastreo || o.folio === a.claveRastreo));
    if (!op) { sinCoincidencia++; continue; }
    const fecha = ahora();
    await runTransaction(db, async (tx) => {
      const rA = doc(colAbonos(), a.claveRastreo), rO = doc(colOperaciones(), op.folio);
      const [sA, sO] = [await tx.get(rA), await tx.get(rO)];
      if (!sA.data()?.conciliado) tx.update(rA, { conciliado: true, folio_pasarela: op.folio, conciliado_at: fecha });
      if (sO.exists() && !sO.data().conciliado) tx.update(rO, { conciliado: true, estado: "CONCILIADO", fecha_conciliacion: fecha });
    });
    conciliados++;
  }
  return { conciliados, sinCoincidencia, yaConciliados };
}

export function estadisticasStp(ordenes: OrdenStp[], abonos: AbonoStp[]) {
  const enviadas = ordenes.filter((o) => o.stp_id);
  return {
    total_enviado: enviadas.reduce((s, o) => s + o.monto, 0),
    pendientes: ordenes.filter((o) => o.estado === "PENDIENTE_FIRMA" || o.estado === "ERROR_ENVIO").length,
    abonos: abonos.length,
    monto_abonos: abonos.reduce((s, a) => s + a.monto, 0),
  };
}
