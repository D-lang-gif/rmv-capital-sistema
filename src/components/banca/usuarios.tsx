import { FormEvent, useMemo, useState } from "react";
import { ArrowLeftRight, CreditCard, Eye, KeyRound, Landmark, Lock, Plus, Search, ShieldCheck, Unlock, UserMinus, UserPlus, Users } from "lucide-react";
import { CREDENCIAL } from "@/lib/acceso/credencial";
import { FRASE_BANCA } from "@/lib/banca/datos";
import { fmtFecha, fmtMXN } from "@/lib/banca/formato";
import { popupAviso, popupConfirmar, popupRegistrada } from "@/lib/banca/popup";
import { mensajeError, useUsuariosStore, type CuentaInterna, type TarjetaInterna, type TipoUsuario } from "@/lib/banca/usuarios";
import { cn } from "@/lib/utils";
import { BotonShimmer, Campo, Card, Titulo, inputCls } from "./ui";

/* Banca Soberana · área de administración de usuarios (solo "soberano"). */

export function BadgeSoberana({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-md border border-[rgba(0,212,170,0.45)] bg-[rgba(0,212,170,0.12)] px-2 py-0.5 text-[10px] font-bold tracking-[0.14em] text-accent uppercase",
        className,
      )}
    >
      <ShieldCheck className="size-3" /> BANCA SOBERANA
    </span>
  );
}

export function Frase() {
  return <p className="text-xs text-fg-muted italic">{FRASE_BANCA}</p>;
}

export const USUARIO_VALIDO = /^[a-z0-9._-]{3,24}$/;
export const CLAVE_MINIMA = 8;

type Vista = "registro" | "lista" | "transferir" | "movimientos";
const VISTAS: Array<{ id: Vista; label: string; icon: typeof Users }> = [
  { id: "registro", label: "Registro", icon: UserPlus },
  { id: "lista", label: "Usuarios", icon: Users },
  { id: "transferir", label: "Transferir", icon: ArrowLeftRight },
  { id: "movimientos", label: "Movimientos", icon: Landmark },
];

export function Usuarios({ vistaInicial = "registro" }: { vistaInicial?: Vista }) {
  const [vista, setVista] = useState<Vista>(vistaInicial);
  const [detalle, setDetalle] = useState<string | null>(null);

  return (
    <div className="flex flex-col gap-5" data-testid="usuarios">
      <Card className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-col gap-1.5">
          <BadgeSoberana className="self-start" />
          <Frase />
        </div>
        <div className="flex flex-wrap gap-1.5">
          {VISTAS.map((v) => (
            <button
              key={v.id}
              type="button"
              data-vista={v.id}
              onClick={() => {
                setVista(v.id);
                setDetalle(null);
              }}
              className={cn(
                "flex h-9 items-center gap-1.5 rounded-lg border px-3 text-xs transition-colors",
                vista === v.id
                  ? "border-[rgba(0,212,170,0.4)] bg-[rgba(0,212,170,0.12)] text-fg"
                  : "border-border text-fg-muted hover:border-[rgba(0,212,170,0.3)] hover:text-fg",
              )}
            >
              <v.icon className="size-3.5" /> {v.label}
            </button>
          ))}
        </div>
      </Card>

      <EstadoNube />

      {vista === "registro" && <Registro onCreado={(id) => { setDetalle(id); setVista("lista"); }} />}
      {vista === "lista" && (detalle ? <Detalle id={detalle} onVolver={() => setDetalle(null)} /> : <Lista onVer={setDetalle} />)}
      {vista === "transferir" && <Transferir />}
      {vista === "movimientos" && <MovimientosInternos />}
    </div>
  );
}

