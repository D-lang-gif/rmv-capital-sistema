import { FormEvent, useState } from "react";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { SEED_WHALES } from "@/lib/nexus/config";
import { formatBtc, isLikelyAddress, satsToBtc } from "@/lib/nexus/format";
import { useAddressMap } from "@/lib/nexus/queries";
import { useNexusStore } from "@/lib/nexus/store";
import { AddressLine, EmptyNote, Panel } from "./shared";

export function WhalesView() {
  const whales = useNexusStore((s) => s.whales);
  const addWhale = useNexusStore((s) => s.addWhale);
  const removeWhale = useNexusStore((s) => s.removeWhale);
  const addrs = useAddressMap();
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [blurb, setBlurb] = useState("");

  function onAdd(e: FormEvent) {
    e.preventDefault();
    if (!isLikelyAddress(address)) {
      toast.error("Dirección no válida");
      return;
    }
    const result = addWhale({
      name: name.trim() || "Observada",
      address: address.trim(),
      blurb: blurb.trim() || "Añadida al observatorio público.",
    });
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success("Añadida al observatorio");
    setName("");
    setAddress("");
    setBlurb("");
  }

  const ranked = [...whales].sort((a, b) => {
    const as = addrs.data?.[a.address]?.confirmedSats ?? 0;
    const bs = addrs.data?.[b.address]?.confirmedSats ?? 0;
    return bs - as;
  });

  return (
    <div className="flex flex-col gap-5">
      <Panel
        title="Observatorio de ballenas"
        hint="Direcciones públicas. Observar no es custodiar."
      >
        {addrs.isLoading && !addrs.data ? (
          <Skeleton className="h-32 w-full" />
        ) : ranked.length === 0 ? (
          <EmptyNote>Vacío.</EmptyNote>
        ) : (
          <ul className="flex flex-col gap-3">
            {ranked.map((w) => {
              const stats = addrs.data?.[w.address];
              const seeded = SEED_WHALES.some((s) => s.id === w.id);
              return (
                <li
                  key={w.id}
                  className="rounded-lg border border-border bg-bg-elevated p-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h3 className="font-medium">{w.name}</h3>
                      <p className="mt-1 text-xs text-fg-muted">{w.blurb}</p>
                    </div>
                    <div className="text-right font-mono text-sm tabular">
                      {stats?.ok ? formatBtc(satsToBtc(stats.confirmedSats)) : "—"}
                      <div className="text-[11px] text-fg-subtle">
                        {stats?.ok ? `${stats.txCount.toLocaleString("es-MX")} tx` : "sin lectura"}
                      </div>
                    </div>
                  </div>
                  <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                    <AddressLine address={w.address} />
                    {!seeded ? (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        aria-label="Quitar"
                        onClick={() => removeWhale(w.id)}
                      >
                        <Trash2 />
                      </Button>
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </Panel>

      <Panel title="Seguir dirección pública">
        <form onSubmit={onAdd} className="grid gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-2">
              <Label htmlFor="h-name">Etiqueta</Label>
              <Input
                id="h-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="font-sans"
              />
            </div>
            <div className="flex flex-col gap-2 sm:col-span-2">
              <Label htmlFor="h-addr">Dirección</Label>
              <Input
                id="h-addr"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                spellCheck={false}
              />
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="h-blurb">Nota</Label>
            <Input
              id="h-blurb"
              value={blurb}
              onChange={(e) => setBlurb(e.target.value)}
              className="font-sans"
            />
          </div>
          <Button type="submit">Añadir al observatorio</Button>
        </form>
      </Panel>
    </div>
  );
}
