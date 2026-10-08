import {
  Area,
  AreaChart,
  ResponsiveContainer,
  Tooltip as ReTooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { CHART_ACCENT, CHART_MUTED, MEMPOOL_EXPLORER, PRIMARY_ADDRESS } from "@/lib/nexus/config";
import {
  fiatFromSats,
  formatAgo,
  formatBtc,
  formatHeight,
  formatMxn,
  formatUsd,
  satsToBtc,
  truncateMiddle,
} from "@/lib/nexus/format";
import { useAddressMap, useNetwork, usePriceHistory, usePrimaryTxs } from "@/lib/nexus/queries";
import { useNexusStore } from "@/lib/nexus/store";
import { AddressLine, BtcFigure, Panel, StatChip } from "./shared";

export function OverviewView() {
  const wallets = useNexusStore((s) => s.wallets);
  const network = useNetwork();
  const prices = usePriceHistory();
  const addrs = useAddressMap();
  const txs = usePrimaryTxs();
  const snap = network.data;
  const treasury = wallets.filter((w) => w.role === "treasury");
  const treasurySats = treasury.reduce((sum, w) => {
    const row = addrs.data?.[w.address];
    return sum + (row?.ok ? row.confirmedSats : 0);
  }, 0);
  const fiat = fiatFromSats(treasurySats, snap?.usd ?? null, snap?.mxn ?? null);
  const primary = addrs.data?.[PRIMARY_ADDRESS];
  const change = chartChange(prices.data);

  return (
    <div className="flex flex-col gap-5">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <HeroStat
          label="Bitcoin"
          value={formatUsd(snap?.usd ?? null)}
          sub={snap?.mxn != null ? formatMxn(snap.mxn) : "Cotización Mainnet"}
          tone="bitcoin"
          loading={network.isLoading}
        />
        <HeroStat
          label="Tesorería on-chain"
          value={formatBtc(satsToBtc(treasurySats))}
          sub={fiat.mxn !== "—" ? `${fiat.usd} · ${fiat.mxn}` : fiat.usd}
          loading={addrs.isLoading}
        />
        <HeroStat
          label="Altura de bloque"
          value={formatHeight(snap?.height ?? null)}
          sub={
            snap?.difficultyChange != null
              ? `Ajuste ${snap.difficultyChange >= 0 ? "+" : ""}${snap.difficultyChange.toFixed(2)}%`
              : "Tip de la cadena"
          }
          loading={network.isLoading}
        />
        <HeroStat
          label="Fee siguiente bloque"
          value={snap?.fees ? `${snap.fees.fastest} sat/vB` : "—"}
          sub={
            snap?.mempoolTxs != null
              ? `${snap.mempoolTxs.toLocaleString("es-MX")} tx en mempool`
              : "mempool.space"
          }
          loading={network.isLoading}
        />
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <Panel
          title="Treinta días"
          hint="Precio USD diario, fuente CoinGecko"
          action={
            change != null ? (
              <Badge variant={change >= 0 ? "success" : "danger"}>
                {change >= 0 ? "+" : ""}
                {change.toFixed(1)}%
              </Badge>
            ) : null
          }
        >
          <div className="h-52">
            {prices.isLoading ? (
              <Skeleton className="h-full w-full rounded-lg" />
            ) : prices.data && prices.data.length > 1 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={prices.data} margin={{ top: 8, right: 4, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="btcFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={CHART_ACCENT} stopOpacity={0.28} />
                      <stop offset="100%" stopColor={CHART_ACCENT} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="t" hide />
                  <YAxis hide domain={["dataMin", "dataMax"]} />
                  <ReTooltip
                    contentStyle={{
                      background: "#121926",
                      border: "1px solid rgb(231 228 220 / 0.12)",
                      borderRadius: 8,
                      fontSize: 12,
                    }}
                    labelFormatter={(t) =>
                      new Date(Number(t)).toLocaleDateString("es-MX", {
                        day: "2-digit",
                        month: "short",
                      })
                    }
                    formatter={(value) => [formatUsd(Number(value), true), "USD"]}
                  />
                  <Area
                    type="monotone"
                    dataKey="usd"
                    stroke={CHART_ACCENT}
                    fill="url(#btcFill)"
                    strokeWidth={1.6}
                    dot={false}
                    activeDot={{ r: 3, fill: CHART_ACCENT, stroke: CHART_MUTED }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <p className="flex h-full items-center justify-center text-sm text-fg-muted">
                Sin serie de precios por ahora.
              </p>
            )}
          </div>
        </Panel>

        <Panel title="Dirección principal" hint="Saldo confirmado en Mainnet">
          <BtcFigure sats={primary?.ok ? primary.confirmedSats : 0} />
          <div className="mt-4">
            <AddressLine address={PRIMARY_ADDRESS} />
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <StatChip
              label="Tx confirmadas"
              value={primary?.ok ? String(primary.txCount) : "—"}
            />
            <StatChip
              label="Mempool"
              value={
                primary?.ok
                  ? `${primary.mempoolTxCount} · ${formatBtc(satsToBtc(primary.mempoolSats))}`
                  : "—"
              }
            />
          </div>
          {primary && !primary.ok ? (
            <p className="mt-3 text-xs text-warning">
              No se pudo leer la cadena. Reintento automático.
            </p>
          ) : null}
        </Panel>
      </div>

      <Panel
        title="Últimos movimientos"
        hint="Entradas y salidas de la dirección principal"
      >
        {txs.isLoading ? (
          <div className="flex flex-col gap-2">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        ) : !txs.data?.length ? (
          <p className="text-sm text-fg-muted">Sin transacciones visibles.</p>
        ) : (
          <ul className="divide-y divide-border">
            {txs.data.map((tx) => {
              const inbound = tx.valueSats >= 0;
              return (
                <li
                  key={tx.txid}
                  className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"
                >
                  <div className="min-w-0">
                    <a
                      href={`${MEMPOOL_EXPLORER}/tx/${tx.txid}`}
                      target="_blank"
                      rel="noreferrer"
                      className="font-mono text-xs text-fg hover:text-accent"
                    >
                      {truncateMiddle(tx.txid, 10, 8)}
                    </a>
                    <div className="mt-0.5 text-[11px] text-fg-subtle">
                      {tx.blockTime ? formatAgo(tx.blockTime) : "mempool"} ·{" "}
                      {tx.confirmed ? "confirmada" : "pendiente"}
                    </div>
                  </div>
                  <div
                    className={`shrink-0 font-mono text-sm tabular ${inbound ? "text-success" : "text-danger"}`}
                  >
                    {inbound ? "+" : "−"}
                    {formatBtc(satsToBtc(Math.abs(tx.valueSats)))}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </Panel>
    </div>
  );
}

function HeroStat({
  label,
  value,
  sub,
  tone,
  loading,
}: {
  label: string;
  value: string;
  sub: string;
  tone?: "bitcoin";
  loading?: boolean;
}) {
  return (
    <div className="glass rounded-xl p-4">
      <div className="text-[10px] font-medium tracking-[0.18em] text-fg-subtle uppercase">
        {label}
      </div>
      {loading ? (
        <Skeleton className="mt-2 h-7 w-32" />
      ) : (
        <div
          className={`mt-1 truncate font-mono text-xl font-medium tabular tracking-tight ${tone === "bitcoin" ? "text-bitcoin" : "text-fg"}`}
        >
          {value}
        </div>
      )}
      <div className="mt-1 truncate text-xs text-fg-muted">{sub}</div>
    </div>
  );
}

function chartChange(points?: { usd: number }[]) {
  if (!points || points.length < 2) return null;
  const first = points[0]?.usd;
  const last = points[points.length - 1]?.usd;
  if (!first || !last) return null;
  return ((last - first) / first) * 100;
}
