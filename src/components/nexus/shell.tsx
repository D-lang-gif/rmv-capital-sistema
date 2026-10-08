import { useEffect, useState } from "react";
import {
  BookOpen,
  Fingerprint,
  Landmark,
  LayoutDashboard,
  LogOut,
  Menu,
  Search,
  Wallet,
  Waves,
  Zap,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { OWNER, TITLE, VERSION } from "@/lib/nexus/config";
import { formatHeight, formatUsd } from "@/lib/nexus/format";
import { useNetwork } from "@/lib/nexus/queries";
import { SESSION_KEY, useNexusStore } from "@/lib/nexus/store";
import { CREDENCIAL } from "@/lib/acceso/credencial";
import { BancaView } from "@/components/banca/banca";
import { ApyFastView } from "@/components/apy/apy-fast";
import type { NexusView } from "@/lib/nexus/types";
import { useRutaHash } from "@/lib/rutas";
import { ExplorerView } from "./explorer";
import { IdentityView } from "./identity";
import { JournalView } from "./journal";
import { LiveRail } from "./live-rail";
import { LoginScreen } from "./login-screen";
import { NexusMark } from "./mark";
import { OverviewView } from "./overview";
import { WalletsView } from "./wallets";
import { WhalesView } from "./whales";

const NAV: Array<{ id: NexusView; label: string; icon: typeof LayoutDashboard }> = [
  { id: "overview", label: "Mesa", icon: LayoutDashboard },
  { id: "wallets", label: "Libro", icon: Wallet },
  { id: "journal", label: "Anotaciones", icon: BookOpen },
  { id: "explorer", label: "Explorador", icon: Search },
  { id: "whales", label: "Observatorio", icon: Waves },
  { id: "identity", label: "Identidad", icon: Fingerprint },
  { id: "banca", label: "Banca", icon: Landmark },
  { id: "apy", label: "APY Fast", icon: Zap },
];

export function NexusApp() {
  const authed = useNexusStore((s) => s.authed);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    // Mantiene la sesión al recargar la pestaña (se borra al cerrar el navegador o con "Salir").
    try {
      if (sessionStorage.getItem(SESSION_KEY) === "1" && !useNexusStore.getState().authed) {
        useNexusStore.setState({ authed: true });
      }
    } catch {
      /* sin almacenamiento */
    }
    setReady(true);
  }, []);
  if (!ready) return <div className="min-h-dvh" />;
  if (!authed) return <LoginScreen />;
  return <NexusShell />;
}

