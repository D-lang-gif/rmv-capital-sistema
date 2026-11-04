import {
  Award,
  CreditCard,
  KeyRound,
  LayoutDashboard,
  Receipt,
  Send,
  Server,
  Smartphone,
  Users,
  Vault,
} from "lucide-react";
import { FIRMA_BANCA, FRASE_BANCA, LEMA_BANCO, NOMBRE_BANCO, VERSION_BANCO } from "@/lib/banca/datos";
import { useBancaStore, type BancaTab } from "@/lib/banca/store";
import { useNexusStore } from "@/lib/nexus/store";
import { cn } from "@/lib/utils";
import { Dashboard } from "./dashboard";
import { Pagos, Recargas, Spei, Tarjetas } from "./operaciones";
import { Certificados, Token } from "./extras";
import { Servidor } from "./servidor";
import { Usuarios } from "./usuarios";
import { PasarelaConciliacion } from "./pasarela";

const TABS: Array<{ id: BancaTab; label: string; icon: typeof Send }> = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "spei", label: "SPEI", icon: Send },
  { id: "tarjetas", label: "Tarjetas", icon: CreditCard },
  { id: "pagos", label: "Pagos", icon: Receipt },
  { id: "recargas", label: "Recargas", icon: Smartphone },
  { id: "token", label: "Token", icon: KeyRound },
  { id: "certificados", label: "Certificados", icon: Award },
  { id: "usuarios", label: "Usuarios", icon: Users },
  { id: "pasarela", label: "Pasarela y conciliación", icon: Vault },
  { id: "servidor", label: "Servidor", icon: Server },
];

export function BancaView() {
  const tab = useBancaStore((s) => s.tab);
  const setTab = useBancaStore((s) => s.setTab);
  const esAdmin = useNexusStore((s) => s.rol) === "admin";
  // "Usuarios" y "Pasarela y conciliación" son exclusivos del soberano.
  const tabs = TABS.filter((t) => (t.id !== "usuarios" && t.id !== "pasarela") || esAdmin);

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="flex items-center gap-2 text-[11px] font-medium tracking-[0.22em] text-fg-muted uppercase">
            <span className="dot-online" aria-hidden="true" /> Online · v{VERSION_BANCO}
          </p>
          <h1 className="mt-1 text-2xl font-extrabold tracking-tight sm:text-3xl">
            <span className="text-gradient">{NOMBRE_BANCO}</span>
            <span className="text-fg-muted"> · {LEMA_BANCO}</span>
          </h1>
        </div>
        <p className="text-xs tracking-[0.18em] text-fg-subtle uppercase">{FIRMA_BANCA}</p>
      </header>

      <div role="tablist" aria-label="Secciones de banca" className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1">
        {tabs.map((t) => {
          const active = t.id === tab;
          return (
            <button
              key={t.id}
              role="tab"
              type="button"
              aria-selected={active}
              data-tab={t.id}
              onClick={() => setTab(t.id)}
              className={cn(
                "flex h-10 shrink-0 items-center gap-1.5 rounded-xl border px-3.5 text-sm transition-colors",
                active
                  ? "border-[rgba(0,212,170,0.4)] bg-[rgba(0,212,170,0.12)] text-fg"
                  : "border-border bg-white/[0.03] text-fg-muted hover:border-[rgba(0,212,170,0.3)] hover:text-fg",
              )}
            >
              <t.icon className={cn("size-4", active && "text-accent")} />
              {t.label}
            </button>
          );
        })}
      </div>

      <div role="tabpanel">
        {tab === "dashboard" && <Dashboard />}
        {tab === "spei" && <Spei />}
        {tab === "tarjetas" && <Tarjetas />}
        {tab === "pagos" && <Pagos />}
        {tab === "recargas" && <Recargas />}
        {tab === "token" && <Token />}
        {tab === "certificados" && <Certificados />}
        {tab === "usuarios" && esAdmin && <Usuarios />}
        {tab === "pasarela" && esAdmin && <PasarelaConciliacion />}
        {tab === "servidor" && <Servidor />}
      </div>

      <footer className="mt-4 border-t border-border pt-4 text-center">
        <p className="text-xs font-medium tracking-[0.14em] text-fg-muted">
          RMV Capital Bank © 2026 · {FIRMA_BANCA.toUpperCase()}
        </p>
        <p className="mt-1 text-[11px] text-fg-muted italic">{FRASE_BANCA}</p>
      </footer>
    </div>
  );
}
