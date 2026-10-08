import { FormEvent, useEffect, useState } from "react";
import { calcularApy } from "@/lib/apy/calculo";
import { APY_TASA_BASE } from "@/lib/banca/datos";

const num = new Intl.NumberFormat("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export function ApyFastView() {
  const [monto, setMonto] = useState("10000");
  const [dias, setDias] = useState("365");
  const [res, setRes] = useState<ReturnType<typeof calcularApy> | null>(null);

  function calcular(m = monto, d = dias) {
    setRes(calcularApy(m, d));
  }
  function rapido() {
    setMonto("10000");
    setDias("365");
    calcular("10000", "365");
  }
  useEffect(() => {
    const id = window.setTimeout(() => calcular(), 300);
    return () => window.clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const input =
    "mt-1.5 h-11 w-full rounded-lg border border-[#333] bg-white/5 px-3 text-base text-white tabular focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e94560]";

  return (
    <div className="flex justify-center py-2 sm:py-6">
      <div
        className="w-full max-w-[420px] rounded-2xl border border-[#e94560] bg-[#0a0a1a] p-6 text-center text-white shadow-[0_0_40px_rgba(233,69,96,0.15)] sm:p-10"
        data-testid="apy-card"
      >
        <h1 className="text-2xl font-bold text-[#e94560]">⚡ APY FAST</h1>
        <div className="mt-2 text-6xl font-extrabold text-[#ffd93d] tabular sm:text-7xl">{APY_TASA_BASE}%</div>
        <div className="mt-2 text-sm text-[#888]">Interés Compuesto · 365 días</div>
        <div className="mt-1 text-sm font-semibold tracking-wider text-[#4ecdc4]">🔐 SÉPTIMO ÁNGEL</div>
        <hr className="my-5 border-[#333]" />
        <form
          onSubmit={(e: FormEvent) => {
            e.preventDefault();
            calcular();
          }}
          className="flex flex-col gap-3 text-left"
        >
          <label className="text-sm text-[#ccc]" htmlFor="apy-monto">
            💰 Monto
            <input id="apy-monto" type="number" inputMode="decimal" className={input} value={monto} onChange={(e) => setMonto(e.target.value)} />
          </label>
          <label className="text-sm text-[#ccc]" htmlFor="apy-dias">
            📅 Días
            <input id="apy-dias" type="number" inputMode="numeric" className={input} value={dias} onChange={(e) => setDias(e.target.value)} />
          </label>
          <button type="submit" className="mt-1 h-12 w-full rounded-lg bg-[#e94560] text-base font-semibold text-white transition-colors hover:bg-[#ff6b6b]">
            🚀 Calcular
          </button>
          <button
            type="button"
            onClick={rapido}
            className="h-12 w-full rounded-lg bg-[#ffd93d] text-base font-semibold text-black transition-colors hover:bg-[#ffe66d]"
          >
            ⚡ Rápido
          </button>
        </form>
        {res ? (
          <div className="mt-5 rounded-lg bg-black/30 px-4 py-2 text-left" data-testid="apy-resultado">
            <div className="flex justify-between border-b border-white/5 py-2">
              <span>📊 APY</span>
              <span className="font-semibold text-[#ffd93d] tabular" data-testid="apy-apy">
                {num.format(res.apy)}%
              </span>
            </div>
            <div className="flex justify-between border-b border-white/5 py-2">
              <span>💰 Final</span>
              <span className="font-semibold tabular" data-testid="apy-final">
                ${num.format(res.final)}
              </span>
            </div>
            <div className="flex justify-between py-2">
              <span>📈 Ganancia</span>
              <span className="font-semibold text-[#e94560] tabular" data-testid="apy-ganancia">
                ${num.format(res.ganancia)}
              </span>
            </div>
          </div>
        ) : null}
        <div className="mt-5 text-xs text-[#555]">RMV Capital Bank · RAÚL MUÑOZ VILLA</div>
      </div>
    </div>
  );
}
