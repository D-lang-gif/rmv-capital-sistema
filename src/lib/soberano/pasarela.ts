/**
 * Banca Soberana · Pasarela y conciliación (solo administrador "soberano").
 * Firestore:
 *   soberano/pasarela/operaciones/{folio}
 *   soberano/bancomer/estados/{id}       (campos sensibles cifrados con AES-GCM en el navegador)
 *   soberano/atm/movimientos/{id}
 * Las reglas (firestore.rules) solo permiten leer/escribir a esAdmin().
 */
import { collection, doc, getDocs, limit, orderBy, query, runTransaction, setDoc, writeBatch } from "firebase/firestore";
import { db } from "@/lib/firebase/app";
import { canonico, cifrar, derivarLlaves, descifrar, folioPasarela, hmacHex, sha256Hex, type LlavesBoveda } from "./cripto";

const colOperaciones = () => collection(db, "soberano", "pasarela", "operaciones");
const colEstados = () => collection(db, "soberano", "bancomer", "estados");
const colAtm = () => collection(db, "soberano", "atm", "movimientos");
const ahora = () => new Date().toISOString();

/* ─────────── Pasarela ─────────── */
export type EstadoOperacion = "PENDIENTE" | "CONCILIADO" | "RECHAZADO" | "CANCELADO";
export const ESTADOS_OPERACION: EstadoOperacion[] = ["PENDIENTE", "CONCILIADO", "RECHAZADO", "CANCELADO"];

export type Operacion = {
  folio: string;
  origen: string;
  cuenta_origen: string;
  cuenta_destino: string;
  monto: number;
  moneda: string;
  concepto: string;
  estado: string;
  metodo: string;
  referencia_externa: string;
  firma: string;
  conciliado: boolean;
  fecha_operacion: string;
  fecha_conciliacion: string | null;
};
export type NuevaOperacion = Omit<Operacion, "folio" | "firma" | "conciliado" | "fecha_operacion" | "fecha_conciliacion" | "estado"> & { estado?: string };

export async function listarOperaciones(): Promise<Operacion[]> {
  const s = await getDocs(query(colOperaciones(), orderBy("fecha_operacion", "desc"), limit(500)));
  return s.docs.map((d) => d.data() as Operacion);
}

export async function registrarOperacion(n: NuevaOperacion): Promise<Operacion> {
  const base = {
    folio: folioPasarela(),
    origen: n.origen.trim(),
    cuenta_origen: n.cuenta_origen.trim(),
    cuenta_destino: n.cuenta_destino.trim(),
    monto: Math.round(n.monto * 100) / 100,
    moneda: (n.moneda || "MXN").trim().toUpperCase(),
    concepto: n.concepto.trim(),
    estado: n.estado || "PENDIENTE",
    metodo: n.metodo.trim(),
    referencia_externa: n.referencia_externa.trim(),
    fecha_operacion: ahora(),
  };
  const op: Operacion = { ...base, firma: await sha256Hex(canonico(base)), conciliado: false, fecha_conciliacion: null };
  await setDoc(doc(colOperaciones(), op.folio), op);
  return op;
}

/** Idempotente: si ya estaba conciliada devuelve "ya_conciliado" sin tocar el documento. */
export async function conciliarOperacion(folio: string): Promise<"ok" | "ya_conciliado"> {
  const ref = doc(colOperaciones(), folio);
  return runTransaction(db, async (tx) => {
    const s = await tx.get(ref);
    if (!s.exists()) throw new Error("El folio no existe.");
    if (s.data().conciliado === true) return "ya_conciliado" as const;
    tx.update(ref, { conciliado: true, estado: "CONCILIADO", fecha_conciliacion: ahora() });
    return "ok" as const;
  });
}

export function estadisticas(ops: Operacion[]) {
  return {
    total: ops.length,
    pendientes: ops.filter((o) => o.estado === "PENDIENTE").length,
    conciliados: ops.filter((o) => o.conciliado).length,
    monto_total: ops.reduce((a, o) => a + (Number(o.monto) || 0), 0),
  };
}

/* ─────────── Estado de cuenta Bancomer ─────────── */
export type DatosSensibles = {
  titular: string;
  beneficiario: string;
  cuenta_corriente: string;
  cuenta_inversion: string;
  tarjeta1: string;
  tarjeta2: string;
  saldo: string;
  fideicomiso: string;
};
export type EstadoBancomer = DatosSensibles & {
  id: string;
  fecha_apertura: string;
  archivo_origen: string;
  firma_hmac: string;
  importado_at: string;
};
type DocEstado = {
  sal: string;
  iv: string;
  cifrado: string;
  fecha_apertura: string;
  archivo_origen: string;
  firma_hmac: string;
  importado_at: string;
};