/* ─────────────────────── Registro ─────────────────────── */
function Registro({ onCreado }: { onCreado: (id: string) => void }) {
  const registrar = useUsuariosStore((s) => s.registrarUsuario);
  const usuarios = useUsuariosStore((s) => s.usuarios);
  const [nombre, setNombre] = useState("");
  const [correo, setCorreo] = useState("");
  const [telefono, setTelefono] = useState("");
  const [tipo, setTipo] = useState<TipoUsuario>("persona");
  const [usuario, setUsuario] = useState("");
  const [clave, setClave] = useState("");
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const n = nombre.trim().replace(/\s+/g, " ");
    const us = usuario.trim().toLowerCase();
    if (n.length < 3) return popupAviso("Nombre no válido", "Escribe el nombre completo o razón social.");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo.trim())) return popupAviso("Correo no válido", "Revisa el correo electrónico.");
    const tel = telefono.replace(/\D/g, "");
    if (telefono && tel.length !== 10) return popupAviso("Teléfono no válido", "Usa 10 dígitos o déjalo vacío.");
    if (!USUARIO_VALIDO.test(us)) return popupAviso("Usuario no válido", "3 a 24 caracteres: letras minúsculas, números, punto, guion.");
    if (us === CREDENCIAL.usuario || usuarios.some((u) => u.usuario === us)) return popupAviso("Usuario ocupado", "Elige otro nombre de usuario.");
    if (clave.length < CLAVE_MINIMA) return popupAviso("Contraseña muy corta", `Mínimo ${CLAVE_MINIMA} caracteres.`);
    setBusy(true);
    try {
      const u = await registrar({ nombre: n, correo: correo.trim().toLowerCase(), telefono: tel, tipo, usuario: us }, clave);
      setNombre("");
      setCorreo("");
      setTelefono("");
      setUsuario("");
      setClave("");
      onCreado(u.id);
    } catch (err) {
      popupAviso("No se pudo registrar", mensajeError(err), "error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <Titulo icon={<UserPlus />} sub="Alta de usuario con acceso propio (se guarda en la nube)">
          Registro de usuarios
        </Titulo>
        <BadgeSoberana />
      </div>
      <form onSubmit={onSubmit} className="grid gap-4 sm:grid-cols-2" noValidate autoComplete="off">
        <Campo label="Nombre completo" htmlFor="usr-nombre">
          <input id="usr-nombre" className={inputCls} value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Ej. María López" maxLength={80} />
        </Campo>
        <Campo label="Correo" htmlFor="usr-correo">
          <input id="usr-correo" type="email" className={inputCls} value={correo} onChange={(e) => setCorreo(e.target.value)} placeholder="correo@ejemplo.com" maxLength={120} />
        </Campo>
        <Campo label="Teléfono (opcional)" htmlFor="usr-tel" hint="10 dígitos">
          <input id="usr-tel" inputMode="tel" className={inputCls} value={telefono} onChange={(e) => setTelefono(e.target.value.replace(/[^\d ]/g, "").slice(0, 14))} placeholder="55 1234 5678" />
        </Campo>
        <Campo label="Tipo" htmlFor="usr-tipo">
          <select id="usr-tipo" className={inputCls} value={tipo} onChange={(e) => setTipo(e.target.value as TipoUsuario)}>
            <option value="persona">Persona</option>
            <option value="negocio">Negocio</option>
          </select>
        </Campo>
        <Campo label="Usuario (para iniciar sesión)" htmlFor="usr-usuario" hint="minúsculas, números, . _ -">
          <input id="usr-usuario" autoCapitalize="none" spellCheck={false} className={inputCls} value={usuario} onChange={(e) => setUsuario(e.target.value.toLowerCase())} placeholder="maria.lopez" maxLength={24} />
        </Campo>
        <Campo label="Contraseña temporal" htmlFor="usr-clave" hint={`Mínimo ${CLAVE_MINIMA} caracteres · se pedirá cambiarla en el primer acceso`}>
          <input id="usr-clave" type="password" autoComplete="new-password" className={inputCls} value={clave} onChange={(e) => setClave(e.target.value)} />
        </Campo>
        <div className="flex flex-col gap-3 sm:col-span-2">
          <BotonShimmer type="submit" disabled={busy} className="self-start">
            <UserPlus /> {busy ? "Creando acceso…" : "Registrar usuario"}
          </BotonShimmer>
        </div>
      </form>
    </Card>
  );
}

