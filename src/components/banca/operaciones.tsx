import { FormEvent, useState } from "react";
import { CreditCard, Receipt, Send, Smartphone } from "lucide-react";
import {
  COMPANIAS,
  CUENTA_ORIGEN,
  MONTOS_RECARGA,
  SERVICIOS,
  TARJETAS,
  TARJETAS_SOLICITABLES,
  TITULAR,
} from "@/lib/banca/datos";
import { bancoDeClabe, clabeValida, fmtMXN } from "@/lib/banca/formato";
import { popupAviso, popupConfirmar, popupRegistrada } from "@/lib/banca/popup";
import { saldoDisponible, useBancaStore, type TipoMovimiento } from "@/lib/banca/store";
import { cn } from "@/lib/utils";
import { TarjetaTile } from "./dashboard";
import { BotonShimmer, Campo, Card, Titulo, inputCls } from "./ui";

function useSaldo() {
  const movs = useBancaStore((s) => s.movimientos);
  return saldoDisponible(movs);
}

function montoValido(texto: string): number | null {
  const n = Number(texto.replace(/,/g, ""));
  if (!Number.isFinite(n) || n <= 0) return null;
  return Math.round(n * 100) / 100;
}

/** Columna lateral: saldo disponible + últimos movimientos de ese tipo. */
function Lateral({ tipo }: { tipo: TipoMovimiento }) {
  const saldo = useSaldo();
  const movs = useBancaStore((s) => s.movimientos).filter((m) => m.tipo === tipo).slice(0, 5);
  return (
    <Card className="flex flex-col gap-4">
      <div>
        <p className="text-[11px] tracking-[0.16em] text-fg-subtle uppercase">Saldo disponible</p>
        <p className="mt-1 text-2xl font-bold tabular">{fmtMXN(saldo)}</p>
      </div>
      <div>
        <p className="mb-2 text-[11px] tracking-[0.16em] text-fg-subtle uppercase">Últimos registros</p>
        {movs.length === 0 ? (
          <p className="text-sm text-fg-muted">Sin registros.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {movs.map((m) => (
              <li key={m.folio} className="rounded-lg bg-white/[0.04] px-3 py-2">
                <div className="flex justify-between gap-2 text-sm">
                  <span className="truncate">{m.descripcion}</span>
                  <span className="shrink-0 tabular">{m.monto === 0 ? "—" : fmtMXN(m.monto)}</span>
                </div>
                <p className="font-mono text-[11px] text-accent">{m.folio}</p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Card>
  );
}

function Layout({ children, tipo }: { children: React.ReactNode; tipo: TipoMovimiento }) {
  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
      {children}
      <Lateral tipo={tipo} />
    </div>
  );
}

/* ─────────────────────────── SPEI ─────────────────────────── */
export function Spei() {
  const registrar = useBancaStore((s) => s.registrar);
  const saldo = useSaldo();
  const [clabe, setClabe] = useState("");
  const [monto, setMonto] = useState("");
  const [concepto, setConcepto] = useState("");
  const banco = bancoDeClabe(clabe);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const m = montoValido(monto);
    if (!clabeValida(clabe)) return popupAviso("CLABE no válida", "Revisa los 18 dígitos de la CLABE destino.");
    if (m == null) return popupAviso("Monto no válido", "Escribe un monto mayor a cero.");
    if (m > saldo) return popupAviso("Saldo insuficiente", `El saldo disponible es ${fmtMXN(saldo)}.`);
    const filas: Array<[string, string]> = [
      ["Origen", CUENTA_ORIGEN],
      ["CLABE destino", clabe],
      ...(banco ? ([["Banco", banco]] as Array<[string, string]>) : []),
      ["Monto", fmtMXN(m)],
      ["Concepto", concepto || "—"],
    ];
    if (!(await popupConfirmar("¿Confirmar SPEI?", filas))) return;
    const mov = registrar({
      tipo: "SPEI",
      descripcion: `SPEI a ${banco ?? "CLABE"} ····${clabe.slice(-4)}`,
      detalle: concepto || "Sin concepto",
      monto: -m,
    });
    setClabe("");
    setMonto("");
    setConcepto("");
    await popupRegistrada(filas, mov.folio);
  }

  return (
    <Layout tipo="SPEI">
      <Card>
        <Titulo icon={<Send />} sub="Transferencia SPEI a otra CLABE">
          SPEI
        </Titulo>
        <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
          <Campo label="Cuenta origen" htmlFor="spei-origen">
            <input id="spei-origen" className={inputCls} value={`${CUENTA_ORIGEN} · ${TITULAR}`} readOnly />
          </Campo>
          <Campo
            label="CLABE destino"
            htmlFor="spei-clabe"
            hint={clabe.length === 18 ? (clabeValida(clabe) ? `✓ ${banco ?? "CLABE válida"}` : "Dígito verificador incorrecto") : `${clabe.length}/18 dígitos`}
          >
            <input
              id="spei-clabe"
              className={cn(inputCls, "font-mono tracking-wider")}
              inputMode="numeric"
              autoComplete="off"
              maxLength={18}
              placeholder="18 dígitos"
              value={clabe}
              onChange={(e) => setClabe(e.target.value.replace(/\D/g, "").slice(0, 18))}
            />
          </Campo>
          <Campo label="Monto (MXN)" htmlFor="spei-monto">
            <input
              id="spei-monto"
              className={cn(inputCls, "tabular")}
              inputMode="decimal"
              placeholder="0.00"
              value={monto}
              onChange={(e) => setMonto(e.target.value.replace(/[^\d.,]/g, ""))}
            />
          </Campo>
          <Campo label="Concepto" htmlFor="spei-concepto" hint={`${concepto.length}/40`}>
            <input
              id="spei-concepto"
              className={inputCls}
              maxLength={40}
              placeholder="Ej. Pago de servicios"
              value={concepto}
              onChange={(e) => setConcepto(e.target.value)}
            />
          </Campo>
          <BotonShimmer type="submit" className="mt-1">
            <Send /> Transferir
          </BotonShimmer>
        </form>
      </Card>
    </Layout>
  );
}

/* ─────────────────────────── PAGOS ─────────────────────────── */
export function Pagos() {
  const registrar = useBancaStore((s) => s.registrar);
  const saldo = useSaldo();
  const [servicio, setServicio] = useState(SERVICIOS[0]);
  const [referencia, setReferencia] = useState("");
  const [monto, setMonto] = useState("");

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const m = montoValido(monto);
    if (!/^[A-Za-z0-9-]{4,30}$/.test(referencia.trim()))
      return popupAviso("Referencia no válida", "Escribe la referencia del recibo (4 a 30 caracteres).");
    if (m == null) return popupAviso("Monto no válido", "Escribe un monto mayor a cero.");
    if (m > saldo) return popupAviso("Saldo insuficiente", `El saldo disponible es ${fmtMXN(saldo)}.`);
    const filas: Array<[string, string]> = [
      ["Servicio", servicio],
      ["Referencia", referencia.trim()],
      ["Monto", fmtMXN(m)],
    ];
    if (!(await popupConfirmar("¿Confirmar pago?", filas))) return;
    const mov = registrar({ tipo: "PAGO", descripcion: `Pago ${servicio}`, detalle: `Ref. ${referencia.trim()}`, monto: -m });
    setReferencia("");
    setMonto("");
    await popupRegistrada(filas, mov.folio);
  }

  return (
    <Layout tipo="PAGO">
      <Card>
        <Titulo icon={<Receipt />} sub="Pago de servicios">
          Pagos
        </Titulo>
        <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {SERVICIOS.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setServicio(s)}
                aria-pressed={servicio === s}
                className={cn(
                  "h-11 rounded-lg border px-2 text-sm transition-colors",
                  servicio === s
                    ? "border-[rgba(0,212,170,0.5)] bg-[rgba(0,212,170,0.12)] text-fg"
                    : "border-border bg-white/[0.03] text-fg-muted hover:text-fg",
                )}
              >
                {s}
              </button>
            ))}
          </div>
          <Campo label="Referencia" htmlFor="pago-ref">
            <input
              id="pago-ref"
              className={cn(inputCls, "font-mono")}
              autoComplete="off"
              placeholder="Número de servicio o referencia"
              value={referencia}
              onChange={(e) => setReferencia(e.target.value.slice(0, 30))}
            />
          </Campo>
          <Campo label="Monto (MXN)" htmlFor="pago-monto">
            <input
              id="pago-monto"
              className={cn(inputCls, "tabular")}
              inputMode="decimal"
              placeholder="0.00"
              value={monto}
              onChange={(e) => setMonto(e.target.value.replace(/[^\d.,]/g, ""))}
            />
          </Campo>
          <BotonShimmer type="submit">
            <Receipt /> Pagar {servicio}
          </BotonShimmer>
        </form>
      </Card>
    </Layout>
  );
}

