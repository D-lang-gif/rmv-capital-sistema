/**
 * Rutas con "#" (hash) para que cada sección tenga su propia dirección y
 * funcione al recargar la página, también en un sitio estático (GitHub Pages).
 *   #/mesa  #/libro  #/anotaciones  #/explorador  #/observatorio  #/identidad
 *   #/banca/dashboard  #/banca/spei  … #/banca/servidor   #/apy
 */
import { useEffect } from "react";
import type { NexusView } from "@/lib/nexus/types";
import { useNexusStore } from "@/lib/nexus/store";
import { useBancaStore, type BancaTab } from "@/lib/banca/store";

const VISTAS: Record<NexusView, string> = {
  overview: "mesa",
  wallets: "libro",
  journal: "anotaciones",
  explorer: "explorador",
  whales: "observatorio",
  identity: "identidad",
  banca: "banca",
  apy: "apy",
};
const PESTANAS: BancaTab[] = [
  "dashboard",
  "spei",
  "tarjetas",
  "pagos",
  "recargas",
  "token",
  "certificados",
  "servidor",
];

export function leerHash(hash: string): { view: NexusView; tab?: BancaTab } | null {
  const partes = hash.replace(/^#\/?/, "").split("/").filter(Boolean);
  if (!partes.length) return null;
  const view = (Object.keys(VISTAS) as NexusView[]).find((v) => VISTAS[v] === partes[0]);
  if (!view) return null;
  const tab = view === "banca" ? PESTANAS.find((t) => t === partes[1]) : undefined;
  return { view, tab };
}

export function hashDe(view: NexusView, tab: BancaTab): string {
  return view === "banca" ? `#/banca/${tab}` : `#/${VISTAS[view]}`;
}

function aplicar(hash: string) {
  const r = leerHash(hash);
  if (!r) return;
  if (useNexusStore.getState().view !== r.view) useNexusStore.getState().setView(r.view);
  if (r.tab && useBancaStore.getState().tab !== r.tab) useBancaStore.getState().setTab(r.tab);
}

/** Sincroniza la vista y la pestaña de Banca con la dirección (#/...). */
export function useRutaHash() {
  const view = useNexusStore((s) => s.view);
  const tab = useBancaStore((s) => s.tab);

  // Al entrar: la dirección manda (permite recargar o abrir un enlace directo).
  useEffect(() => {
    aplicar(window.location.hash);
    const alCambiar = () => aplicar(window.location.hash);
    window.addEventListener("hashchange", alCambiar);
    return () => window.removeEventListener("hashchange", alCambiar);
  }, []);

  // Al navegar dentro de la app: se actualiza la dirección (con historial para "Atrás").
  useEffect(() => {
    // Se lee el estado actual (no el de este render) por si el efecto anterior acaba de aplicarlo.
    const destino = hashDe(useNexusStore.getState().view, useBancaStore.getState().tab);
    if (window.location.hash !== destino) {
      const actual = leerHash(window.location.hash);
      const url = `${window.location.pathname}${window.location.search}${destino}`;
      if (actual) window.history.pushState(null, "", url);
      else window.history.replaceState(null, "", url);
    }
  }, [view, tab]);
}
