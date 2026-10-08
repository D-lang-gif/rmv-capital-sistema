import { FormEvent, useCallback, useEffect, useState } from "react";
import { Landmark, LogIn, LogOut, Power, RefreshCw, Send, Server, Smartphone, Waypoints } from "lucide-react";
import {
  api,
  apiActiva,
  guardarApiActiva,
  guardarUrlApi,
  tokenApi,
  urlApi,
  type BanxicoResumen,
  type CuentaApi,
  type PasarelaOp,
  type PasarelaStats,
  type Salud,
  type TxApi,
} from "@/lib/banca/api";
import { fmtFecha, fmtMXN } from "@/lib/banca/formato";
import { popupAviso, popupConfirmar, popupRegistrada } from "@/lib/banca/popup";
import { cn } from "@/lib/utils";
import { BotonShimmer, Campo, Card, Titulo, inputCls } from "./ui";

export function Servidor() {
  const [activa, setActiva] = useState<boolean>(() => apiActiva());
  if (!activa) {
    return (
      <ServidorApagado
        onActivar={() => {
          guardarApiActiva(true);
          setActiva(true);
        }}
      />
    );
  }
  return (
    <ServidorActivo
      onApagar={() => {
        api.salir();
        guardarApiActiva(false);
        setActiva(false);
      }}
    />
  );
}

/** Explicación cuando la conexión está apagada (estado por defecto, p. ej. en GitHub Pages). */
function ServidorApagado({ onActivar }: { onActivar: () => void }) {
  const [url, setUrl] = useState(urlApi());
  return (
    <div className="flex flex-col gap-5">
      <Card>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <Titulo icon={<Server />} sub="RMV CORP · API MAESTRA v3.0 (opcional)">
            Servidor
          </Titulo>
          <span data-testid="api-estado" className="flex items-center gap-2 rounded-full bg-white/5 px-3 py-1 text-xs font-medium text-fg-muted">
            Modo local
          </span>
        </div>
        <div className="flex flex-col gap-3 text-sm text-fg-muted" data-testid="api-explicacion">
          <p>
            La Banca de esta página funciona en <b className="text-fg">modo local</b>: SPEI, pagos, recargas y
            solicitudes de tarjeta se guardan solo en este navegador (con su folio en «Movimientos»).
          </p>
          <p className="flex gap-2">
            <Smartphone className="mt-0.5 size-4 shrink-0 text-accent" />
            <span>
              La <b className="text-fg">API MAESTRA</b> (Flask) no está en internet: corre en tu teléfono (Termux) o en
              tu PC, en <code className="font-mono text-xs">http://127.0.0.1:5001</code>. Las instrucciones están en
              el README del repositorio, carpeta <code className="font-mono text-xs">api/</code>.
            </span>
          </p>
          <p>
            Si la tienes encendida en este mismo equipo, escribe su dirección y pulsa «Conectar con mi servidor».
            Para usarla desde esta página publicada, arráncala con{" "}
            <code className="font-mono text-xs">RMV_CORS_ORIGINS=https://d-lang-gif.github.io</code>.
          </p>
        </div>
        <form
          className="mt-4 flex flex-col gap-2 sm:flex-row"
          onSubmit={(e) => {
            e.preventDefault();
            guardarUrlApi(url);
            onActivar();
          }}
        >
          <input
            aria-label="Dirección del servidor"
            className={cn(inputCls, "font-mono")}
            value={url}
            onChange={(e) => setUrl(e.target.value)}
          />
          <BotonShimmer type="submit" className="shrink-0">
            <Power /> Conectar con mi servidor
          </BotonShimmer>
        </form>
      </Card>
    </div>
  );
}

