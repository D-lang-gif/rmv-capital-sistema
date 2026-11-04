/**
 * Usuarios · Banca Soberana (nube: Firebase Auth + Firestore).
 * - Acceso: Firebase Email/Password con correo sintético <usuario>@rmv-banca-soberana.firebaseapp.com.
 *   Las contraseñas nunca se guardan en Firestore ni en este navegador.
 * - Cuentas "RMV-XXXX-XXXX" (hexadecimal; nunca una CLABE de 18 dígitos).
 * - Tarjetas "RMV 0000 #### ####" (no son un PAN válido).
 * - Colecciones: usuarios/{uid}, cuentas/{id} (con tarjeta incrustada), movimientos/{id}, config/admin.
 * - Escucha en vivo (onSnapshot): el administrador ve los cambios al instante.
 */
import { create } from "zustand";
import { createUserWithEmailAndPassword } from "firebase/auth";
import {
  collection,
  doc,
  onSnapshot,
  query,
  runTransaction,
  setDoc,
  updateDoc,
  where,
  writeBatch,
  type Unsubscribe,
} from "firebase/firestore";
import { limpiarClave } from "@/lib/acceso/verificar";
import { auth, conAppSecundaria, db } from "@/lib/firebase/app";
import { correoDe } from "@/lib/firebase/config";
import { nuevoFolio } from "./store";

export type TipoUsuario = "persona" | "negocio";
export type EstadoCuenta = "activa" | "suspendida";
export type EstadoTarjeta = "activa" | "bloqueada";
export type RolNube = "admin" | "usuario";

export type UsuarioInterno = {
  /** uid de Firebase Auth. */
  id: string;
  nombre: string;
  correo: string;
  telefono: string;
  tipo: TipoUsuario;
  usuario: string;
  rol: RolNube;
  estado: "activa" | "baja";
  /** El administrador pidió restablecer: debe cambiar la contraseña al entrar. */
  debeCambiarClave: boolean;
  alta: string;
  baja: string | null;
};

export type TarjetaNube = { numero: string; nombre: string; vence: string; estado: EstadoTarjeta; alta: string };

export type CuentaInterna = {
  id: string;
  usuarioId: string;
  numero: string;
  moneda: "MXN";
  saldo: number;
  estado: EstadoCuenta;
  alta: string;
  tarjeta: TarjetaNube | null;
};

/** Vista derivada de cuenta.tarjeta (id = id de la cuenta). */
export type TarjetaInterna = {
  id: string;
  cuentaId: string;
  numero: string;
  nombre: string;
  vencimiento: string;
  estado: EstadoTarjeta;
  alta: string;
};

export type TipoMovInterno = "ABONO" | "ENVIO" | "RECEPCION";
export type MovimientoInterno = {
  id: string;
  folio: string;
  cuentaId: string;
  uid: string;
  tipo: TipoMovInterno;
  monto: number;
  concepto: string;
  fecha: string;
};

export type EstadoNube = "inactiva" | "conectando" | "conectada" | "sin-conexion";

type UsuariosState = {
  usuarios: UsuarioInterno[];
  cuentas: CuentaInterna[];
  tarjetas: TarjetaInterna[];
  movimientos: MovimientoInterno[];
  nube: EstadoNube;
  errorNube: string | null;
  iniciar: (rol: RolNube, uid?: string | null) => void;
  detener: () => void;
  registrarUsuario: (
    u: Pick<UsuarioInterno, "nombre" | "correo" | "telefono" | "tipo" | "usuario">,
    claveTemporal: string,
  ) => Promise<UsuarioInterno>;
  darDeBaja: (id: string) => Promise<void>;
  /** Marca al usuario para que cambie su contraseña en el siguiente acceso. */
  pedirCambioClave: (id: string) => Promise<void>;
  emitirCuenta: (usuarioId: string) => Promise<void>;
  emitirTarjeta: (cuentaId: string) => Promise<void>;
  alternarTarjeta: (cuentaId: string) => Promise<void>;
  /** Abono interno (transacción: saldo + movimiento). Devuelve el folio. */
  abonarInterno: (cuentaId: string, monto: number) => Promise<string>;
  /** Transferencia entre cuentas internas (transacción). Devuelve el folio. */
  moverSaldo: (origenId: string, destinoId: string, monto: number) => Promise<string>;
};

