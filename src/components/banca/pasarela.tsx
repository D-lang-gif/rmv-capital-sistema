import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { onAuthStateChanged, type User } from "firebase/auth";
import { Banknote, CheckCircle2, Clock, Eye, EyeOff, FileUp, Landmark, ListChecks, Lock, Plus, RefreshCw, Send, Sigma, Vault, Wallet } from "lucide-react";
import { auth } from "@/lib/firebase/app";
import { fmtFecha, fmtMXN } from "@/lib/banca/formato";
import { popupAviso } from "@/lib/banca/popup";
import { mensajeError } from "@/lib/banca/usuarios";
import { ultimos4 } from "@/lib/soberano/cripto";
import {
  ESTADOS_OPERACION, agregarAtm, conciliarOperacion, estadisticas, guardarEstado, listarAtm, listarOperaciones,
  parsearCsvAtm, registrarOperacion, ultimoEstado,
  type DatosSensibles, type EstadoBancomer, type MovimientoAtm, type Operacion,
} from "@/lib/soberano/pasarela";
import { cn } from "@/lib/utils";
import { BotonShimmer, Campo, Card, Titulo, inputCls } from "./ui";
import { BadgeSoberana } from "./usuarios";
import { StpSpei } from "./stp";

/* Banca Soberana · Pasarela y conciliación (solo "soberano"). */

type Vista = "pasarela" | "stp" | "bancomer" | "atm";
const VISTAS: Array<{ id: Vista; label: string; icon: typeof Wallet }> = [
  { id: "pasarela", label: "Pasarela de pagos", icon: Wallet },
  { id: "stp", label: "STP / SPEI", icon: Send },
  { id: "bancomer", label: "Estado de cuenta Bancomer", icon: Landmark },
  { id: "atm", label: "Movimientos ATM", icon: Banknote },
];

export function PasarelaConciliacion() {
  const [vista, setVista] = useState<Vista>("pasarela");
  const [user, setUser] = useState<User | null>(auth.currentUser);
  useEffect(() => onAuthStateChanged(auth, setUser), []);

  return (
    <div className="flex flex-col gap-4" data-testid="pasarela-conciliacion">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-xl font-bold tracking-tight">Pasarela y conciliación</h2>
        <BadgeSoberana />
      </div>
      <div className="flex flex-wrap gap-1.5">
        {VISTAS.map((v) => (
          <button
            key={v.id}
            type="button"
            data-vista={v.id}
            onClick={() => setVista(v.id)}
            className={cn(
              "flex h-9 items-center gap-1.5 rounded-lg border px-3 text-sm",
              vista === v.id ? "border-[rgba(0,212,170,0.4)] bg-[rgba(0,212,170,0.12)] text-fg" : "border-border text-fg-muted hover:text-fg",
            )}
          >
            <v.icon className="size-4" /> {v.label}
          </button>
        ))}
      </div>
      {!user ? (
        <Card>
          <p className="text-sm text-fg-muted">Sin sesión de nube del administrador. Vuelve a entrar como soberano para usar este módulo.</p>
        </Card>
      ) : vista === "pasarela" ? (
        <Pasarela />
      ) : vista === "stp" ? (
        <StpSpei />
      ) : vista === "bancomer" ? (
        <Bancomer />
      ) : (
        <Atm />
      )}
    </div>
  );
}

function Stat({ icon, label, valor }: { icon: React.ReactNode; label: string; valor: string }) {
  return (
    <Card className="p-4">
      <p className="flex items-center gap-1.5 text-xs tracking-wide text-fg-muted uppercase [&_svg]:size-4 [&_svg]:text-accent">{icon}{label}</p>
      <p className="mt-1 text-2xl font-bold tabular-nums">{valor}</p>
    </Card>
  );
}

/* ─────────── Pasarela ─────────── */
const VACIA = { origen: "", cuenta_origen: "", cuenta_destino: "", monto: "", moneda: "MXN", concepto: "", metodo: "SPEI", referencia_externa: "" };

