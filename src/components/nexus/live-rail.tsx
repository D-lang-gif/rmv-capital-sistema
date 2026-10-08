import { MEMPOOL_EXPLORER } from "@/lib/nexus/config";
import { formatAgo, formatHeight, truncateMiddle } from "@/lib/nexus/format";
import { useNetwork } from "@/lib/nexus/queries";
import { Skeleton } from "@/components/ui/skeleton";

export function LiveRail() {
  const { data, isLoading } = useNetwork();
  const blocks = data?.blocks ?? [];

  return (
    <aside className="flex h-full min-h-0 flex-col border-l border-border bg-bg-elevated">
      <div className="border-b border-border px-4 py-4">
        <p className="text-[10px] font-medium tracking-[0.18em] text-accent uppercase">
          Cadena en vivo
        </p>
        <p className="mt-1 font-display text-lg">Últimos bloques</p>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto px-3 py-3">
        {isLoading && !blocks.length ? (
          <div className="flex flex-col gap-2">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
          </div>
        ) : !blocks.length ? (
          <p className="px-2 py-6 text-sm text-fg-muted">
            Sin bloques todavía. Reintento en unos segundos.
          </p>
        ) : (
          <ol className="flex flex-col gap-2">
            {blocks.map((b) => (
              <li key={b.id}>
                <a
                  href={`${MEMPOOL_EXPLORER}/block/${b.id}`}
                  target="_blank"
                  rel="noreferrer"
                  className="block rounded-lg border border-transparent px-2 py-2 hover:border-border hover:bg-surface"
                >
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="font-mono text-sm tabular text-accent">
                      {formatHeight(b.height)}
                    </span>
                    <span className="text-[11px] text-fg-subtle">
                      {formatAgo(b.timestamp)}
                    </span>
                  </div>
                  <div className="mt-1 font-mono text-[11px] text-fg-muted">
                    {b.txCount.toLocaleString("es-MX")} tx · {truncateMiddle(b.id, 8, 6)}
                  </div>
                </a>
              </li>
            ))}
          </ol>
        )}
      </div>
      <p className="border-t border-border px-4 py-3 text-[11px] text-fg-subtle">
        Fuente: Esplora · Bitcoin Mainnet
      </p>
    </aside>
  );
}
