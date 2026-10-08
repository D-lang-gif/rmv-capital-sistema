import { create } from "zustand";
import { persist } from "zustand/middleware";
import { SALDOS } from "./datos";

export type TipoMovimiento = "SPEI" | "PAGO" | "RECARGA" | "TARJETA";

export type Movimiento = {
  folio: string;
  tipo: TipoMovimiento;
  descripcion: string;
  detalle: string;
  /** Negativo = salida. 0 = solicitud sin cargo. */
  monto: number;
  fecha: string;
};

export type BancaTab =
  | "dashboard"
  | "spei"
  | "tarjetas"
  | "pagos"
  | "recargas"
  | "token"
  | "certificados"
  | "servidor";

type BancaState = {
  tab: BancaTab;
  movimientos: Movimiento[];
  setTab: (t: BancaTab) => void;
  registrar: (m: Omit<Movimiento, "folio" | "fecha">) => Movimiento;
  reiniciar: () => void;
};

const ABC = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function nuevoFolio(prefijo = "RMV"): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  const r = crypto.getRandomValues(new Uint8Array(6));
  const sufijo = Array.from(r, (b) => ABC[b % ABC.length]).join("");
  return `${prefijo}-${String(d.getFullYear()).slice(2)}${p(d.getMonth() + 1)}${p(d.getDate())}-${sufijo}`;
}

export const useBancaStore = create<BancaState>()(
  persist(
    (set, get) => ({
      tab: "dashboard",
      movimientos: [],
      setTab: (tab) => set({ tab }),
      registrar: (m) => {
        const mov: Movimiento = { ...m, folio: nuevoFolio(), fecha: new Date().toISOString() };
        set({ movimientos: [mov, ...get().movimientos] });
        return mov;
      },
      reiniciar: () => set({ movimientos: [] }),
    }),
    {
      name: "rmv-banca-v1",
      partialize: (s) => ({ movimientos: s.movimientos }),
    },
  ),
);

/** Saldo MXN disponible = saldo configurado en datos.ts + movimientos registrados. */
export function saldoDisponible(movs: Movimiento[]): number {
  return Math.round((SALDOS.mxn + movs.reduce((a, m) => a + m.monto, 0)) * 100) / 100;
}
