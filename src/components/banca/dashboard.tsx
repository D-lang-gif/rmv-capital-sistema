import { Bitcoin, Coins, Fingerprint, RotateCcw, Wallet } from "lucide-react";
import { FIRMA, SALDOS, TARJETAS, TITULAR, type Tarjeta } from "@/lib/banca/datos";
import { enmascarar, fmtCripto, fmtFecha, fmtMXN } from "@/lib/banca/formato";
import { popupConfirmar } from "@/lib/banca/popup";
import { saldoDisponible, useBancaStore } from "@/lib/banca/store";
import { useNetwork } from "@/lib/nexus/queries";
import { Card, Titulo } from "./ui";

export function Dashboard() {
  const movs = useBancaStore((s) => s.movimientos);
  const net = useNetwork();
  const btcMxn = net.data?.mxn ?? null;
  const saldo = saldoDisponible(movs);

  return (
    <div className="flex flex-col gap-5">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat icon={<Wallet />} label="Saldo Total MXN" valor={fmtMXN(saldo)} sub="Pesos mexicanos" testid="saldo-mxn" />
        <Stat
          icon={<Bitcoin />}
          label="BTC"
          valor={fmtCripto(SALDOS.btc)}
          sub={btcMxn ? `≈ ${fmtMXN(SALDOS.btc * btcMxn)} (precio en vivo)` : "Bitcoin"}
          tono="text-bitcoin"
        />
        <Stat icon={<Coins />} label="ETC" valor={fmtCripto(SALDOS.etc)} sub="Ethereum Classic" tono="text-[#3ab83a]" />
        <Stat icon={<Fingerprint />} label="Firma" valor={FIRMA} sub="Firma activa" tono="text-accent" mono />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {TARJETAS.map((t) => (
          <TarjetaTile key={t.id} t={t} />
        ))}
      </div>

      <Movimientos />
    </div>
  );
}

function Stat({
  icon,
  label,
  valor,
  sub,
  tono,
  mono,
  testid,
}: {
  icon: React.ReactNode;
  label: string;
  valor: string;
  sub: string;
  tono?: string;
  mono?: boolean;
  testid?: string;
}) {
  return (
    <Card className="min-w-0">
      <div className="flex items-center justify-between text-fg-muted">
        <span className="text-[11px] font-medium tracking-[0.16em] uppercase">{label}</span>
        <span className="text-accent [&_svg]:size-5">{icon}</span>
      </div>
      <div
        data-testid={testid}
        title={valor}
        className={`mt-2 truncate font-bold tracking-tight tabular ${mono ? "font-mono text-base" : "text-xl 2xl:text-2xl"} ${tono ?? "text-fg"}`}
      >
        {valor}
      </div>
      <div className="mt-1 truncate text-xs text-fg-subtle">{sub}</div>
    </Card>
  );
}

export function TarjetaTile({ t }: { t: Tarjeta }) {
  return (
    <div className="glass relative overflow-hidden rounded-2xl p-5" style={{ borderLeft: `4px solid ${t.color}` }}>
      <div
        className="pointer-events-none absolute -top-16 -right-16 size-48 rounded-full opacity-20 blur-2xl"
        style={{ background: t.color }}
      />
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold tracking-[0.18em] text-fg">{t.nombre}</p>
          <p className="mt-3 font-mono text-lg tracking-[0.2em] text-fg-muted">{enmascarar(t.ultimos4)}</p>
        </div>
        <span className="rounded-md bg-white/10 px-2 py-1 text-[10px] font-bold tracking-wider">{t.red}</span>
      </div>
      <div className="mt-5 flex items-end justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[10px] tracking-[0.16em] text-fg-subtle uppercase">Titular</p>
          <p className="truncate text-sm font-medium">{TITULAR}</p>
        </div>
        <div className="text-right">
          <p className="text-[10px] tracking-[0.16em] text-fg-subtle uppercase">Saldo</p>
          <p className="font-bold tabular">{fmtMXN(t.saldo)}</p>
        </div>
      </div>
    </div>
  );
}

export function Movimientos({ limite }: { limite?: number }) {
  const movs = useBancaStore((s) => s.movimientos);
  const reiniciar = useBancaStore((s) => s.reiniciar);
  const lista = limite ? movs.slice(0, limite) : movs;

  async function onReiniciar() {
    const ok = await popupConfirmar("¿Reiniciar movimientos?", [
      ["Movimientos", String(movs.length)],
      ["Saldo", `vuelve a ${fmtMXN(SALDOS.mxn)}`],
    ]);
    if (ok) reiniciar();
  }

  return (
    <Card>
      <div className="flex items-start justify-between gap-3">
        <Titulo sub={`${movs.length} registrados`}>Movimientos</Titulo>
        <button
          type="button"
          onClick={onReiniciar}
          className="flex h-9 items-center gap-1.5 rounded-lg border border-border px-3 text-xs text-fg-muted hover:border-[rgba(0,212,170,0.3)] hover:text-fg"
        >
          <RotateCcw className="size-3.5" /> Reiniciar
        </button>
      </div>
      {lista.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border px-4 py-8 text-center text-sm text-fg-muted">
          Sin movimientos todavía.
        </p>
      ) : (
        <ul className="flex flex-col divide-y divide-border" data-testid="movimientos">
          {lista.map((m) => (
            <li key={m.folio} className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 py-3">
              <div className="min-w-0">
                <p className="flex items-center gap-2 text-sm font-medium">
                  <span className="rounded bg-[rgba(0,212,170,0.12)] px-1.5 py-0.5 text-[10px] font-semibold tracking-wider text-accent">
                    {m.tipo}
                  </span>
                  <span className="truncate">{m.descripcion}</span>
                </p>
                <p className="mt-0.5 truncate text-xs text-fg-subtle">
                  {fmtFecha(m.fecha)} · {m.detalle}
                </p>
              </div>
              <div className="text-right">
                <p className={`font-semibold tabular ${m.monto < 0 ? "text-fg" : "text-fg-muted"}`}>
                  {m.monto === 0 ? "Sin cargo" : fmtMXN(m.monto)}
                </p>
                <p className="font-mono text-[11px] text-accent">{m.folio}</p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
