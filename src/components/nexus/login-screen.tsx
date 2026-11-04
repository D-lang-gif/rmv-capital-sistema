import { FormEvent, useState } from "react";
import { BookOpenText, Eye, EyeOff, Loader2, LogIn, ShieldCheck } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { popupAviso } from "@/lib/banca/popup";
import { iniciarSesion } from "@/lib/acceso/sesion";
import { VERSION } from "@/lib/nexus/config";
import { useNexusStore } from "@/lib/nexus/store";
import { LOGO_BANNER, MARCA } from "./marca";
import { TestimonioView } from "./testimonio";

export function LoginScreen() {
  const entrar = useNexusStore((s) => s.entrar);
  const [user, setUser] = useState("");
  const [pass, setPass] = useState("");
  const [ver, setVer] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [testimonio, setTestimonio] = useState(() => typeof location !== "undefined" && location.hash === "#/testimonio");

  function verTestimonio(v: boolean) {
    setTestimonio(v);
    try {
      history.replaceState(null, "", v ? "#/testimonio" : location.pathname + location.search);
    } catch {
      /* sin historial */
    }
    window.scrollTo(0, 0);
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!user.trim() || !pass) {
      setError("Escribe usuario y contraseña.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const r = await iniciarSesion(user, pass);
      if (r.ok) {
        setPass("");
        if (r.rol === "admin") {
          entrar("admin");
          if (r.aviso) void popupAviso("Nube sin conexión", r.aviso, "info");
        } else entrar("usuario", r.uid);
      } else {
        await new Promise((res) => setTimeout(res, 350));
        setError(r.error);
      }
    } catch {
      setError("Este navegador no puede verificar la contraseña (abre la página con https o localhost).");
    } finally {
      setBusy(false);
    }
  }

  if (testimonio) {
    return (
      <div className="nexus-grid nexus-vignette relative flex min-h-dvh flex-col">
        <main className="flex w-full flex-1 flex-col px-5 py-10">
          <TestimonioView onVolver={() => verTestimonio(false)} />
        </main>
      </div>
    );
  }

  return (
    <div className="nexus-grid nexus-vignette relative flex min-h-dvh flex-col">
      <div className="h-px w-full bg-gradient-to-r from-[#00d4aa] to-[#00a3e0] opacity-70" />
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-5 py-12">
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="w-full overflow-hidden rounded-2xl border border-[#e0b15c]/40 shadow-[0_0_40px_rgba(224,177,92,0.18)]">
            <img src={LOGO_BANNER} alt="RMV Capital Soberano" className="block h-auto w-full" data-testid="logo-banner" />
          </div>
          <span className="mt-5 inline-flex items-center gap-1.5 rounded-full border border-[#e0b15c]/50 bg-[#e0b15c]/10 px-3 py-1 text-[10px] font-semibold tracking-[0.24em] text-[#e0b15c]">
            <ShieldCheck className="size-3" /> BANCA SOBERANA
          </span>
          <h1 className="mt-3 text-3xl font-extrabold tracking-tight sm:text-4xl">
            <span className="text-gradient">RMV Capital Bank · Banca Soberana</span>
          </h1>
          <p className="mt-3 max-w-sm text-sm text-[#f3d28b] italic">
            Soñar un futuro no es delito, es expresión en el mundo material.
          </p>
          <p className="mt-2 flex items-center gap-2 text-xs tracking-[0.2em] text-fg-subtle uppercase">
            <span className="dot-online" aria-hidden="true" /> {MARCA}
          </p>
        </div>

        <form onSubmit={onSubmit} className="glass rounded-2xl p-5" autoComplete="on">
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="rmv-user">Usuario</Label>
              <Input
                id="rmv-user"
                name="username"
                autoComplete="username"
                autoCapitalize="none"
                spellCheck={false}
                value={user}
                onChange={(e) => {
                  setUser(e.target.value);
                  setError(null);
                }}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="rmv-pass">Contraseña</Label>
              <div className="relative">
                <Input
                  id="rmv-pass"
                  name="password"
                  type={ver ? "text" : "password"}
                  autoComplete="current-password"
                  className="pr-11"
                  value={pass}
                  onChange={(e) => {
                    setPass(e.target.value);
                    setError(null);
                  }}
                />
                <button
                  type="button"
                  onClick={() => setVer((v) => !v)}
                  aria-label={ver ? "Ocultar contraseña" : "Mostrar contraseña"}
                  className="absolute top-0 right-0 flex h-11 w-11 items-center justify-center text-fg-muted hover:text-fg"
                >
                  {ver ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
            </div>
            {error ? (
              <p className="text-sm text-danger" role="alert">
                {error}
              </p>
            ) : null}
            <button
              type="submit"
              disabled={busy}
              className="btn-shimmer mt-1 flex h-11 w-full items-center justify-center gap-2 rounded-lg text-sm disabled:opacity-60"
            >
              {busy ? <Loader2 className="size-4 animate-spin" /> : <LogIn className="size-4" />}
              {busy ? "Verificando…" : "Entrar"}
            </button>
          </div>
        </form>

        <button
          type="button"
          onClick={() => verTestimonio(true)}
          className="mt-5 flex h-11 w-full items-center justify-center gap-2 rounded-lg border border-[#e0b15c]/50 text-sm text-[#e0b15c] hover:bg-[#e0b15c]/10"
          data-testid="ver-testimonio"
        >
          <BookOpenText className="size-4" /> Leer el Testimonio
        </button>

        <p className="mt-8 text-center font-mono text-[11px] tracking-wide text-fg-subtle">
          RMV Capital Bank © 2026 · v{VERSION}
        </p>
        <p className="mt-1 text-center text-[11px] tracking-wide text-fg-subtle" data-testid="autor">
          {MARCA} · Todos los derechos reservados
        </p>
      </main>
    </div>
  );
}