/* ─────────────────────────── RECARGAS ─────────────────────────── */
export function Recargas() {
  const registrar = useBancaStore((s) => s.registrar);
  const saldo = useSaldo();
  const [compania, setCompania] = useState(COMPANIAS[0]);
  const [numero, setNumero] = useState("");
  const [monto, setMonto] = useState<number>(MONTOS_RECARGA[1] ?? 100);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!/^\d{10}$/.test(numero)) return popupAviso("Número no válido", "El número debe tener 10 dígitos.");
    if (monto > saldo) return popupAviso("Saldo insuficiente", `El saldo disponible es ${fmtMXN(saldo)}.`);
    const filas: Array<[string, string]> = [
      ["Compañía", compania],
      ["Número", numero.replace(/(\d{3})(\d{3})(\d{4})/, "$1 $2 $3")],
      ["Monto", fmtMXN(monto)],
    ];
    if (!(await popupConfirmar("¿Confirmar recarga?", filas))) return;
    const mov = registrar({ tipo: "RECARGA", descripcion: `Recarga ${compania}`, detalle: `Tel. ····${numero.slice(-4)}`, monto: -monto });
    setNumero("");
    await popupRegistrada(filas, mov.folio);
  }

  return (
    <Layout tipo="RECARGA">
      <Card>
        <Titulo icon={<Smartphone />} sub="Tiempo aire de $50 a $1,000">
          Recargas
        </Titulo>
        <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
          <div className="grid grid-cols-3 gap-2">
            {COMPANIAS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setCompania(c)}
                aria-pressed={compania === c}
                className={cn(
                  "h-11 rounded-lg border text-sm transition-colors",
                  compania === c
                    ? "border-[rgba(0,212,170,0.5)] bg-[rgba(0,212,170,0.12)] text-fg"
                    : "border-border bg-white/[0.03] text-fg-muted hover:text-fg",
                )}
              >
                {c}
              </button>
            ))}
          </div>
          <Campo label="Número celular (10 dígitos)" htmlFor="rec-num" hint={`${numero.length}/10`}>
            <input
              id="rec-num"
              className={cn(inputCls, "font-mono tracking-wider")}
              inputMode="numeric"
              autoComplete="off"
              placeholder="871 000 0000"
              value={numero}
              onChange={(e) => setNumero(e.target.value.replace(/\D/g, "").slice(0, 10))}
            />
          </Campo>
          <div>
            <p className="mb-1.5 text-xs font-medium tracking-wide text-fg-muted">Monto</p>
            <div className="grid grid-cols-4 gap-2 sm:grid-cols-7">
              {MONTOS_RECARGA.map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMonto(m)}
                  aria-pressed={monto === m}
                  className={cn(
                    "h-10 rounded-lg border text-sm tabular transition-colors",
                    monto === m
                      ? "border-[rgba(0,212,170,0.5)] bg-[rgba(0,212,170,0.12)] text-fg"
                      : "border-border bg-white/[0.03] text-fg-muted hover:text-fg",
                  )}
                >
                  ${m.toLocaleString("es-MX")}
                </button>
              ))}
            </div>
          </div>
          <BotonShimmer type="submit">
            <Smartphone /> Recargar {fmtMXN(monto)}
          </BotonShimmer>
        </form>
      </Card>
    </Layout>
  );
}