function NexusShell() {
  const view = useNexusStore((s) => s.view);
  const setView = useNexusStore((s) => s.setView);
  const logout = useNexusStore((s) => s.logout);
  const network = useNetwork();
  useRutaHash();
  const [menu, setMenu] = useState(false);
  const [clock, setClock] = useState(() => new Date());

  useEffect(() => {
    const id = window.setInterval(() => setClock(new Date()), 1000);
    return () => window.clearInterval(id);
  }, []);

  const snap = network.data;
  const online = snap?.online ?? false;

  return (
    <div className="flex min-h-dvh flex-col text-fg">
      <div className="h-px bg-gradient-to-r from-[#00d4aa] to-[#00a3e0] opacity-70" />
      <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-border bg-bg-elevated/80 px-3 py-3 backdrop-blur-md sm:px-5">
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          className="lg:hidden"
          aria-label="Menú"
          onClick={() => setMenu(true)}
        >
          <Menu />
        </Button>
        <NexusMark size={22} />
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-2">
            <span className="text-gradient text-lg leading-none font-extrabold tracking-tight">
              RMV Capital
            </span>
            <span className="flex items-center gap-1.5 text-[11px] text-fg-muted">
              <span className="dot-online" aria-hidden="true" />
              Online
            </span>
            <span className="hidden font-mono text-[10px] text-fg-subtle sm:inline">
              v{VERSION}
            </span>
          </div>
          <p className="truncate text-[11px] text-fg-muted">
            {OWNER} · {TITLE}
          </p>
        </div>
        <div className="hidden items-center gap-3 md:flex">
          <div className="text-right">
            <div className="font-mono text-sm tabular text-bitcoin">
              {formatUsd(snap?.usd ?? null)}
            </div>
            <div className="font-mono text-[11px] text-fg-subtle tabular">
              blk {formatHeight(snap?.height ?? null)}
            </div>
          </div>
        </div>
        <Button type="button" variant="ghost" size="sm" onClick={logout} className="hidden sm:inline-flex">
          <LogOut />
          Salir
        </Button>
      </header>

      <div className="flex min-h-0 flex-1">
        <nav className="hidden w-56 shrink-0 flex-col border-r border-border bg-bg-elevated/60 p-3 lg:flex">
          <p className="px-2 pb-2 text-[10px] tracking-[0.18em] text-fg-subtle uppercase">
            Navegación
          </p>
          <NavList
            view={view}
            onSelect={(id) => setView(id)}
          />
        </nav>

        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex gap-1 overflow-x-auto border-b border-border px-2 py-2 lg:hidden">
            {NAV.map((item) => {
              const active = item.id === view;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setView(item.id)}
                  className={`flex h-10 shrink-0 items-center gap-1.5 rounded-md px-3 text-sm ${
                    active
                      ? "bg-surface-2 text-fg"
                      : "text-fg-muted hover:text-fg"
                  }`}
                >
                  <item.icon className="size-4" />
                  {item.label}
                </button>
              );
            })}
          </div>

          <main className="min-h-0 flex-1 overflow-y-auto px-4 py-5 sm:px-6">
            <ViewBody view={view} />
          </main>
        </div>

        {view !== "banca" && view !== "apy" ? (
          <div className="hidden w-72 shrink-0 xl:block">
            <LiveRail />
          </div>
        ) : null}
      </div>

      <footer className="flex items-center gap-3 border-t border-border bg-bg-elevated/80 px-4 py-2 text-[11px]">
        <Badge variant={online ? "success" : "danger"}>
          {online ? "Mainnet en línea" : "Modo local"}
        </Badge>
        <span className="hidden text-fg-muted sm:inline">{CREDENCIAL.usuario}</span>
        <span className="ml-auto font-mono tabular text-fg-subtle">
          {clock.toLocaleTimeString("es-MX", { hour12: false })}
        </span>
      </footer>

      <Sheet open={menu} onOpenChange={setMenu}>
        <SheetContent side="left">
          <SheetHeader>
            <SheetTitle>RMV Capital</SheetTitle>
          </SheetHeader>
          <NavList
            view={view}
            onSelect={(id) => {
              setView(id);
              setMenu(false);
            }}
          />
          <Button
            type="button"
            variant="outline"
            className="mt-auto"
            onClick={() => {
              setMenu(false);
              logout();
            }}
          >
            <LogOut />
            Salir
          </Button>
        </SheetContent>
      </Sheet>
    </div>
  );
}

function NavList({
  view,
  onSelect,
}: {
  view: NexusView;
  onSelect: (id: NexusView) => void;
}) {
  return (
    <ul className="flex flex-col gap-1">
      {NAV.map((item) => {
        const active = item.id === view;
        return (
          <li key={item.id}>
            <button
              type="button"
              onClick={() => onSelect(item.id)}
              className={`flex h-11 w-full items-center gap-2 rounded-md px-3 text-sm ${
                active
                  ? "bg-surface-2 text-fg"
                  : "text-fg-muted hover:bg-surface hover:text-fg"
              }`}
            >
              <item.icon className="size-4" />
              {item.label}
            </button>
          </li>
        );
      })}
    </ul>
  );
}

function ViewBody({ view }: { view: NexusView }) {
  switch (view) {
    case "overview":
      return <OverviewView />;
    case "wallets":
      return <WalletsView />;
    case "journal":
      return <JournalView />;
    case "explorer":
      return <ExplorerView />;
    case "whales":
      return <WhalesView />;
    case "identity":
      return <IdentityView />;
    case "banca":
      return <BancaView />;
    case "apy":
      return <ApyFastView />;
  }
}
