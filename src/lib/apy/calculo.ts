import { APY_TASA_BASE } from "@/lib/banca/datos";

/** Misma fórmula que el server.js original de APY FAST (redondeo a 2 decimales). */
export function calcularApy(montoTexto: string | number, diasTexto: string | number, base = APY_TASA_BASE) {
  const amount = parseFloat(String(montoTexto)) || 10000;
  const period = parseInt(String(diasTexto), 10) || 365;
  const tasaDiaria = base / 100 / 365;
  const apy = ((1 + tasaDiaria) ** period - 1) * 100;
  const pro = amount * (1 + apy / 100);
  const gan = pro - amount;
  const r2 = (n: number) => parseFloat(n.toFixed(2));
  return { amount, period, apy: r2(apy), final: r2(pro), ganancia: r2(gan) };
}
