import { FormEvent, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MEMPOOL_EXPLORER } from "@/lib/nexus/config";
import { formatBtc, isLikelyTxid, localRef } from "@/lib/nexus/format";
import { useNexusStore } from "@/lib/nexus/store";
import { EmptyNote, Panel } from "./shared";

export function JournalView() {
  const journal = useNexusStore((s) => s.journal);
  const addJournal = useNexusStore((s) => s.addJournal);
  const [destination, setDestination] = useState("");
  const [amount, setAmount] = useState("");
  const [memo, setMemo] = useState("Movimiento de tesorería");
  const [txid, setTxid] = useState("");

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    const n = Number.parseFloat(amount.replace(",", "."));
    if (!destination.trim()) {
      toast.error("Indica destino o contra-cuenta");
      return;
    }
    if (!Number.isFinite(n) || n <= 0) {
      toast.error("Monto inválido");
      return;
    }
    const onchain = txid.trim();
    if (onchain && !isLikelyTxid(onchain)) {
      toast.error("El TXID opcional debe ser 64 hex");
      return;
    }
    const row = addJournal({
      destination: destination.trim(),
      amountBtc: n,
      memo: memo.trim() || "Movimiento",
      onchainTxid: onchain || undefined,
    });
    toast.success(`Anotado ${row.id.slice(0, 8)} · no se difundió a la red`);
    setDestination("");
    setAmount("");
    setTxid("");
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="rounded-xl border border-warning/30 bg-warning/10 px-5 py-4 text-sm text-fg">
        <p className="font-medium text-warning">Libro interno · no es Bitcoin</p>
        <p className="mt-1 text-fg-muted">
          Este formulario no firma, no transmite y no crea un TXID de Mainnet.
          Sirve para anotar intenciones o conciliar un envío ya confirmado en la
          cadena (pega el TXID real si lo tienes).
        </p>
      </div>

      <Panel title="Nueva anotación" hint={`Referencia local ${localRef()}`}>
        <form onSubmit={onSubmit} className="grid gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="j-dest">Destino / contra-cuenta</Label>
            <Input
              id="j-dest"
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
              placeholder="Dirección o nota de destino"
              spellCheck={false}
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-2">
              <Label htmlFor="j-amt">Monto (BTC)</Label>
              <Input
                id="j-amt"
                inputMode="decimal"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.01000000"
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="j-txid">TXID on-chain (opcional)</Label>
              <Input
                id="j-txid"
                value={txid}
                onChange={(e) => setTxid(e.target.value)}
                placeholder="solo si ya existe en Mainnet"
                spellCheck={false}
              />
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="j-memo">Concepto</Label>
            <Input
              id="j-memo"
              value={memo}
              onChange={(e) => setMemo(e.target.value)}
              className="font-sans"
            />
          </div>
          <Button type="submit">Registrar en el libro</Button>
        </form>
      </Panel>

      <Panel title="Historial" hint="Se guarda en este navegador">
        {journal.length === 0 ? (
          <EmptyNote>Aún no hay movimientos anotados.</EmptyNote>
        ) : (
          <ul className="divide-y divide-border">
            {journal.map((row) => (
              <li key={row.id} className="flex flex-col gap-1 py-3 first:pt-0 last:pb-0">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-mono text-xs text-fg-subtle">{row.id.slice(0, 8)}</span>
                  <Badge variant="outline">{row.status}</Badge>
                </div>
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <span className="min-w-0 truncate text-sm">{row.memo}</span>
                  <span className="font-mono text-sm tabular">{formatBtc(row.amountBtc)}</span>
                </div>
                <p className="truncate font-mono text-xs text-fg-muted">{row.destination}</p>
                <p className="text-[11px] text-fg-subtle">
                  {new Date(row.createdAt).toLocaleString("es-MX")}
                  {row.onchainTxid ? (
                    <>
                      {" · "}
                      <a
                        className="text-accent hover:underline"
                        href={`${MEMPOOL_EXPLORER}/tx/${row.onchainTxid}`}
                        target="_blank"
                        rel="noreferrer"
                      >
                        ver on-chain
                      </a>
                    </>
                  ) : (
                    " · sin TXID de red"
                  )}
                </p>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </div>
  );
}
