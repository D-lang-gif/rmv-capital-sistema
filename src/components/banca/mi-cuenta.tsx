import { FormEvent, useEffect, useState } from "react";
import { KeyRound, Landmark, LogOut, UserRound } from "lucide-react";
import { cambiarClavePropia } from "@/lib/acceso/sesion";
import { FIRMA_BANCA, LEMA_BANCO, NOMBRE_BANCO } from "@/lib/banca/datos";
import { popupAviso } from "@/lib/banca/popup";
import { mensajeError, useUsuariosStore } from "@/lib/banca/usuarios";
import { useNexusStore } from "@/lib/nexus/store";
import { BadgeSoberana, CLAVE_MINIMA, CuentaCard, EstadoNube, Frase, MovimientosInternos } from "./usuarios";
import { BotonShimmer, Campo, Card, Titulo, inputCls } from "./ui";

/** Vista "Mi cuenta": lo único que ve un usuario registrado (no administrador). */
export function MiCuentaApp() {
  const uid = useNexusStore((s) => s.usuarioId);
  const logout = useNexusStore((s) => s.logout);
  const u = useUsuariosStore((s) => s.usuarios.find((x) => x.id === uid));
  const todas = useUsuariosStore((s) => s.cuentas);
  const nube = useUsuariosStore((s) => s.nube);
  const baja = !!u?.baja;
  useEffect(() => {
    if (baja) logout(); // baja = sin acceso (también si ocurre con la sesión abierta)
  }, [baja, logout]);
  if (u?.baja) return null;
  if (!u) {
    return (
      <div className="nexus-grid nexus-vignette flex min-h-dvh flex-col items-center justify-center gap-4 px-4">
        <BadgeSoberana />
        {nube === "sin-conexion" ? <EstadoNube /> : <p className="text-sm text-fg-muted">Conectando con la nube…</p>}
        <button type="button" onClick={logout} className="flex h-9 items-center gap-1.5 rounded-lg border border-border px-3 text-xs text-fg-muted hover:text-fg">
          <LogOut className="size-3.5" /> Salir
        </button>
      </div>
    );
  }
  const cuentas = todas.filter((c) => c.usuarioId === u.id);

  return (
    <div className="nexus-grid nexus-vignette min-h-dvh">
      <div className="h-px w-full bg-gradient-to-r from-[#00d4aa] to-[#00a3e0] opacity-70" />
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-5 px-4 py-6" data-testid="mi-cuenta">
        <header className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <BadgeSoberana />
            <h1 className="mt-2 text-2xl font-extrabold tracking-tight sm:text-3xl">
              <span className="text-gradient">{NOMBRE_BANCO}</span>
              <span className="text-fg-muted"> · {LEMA_BANCO}</span>
            </h1>
            <p className="mt-1 flex items-center gap-1.5 text-sm text-fg-muted">
              <UserRound className="size-4 text-accent" /> {u.nombre} · <span className="font-mono">@{u.usuario}</span>
            </p>
          </div>
          <button
            type="button"
            onClick={logout}
            className="flex h-9 items-center gap-1.5 rounded-lg border border-border px-3 text-xs text-fg-muted hover:border-[rgba(0,212,170,0.3)] hover:text-fg"
          >
            <LogOut className="size-3.5" /> Salir
          </button>
        </header>

        <EstadoNube />

        {u.debeCambiarClave ? (
          <div className="mx-auto w-full max-w-lg" data-testid="cambio-obligatorio">
            <Card className="mb-4 flex flex-col gap-1">
              <Titulo icon={<KeyRound />} sub="Antes de continuar, crea una contraseña nueva.">Cambio de contraseña requerido</Titulo>
              <Frase />
            </Card>
            <CambiarClave />
          </div>
        ) : (
          <>
            <Card className="flex flex-col gap-1">
              <Titulo icon={<Landmark />} sub={`${cuentas.length} cuenta(s) a tu nombre`}>
                Mi cuenta
              </Titulo>
              <Frase />
            </Card>

            {cuentas.length === 0 ? (
              <Card><p className="text-sm text-fg-muted">Aún no tienes cuentas. El administrador puede emitirte una.</p></Card>
            ) : (
              cuentas.map((c) => <CuentaCard key={c.id} c={c} bloqueado={false} />)
            )}

            <div className="grid gap-5 lg:grid-cols-2">
              <MovimientosInternos titulo="Mis movimientos" />
              <CambiarClave />
            </div>
          </>
        )}

        <footer className="mt-2 border-t border-border pt-4 text-center">
          <p className="text-xs font-medium tracking-[0.14em] text-fg-muted">RMV Capital Bank © 2026 · {FIRMA_BANCA.toUpperCase()}</p>
          <div className="mt-1"><Frase /></div>
        </footer>
      </div>
    </div>
  );
}

function CambiarClave() {
  const [actual, setActual] = useState("");
  const [nueva, setNueva] = useState("");
  const [repite, setRepite] = useState("");
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (nueva.length < CLAVE_MINIMA) return popupAviso("Contraseña muy corta", `Mínimo ${CLAVE_MINIMA} caracteres.`);
    if (nueva !== repite) return popupAviso("No coinciden", "Escribe la misma contraseña nueva dos veces.");
    setBusy(true);
    try {
      await cambiarClavePropia(actual, nueva);
      setActual("");
      setNueva("");
      setRepite("");
      popupAviso("Contraseña actualizada", "Usa la nueva contraseña la próxima vez que entres.", "info");
    } catch (err) {
      popupAviso("No se pudo cambiar", mensajeError(err), "error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <Titulo icon={<KeyRound />} sub="Se actualiza en tu acceso de nube">Cambiar contraseña</Titulo>
      <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
        <Campo label="Contraseña actual" htmlFor="cc-actual">
          <input id="cc-actual" type="password" autoComplete="current-password" className={inputCls} value={actual} onChange={(e) => setActual(e.target.value)} />
        </Campo>
        <Campo label="Nueva contraseña" htmlFor="cc-nueva">
          <input id="cc-nueva" type="password" autoComplete="new-password" className={inputCls} value={nueva} onChange={(e) => setNueva(e.target.value)} />
        </Campo>
        <Campo label="Repite la nueva contraseña" htmlFor="cc-repite">
          <input id="cc-repite" type="password" autoComplete="new-password" className={inputCls} value={repite} onChange={(e) => setRepite(e.target.value)} />
        </Campo>
        <BotonShimmer type="submit" disabled={busy} className="self-start"><KeyRound /> {busy ? "Guardando…" : "Actualizar"}</BotonShimmer>
      </form>
    </Card>
  );
}
