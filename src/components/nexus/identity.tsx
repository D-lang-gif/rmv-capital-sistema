import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { FIRMA, OWNER, PATENTE, SELLO, TITLE, VERSION } from "@/lib/nexus/config";
import { useNexusStore } from "@/lib/nexus/store";
import { Panel } from "./shared";
import { NexusMark } from "./mark";

export function IdentityView() {
  const wallets = useNexusStore((s) => s.wallets);
  const journal = useNexusStore((s) => s.journal);

  function exportBook() {
    const payload = {
      app: "RMV Capital Nexus",
      version: VERSION,
      owner: OWNER,
      patente: PATENTE,
      exportedAt: new Date().toISOString(),
      note: "Exportación del libro local. No contiene claves privadas ni semilla.",
      wallets: wallets.map(({ id, name, address, role, note, created }) => ({
        id,
        name,
        address,
        role,
        note,
        created,
      })),
      journal,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `rmv-nexus-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Libro exportado");
  }

  return (
    <div className="flex flex-col gap-5">
      <Panel title="Identidad de la casa">
        <div className="flex items-start gap-4">
          <div className="flex size-16 items-center justify-center rounded-lg border border-border bg-bg-elevated">
            <NexusMark size={28} />
          </div>
          <div className="min-w-0">
            <p className="text-[11px] tracking-[0.2em] text-accent uppercase">{TITLE}</p>
            <h3 className="font-display text-2xl font-medium">{OWNER}</h3>
            <p className="mt-1 text-sm text-fg-muted">
              Centro de comando de tesorería. Lectura de cadena, no banco emisor,
              no SWIFT operativo.
            </p>
          </div>
        </div>
        <dl className="mt-6 grid gap-3 sm:grid-cols-2">
          <Field k="Patente ceremonial" v={PATENTE} />
          <Field k="Versión" v={VERSION} />
          <Field k="Sello" v={SELLO} mono />
          <Field k="Firma de identidad" v={`${FIRMA.slice(0, 24)}…`} mono />
        </dl>
      </Panel>

      <Panel
        title="Bóveda"
        hint="Las claves de gasto no viven aquí. Si una semilla aparece en una pantalla, no la uses."
      >
        <p className="text-sm text-fg-muted">
          Este nexo observa direcciones públicas y anota un libro interno. No
          deriva wallets, no construye transacciones y no exhibe WIF ni frases
          BIP39. La cadena es la única fuente de saldo.
        </p>
        <Button type="button" variant="outline" className="mt-4" onClick={exportBook}>
          Exportar libro (JSON)
        </Button>
      </Panel>
    </div>
  );
}

function Field({ k, v, mono }: { k: string; v: string; mono?: boolean }) {
  return (
    <div className="rounded-lg bg-bg-elevated px-3 py-2">
      <dt className="text-[10px] tracking-[0.16em] text-fg-subtle uppercase">{k}</dt>
      <dd className={`mt-1 break-all text-sm ${mono ? "font-mono text-xs" : ""}`}>{v}</dd>
    </div>
  );
}
