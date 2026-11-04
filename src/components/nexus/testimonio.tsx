import { ArrowLeft } from "lucide-react";
import { LOGO_BANNER, MARCA } from "./marca";

const PARRAFOS = [
  "Durante quince años investigué, aprendí y me equivoqué. Conocí de cerca cómo funcionan los sistemas financieros y también sus vulnerabilidades. Al principio buscaba un beneficio propio, pero pensé en mi familia y me pregunté de qué me serviría. Me acerqué a Dios, dejé atrás las adicciones y entendí que ese tiempo también me dejó madurez, conocimiento de la economía y ganas de construir.",
  "RMV Capital Bank · Banca Soberana nació así: con un celular, una computadora y mucha investigación. No robé ni hackeé a nadie. Simplemente estudié cómo funciona y lo construí. No es para estafar a nadie ni para hacer campaña. Respeto las leyes, y esta obra nace del derecho a crear, a manifestarse y a expresarse.",
  "Es una muestra de que nada es imposible: si el pueblo se une y decide, podemos aspirar a la soberanía económica, y algún día cambiar la forma de manejar la economía para los que menos tienen. Participar no tiene costo. Quien quiera ser parte, bienvenido.",
];

export function TestimonioView({ onVolver }: { onVolver?: () => void }) {
  return (
    <article className="mx-auto w-full max-w-2xl" data-testid="testimonio">
      {onVolver ? (
        <button
          type="button"
          onClick={onVolver}
          className="mb-4 flex items-center gap-1.5 text-sm text-fg-muted hover:text-fg"
        >
          <ArrowLeft className="size-4" /> Volver
        </button>
      ) : null}
      <div className="overflow-hidden rounded-2xl border border-[#e0b15c]/40 shadow-[0_0_40px_rgba(224,177,92,0.15)]">
        <img src={LOGO_BANNER} alt="RMV Capital Soberano" className="block h-auto w-full" />
      </div>
      <div className="glass mt-6 rounded-2xl border border-[#e0b15c]/25 p-6 sm:p-8">
        <p className="text-[11px] tracking-[0.28em] text-[#e0b15c] uppercase">RMV Capital Bank · Banca Soberana</p>
        <h2 className="mt-2 text-3xl font-extrabold tracking-tight text-[#f3d28b]">Testimonio</h2>
        <div className="mt-2 h-px w-24 bg-gradient-to-r from-[#e0b15c] to-transparent" />
        <div className="mt-6 flex flex-col gap-4 text-[15px] leading-relaxed text-fg">
          {PARRAFOS.map((p) => (
            <p key={p.slice(0, 20)}>{p}</p>
          ))}
        </div>
        <blockquote className="mt-8 border-l-2 border-[#e0b15c] pl-4">
          <p className="text-lg font-medium text-[#f3d28b] italic">
            Soñar un futuro no es delito, es expresión en el mundo material.
          </p>
          <footer className="mt-2 text-sm tracking-wide text-fg-muted">— {MARCA}</footer>
        </blockquote>
      </div>
    </article>
  );
}