export async function guardarEstado(claveBoveda: string, d: DatosSensibles, fecha_apertura: string, archivo_origen: string): Promise<void> {
  const llaves = await derivarLlaves(claveBoveda);
  const plano = canonico({ ...d, fecha_apertura, archivo_origen });
  const { iv, datos } = await cifrar(llaves.cifrado, JSON.stringify(d));
  const importado_at = ahora();
  const reg: DocEstado = { sal: llaves.salB64, iv, cifrado: datos, fecha_apertura, archivo_origen, firma_hmac: await hmacHex(llaves.firma, plano), importado_at };
  await setDoc(doc(colEstados(), `EC-${Date.now()}`), reg);
}

/** Último estado de cuenta descifrado. null si no hay ninguno. Lanza si la clave de bóveda es incorrecta. */
export async function ultimoEstado(claveBoveda: string): Promise<(EstadoBancomer & { firmaValida: boolean }) | null> {
  const s = await getDocs(query(colEstados(), orderBy("importado_at", "desc"), limit(1)));
  if (s.empty) return null;
  const r = s.docs[0].data() as DocEstado;
  let llaves: LlavesBoveda;
  let d: DatosSensibles;
  try {
    llaves = await derivarLlaves(claveBoveda, r.sal);
    d = JSON.parse(await descifrar(llaves.cifrado, r.iv, r.cifrado));
  } catch {
    throw new Error("Clave de bóveda incorrecta.");
  }
  const firma = await hmacHex(llaves.firma, canonico({ ...d, fecha_apertura: r.fecha_apertura, archivo_origen: r.archivo_origen }));
  return { id: s.docs[0].id, ...d, fecha_apertura: r.fecha_apertura, archivo_origen: r.archivo_origen, firma_hmac: r.firma_hmac, importado_at: r.importado_at, firmaValida: firma === r.firma_hmac };
}

/* ─────────── Movimientos ATM ─────────── */
export type MovimientoAtm = { id: string; fecha_iso: string; tipo: string; monto: number; concepto: string; archivo_origen: string; importado_at: string };
export type NuevoAtm = Omit<MovimientoAtm, "id" | "importado_at">;

export async function listarAtm(): Promise<MovimientoAtm[]> {
  const s = await getDocs(query(colAtm(), orderBy("fecha_iso", "desc"), limit(100)));
  return s.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<MovimientoAtm, "id">) }));
}

export async function agregarAtm(movs: NuevoAtm[]): Promise<number> {
  const importado_at = ahora();
  for (let i = 0; i < movs.length; i += 400) {
    const b = writeBatch(db);
    for (const m of movs.slice(i, i + 400)) b.set(doc(colAtm()), { ...m, importado_at });
    await b.commit();
  }
  return movs.length;
}

/** CSV con columnas fecha,tipo,monto,concepto (encabezado opcional; separador "," o ";"). */
export function parsearCsvAtm(texto: string, archivo_origen: string): { movs: NuevoAtm[]; errores: number } {
  const lineas = texto.replace(/^\uFEFF/, "").split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const movs: NuevoAtm[] = [];
  let errores = 0;
  const partir = (l: string) => {
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
  };
  let idx = { fecha: 0, tipo: 1, monto: 2, concepto: 3 };
  if (lineas.length && /fecha/i.test(lineas[0])) {
    const h = partir(lineas.shift()!).map((x) => x.toLowerCase());
    const f = (n: string, d: number) => { const i = h.findIndex((x) => x.startsWith(n)); return i < 0 ? d : i; };
    idx = { fecha: f("fecha", 0), tipo: f("tipo", 1), monto: f("monto", 2), concepto: f("concepto", 3) };
  }
  for (const l of lineas) {
    const c = partir(l);
    const monto = Number((c[idx.monto] ?? "").replace(/[$\s,]/g, ""));
    const fecha = new Date(c[idx.fecha] ?? "");
    if (!Number.isFinite(monto) || Number.isNaN(fecha.getTime())) { errores++; continue; }
    movs.push({ fecha_iso: fecha.toISOString(), tipo: (c[idx.tipo] || "ATM").toUpperCase(), monto, concepto: c[idx.concepto] ?? "", archivo_origen });
  }
  return { movs, errores };
}