const HEX = "0123456789ABCDEF";
function bloque(n = 4): string {
  const r = crypto.getRandomValues(new Uint8Array(n));
  return Array.from(r, (b) => HEX[b % 16]).join("");
}

export function numeroCuentaInterna(): string {
  return `RMV-${bloque()}-${bloque()}`;
}

export function numeroTarjetaInterna(): string {
  const d = crypto.getRandomValues(new Uint8Array(8));
  const dig = Array.from(d, (b) => String(b % 10)).join("");
  return `RMV 0000 ${dig.slice(0, 4)} ${dig.slice(4)}`;
}

function vencimientoTarjeta(): string {
  const d = new Date();
  return `${String(d.getMonth() + 1).padStart(2, "0")}/${String((d.getFullYear() + 3) % 100).padStart(2, "0")}`;
}

const redondear = (n: number) => Math.round(n * 100) / 100;
const ahora = () => new Date().toISOString();

/* eslint-disable @typescript-eslint/no-explicit-any */
function aUsuario(id: string, d: any): UsuarioInterno {
  return {
    id,
    nombre: d.nombre ?? "",
    correo: d.correo ?? "",
    telefono: d.telefono ?? "",
    tipo: d.tipo === "negocio" ? "negocio" : "persona",
    usuario: d.usuario ?? "",
    rol: d.rol === "admin" ? "admin" : "usuario",
    estado: d.estado === "baja" ? "baja" : "activa",
    debeCambiarClave: d.debeCambiarClave === true,
    alta: d.creadoEn ?? "",
    baja: d.estado === "baja" ? (d.bajaEn ?? d.creadoEn ?? "") : null,
  };
}
function aCuenta(id: string, d: any): CuentaInterna {
  return {
    id,
    usuarioId: d.uid,
    numero: d.numero,
    moneda: "MXN",
    saldo: Number(d.saldo) || 0,
    estado: d.estado === "suspendida" ? "suspendida" : "activa",
    alta: d.creadoEn ?? "",
    tarjeta: d.tarjeta ?? null,
  };
}
function aMov(id: string, d: any): MovimientoInterno {
  return { id, folio: d.folio ?? id, cuentaId: d.cuentaId, uid: d.uid, tipo: d.tipo, monto: Number(d.monto) || 0, concepto: d.concepto ?? "", fecha: d.fecha ?? "" };
}
/* eslint-enable @typescript-eslint/no-explicit-any */

function tarjetasDe(cuentas: CuentaInterna[]): TarjetaInterna[] {
  return cuentas
    .filter((c) => c.tarjeta)
    .map((c) => ({
      id: c.id,
      cuentaId: c.id,
      numero: c.tarjeta!.numero,
      nombre: c.tarjeta!.nombre,
      vencimiento: c.tarjeta!.vence,
      estado: c.tarjeta!.estado,
      alta: c.tarjeta!.alta,
    }));
}

const porFechaDesc = <T extends { fecha: string }>(a: T, b: T) => (a.fecha < b.fecha ? 1 : a.fecha > b.fecha ? -1 : 0);

let escuchas: Unsubscribe[] = [];

export function mensajeError(e: unknown): string {
  const code = (e as { code?: string })?.code ?? "";
  if (code.includes("permission-denied")) return "La nube rechazó la operación (revisa que las reglas de Firestore estén publicadas).";
  if (code.includes("unavailable") || code.includes("network")) return "Sin conexión con la nube. Intenta de nuevo.";
  if (code.includes("email-already-in-use")) return "Ese usuario ya existe.";
  if (code.includes("weak-password")) return "La contraseña es demasiado débil.";
  if (e instanceof Error && e.message && !code) return e.message;
  return "No se pudo completar la operación en la nube.";
}