function ServidorActivo({ onApagar }: { onApagar: () => void }) {
  const [url, setUrl] = useState(urlApi());
  const [salud, setSalud] = useState<Salud | null>(null);
  const [estado, setEstado] = useState<"probando" | "ok" | "local">("probando");
  const [sesion, setSesion] = useState<boolean>(() => Boolean(tokenApi()));
  const [cuentas, setCuentas] = useState<CuentaApi[]>([]);
  const [txs, setTxs] = useState<TxApi[]>([]);

  const probar = useCallback(async () => {
    setEstado("probando");
    try {
      setSalud(await api.salud());
      setEstado("ok");
    } catch {
      setSalud(null);
      setEstado("local");
    }
  }, []);

  const cargar = useCallback(async () => {
    try {
      const [c, t] = await Promise.all([api.cuentas(), api.transacciones()]);
      setCuentas(c);
      setTxs(t);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (/token|expired|signature/i.test(msg)) {
        api.salir();
        setSesion(false);
      }
    }
  }, []);

  useEffect(() => {
    void probar();
  }, [probar]);

  useEffect(() => {
    if (estado === "ok" && sesion) void cargar();
  }, [estado, sesion, cargar]);

  return (
    <div className="flex flex-col gap-5">
      <Card>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <Titulo icon={<Server />} sub="RMV CORP · API MAESTRA v3.0 (opcional)">
            Servidor
          </Titulo>
          <span
            data-testid="api-estado"
            className={cn(
              "flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium",
              estado === "ok" ? "bg-[rgba(34,197,94,0.12)] text-[#4ade80]" : "bg-white/5 text-fg-muted",
            )}
          >
            {estado === "ok" ? <span className="dot-online" /> : null}
            {estado === "ok" ? "Conectado" : estado === "probando" ? "Probando…" : "Modo local"}
          </span>
        </div>
        <form
          className="flex flex-col gap-2 sm:flex-row"
          onSubmit={(e) => {
            e.preventDefault();
            guardarUrlApi(url);
            void probar();
          }}
        >
          <input
            aria-label="Dirección del servidor"
            className={cn(inputCls, "font-mono")}
            value={url}
            onChange={(e) => setUrl(e.target.value)}
          />
          <button
            type="submit"
            className="flex h-11 shrink-0 items-center justify-center gap-2 rounded-lg border border-border px-4 text-sm hover:border-[rgba(0,212,170,0.3)]"
          >
            <RefreshCw className="size-4" /> Probar
          </button>
          <button
            type="button"
            onClick={onApagar}
            className="flex h-11 shrink-0 items-center justify-center gap-2 rounded-lg border border-border px-4 text-sm text-fg-muted hover:text-fg"
          >
            <Power className="size-4" /> Desconectar
          </button>
        </form>
        {salud ? (
          <dl className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {[
              ["Versión", salud.version],
              ["Cuentas", String(salud.cuentas_registradas)],
              ["Transacciones", String(salud.transacciones_totales)],
              ["Firma", salud.firma],
            ].map(([k, v]) => (
              <div key={k} className="rounded-lg bg-white/[0.04] px-3 py-2">
                <dt className="text-[10px] tracking-[0.16em] text-fg-subtle uppercase">{k}</dt>
                <dd className="mt-0.5 truncate font-mono text-sm">{v}</dd>
              </div>
            ))}
          </dl>
        ) : estado === "local" ? (
          <p className="mt-3 text-sm text-fg-muted">
            Sin conexión con el servidor en <span className="font-mono">{urlApi()}</span>. Revisa que esté
            encendido (en tu teléfono o PC) y que permita este origen (<span className="font-mono">RMV_CORS_ORIGINS</span>).
            Las demás pestañas siguen funcionando en modo local.
          </p>
        ) : null}
      </Card>

      {estado === "ok" && !sesion ? <LoginApi onOk={() => setSesion(true)} /> : null}

      {estado === "ok" && sesion ? (
        <>
          <div className="grid gap-5 lg:grid-cols-2">
            <Card>
              <div className="flex items-start justify-between gap-3">
                <Titulo sub={`${cuentas.length} en el servidor`}>Cuentas</Titulo>
                <button
                  type="button"
                  onClick={() => {
                    api.salir();
                    setSesion(false);
                  }}
                  className="flex h-9 items-center gap-1.5 rounded-lg border border-border px-3 text-xs text-fg-muted hover:text-fg"
                >
                  <LogOut className="size-3.5" /> Salir del servidor
                </button>
              </div>
              <ul className="flex flex-col divide-y divide-border" data-testid="api-cuentas">
                {cuentas.map((c) => (
                  <li key={c.id} className="flex items-center justify-between gap-3 py-2.5">
                    <div className="min-w-0">
                      <p className="font-mono text-sm">{c.numero}</p>
                      <p className="truncate text-xs text-fg-subtle">{c.titular}</p>
                    </div>
                    <p className="font-semibold tabular">{fmtMXN(c.saldo)}</p>
                  </li>
                ))}
                {cuentas.length === 0 ? <li className="py-4 text-sm text-fg-muted">Sin cuentas.</li> : null}
              </ul>
            </Card>
            <TransferenciaApi cuentas={cuentas} onHecha={cargar} />
          </div>
          <div className="grid gap-5 lg:grid-cols-2">
            <Banxico />
            <Pasarela />
          </div>
          <Card>
            <Titulo sub="Últimas 20">Transacciones del servidor</Titulo>
            <ul className="flex flex-col divide-y divide-border" data-testid="api-transacciones">
              {txs.map((t) => (
                <li key={t.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5">
                  <div className="min-w-0">
                    <p className="text-sm">
                      <span className="mr-2 rounded bg-[rgba(0,212,170,0.12)] px-1.5 py-0.5 text-[10px] font-semibold text-accent">
                        {t.tipo}
                      </span>
                      {t.concepto || "—"}
                    </p>
                    <p className="text-xs text-fg-subtle">
                      {fmtFecha(t.fecha)} · {t.estado}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold tabular">{fmtMXN(t.monto)}</p>
                    <p className="font-mono text-[11px] text-accent">{t.folio}</p>
                  </div>
                </li>
              ))}
              {txs.length === 0 ? <li className="py-4 text-sm text-fg-muted">Sin transacciones.</li> : null}
            </ul>
          </Card>
        </>
      ) : null}
    </div>
  );
}

function LoginApi({ onOk }: { onOk: () => void }) {
  const [usuario, setUsuario] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await api.entrar(usuario, password);
      setPassword("");
      onOk();
    } catch {
      setError("Usuario o contraseña del servidor incorrectos.");
    }
  }
  return (
    <Card>
      <Titulo icon={<LogIn />} sub="Usuario del servidor (API Maestra)">
        Entrar al servidor
      </Titulo>
      <form onSubmit={onSubmit} className="grid gap-4 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
        <Campo label="Usuario" htmlFor="api-user">
          <input id="api-user" className={inputCls} autoComplete="off" value={usuario} onChange={(e) => setUsuario(e.target.value)} />
        </Campo>
        <Campo label="Contraseña" htmlFor="api-pass">
          <input
            id="api-pass"
            type="password"
            className={inputCls}
            autoComplete="off"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </Campo>
        <BotonShimmer type="submit">
          <LogIn /> Entrar
        </BotonShimmer>
      </form>
      {error ? (
        <p className="mt-3 text-sm text-danger" role="alert">
          {error}
        </p>
      ) : null}
    </Card>
  );
}

