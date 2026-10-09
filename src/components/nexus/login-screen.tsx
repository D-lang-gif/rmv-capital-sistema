import { FormEvent, useState } from "react";
import { Eye, EyeOff, Loader2, LogIn } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { verificarAcceso } from "@/lib/acceso/verificar";
import { OWNER, VERSION } from "@/lib/nexus/config";
import { useNexusStore } from "@/lib/nexus/store";
import { NexusMark } from "./mark";

export function LoginScreen() {
  const entrar = useNexusStore((s) => s.entrar);
  const [user, setUser] = useState("");
  const [pass, setPass] = useState("");
  const [ver, setVer] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!user.trim() || !pass) {
      setError("Escribe usuario y contraseña.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const ok = await verificarAcceso(user, pass);
      if (ok) {
        setPass("");
        entrar();
      } else {
        await new Promise((r) => setTimeout(r, 350));
        setError("Usuario o contraseña incorrectos.");
      }
    } catch {
      setError("Este navegador no puede verificar la contraseña (abre la página con https o localhost).");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="nexus-grid nexus-vignette relative flex min-h-dvh flex-col">
      <div className="h-px w-full bg-gradient-to-r from-[#00d4aa] to-[#00a3e0] opacity-70" />
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-5 py-12">
        <div className="mb-8 flex flex-col items-center text-center">
          <NexusMark size={44} />
          <p className="mt-6 flex items-center gap-2 text-[11px] font-medium tracking-[0.28em] text-fg-muted uppercase">
            <span className="dot-online" aria-hidden="true" /> Online
          </p>
          <h1 className="mt-3 text-4xl font-extrabold tracking-tight sm:text-5xl">
            <span className="text-gradient">RMV Capital</span>
          </h1>
          <p className="mt-3 max-w-sm text-sm text-fg-muted">
            Tesorería Bitcoin · Banca Digital Soberana · APY Fast
          </p>
          <p className="mt-1 text-xs tracking-[0.2em] text-fg-subtle uppercase">{OWNER}</p>
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

        <p className="mt-8 text-center font-mono text-[11px] tracking-wide text-fg-subtle">
          RMV Capital Bank © 2026 · v{VERSION}
        </p>
        <p className="mt-1 text-center text-[11px] tracking-wide text-fg-subtle" data-testid="autor">
          Autor: Raúl Muñoz Villa · Todos los derechos reservados
        </p>
      </main>
    </div>
  );
}