export const useUsuariosStore = create<UsuariosState>()((set, get) => ({
  usuarios: [],
  cuentas: [],
  tarjetas: [],
  movimientos: [],
  nube: "inactiva",
  errorNube: null,

  iniciar: (rol, uid) => {
    get().detener();
    const actual = auth.currentUser;
    if (!actual) {
      set({ nube: "sin-conexion", errorNube: "Sesión de nube no iniciada." });
      return;
    }
    set({ nube: "conectando", errorNube: null });
    const fallo = (e: unknown) => set({ nube: "sin-conexion", errorNube: mensajeError(e) });
    const ok = () => set({ nube: "conectada", errorNube: null });
    if (rol === "admin") {
      escuchas.push(
        onSnapshot(collection(db, "usuarios"), (s) => {
          const us = s.docs.map((d) => aUsuario(d.id, d.data())).filter((u) => u.rol !== "admin");
          us.sort((a, b) => (a.alta < b.alta ? 1 : -1));
          set({ usuarios: us });
          ok();
        }, fallo),
        onSnapshot(collection(db, "cuentas"), (s) => {
          const cs = s.docs.map((d) => aCuenta(d.id, d.data())).sort((a, b) => (a.alta < b.alta ? -1 : 1));
          set({ cuentas: cs, tarjetas: tarjetasDe(cs) });
        }, fallo),
        onSnapshot(collection(db, "movimientos"), (s) => {
          set({ movimientos: s.docs.map((d) => aMov(d.id, d.data())).sort(porFechaDesc) });
        }, fallo),
      );
    } else {
      const id = uid ?? actual.uid;
      escuchas.push(
        onSnapshot(doc(db, "usuarios", id), (s) => {
          set({ usuarios: s.exists() ? [aUsuario(s.id, s.data())] : [] });
          ok();
        }, fallo),
        onSnapshot(query(collection(db, "cuentas"), where("uid", "==", id)), (s) => {
          const cs = s.docs.map((d) => aCuenta(d.id, d.data())).sort((a, b) => (a.alta < b.alta ? -1 : 1));
          set({ cuentas: cs, tarjetas: tarjetasDe(cs) });
        }, fallo),
        onSnapshot(query(collection(db, "movimientos"), where("uid", "==", id)), (s) => {
          set({ movimientos: s.docs.map((d) => aMov(d.id, d.data())).sort(porFechaDesc) });
        }, fallo),
      );
    }
  },

  detener: () => {
    escuchas.forEach((u) => u());
    escuchas = [];
    set({ usuarios: [], cuentas: [], tarjetas: [], movimientos: [], nube: "inactiva", errorNube: null });
  },

  registrarUsuario: async (u, claveTemporal) => {
    const usuario = u.usuario.trim().toLowerCase();
    // Instancia secundaria: el administrador NO pierde su sesión.
    const uid = await conAppSecundaria(async (a) => {
      const cred = await createUserWithEmailAndPassword(a, correoDe(usuario), limpiarClave(claveTemporal));
      return cred.user.uid;
    });
    const datos = {
      usuario,
      nombre: u.nombre,
      correo: u.correo,
      telefono: u.telefono,
      tipo: u.tipo,
      rol: "usuario",
      estado: "activa",
      // Contraseña inicial = temporal: se pide cambiarla en el primer acceso.
      debeCambiarClave: true,
      creadoEn: ahora(),
      bajaEn: null,
    };
    await setDoc(doc(db, "usuarios", uid), datos);
    return aUsuario(uid, datos);
  },

  darDeBaja: async (uid) => {
    const b = writeBatch(db);
    b.update(doc(db, "usuarios", uid), { estado: "baja", bajaEn: ahora() });
    for (const c of get().cuentas.filter((x) => x.usuarioId === uid)) {
      b.update(doc(db, "cuentas", c.id), c.tarjeta ? { estado: "suspendida", "tarjeta.estado": "bloqueada" } : { estado: "suspendida" });
    }
    await b.commit();
  },

  pedirCambioClave: async (uid) => {
    await updateDoc(doc(db, "usuarios", uid), { debeCambiarClave: true });
  },

  emitirCuenta: async (usuarioId) => {
    const ref = doc(collection(db, "cuentas"));
    await setDoc(ref, { uid: usuarioId, numero: numeroCuentaInterna(), moneda: "MXN", saldo: 0, estado: "activa", creadoEn: ahora(), tarjeta: null });
  },

  emitirTarjeta: async (cuentaId) => {
    const c = get().cuentas.find((x) => x.id === cuentaId);
    const u = c && get().usuarios.find((x) => x.id === c.usuarioId);
    if (!c || !u) throw new Error("Cuenta no encontrada.");
    if (c.tarjeta) throw new Error("Esta cuenta ya tiene tarjeta virtual.");
    await updateDoc(doc(db, "cuentas", cuentaId), {
      tarjeta: { numero: numeroTarjetaInterna(), nombre: u.nombre.toUpperCase(), vence: vencimientoTarjeta(), estado: "activa", alta: ahora() },
    });
  },

  alternarTarjeta: async (cuentaId) => {
    const c = get().cuentas.find((x) => x.id === cuentaId);
    if (!c?.tarjeta) return;
    await updateDoc(doc(db, "cuentas", cuentaId), { "tarjeta.estado": c.tarjeta.estado === "activa" ? "bloqueada" : "activa" });
  },

  abonarInterno: async (cuentaId, monto) => {
    const folio = nuevoFolio();
    const cRef = doc(db, "cuentas", cuentaId);
    await runTransaction(db, async (tx) => {
      const s = await tx.get(cRef);
      if (!s.exists()) throw new Error("Cuenta no encontrada.");
      const d = s.data();
      if (d.estado !== "activa") throw new Error("La cuenta no está activa.");
      tx.update(cRef, { saldo: redondear((Number(d.saldo) || 0) + monto) });
      tx.set(doc(collection(db, "movimientos")), {
        folio, cuentaId, uid: d.uid, tipo: "ABONO", monto: redondear(monto), concepto: `Abono interno a ${d.numero}`, fecha: ahora(),
      });
    });
    return folio;
  },

  moverSaldo: async (origenId, destinoId, monto) => {
    const folio = nuevoFolio();
    const oRef = doc(db, "cuentas", origenId);
    const dRef = doc(db, "cuentas", destinoId);
    await runTransaction(db, async (tx) => {
      const [so, sd] = [await tx.get(oRef), await tx.get(dRef)];
      if (!so.exists() || !sd.exists()) throw new Error("Cuenta no encontrada.");
      const o = so.data();
      const d = sd.data();
      if (o.estado !== "activa" || d.estado !== "activa") throw new Error("Ambas cuentas deben estar activas.");
      const so$ = Number(o.saldo) || 0;
      if (monto > so$) throw new Error("Saldo insuficiente.");
      const f = ahora();
      tx.update(oRef, { saldo: redondear(so$ - monto) });
      tx.update(dRef, { saldo: redondear((Number(d.saldo) || 0) + monto) });
      tx.set(doc(collection(db, "movimientos")), { folio, cuentaId: origenId, uid: o.uid, tipo: "ENVIO", monto: -redondear(monto), concepto: `${o.numero} → ${d.numero}`, fecha: f });
      tx.set(doc(collection(db, "movimientos")), { folio, cuentaId: destinoId, uid: d.uid, tipo: "RECEPCION", monto: redondear(monto), concepto: `${o.numero} → ${d.numero}`, fecha: f });
    });
    return folio;
  },
}));