function Pasarela() {
  const [ops, setOps] = useState<Operacion[]>([]);
  const [filtro, setFiltro] = useState("");
  const [cargando, setCargando] = useState(true);
  const [f, setF] = useState(VACIA);
  const [busy, setBusy] = useState(false);
  const [aviso, setAviso] = useState<Record<string, string>>({});

  const cargar = useCallback(async () => {
    setCargando(true);
    try { setOps(await listarOperaciones()); } catch (e) { void popupAviso("Pasarela", mensajeError(e), "error"); }
    finally { setCargando(false); }
  }, []);
  useEffect(() => { void cargar(); }, [cargar]);

  const st = useMemo(() => estadisticas(ops), [ops]);
  const visibles = filtro ? ops.filter((o) => o.estado === filtro) : ops;
  const estados = useMemo(() => [...new Set([...ESTADOS_OPERACION, ...ops.map((o) => o.estado)])], [ops]);

  async function registrar(e: FormEvent) {
    e.preventDefault();
    const monto = Number(f.monto);
    if (!f.origen.trim() || !f.cuenta_destino.trim() || !(monto > 0)) {
      void popupAviso("Pasarela", "Origen, cuenta destino y un monto mayor a cero son obligatorios.", "warning");
      return;
    }
    setBusy(true);
    try {
      const op = await registrarOperacion({ ...f, monto });
      setF(VACIA);
      setOps((p) => [op, ...p]);
    } catch (e) { void popupAviso("Pasarela", mensajeError(e), "error"); }
    finally { setBusy(false); }
  }

  async function conciliar(folio: string) {
    try {
      const r = await conciliarOperacion(folio);
      setAviso((a) => ({ ...a, [folio]: r === "ok" ? "Conciliado" : "ya conciliado" }));
      await cargar();
    } catch (e) { void popupAviso("Conciliar", mensajeError(e), "error"); }
  }

  const set = (k: keyof typeof VACIA) => (e: React.ChangeEvent<HTMLInputElement>) => setF((p) => ({ ...p, [k]: e.target.value }));

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat icon={<ListChecks />} label="Total" valor={String(st.total)} />
        <Stat icon={<Clock />} label="Pendientes" valor={String(st.pendientes)} />
        <Stat icon={<CheckCircle2 />} label="Conciliados" valor={String(st.conciliados)} />
        <Stat icon={<Sigma />} label="Monto total" valor={fmtMXN(st.monto_total)} />
      </div>

      <Card>
        <Titulo icon={<Plus />} sub="Se firma con SHA-256 y queda PENDIENTE hasta conciliarla.">Registrar operación</Titulo>
        <form onSubmit={registrar} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Campo label="Origen" htmlFor="ps-origen"><input id="ps-origen" className={inputCls} value={f.origen} onChange={set("origen")} /></Campo>
          <Campo label="Cuenta origen" htmlFor="ps-co"><input id="ps-co" className={inputCls} value={f.cuenta_origen} onChange={set("cuenta_origen")} /></Campo>
          <Campo label="Cuenta destino" htmlFor="ps-cd"><input id="ps-cd" className={inputCls} value={f.cuenta_destino} onChange={set("cuenta_destino")} /></Campo>
          <Campo label="Monto" htmlFor="ps-monto"><input id="ps-monto" type="number" step="0.01" min="0" className={inputCls} value={f.monto} onChange={set("monto")} /></Campo>
          <Campo label="Moneda" htmlFor="ps-moneda"><input id="ps-moneda" className={inputCls} value={f.moneda} onChange={set("moneda")} /></Campo>
          <Campo label="Método" htmlFor="ps-metodo"><input id="ps-metodo" className={inputCls} value={f.metodo} onChange={set("metodo")} /></Campo>
          <Campo label="Referencia externa" htmlFor="ps-ref"><input id="ps-ref" className={inputCls} value={f.referencia_externa} onChange={set("referencia_externa")} /></Campo>
          <Campo label="Concepto" htmlFor="ps-concepto"><input id="ps-concepto" className={inputCls} value={f.concepto} onChange={set("concepto")} /></Campo>
          <div className="sm:col-span-2 lg:col-span-4"><BotonShimmer type="submit" disabled={busy}><Plus /> Registrar operación</BotonShimmer></div>
        </form>
      </Card>

      <Card>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <Titulo icon={<Wallet />}>Operaciones</Titulo>
          <div className="flex items-center gap-2">
            <label htmlFor="ps-filtro" className="text-xs text-fg-muted">Estado</label>
            <select id="ps-filtro" value={filtro} onChange={(e) => setFiltro(e.target.value)} className={cn(inputCls, "h-9 w-40")}>
              <option value="">Todos</option>
              {estados.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
            <button type="button" onClick={() => void cargar()} className="rounded-lg border border-border p-2 text-fg-muted hover:text-fg" aria-label="Actualizar"><RefreshCw className="size-4" /></button>
          </div>
        </div>
        {cargando ? <p className="text-sm text-fg-muted">Cargando…</p> : visibles.length === 0 ? <p className="text-sm text-fg-muted">Sin operaciones.</p> : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-xs tracking-wide text-fg-muted uppercase">
                <tr><th className="py-2 pr-3">Folio</th><th className="pr-3">Origen → destino</th><th className="pr-3">Monto</th><th className="pr-3">Concepto</th><th className="pr-3">Estado</th><th className="pr-3">Fechas</th><th className="pr-3">Firma</th><th /></tr>
              </thead>
              <tbody>
                {visibles.map((o) => (
                  <tr key={o.folio} className="border-t border-border align-top" data-folio={o.folio}>
                    <td className="py-2 pr-3 font-mono text-xs">{o.folio}<div className="text-fg-subtle">{o.metodo}{o.referencia_externa ? ` · ${o.referencia_externa}` : ""}</div></td>
                    <td className="pr-3">{o.origen}<div className="text-xs text-fg-muted">{o.cuenta_origen || "—"} → {o.cuenta_destino}</div></td>
                    <td className="pr-3 tabular-nums">{o.moneda === "MXN" ? fmtMXN(o.monto) : `${o.monto.toLocaleString("es-MX")} ${o.moneda}`}</td>
                    <td className="pr-3">{o.concepto}</td>
                    <td className="pr-3"><span className={cn("rounded-md px-2 py-0.5 text-xs font-semibold", o.conciliado ? "bg-[rgba(0,212,170,0.15)] text-accent" : "bg-[rgba(212,175,55,0.15)] text-[#d4af37]")}>{o.estado}</span></td>
                    <td className="pr-3 text-xs text-fg-muted">{fmtFecha(o.fecha_operacion)}{o.fecha_conciliacion ? <div>Conc.: {fmtFecha(o.fecha_conciliacion)}</div> : null}</td>
                    <td className="pr-3 font-mono text-xs text-fg-subtle" title={o.firma}>{o.firma.slice(0, 16)}…</td>
                    <td className="py-2">
                      <button type="button" onClick={() => void conciliar(o.folio)} className="rounded-lg border border-border px-2.5 py-1 text-xs hover:border-[rgba(0,212,170,0.4)]">Conciliar</button>
                      {aviso[o.folio] || o.conciliado ? <div className="mt-1 text-[11px] text-fg-muted">{aviso[o.folio] ?? "ya conciliado"}</div> : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}

/* ─────────── Bancomer ─────────── */
const CAMPOS: Array<[keyof DatosSensibles, string]> = [
  ["titular", "Titular"], ["beneficiario", "Beneficiario"], ["cuenta_corriente", "Cuenta corriente"], ["cuenta_inversion", "Cuenta inversión"],
  ["tarjeta1", "Tarjeta 1"], ["tarjeta2", "Tarjeta 2"], ["saldo", "Saldo"], ["fideicomiso", "Fideicomiso"],
];
const ENMASCARAR = new Set<keyof DatosSensibles>(["cuenta_corriente", "cuenta_inversion", "tarjeta1", "tarjeta2"]);
const ESTADO_VACIO: DatosSensibles = { titular: "", beneficiario: "", cuenta_corriente: "", cuenta_inversion: "", tarjeta1: "", tarjeta2: "", saldo: "", fideicomiso: "" };

function Bancomer() {
  const [clave, setClave] = useState<string | null>(null);
  const [escrita, setEscrita] = useState("");
  const [estado, setEstado] = useState<(EstadoBancomer & { firmaValida: boolean }) | null>(null);
  const [mostrar, setMostrar] = useState(false);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState(ESTADO_VACIO);
  const [apertura, setApertura] = useState("");
  const [archivo, setArchivo] = useState("");

  async function abrir(c: string) {
    setBusy(true);
    try {
      setEstado(await ultimoEstado(c));
      setClave(c);
      setEscrita("");
    } catch (e) { void popupAviso("Bóveda", mensajeError(e), "error"); }
    finally { setBusy(false); }
  }

  async function guardar(e: FormEvent) {
    e.preventDefault();
    if (!clave) return;
    setBusy(true);
    try {
      await guardarEstado(clave, form, apertura, archivo);
      setForm(ESTADO_VACIO); setApertura(""); setArchivo("");
      setEstado(await ultimoEstado(clave));
    } catch (e) { void popupAviso("Bóveda", mensajeError(e), "error"); }
    finally { setBusy(false); }
  }

  // La clave de bóveda vive solo en memoria de este componente; se olvida al salir de la sección.
  useEffect(() => () => setClave(null), []);

  if (!clave) {
    return (
      <Card className="max-w-md">
        <Titulo icon={<Vault />} sub="Se usa para cifrar y descifrar en este navegador (AES-GCM, PBKDF2). No se guarda en ningún lado.">Abrir bóveda</Titulo>
        <form onSubmit={(e) => { e.preventDefault(); if (escrita.length >= 8) void abrir(escrita); else void popupAviso("Bóveda", "La clave de bóveda debe tener al menos 8 caracteres.", "warning"); }} className="flex flex-col gap-3">
          <Campo label="Clave de bóveda" htmlFor="bv-clave"><input id="bv-clave" type="password" autoComplete="off" className={inputCls} value={escrita} onChange={(e) => setEscrita(e.target.value)} /></Campo>
          <BotonShimmer type="submit" disabled={busy}><Lock /> {busy ? "Derivando llave…" : "Abrir"}</BotonShimmer>
        </form>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <Card className="bancomer-card">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <Titulo icon={<Landmark />} sub={estado ? `Importado ${fmtFecha(estado.importado_at)}` : undefined}>Último estado de cuenta Bancomer</Titulo>
          <div className="flex gap-2">
            {estado ? <button type="button" onClick={() => setMostrar((m) => !m)} className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-sm">{mostrar ? <EyeOff className="size-4" /> : <Eye className="size-4" />}{mostrar ? "ocultar" : "mostrar"}</button> : null}
            <button type="button" onClick={() => { setClave(null); setEstado(null); setMostrar(false); }} className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-sm"><Lock className="size-4" /> Cerrar bóveda</button>
          </div>
        </div>
        {!estado ? <p className="text-sm text-fg-muted">Aún no hay estados de cuenta guardados.</p> : (
          <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {CAMPOS.map(([k, l]) => (
              <div key={k}>
                <dt className="text-xs text-fg-muted">{l}</dt>
                <dd className="font-mono text-sm">{ENMASCARAR.has(k) && !mostrar ? ultimos4(estado[k]) : estado[k] || "—"}</dd>
              </div>
            ))}
            <div><dt className="text-xs text-fg-muted">Fecha de apertura</dt><dd className="text-sm">{estado.fecha_apertura || "—"}</dd></div>
            <div><dt className="text-xs text-fg-muted">Archivo de origen</dt><dd className="text-sm">{estado.archivo_origen || "—"}</dd></div>
            <div className="sm:col-span-2 lg:col-span-3">
              <dt className="text-xs text-fg-muted">Firma HMAC-SHA256</dt>
              <dd className="font-mono text-xs">{estado.firma_hmac.slice(0, 32)}... <span className={estado.firmaValida ? "text-accent" : "text-red-400"}>{estado.firmaValida ? "· íntegra" : "· no coincide"}</span></dd>
            </div>
          </dl>
        )}
      </Card>

      <Card>
        <Titulo icon={<Plus />} sub="Los datos se cifran antes de salir del navegador; en la nube solo quedan la sal y el texto cifrado.">Registrar estado de cuenta</Titulo>
        <form onSubmit={guardar} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {CAMPOS.map(([k, l]) => (
            <Campo key={k} label={l} htmlFor={`bv-${k}`}><input id={`bv-${k}`} autoComplete="off" className={inputCls} value={form[k]} onChange={(e) => setForm((p) => ({ ...p, [k]: e.target.value }))} /></Campo>
          ))}
          <Campo label="Fecha de apertura" htmlFor="bv-apertura"><input id="bv-apertura" type="date" className={inputCls} value={apertura} onChange={(e) => setApertura(e.target.value)} /></Campo>
          <Campo label="Archivo de origen" htmlFor="bv-archivo"><input id="bv-archivo" className={inputCls} value={archivo} onChange={(e) => setArchivo(e.target.value)} /></Campo>
          <div className="sm:col-span-2 lg:col-span-4"><BotonShimmer type="submit" disabled={busy}><Lock /> Cifrar y guardar</BotonShimmer></div>
        </form>
      </Card>
    </div>
  );
}

/* ─────────── ATM ─────────── */
function Atm() {
  const [movs, setMovs] = useState<MovimientoAtm[]>([]);
  const [cargando, setCargando] = useState(true);
  const [f, setF] = useState({ fecha: "", tipo: "RETIRO", monto: "", concepto: "" });
  const [busy, setBusy] = useState(false);

  const cargar = useCallback(async () => {
    setCargando(true);
    try { setMovs(await listarAtm()); } catch (e) { void popupAviso("ATM", mensajeError(e), "error"); }
    finally { setCargando(false); }
  }, []);
  useEffect(() => { void cargar(); }, [cargar]);

  async function agregar(e: FormEvent) {
    e.preventDefault();
    const monto = Number(f.monto);
    const fecha = new Date(f.fecha);
    if (!Number.isFinite(monto) || !f.monto || Number.isNaN(fecha.getTime())) { void popupAviso("ATM", "Fecha y monto son obligatorios.", "warning"); return; }
    setBusy(true);
    try {
      await agregarAtm([{ fecha_iso: fecha.toISOString(), tipo: f.tipo.trim().toUpperCase() || "ATM", monto, concepto: f.concepto.trim(), archivo_origen: "captura manual" }]);
      setF({ fecha: "", tipo: "RETIRO", monto: "", concepto: "" });
      await cargar();
    } catch (e) { void popupAviso("ATM", mensajeError(e), "error"); }
    finally { setBusy(false); }
  }

  async function importar(file: File | undefined) {
    if (!file) return;
    setBusy(true);
    try {
      const { movs: nuevos, errores } = parsearCsvAtm(await file.text(), file.name);
      const n = nuevos.length ? await agregarAtm(nuevos) : 0;
      void popupAviso("Importación CSV", `${n} movimientos importados${errores ? `, ${errores} filas omitidas` : ""}.`, n ? "info" : "warning");
      await cargar();
    } catch (e) { void popupAviso("ATM", mensajeError(e), "error"); }
    finally { setBusy(false); }
  }

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <Titulo icon={<Plus />} sub="O importa un CSV con columnas fecha, tipo, monto, concepto.">Agregar movimiento</Titulo>
        <form onSubmit={agregar} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Campo label="Fecha" htmlFor="atm-fecha"><input id="atm-fecha" type="datetime-local" className={inputCls} value={f.fecha} onChange={(e) => setF((p) => ({ ...p, fecha: e.target.value }))} /></Campo>
          <Campo label="Tipo" htmlFor="atm-tipo"><input id="atm-tipo" className={inputCls} value={f.tipo} onChange={(e) => setF((p) => ({ ...p, tipo: e.target.value }))} /></Campo>
          <Campo label="Monto" htmlFor="atm-monto"><input id="atm-monto" type="number" step="0.01" className={inputCls} value={f.monto} onChange={(e) => setF((p) => ({ ...p, monto: e.target.value }))} /></Campo>
          <Campo label="Concepto" htmlFor="atm-concepto"><input id="atm-concepto" className={inputCls} value={f.concepto} onChange={(e) => setF((p) => ({ ...p, concepto: e.target.value }))} /></Campo>
          <div className="flex flex-wrap gap-2 sm:col-span-2 lg:col-span-4">
            <BotonShimmer type="submit" disabled={busy}><Plus /> Agregar</BotonShimmer>
            <label className="flex h-11 cursor-pointer items-center gap-2 rounded-lg border border-border px-4 text-sm text-fg-muted hover:text-fg">
              <FileUp className="size-4" /> Importar CSV
              <input type="file" accept=".csv,text/csv" className="hidden" onChange={(e) => { void importar(e.target.files?.[0]); e.target.value = ""; }} />
            </label>
          </div>
        </form>
      </Card>
      <Card>
        <Titulo icon={<Banknote />} sub="Últimos 100">Movimientos ATM</Titulo>
        {cargando ? <p className="text-sm text-fg-muted">Cargando…</p> : movs.length === 0 ? <p className="text-sm text-fg-muted">Sin movimientos.</p> : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-xs tracking-wide text-fg-muted uppercase"><tr><th className="py-2 pr-3">Fecha</th><th className="pr-3">Tipo</th><th className="pr-3">Monto</th><th className="pr-3">Concepto</th><th className="pr-3">Archivo</th><th>Importado</th></tr></thead>
              <tbody>
                {movs.map((m) => (
                  <tr key={m.id} className="border-t border-border">
                    <td className="py-2 pr-3">{fmtFecha(m.fecha_iso)}</td>
                    <td className="pr-3">{m.tipo}</td>
                    <td className={cn("pr-3 tabular-nums", m.monto < 0 && "text-red-400")}>{fmtMXN(m.monto)}</td>
                    <td className="pr-3">{m.concepto}</td>
                    <td className="pr-3 text-xs text-fg-muted">{m.archivo_origen}</td>
                    <td className="text-xs text-fg-muted">{fmtFecha(m.importado_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
