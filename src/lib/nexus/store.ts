import { create } from "zustand";
import { persist } from "zustand/middleware";
import { SEED_WALLETS, SEED_WHALES } from "./config";
import type { LedgerEntry, NexusView, WatchedWallet, WhaleEntry } from "./types";

type NexusState = {
  authed: boolean;
  view: NexusView;
  wallets: WatchedWallet[];
  journal: LedgerEntry[];
  whales: WhaleEntry[];
  /** Se llama solo después de verificar la contraseña (PBKDF2) en login-screen. */
  entrar: () => void;
  logout: () => void;
  setView: (view: NexusView) => void;
  addWallet: (wallet: Omit<WatchedWallet, "id" | "created">) => { ok: true } | { ok: false; error: string };
  removeWallet: (id: string) => void;
  addJournal: (entry: Omit<LedgerEntry, "id" | "createdAt" | "status">) => LedgerEntry;
  addWhale: (whale: Omit<WhaleEntry, "id">) => { ok: true } | { ok: false; error: string };
  removeWhale: (id: string) => void;
};

export const SESSION_KEY = "rmv-capital.sesion";

function normAddr(a: string) {
  return a.trim();
}

export const useNexusStore = create<NexusState>()(
  persist(
    (set, get) => ({
      authed: false,
      view: "overview",
      wallets: SEED_WALLETS,
      journal: [],
      whales: SEED_WHALES,
      entrar: () => {
        try {
          sessionStorage.setItem(SESSION_KEY, "1");
        } catch {
          /* sin almacenamiento */
        }
        set({ authed: true, view: "overview" });
      },
      logout: () => {
        try {
          sessionStorage.removeItem(SESSION_KEY);
        } catch {
          /* sin almacenamiento */
        }
        set({ authed: false, view: "overview" });
      },
      setView: (view) => set({ view }),
      addWallet: (wallet) => {
        const address = normAddr(wallet.address);
        if (!address) return { ok: false, error: "Ingresa una dirección" };
        const exists = get().wallets.some(
          (w) => w.address.toLowerCase() === address.toLowerCase(),
        );
        if (exists) return { ok: false, error: "Esa dirección ya está en el libro" };
        const next: WatchedWallet = {
          ...wallet,
          address,
          id: `w-${Date.now().toString(36)}`,
          created: new Date().toISOString().slice(0, 10),
        };
        set({ wallets: [...get().wallets, next] });
        return { ok: true };
      },
      removeWallet: (id) => {
        const target = get().wallets.find((w) => w.id === id);
        if (!target || target.role === "treasury") return;
        set({ wallets: get().wallets.filter((w) => w.id !== id) });
      },
      addJournal: (entry) => {
        const row: LedgerEntry = {
          ...entry,
          id: crypto.randomUUID(),
          createdAt: new Date().toISOString(),
          status: "anotado",
        };
        set({ journal: [row, ...get().journal] });
        return row;
      },
      addWhale: (whale) => {
        const address = normAddr(whale.address);
        if (!address) return { ok: false, error: "Ingresa una dirección" };
        const exists = get().whales.some(
          (w) => w.address.toLowerCase() === address.toLowerCase(),
        );
        if (exists) return { ok: false, error: "Esa dirección ya está en el observatorio" };
        set({
          whales: [
            ...get().whales,
            { ...whale, address, id: `h-${Date.now().toString(36)}` },
          ],
        });
        return { ok: true };
      },
      removeWhale: (id) => {
        if (SEED_WHALES.some((w) => w.id === id)) return;
        set({ whales: get().whales.filter((w) => w.id !== id) });
      },
    }),
    {
      name: "rmv-nexus-v11",
      partialize: (s) => ({
        wallets: s.wallets,
        journal: s.journal,
        whales: s.whales,
      }),
    },
  ),
);