function TransferenciaApi({ cuentas, onHecha }: { cuentas: CuentaApi[]; onHecha: () => void }) {
  const [origen, setOrigen] = useState("");
  const [destino, setDestino] = useState("");
  const [monto, setMonto] = useState("");
  const [concepto, setConcepto] = useState("");

  useEffect(() => {
    if (!origen && cuentas[0]) setOrigen(cuentas[0].numero);
    if (!destino && cuentas[1]) setDestino(cuentas[1].numero);
  }, [cuentas, origen, destino]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const m = Number(monto.replace(/,/g, ""));
    if (!origen || !destino || origen === destino) return popupAviso("Cuentas no válidas", "Elige dos cuentas distintas.");
    if (!Number.isFinite(m) || m <= 0) return popupAviso("Monto no válido", "Escribe un monto mayor a cero.");
    const filas: Array<[string, string]> = [
      ["Origen", origen],
      ["Destino", destino],
      ["Monto", fmtMXN(m)],
      ["Concepto", concepto || "—"],
    ];
    if (!(await popupConfirmar("¿Confirmar transferencia en el servidor?", filas))) return;
    try {
      const r = await api.transaccion({ origen, destino, monto: m, concepto });
      setMonto("");
      setConcepto("");
      onHecha();
      await popupRegistrada(filas, r.folio);
    } catch (err) {
      await popupAviso("No se registró", err instanceof Error ? err.message : String(err), "error");
    }
  }

  const sel = cn(inputCls, "bg-[#111a30] font-mono");
  return (
    <Card>
      <Titulo icon={<Send />} sub="Entre cuentas del servidor">
        Transferir
      </Titulo>
      <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
        <div className="grid gap-4 sm:grid-cols-2">
          <Campo label="Origen" htmlFor="api-origen">
            <select id="api-origen" className={sel} value={origen} onChange={(e) => setOrigen(e.target.value)}>
              {cuentas.map((c) => (
                <option key={c.id} value={c.numero}>
                  {c.numero}
                </option>
              ))}
            </select>
          </Campo>
          <Campo label="Destino" htmlFor="api-destino">
            <select id="api-destino" className={sel} value={destino} onChange={(e) => setDestino(e.target.value)}>
              {cuentas.map((c) => (
                <option key={c.id} value={c.numero}>
                  {c.numero}
                </option>
              ))}
            </select>
          </Campo>
        </div>
        <Campo label="Monto (MXN)" htmlFor="api-monto">
          <input
            id="api-monto"
            className={cn(inputCls, "tabular")}
            inputMode="decimal"
            placeholder="0.00"
            value={monto}
            onChange={(e) => setMonto(e.target.value.replace(/[^\d.,]/g, ""))}
          />
        </Campo>
        <Campo label="Concepto" htmlFor="api-concepto">
          <input id="api-concepto" className={inputCls} maxLength={40} value={concepto} onChange={(e) => setConcepto(e.target.value)} />
        </Campo>
        <BotonShimmer type="submit">
          <Send /> Transferir
        </BotonShimmer>
      </form>
    </Card>
  );
}

