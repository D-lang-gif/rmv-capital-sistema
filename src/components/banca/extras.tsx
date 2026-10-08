import { useEffect, useState } from "react";
import { Award, KeyRound, ShieldCheck } from "lucide-react";
import { CERTIFICADOS, TITULAR } from "@/lib/banca/datos";
import { PERIODO, codigoTotp, segundosRestantes } from "@/lib/banca/totp";
import { Card, Titulo } from "./ui";

/* ─────────────────────────── TOKEN ─────────────────────────── */
export function Token() {
  const [codigo, setCodigo] = useState<string | null>(null);
  const [restan, setRestan] = useState(PERIODO);

  useEffect(() => {
    let vivo = true;
    let ventana = -1;
    async function tick() {
      const ahora = Date.now();
      const v = Math.floor(ahora / 1000 / PERIODO);
      setRestan(segundosRestantes(ahora));
      if (v !== ventana) {
        ventana = v;
        try {
          const c = await codigoTotp(ahora);
          if (vivo) setCodigo(c);
        } catch {
          if (vivo) setCodigo(null);
        }
      }
    }
    void tick();
    const id = window.setInterval(() => void tick(), 1000);
    return () => {
      vivo = false;
      window.clearInterval(id);
    };
  }, []);

  const pct = (restan / PERIODO) * 100;
  const r = 54;
  const circ = 2 * Math.PI * r;

  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <Card className="flex flex-col items-center text-center">
        <Titulo icon={<KeyRound />}>Token dinámico</Titulo>
        <div className="relative my-2 size-44">
          <svg viewBox="0 0 120 120" className="size-full -rotate-90">
            <circle cx="60" cy="60" r={r} fill="none" stroke="rgb(255 255 255 / 0.08)" strokeWidth="6" />
            <circle
              cx="60"
              cy="60"
              r={r}
              fill="none"
              stroke="url(#rmv-grad)"
              strokeWidth="6"
              strokeLinecap="round"
              strokeDasharray={circ}
              strokeDashoffset={circ * (1 - pct / 100)}
              style={{ transition: "stroke-dashoffset 1s linear" }}
            />
            <defs>
              <linearGradient id="rmv-grad" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#00d4aa" />
                <stop offset="100%" stopColor="#00a3e0" />
              </linearGradient>
            </defs>
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-3xl font-bold tabular" data-testid="token-segundos">
              {restan}
            </span>
            <span className="text-[10px] tracking-[0.16em] text-fg-subtle uppercase">segundos</span>
          </div>
        </div>
        <p className="text-gradient font-mono text-5xl font-bold tracking-[0.18em] tabular" data-testid="token-codigo">
          {codigo ? `${codigo.slice(0, 3)} ${codigo.slice(3)}` : "··· ···"}
        </p>
        <p className="mt-3 text-sm text-fg-muted">El código cambia cada {PERIODO} segundos.</p>
      </Card>
      <Card>
        <Titulo icon={<ShieldCheck />} sub="Token de este dispositivo">
          Detalles
        </Titulo>
        <dl className="grid gap-3">
          {[
            ["Titular", TITULAR],
            ["Algoritmo", "TOTP · HMAC-SHA1 · 6 dígitos"],
            ["Vigencia", `${PERIODO} segundos`],
            ["Estado", "Activo"],
          ].map(([k, v]) => (
            <div key={k} className="rounded-lg bg-white/[0.04] px-3 py-2">
              <dt className="text-[10px] tracking-[0.16em] text-fg-subtle uppercase">{k}</dt>
              <dd className="mt-0.5 text-sm">{v}</dd>
            </div>
          ))}
        </dl>
      </Card>
    </div>
  );
}

/* ─────────────────────────── CERTIFICADOS ─────────────────────────── */
export function Certificados() {
  return (
    <div className="grid gap-4 md:grid-cols-3">
      {CERTIFICADOS.map((c) => (
        <Card key={c.titulo} className="flex flex-col">
          <div className="mb-3 flex size-11 items-center justify-center rounded-xl bg-[rgba(0,212,170,0.12)] text-accent">
            <Award className="size-5" />
          </div>
          <h3 className="text-base font-semibold">{c.titulo}</h3>
          <p className="mt-1 flex-1 text-sm text-fg-muted">{c.descripcion}</p>
          <div className="mt-4 rounded-lg bg-white/[0.04] px-3 py-2">
            <p className="text-[10px] tracking-[0.16em] text-fg-subtle uppercase">Titular</p>
            <p className="text-sm">{TITULAR}</p>
          </div>
          <p className="text-gradient mt-3 font-mono text-xs font-semibold tracking-wider">{c.codigo}</p>
        </Card>
      ))}
    </div>
  );
}
