import { FormEvent, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { exploreQuery } from "@/lib/nexus/api";
import { MEMPOOL_EXPLORER } from "@/lib/nexus/config";
import {
  formatBtc,
  formatHeight,
  formatSats,
  satsToBtc,
  truncateMiddle,
} from "@/lib/nexus/format";
import type { ExplorerResult } from "@/lib/nexus/types";
import { AddressLine, Panel, StatChip } from "./shared";

export function ExplorerView() {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ExplorerResult | null>(null);

  async function onSearch(e: FormEvent) {
    e.preventDefault();
    const q = query.trim();
    if (q.length < 20) {
      toast.error("Pega un TXID o una dirección completa");
      return;
    }
    setLoading(true);
    try {
      const data = await exploreQuery({ data: { query: q } });
      setResult(data);
      if (data.kind === "empty") toast.error("No aparece en Mainnet");
    } catch {
      toast.error("No se pudo consultar la cadena");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <Panel title="Explorador" hint="Consulta real a mempool.space · Bitcoin Mainnet">
        <form onSubmit={onSearch} className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="flex min-w-0 flex-1 flex-col gap-2">
            <Label htmlFor="ex-q">TXID o dirección</Label>
            <Input
              id="ex-q"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="pega 64 hex o bc1q…"
              spellCheck={false}
            />
          </div>
          <Button type="submit" disabled={loading}>
            {loading ? "Buscando…" : "Buscar"}
          </Button>
        </form>
      </Panel>

      {loading ? (
        <Skeleton className="h-40 w-full rounded-xl" />
      ) : result?.kind === "tx" ? (
        <Panel
          title="Transacción"
          action={
            <a
              href={`${MEMPOOL_EXPLORER}/tx/${result.txid}`}
              target="_blank"
              rel="noreferrer"
              className="text-sm text-accent hover:underline"
            >
              mempool.space
            </a>
          }
        >
          <p className="break-all font-mono text-xs text-fg-muted">{result.txid}</p>
          <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
            <StatChip label="Estado" value={result.confirmed ? "Confirmada" : "Mempool"} />
            <StatChip label="Bloque" value={formatHeight(result.blockHeight)} />
            <StatChip label="Valor salidas" value={formatBtc(satsToBtc(result.valueSats))} />
            <StatChip label="Fee" value={formatSats(result.fee)} />
            <StatChip label="Entradas" value={String(result.vinCount)} />
            <StatChip label="Salidas" value={String(result.voutCount)} />
          </div>
        </Panel>
      ) : result?.kind === "address" ? (
        <Panel
          title="Dirección"
          action={
            <a
              href={`${MEMPOOL_EXPLORER}/address/${result.stats.address}`}
              target="_blank"
              rel="noreferrer"
              className="text-sm text-accent hover:underline"
            >
              mempool.space
            </a>
          }
        >
          <AddressLine address={result.stats.address} />
          <div className="mt-4 grid grid-cols-2 gap-2">
            <StatChip
              label="Saldo confirmado"
              value={formatBtc(satsToBtc(result.stats.confirmedSats))}
            />
            <StatChip label="Transacciones" value={String(result.stats.txCount)} />
            <StatChip
              label="Recibido"
              value={formatBtc(satsToBtc(result.stats.fundedSats))}
            />
            <StatChip
              label="Gastado"
              value={formatBtc(satsToBtc(result.stats.spentSats))}
            />
          </div>
        </Panel>
      ) : result?.kind === "empty" ? (
        <Panel title="Sin resultado">
          <p className="text-sm text-fg-muted">
            {truncateMiddle(result.query, 16, 12)} no aparece como TXID ni como
            dirección en Mainnet.
          </p>
        </Panel>
      ) : (
        <p className="text-sm text-fg-muted">
          Busca cualquier transacción o dirección pública. El nexo no inventa
          comprobantes.
        </p>
      )}
    </div>
  );
}