/* ───────────── Indicadores Banxico (módulo banxico.py) ───────────── */
function Banxico() {
  const [datos, setDatos] = useState<BanxicoResumen | null>(null);
  const [estado, setEstado] = useState<"cargando" | "ok" | "sin-token" | "error">("cargando");
  const [detalle, setDetalle] = useState("");

  const cargar = useCallback(async () => {
    setEstado("cargando");
    try {
      const m = await api.modulos().catch(() => null);
      if (m && (!m.banxico || !m.banxico_token)) {
        setEstado("sin-token");
        return;
      }
      setDatos(await api.banxico());
      setEstado("ok");
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setDetalle(msg);
      setEstado(/token/i.test(msg) || /HTTP 404/.test(msg) ? "sin-token" : "error");
    }
  }, []);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  const filas = datos ? Object.entries(datos.indicadores) : [];
  return (
    <Card>
      <div className="flex items-start justify-between gap-3">
        <Titulo icon={<Landmark />} sub="Banxico SIE · fuente oficial">
          Indicadores Banxico
        </Titulo>
        <button
          type="button"
          onClick={() => void cargar()}
          aria-label="Actualizar indicadores"
          className="flex size-9 items-center justify-center rounded-lg border border-border text-fg-muted hover:text-fg"
        >
          <RefreshCw className="size-3.5" />
        </button>
      </div>
      {estado === "cargando" ? <p className="text-sm text-fg-muted">Consultando…</p> : null}
      {estado === "sin-token" ? (
        <div className="rounded-xl bg-white/[0.04] px-4 py-3 text-sm" data-testid="banxico-sin-token">
          <p className="font-medium">Configura tu token de Banxico</p>
          <p className="mt-1 text-fg-muted">
            Obtén un token gratuito en{" "}
            <a
              className="text-accent underline-offset-4 hover:underline"
              href="https://www.banxico.org.mx/SieAPIRest/service/v1/token"
              target="_blank"
              rel="noreferrer"
            >
              banxico.org.mx
            </a>{" "}
            y arranca el servidor con la variable <code className="font-mono text-xs">BANXICO_TOKEN</code>.
          </p>
        </div>
      ) : null}
      {estado === "error" ? <p className="text-sm text-fg-muted">No disponible: {detalle}</p> : null}
      {estado === "ok" ? (
        filas.length ? (
          <ul className="flex flex-col divide-y divide-border">
            {filas.map(([k, v]) => (
              <li key={k} className="flex items-center justify-between gap-3 py-2">
                <span className="min-w-0 text-sm text-fg-muted">{k}</span>
                <span className="text-right">
                  <span className="block font-mono text-sm tabular">{String(v.valor)}</span>
                  <span className="text-[11px] text-fg-subtle">{v.fecha}</span>
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-fg-muted">Sin datos publicados en los últimos días.</p>
        )
      ) : null}
    </Card>
  );
}

/* ───────────── Pasarela (módulo pasarela.py) ───────────── */
function Pasarela() {
  const [stats, setStats] = useState<PasarelaStats | null>(null);
  const [ops, setOps] = useState<PasarelaOp[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let vivo = true;
    api
      .modulos()
      .catch(() => ({ pasarela: true }))
      .then((m) => {
        if (!m.pasarela) throw new Error("módulo pasarela.py no cargado");
        return Promise.all([api.pasarelaStats(), api.pasarelaOperaciones()]);
      })
      .then(([s, o]) => {
        if (!vivo) return;
        setStats(s);
        setOps(o);
      })
      .catch((e) => vivo && setError(e instanceof Error ? e.message : String(e)));
    return () => {
      vivo = false;
    };
  }, []);

  return (
    <Card>
      <Titulo icon={<Waypoints />} sub="Operaciones y conciliación">
        Pasarela
      </Titulo>
      {error ? <p className="text-sm text-fg-muted">No disponible: {error}</p> : null}
      {stats ? (
        <dl className="grid grid-cols-2 gap-2 sm:grid-cols-4" data-testid="pasarela-stats">
          {[
            ["Total", String(stats.total)],
            ["Pendientes", String(stats.pendientes)],
            ["Conciliadas", String(stats.conciliados)],
            ["Monto", fmtMXN(Number(stats.monto_total) || 0)],
          ].map(([k, v]) => (
            <div key={k} className="rounded-lg bg-white/[0.04] px-3 py-2">
              <dt className="text-[10px] tracking-[0.16em] text-fg-subtle uppercase">{k}</dt>
              <dd className="mt-0.5 truncate font-mono text-sm tabular">{v}</dd>
            </div>
          ))}
        </dl>
      ) : null}
      <ul className="mt-3 flex flex-col divide-y divide-border">
        {ops.map((o) => (
          <li key={o.id} className="flex items-center justify-between gap-3 py-2">
            <div className="min-w-0">
              <p className="font-mono text-xs text-accent">{o.folio}</p>
              <p className="truncate text-xs text-fg-subtle">
                {o.concepto || o.metodo || "—"} · {o.estado}
              </p>
            </div>
            <p className="font-semibold tabular">{fmtMXN(Number(o.monto) || 0)}</p>
          </li>
        ))}
        {stats && ops.length === 0 ? <li className="py-3 text-sm text-fg-muted">Sin operaciones.</li> : null}
      </ul>
    </Card>
  );
}
