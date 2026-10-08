import { FormEvent, useState } from "react";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { fiatFromSats, formatBtc, isLikelyAddress, satsToBtc } from "@/lib/nexus/format";
import { useAddressMap, useNetwork } from "@/lib/nexus/queries";
import { useNexusStore } from "@/lib/nexus/store";
import { AddressLine, EmptyNote, Panel, QrButton } from "./shared";

export function WalletsView() {
  const wallets = useNexusStore((s) => s.wallets);
  const addWallet = useNexusStore((s) => s.addWallet);
  const removeWallet = useNexusStore((s) => s.removeWallet);
  const addrs = useAddressMap();
  const network = useNetwork();
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [note, setNote] = useState("");

  function onAdd(e: FormEvent) {
    e.preventDefault();
    if (!isLikelyAddress(address)) {
      toast.error("Dirección Bitcoin no válida");
      return;
    }
    const result = addWallet({
      name: name.trim() || "Observada",
      address: address.trim(),
      role: "watch",
      note: note.trim() || "Añadida al libro de observación.",
    });
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success("Dirección añadida al libro");
    setName("");
    setAddress("");
    setNote("");
  }

  return (
    <div className="flex flex-col gap-5">
      <Panel
        title="Libro de direcciones"
        hint="Solo observación. Este nexo no guarda claves privadas ni firma transacciones."
      >
        <div className="flex flex-col gap-3">
          {addrs.isLoading && !addrs.data ? (
            <>
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-24 w-full" />
            </>
          ) : wallets.length === 0 ? (
            <EmptyNote>No hay direcciones en el libro.</EmptyNote>
          ) : (
            wallets.map((w) => {
              const stats = addrs.data?.[w.address];
              const sats = stats?.ok ? stats.confirmedSats : 0;
              const fiat = fiatFromSats(sats, network.data?.usd ?? null, network.data?.mxn ?? null);
              return (
                <article
                  key={w.id}
                  className="rounded-lg border border-border bg-bg-elevated p-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-medium">{w.name}</h3>
                        <Badge variant={w.role === "treasury" ? "default" : "outline"}>
                          {w.role === "treasury" ? "Tesorería" : "Watch-only"}
                        </Badge>
                      </div>
                      <p className="mt-1 text-xs text-fg-muted">{w.note}</p>
                    </div>
                    <div className="text-right">
                      <div className="font-mono text-sm tabular">
                        {stats && !stats.ok ? "—" : formatBtc(satsToBtc(sats))}
                      </div>
                      <div className="text-[11px] text-fg-subtle">
                        {fiat.usd} · {stats?.ok ? `${stats.txCount} tx` : "sin lectura"}
                      </div>
                    </div>
                  </div>
                  <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                    <AddressLine address={w.address} />
                    <div className="flex items-center gap-1">
                      <QrButton address={w.address} name={w.name} />
                      {w.role !== "treasury" ? (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          aria-label="Quitar"
                          onClick={() => {
                            removeWallet(w.id);
                            toast("Dirección retirada del libro");
                          }}
                        >
                          <Trash2 />
                        </Button>
                      ) : null}
                    </div>
                  </div>
                </article>
              );
            })
          )}
        </div>
      </Panel>

      <Panel title="Añadir observación" hint="Pega una dirección Mainnet para seguir su saldo real.">
        <form onSubmit={onAdd} className="grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-2">
            <Label htmlFor="w-name">Nombre</Label>
            <Input
              id="w-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Caja, cold, intercambio…"
              className="font-sans"
            />
          </div>
          <div className="flex flex-col gap-2 sm:col-span-2">
            <Label htmlFor="w-addr">Dirección</Label>
            <Input
              id="w-addr"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="bc1q… / 1… / 3…"
              spellCheck={false}
            />
          </div>
          <div className="flex flex-col gap-2 sm:col-span-2">
            <Label htmlFor="w-note">Nota</Label>
            <Input
              id="w-note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Opcional"
              className="font-sans"
            />
          </div>
          <div className="sm:col-span-2">
            <Button type="submit">Añadir al libro</Button>
          </div>
        </form>
      </Panel>
    </div>
  );
}