/* ─────────────────────────── TARJETAS ─────────────────────────── */
export function Tarjetas() {
  const registrar = useBancaStore((s) => s.registrar);
  const [tipo, setTipo] = useState(TARJETAS_SOLICITABLES[0]);
  const [entrega, setEntrega] = useState("Sucursal");

  async function onSolicitar(e: FormEvent) {
    e.preventDefault();
    const filas: Array<[string, string]> = [
      ["Tarjeta", tipo],
      ["Titular", TITULAR],
      ["Entrega", entrega],
    ];
    if (!(await popupConfirmar("¿Solicitar tarjeta?", filas))) return;
    const mov = registrar({ tipo: "TARJETA", descripcion: `Solicitud ${tipo}`, detalle: `Entrega: ${entrega}`, monto: 0 });
    await popupRegistrada(filas, mov.folio);
  }

  return (
    <Layout tipo="TARJETA">
      <div className="flex flex-col gap-5">
        <div className="grid gap-4 xl:grid-cols-2">
          {TARJETAS.map((t) => (
            <TarjetaTile key={t.id} t={t} />
          ))}
        </div>
        <Card>
          <Titulo icon={<CreditCard />} sub="Nueva tarjeta a nombre del titular">
            Solicitar tarjeta
          </Titulo>
          <form onSubmit={onSolicitar} className="grid gap-4 sm:grid-cols-2">
            <Campo label="Tipo de tarjeta" htmlFor="tj-tipo">
              <select id="tj-tipo" className={cn(inputCls, "bg-[#111a30]")} value={tipo} onChange={(e) => setTipo(e.target.value)}>
                {TARJETAS_SOLICITABLES.map((t) => (
                  <option key={t}>{t}</option>
                ))}
              </select>
            </Campo>
            <Campo label="Entrega" htmlFor="tj-entrega">
              <select id="tj-entrega" className={cn(inputCls, "bg-[#111a30]")} value={entrega} onChange={(e) => setEntrega(e.target.value)}>
                <option>Sucursal</option>
                <option>Domicilio</option>
                <option>Digital</option>
              </select>
            </Campo>
            <BotonShimmer type="submit" className="sm:col-span-2">
              <CreditCard /> Solicitar tarjeta
            </BotonShimmer>
          </form>
        </Card>
      </div>
    </Layout>
  );
}