/* ─────────────────────── Lista ─────────────────────── */
function Lista({ onVer }: { onVer: (id: string) => void }) {
  const usuarios = useUsuariosStore((s) => s.usuarios);
  const cuentas = useUsuariosStore((s) => s.cuentas);
  const darDeBaja = useUsuariosStore((s) => s.darDeBaja);
  const [q, setQ] = useState("");
  const filtrados = useMemo(() => {
    const t = q.trim().toLowerCase();
    return t ? usuarios.filter((u) => `${u.nombre} ${u.usuario} ${u.correo} ${u.telefono}`.toLowerCase().includes(t)) : usuarios;
  }, [q, usuarios]);

  async function onBaja(id: string, nombre: string) {
    if (!(await popupConfirmar("¿Dar de baja al usuario?", [["Usuario", nombre], ["Efecto", "Sin acceso; cuentas suspendidas y tarjetas bloqueadas"]]))) return;
    await intentar(() => darDeBaja(id), "No se pudo dar de baja");
  }

  return (
    <Card>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <Titulo icon={<Users />} sub={`${usuarios.length} registrados`}>
          Usuarios
        </Titulo>
        <BadgeSoberana />
      </div>
      <div className="relative mb-4">
        <Search className="pointer-events-none absolute top-3.5 left-3 size-4 text-fg-subtle" />
        <input aria-label="Buscar usuario" className={cn(inputCls, "pl-9")} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar por nombre, usuario, correo o teléfono" />
      </div>
      {filtrados.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border px-4 py-8 text-center text-sm text-fg-muted">Sin usuarios.</p>
      ) : (
        <ul className="flex flex-col divide-y divide-border" data-testid="lista-usuarios">
          {filtrados.map((u) => (
            <li key={u.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
              <div className="min-w-0">
                <p className="flex items-center gap-2 text-sm font-medium">
                  <span className="rounded bg-[rgba(0,212,170,0.12)] px-1.5 py-0.5 text-[10px] font-semibold tracking-wider text-accent uppercase">{u.tipo}</span>
                  <span className="truncate">{u.nombre}</span>
                  <span className="font-mono text-xs text-fg-muted">@{u.usuario}</span>
                  {u.baja ? <span className="rounded bg-white/10 px-1.5 py-0.5 text-[10px] text-fg-muted">BAJA</span> : null}
                  {!u.baja && u.debeCambiarClave ? <span className="rounded bg-white/10 px-1.5 py-0.5 text-[10px] text-fg-muted">CAMBIO DE CONTRASEÑA PENDIENTE</span> : null}
                </p>
                <p className="mt-0.5 truncate text-xs text-fg-subtle">
                  {u.correo}
                  {u.telefono ? ` · ${u.telefono}` : ""} · {cuentas.filter((c) => c.usuarioId === u.id).length} cuenta(s) · alta {fmtFecha(u.alta)}
                </p>
              </div>
              <div className="flex gap-1.5">
                <BotonMini onClick={() => onVer(u.id)}><Eye /> Ver detalle</BotonMini>
                {!u.baja && <BotonMini onClick={() => onBaja(u.id, u.nombre)}><UserMinus /> Dar de baja</BotonMini>}
              </div>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

export function BotonMini({ children, ...props }: React.ComponentProps<"button">) {
  return (
    <button
      type="button"
      {...props}
      className="flex h-8 items-center gap-1.5 rounded-lg border border-border px-2.5 text-xs text-fg-muted hover:border-[rgba(0,212,170,0.3)] hover:text-fg disabled:opacity-50 [&_svg]:size-3.5"
    >
      {children}
    </button>
  );
}

/* ─────────────────────── Detalle / cuentas / tarjetas ─────────────────────── */
function Detalle({ id, onVolver }: { id: string; onVolver: () => void }) {
  const u = useUsuariosStore((s) => s.usuarios.find((x) => x.id === id));
  const todas = useUsuariosStore((s) => s.cuentas);
  const emitirCuenta = useUsuariosStore((s) => s.emitirCuenta);
  const pedirCambio = useUsuariosStore((s) => s.pedirCambioClave);
  const cuentas = todas.filter((c) => c.usuarioId === id);
  if (!u) return null;

  async function onRestablecer() {
    const ok = await popupConfirmar("¿Restablecer contraseña?", [
      ["Usuario", `@${u!.usuario}`],
      ["Efecto", "Al entrar deberá crear una contraseña nueva antes de ver su cuenta"],
    ]);
    if (!ok) return;
    if (await intentar(() => pedirCambio(u!.id), "No se pudo restablecer")) {
      popupAviso("Restablecimiento solicitado", `@${u!.usuario} deberá cambiar su contraseña en el siguiente acceso.`, "info");
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <div className="flex flex-wrap items-start justify-between gap-2">
          <Titulo icon={<Eye />} sub={`@${u.usuario} · ${u.tipo === "persona" ? "Persona" : "Negocio"} · ${u.correo}${u.telefono ? ` · ${u.telefono}` : ""}`}>
            {u.nombre}
          </Titulo>
          <BadgeSoberana />
        </div>
        <p className="text-xs text-fg-subtle">Alta {fmtFecha(u.alta)}{u.baja ? ` · Baja ${fmtFecha(u.baja)}` : ""}{!u.baja && u.debeCambiarClave ? " · Cambio de contraseña pendiente" : ""}</p>
        <div className="mt-4 flex flex-wrap gap-2">
          <BotonMini onClick={onVolver}>← Volver a la lista</BotonMini>
          <BotonMini disabled={!!u.baja} onClick={() => intentar(() => emitirCuenta(u.id), "No se pudo emitir la cuenta")}><Landmark /> Emitir cuenta interna</BotonMini>
          <BotonMini disabled={!!u.baja} onClick={onRestablecer}><KeyRound /> Restablecer contraseña</BotonMini>
        </div>
      </Card>
      {cuentas.length === 0 ? (
        <Card><p className="text-sm text-fg-muted">Sin cuentas internas. Emite una para poder generar tarjetas virtuales.</p></Card>
      ) : (
        cuentas.map((c) => <CuentaCard key={c.id} c={c} bloqueado={!!u.baja} admin />)
      )}
    </div>
  );
}

export function CuentaCard({ c, bloqueado, admin }: { c: CuentaInterna; bloqueado: boolean; admin?: boolean }) {
  const tarjetas = useUsuariosStore((s) => s.tarjetas).filter((t) => t.cuentaId === c.id);
  const emitirTarjeta = useUsuariosStore((s) => s.emitirTarjeta);
  const abonar = useUsuariosStore((s) => s.abonarInterno);
  const [monto, setMonto] = useState("");
  const [busy, setBusy] = useState(false);
  const inactiva = bloqueado || c.estado !== "activa";

  async function onAbonar() {
    const m = Math.round(Number(monto.replace(/,/g, "")) * 100) / 100;
    if (!Number.isFinite(m) || m <= 0) return popupAviso("Monto no válido", "Escribe un monto mayor a cero.");
    setBusy(true);
    try {
      const folio = await abonar(c.id, m);
      setMonto("");
      popupRegistrada([["Cuenta", c.numero], ["Abono", fmtMXN(m)]], folio);
    } catch (e) {
      popupAviso("No se pudo abonar", mensajeError(e), "error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className="flex flex-col gap-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[11px] tracking-[0.16em] text-fg-subtle uppercase">Cuenta interna · {c.moneda}</p>
          <p className="mt-1 font-mono text-base tracking-wider">{c.numero}</p>
          <p className="mt-1 text-xs text-fg-subtle">Estado: <span className={c.estado === "activa" ? "text-accent" : "text-fg-muted"}>{c.estado}</span> · alta {fmtFecha(c.alta)}</p>
        </div>
        <div className="text-right">
          <BadgeSoberana />
          <p className="mt-2 text-[11px] tracking-[0.16em] text-fg-subtle uppercase">Saldo</p>
          <p className="text-xl font-bold tabular">{fmtMXN(c.saldo)}</p>
        </div>
      </div>
      {admin && (
        <div className="flex flex-wrap items-center gap-2">
          <BotonMini disabled={inactiva || tarjetas.length > 0} onClick={() => intentar(() => emitirTarjeta(c.id), "No se pudo emitir la tarjeta")}><CreditCard /> Emitir tarjeta virtual</BotonMini>
          <input aria-label="Monto del abono" inputMode="decimal" className={cn(inputCls, "h-8 w-32 text-xs")} value={monto} onChange={(e) => setMonto(e.target.value.replace(/[^\d.,]/g, ""))} placeholder="Monto MXN" disabled={inactiva} />
          <BotonMini disabled={inactiva || busy} onClick={onAbonar}><Plus /> Abono interno</BotonMini>
        </div>
      )}
      {tarjetas.length > 0 && (
        <div className="grid gap-4 md:grid-cols-2">
          {tarjetas.map((t) => <TarjetaVirtual key={t.id} t={t} bloqueado={bloqueado || !admin} />)}
        </div>
      )}
    </Card>
  );
}

export function TarjetaVirtual({ t, bloqueado }: { t: TarjetaInterna; bloqueado: boolean }) {
  const alternar = useUsuariosStore((s) => s.alternarTarjeta);
  const activa = t.estado === "activa";
  return (
    <div className="flex flex-col gap-2">
      <div
        data-testid="tarjeta-interna"
        className={cn("relative aspect-[1.586] overflow-hidden rounded-2xl border border-[rgba(0,212,170,0.35)] p-5", !activa && "grayscale opacity-70")}
        style={{ background: "linear-gradient(135deg, #0b1f2a 0%, #0f3b3a 55%, #00d4aa 160%)" }}
      >
        <div className="pointer-events-none absolute -top-16 -right-16 size-48 rounded-full bg-[#00d4aa] opacity-20 blur-2xl" />
        <div className="flex items-start justify-between gap-2">
          <p className="text-xs font-extrabold tracking-[0.2em]"><span className="text-gradient">RMV</span> CAPITAL BANK</p>
          <BadgeSoberana />
        </div>
        <p className="mt-6 font-mono text-lg tracking-[0.18em] sm:text-xl">{t.numero}</p>
        <div className="absolute inset-x-5 bottom-4 flex items-end justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[9px] tracking-[0.16em] text-fg-subtle uppercase">Nombre</p>
            <p className="truncate text-sm font-medium">{t.nombre}</p>
          </div>
          <div className="text-right">
            <p className="text-[9px] tracking-[0.16em] text-fg-subtle uppercase">Vence</p>
            <p className="font-mono text-sm">{t.vencimiento}</p>
          </div>
          <span className={cn("rounded-md px-2 py-1 text-[10px] font-bold tracking-wider", activa ? "bg-[rgba(0,212,170,0.2)] text-accent" : "bg-white/10 text-fg-muted")}>
            {activa ? "ACTIVA" : "BLOQUEADA"}
          </span>
        </div>
      </div>
      <BotonMini disabled={bloqueado} onClick={() => intentar(() => alternar(t.id), "No se pudo cambiar la tarjeta")}>{activa ? <><Lock /> Bloquear</> : <><Unlock /> Desbloquear</>}</BotonMini>
    </div>
  );
}

/* ─────────────────────── Transferencia interna ─────────────────────── */
/** Si `soloDe` se indica, el origen se limita a las cuentas de ese usuario. */
export function Transferir({ soloDe }: { soloDe?: string }) {
  const usuarios = useUsuariosStore((s) => s.usuarios);
  const todas = useUsuariosStore((s) => s.cuentas).filter((c) => c.estado === "activa");
  const mover = useUsuariosStore((s) => s.moverSaldo);
  const origenes = soloDe ? todas.filter((c) => c.usuarioId === soloDe) : todas;
  const [o, setO] = useState("");
  const [d, setD] = useState("");
  const [monto, setMonto] = useState("");
  const titular = (c: CuentaInterna) => usuarios.find((u) => u.id === c.usuarioId)?.nombre ?? "—";

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const co = origenes.find((c) => c.id === o);
    const cd = soloDe ? todas.find((c) => c.numero === d.trim().toUpperCase()) : todas.find((c) => c.id === d);
    const m = Math.round(Number(monto.replace(/,/g, "")) * 100) / 100;
    if (!co || !cd || co.id === cd.id) return popupAviso("Cuentas no válidas", "Elige dos cuentas internas activas distintas.");
    if (!Number.isFinite(m) || m <= 0) return popupAviso("Monto no válido", "Escribe un monto mayor a cero.");
    if (m > co.saldo) return popupAviso("Saldo insuficiente", `La cuenta origen tiene ${fmtMXN(co.saldo)}.`);
    const filas: Array<[string, string]> = [["Origen", co.numero], ["Destino", `${cd.numero} · ${titular(cd)}`], ["Monto", fmtMXN(m)]];
    if (!(await popupConfirmar("¿Confirmar transferencia interna?", filas))) return;
    try {
      const folio = await mover(co.id, cd.id, m);
      setMonto("");
      await popupRegistrada(filas, folio);
    } catch (err) {
      popupAviso("No se pudo transferir", mensajeError(err), "error");
    }
  }

  return (
    <Card>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <Titulo icon={<ArrowLeftRight />} sub="Entre cuentas internas RMV; se registra en Movimientos con folio">
          Transferencia interna
        </Titulo>
        <BadgeSoberana />
      </div>
      <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
        <Campo label="Cuenta origen" htmlFor="tr-o">
          <select id="tr-o" className={inputCls} value={o} onChange={(e) => setO(e.target.value)}>
            <option value="">Selecciona…</option>
            {origenes.map((c) => <option key={c.id} value={c.id}>{`${c.numero} · ${titular(c)} · ${fmtMXN(c.saldo)}`}</option>)}
          </select>
        </Campo>
        {soloDe ? (
          <Campo label="Cuenta destino" htmlFor="tr-d" hint="Formato RMV-XXXX-XXXX">
            <input id="tr-d" className={cn(inputCls, "font-mono uppercase")} value={d} onChange={(e) => setD(e.target.value)} placeholder="RMV-XXXX-XXXX" maxLength={13} />
          </Campo>
        ) : (
          <Campo label="Cuenta destino" htmlFor="tr-d">
            <select id="tr-d" className={inputCls} value={d} onChange={(e) => setD(e.target.value)}>
              <option value="">Selecciona…</option>
              {todas.filter((c) => c.id !== o).map((c) => <option key={c.id} value={c.id}>{`${c.numero} · ${titular(c)} · ${fmtMXN(c.saldo)}`}</option>)}
            </select>
          </Campo>
        )}
        <Campo label="Monto (MXN)" htmlFor="tr-m">
          <input id="tr-m" inputMode="decimal" className={inputCls} value={monto} onChange={(e) => setMonto(e.target.value.replace(/[^\d.,]/g, ""))} placeholder="0.00" />
        </Campo>
        <BotonShimmer type="submit" className="self-start"><ArrowLeftRight /> Transferir</BotonShimmer>
      </form>
    </Card>
  );
}

/** Ejecuta una operación de nube y muestra el error si falla. */
async function intentar(fn: () => Promise<unknown>, titulo: string): Promise<boolean> {
  try {
    await fn();
    return true;
  } catch (e) {
    popupAviso(titulo, mensajeError(e), "error");
    return false;
  }
}

/** Estado de la conexión con la nube (Firestore). */
export function EstadoNube() {
  const nube = useUsuariosStore((s) => s.nube);
  const error = useUsuariosStore((s) => s.errorNube);
  if (nube === "conectada") return null;
  return (
    <p data-testid="estado-nube" className="rounded-xl border border-border px-4 py-3 text-xs text-fg-muted">
      {nube === "conectando" ? "Conectando con la nube…" : `Nube sin conexión${error ? ` · ${error}` : ""}`}
    </p>
  );
}

/** Movimientos de cuentas internas (Firestore, en vivo). */
export function MovimientosInternos({ titulo = "Movimientos internos" }: { titulo?: string }) {
  const movs = useUsuariosStore((s) => s.movimientos);
  const cuentas = useUsuariosStore((s) => s.cuentas);
  const numero = (id: string) => cuentas.find((c) => c.id === id)?.numero ?? "";
  const etiqueta = { ABONO: "ABONO", ENVIO: "ENVÍO", RECEPCION: "RECEPCIÓN" } as const;
  return (
    <Card>
      <Titulo sub={`${movs.length} registrados`}>{titulo}</Titulo>
      {movs.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border px-4 py-8 text-center text-sm text-fg-muted">Sin movimientos todavía.</p>
      ) : (
        <ul className="flex flex-col divide-y divide-border" data-testid="movimientos-internos">
          {movs.map((m) => (
            <li key={m.id} className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 py-3">
              <div className="min-w-0">
                <p className="flex items-center gap-2 text-sm font-medium">
                  <span className="rounded bg-[rgba(0,212,170,0.12)] px-1.5 py-0.5 text-[10px] font-semibold tracking-wider text-accent">{etiqueta[m.tipo] ?? m.tipo}</span>
                  <span className="truncate">{m.concepto}</span>
                </p>
                <p className="mt-0.5 truncate text-xs text-fg-subtle">{fmtFecha(m.fecha)}{numero(m.cuentaId) ? ` · ${numero(m.cuentaId)}` : ""}</p>
              </div>
              <div className="text-right">
                <p className="font-semibold tabular">{fmtMXN(m.monto)}</p>
                <p className="font-mono text-[11px] text-accent">{m.folio}</p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
