import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { ArrowLeftRight, CheckCircle2, Clock, FileUp, Inbox, KeyRound, ListChecks, RefreshCw, Save, Send, Settings2, Sigma } from "lucide-react";
import { fmtFecha, fmtMXN } from "@/lib/banca/formato";
import { popupAviso } from "@/lib/banca/popup";
import { mensajeError } from "@/lib/banca/usuarios";
import {
  CONFIG_VACIA, INSTITUCIONES, armarOrden, clabeValida, conciliarConPasarela, enviarAStp, estadisticasStp, guardarConfig, guardarOrden,
  importarAbonos, institucionDeClabe, leerConfig, listarAbonos, listarOrdenes, nuevaClaveRastreo, nuevaReferencia, parsearCsvAbonos,
  type AbonoStp, type ConfigStp, type OrdenStp,
} from "@/lib/soberano/stp";
import { cn } from "@/lib/utils";
import { BotonShimmer, Campo, Card, Titulo, inputCls } from "./ui";

/* Banca Soberana · STP / SPEI (solo "soberano"). La firma RSA ocurre en el relay. */

function Stat({ icon, label, valor }: { icon: React.ReactNode; label: string; valor: string }) {
  return (
    <Card className="p-4">
      <p className="flex items-center gap-1.5 text-xs tracking-wide text-fg-muted uppercase [&_svg]:size-4 [&_svg]:text-accent">{icon}{label}</p>
      <p className="mt-1 text-2xl font-bold tabular-nums">{valor}</p>
    </Card>
  );
}

const nombreInst = (c: string) => INSTITUCIONES.find((i) => i.clave === c)?.nombre ?? c;
const ORDEN_VACIA = { conceptoPago: "", cuentaBeneficiario: "", nombreBeneficiario: "", rfcCurpBeneficiario: "", institucionContraparte: "", monto: "" };

export function StpSpei() {
  const [cfg, setCfg] = useState<ConfigStp>(CONFIG_VACIA);
  const [ordenes, setOrdenes] = useState<OrdenStp[]>([]);
  const [abonos, setAbonos] = useState<AbonoStp[]>([]);
  const [cargando, setCargando] = useState(true);
  const [busy, setBusy] = useState(false);
  const [f, setF] = useState(ORDEN_VACIA);
  const [clave, setClave] = useState(nuevaClaveRastreo);
  const [refNum, setRefNum] = useState(nuevaReferencia);

  const cargar = useCallback(async () => {
    setCargando(true);
    try {
      const [c, o, a] = await Promise.all([leerConfig(), listarOrdenes(), listarAbonos()]);
      setCfg(c); setOrdenes(o); setAbonos(a);
    } catch (e) { void popupAviso("STP", mensajeError(e), "error"); }
    finally { setCargando(false); }
  }, []);
  useEffect(() => { void cargar(); }, [cargar]);

  const st = useMemo(() => estadisticasStp(ordenes, abonos), [ordenes, abonos]);
  const clabeOk = clabeValida(f.cuentaBeneficiario);
  const ordenPrevia = useMemo(
    () => armarOrden({ ...f, monto: Number(f.monto) || 0, referenciaNumerica: refNum }, cfg, clave),
    [f, cfg, clave, refNum],
  );

  async function guardarCfg(e: FormEvent) {
    e.preventDefault();
    if (cfg.cuentaOrdenante && !clabeValida(cfg.cuentaOrdenante)) { void popupAviso("STP", "La CLABE ordenante no es válida.", "warning"); return; }
    if (cfg.relay && !/^https?:\/\//.test(cfg.relay)) { void popupAviso("STP", "La URL del relay debe iniciar con https://", "warning"); return; }
    setBusy(true);
    try { await guardarConfig(cfg); await cargar(); void popupAviso("STP", "Configuración guardada.", "info"); }
    catch (e) { void popupAviso("STP", mensajeError(e), "error"); }
    finally { setBusy(false); }
  }

  function cambiarClabe(v: string) {
    const c = v.replace(/\D/g, "").slice(0, 18);
    const inst = institucionDeClabe(c);
    setF((p) => ({ ...p, cuentaBeneficiario: c, institucionContraparte: inst ?? p.institucionContraparte }));
  }

  async function registrar(e: FormEvent) {
    e.preventDefault();
    const monto = Number(f.monto);
    if (!cfg.empresa || !cfg.cuentaOrdenante) { void popupAviso("STP", "Primero guarda empresa y CLABE ordenante en la configuración.", "warning"); return; }
    if (!clabeOk) { void popupAviso("STP", "La CLABE del beneficiario no es válida.", "warning"); return; }
    if (!f.nombreBeneficiario.trim() || !f.conceptoPago.trim() || !f.institucionContraparte || !(monto > 0)) {
      void popupAviso("STP", "Nombre, concepto, institución y un monto mayor a cero son obligatorios.", "warning"); return;
    }
    setBusy(true);
    try {
      const o = await guardarOrden(armarOrden({ ...f, monto, referenciaNumerica: refNum }, cfg, clave));
      setOrdenes((p) => [o, ...p]);
      setF(ORDEN_VACIA); setClave(nuevaClaveRastreo()); setRefNum(nuevaReferencia());
      void popupAviso("Orden SPEI registrada", `Clave de rastreo ${o.claveRastreo} · ${fmtMXN(o.monto)} a ${o.nombreBeneficiario}. Estado: PENDIENTE_FIRMA.${cfg.relay ? " Usa «Enviar a STP» para transmitirla." : " Se enviará a STP en cuanto se conecte el relay de STP."}`, "info");
    } catch (e) { void popupAviso("STP", mensajeError(e), "error"); }
    finally { setBusy(false); }
  }

  async function enviar(o: OrdenStp) {
    if (!cfg.relay) {
      void popupAviso("Orden guardada", `La orden ${o.claveRastreo} quedó guardada como PENDIENTE_FIRMA. Se enviará a STP en cuanto se conecte el relay de STP (URL del relay en Configuración).`, "info");
      return;
    }
    setBusy(true);
    try {
      const r = await enviarAStp(cfg.relay, o);
      setOrdenes((p) => p.map((x) => (x.claveRastreo === r.claveRastreo ? r : x)));
      void popupAviso("Enviar a STP", r.stp_id ? `Orden registrada en STP con id ${r.stp_id}.` : `STP no confirmó la orden. Estado: ${r.estado}.`, r.stp_id ? "info" : "warning");
    } catch (e) { void popupAviso("Enviar a STP", mensajeError(e), "error"); }
    finally { setBusy(false); }
  }

  async function importar(file: File | undefined) {
    if (!file) return;
    setBusy(true);
    try {
      const { abonos: nuevos, errores } = parsearCsvAbonos(await file.text());
      const n = nuevos.length ? await importarAbonos(nuevos) : 0;
      void popupAviso("Abonos SPEI", `${n} abonos nuevos importados${errores ? `, ${errores} filas omitidas` : ""}.`, n ? "info" : "warning");
      await cargar();
    } catch (e) { void popupAviso("Abonos SPEI", mensajeError(e), "error"); }
    finally { setBusy(false); }
  }

  async function conciliar() {
    setBusy(true);
    try {
      const r = await conciliarConPasarela();
      void popupAviso("Conciliación STP", `${r.conciliados} conciliados · ${r.yaConciliados} ya conciliados · ${r.sinCoincidencia} sin coincidencia en pasarela.`, "info");
      await cargar();
    } catch (e) { void popupAviso("Conciliación STP", mensajeError(e), "error"); }
    finally { setBusy(false); }
  }

  const set = (k: keyof typeof ORDEN_VACIA) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setF((p) => ({ ...p, [k]: e.target.value }));

  return (
    <div className="flex flex-col gap-4" data-testid="stp-spei">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat icon={<Sigma />} label="Total enviado" valor={fmtMXN(st.total_enviado)} />
        <Stat icon={<Clock />} label="Pendientes" valor={String(st.pendientes)} />
        <Stat icon={<Inbox />} label="Abonos recibidos" valor={String(st.abonos)} />
        <Stat icon={<ListChecks />} label="Monto abonado" valor={fmtMXN(st.monto_abonos)} />
      </div>

      <Card>
        <Titulo icon={<Settings2 />} sub="Se guarda en soberano/stp (solo soberano).">Conexión STP</Titulo>
        <form onSubmit={guardarCfg} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4" data-testid="stp-config">
          <Campo label="Empresa" htmlFor="stp-empresa"><input id="stp-empresa" className={inputCls} value={cfg.empresa} onChange={(e) => setCfg((p) => ({ ...p, empresa: e.target.value }))} /></Campo>
          <Campo label="CLABE ordenante" htmlFor="stp-cuenta" hint={cfg.cuentaOrdenante ? (clabeValida(cfg.cuentaOrdenante) ? "CLABE válida" : "Dígito verificador incorrecto") : undefined}>
            <input id="stp-cuenta" inputMode="numeric" className={cn(inputCls, "font-mono")} value={cfg.cuentaOrdenante} onChange={(e) => setCfg((p) => ({ ...p, cuentaOrdenante: e.target.value.replace(/\D/g, "").slice(0, 18) }))} />
          </Campo>
          <Campo label="Ambiente" htmlFor="stp-ambiente">
            <select id="stp-ambiente" className={inputCls} value={cfg.ambiente} onChange={(e) => setCfg((p) => ({ ...p, ambiente: e.target.value as ConfigStp["ambiente"] }))}>
              <option value="pruebas">Pruebas</option>
              <option value="produccion">Producción</option>
            </select>
          </Campo>
          <Campo label="URL del relay (opcional)" htmlFor="stp-relay"><input id="stp-relay" placeholder="https://relay.ejemplo.mx" className={inputCls} value={cfg.relay} onChange={(e) => setCfg((p) => ({ ...p, relay: e.target.value }))} /></Campo>
          <div className="flex flex-wrap items-center gap-3 sm:col-span-2 lg:col-span-4">
            <BotonShimmer type="submit" disabled={busy}><Save /> Guardar configuración</BotonShimmer>
            <p className="flex items-center gap-1.5 text-xs text-fg-muted"><KeyRound className="size-3.5 text-[#d4af37]" /> La llave privada de STP permanece únicamente en el servidor relay; nunca se guarda en Firestore ni en el navegador.</p>
          </div>
        </form>
      </Card>

      <Card>
        <Titulo icon={<Send />} sub="Campos de registraOrden · tipoPago 1 · tipoCuentaBeneficiario 40">Nueva orden SPEI</Titulo>
        <form onSubmit={registrar} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4" data-testid="stp-orden">
          <Campo label="Clave de rastreo" htmlFor="stp-clave"><input id="stp-clave" readOnly className={cn(inputCls, "font-mono text-fg-muted")} value={clave} /></Campo>
          <Campo label="Referencia numérica" htmlFor="stp-ref"><input id="stp-ref" readOnly className={cn(inputCls, "font-mono text-fg-muted")} value={refNum} /></Campo>
          <Campo label="CLABE beneficiario" htmlFor="stp-clabe" hint={f.cuentaBeneficiario.length === 18 ? (clabeOk ? <span className="text-accent">CLABE válida</span> : <span className="text-red-400">Dígito verificador incorrecto</span>) : `${f.cuentaBeneficiario.length}/18 dígitos`}>
            <input id="stp-clabe" inputMode="numeric" className={cn(inputCls, "font-mono")} value={f.cuentaBeneficiario} onChange={(e) => cambiarClabe(e.target.value)} />
          </Campo>
          <Campo label="Institución contraparte" htmlFor="stp-inst">
            <select id="stp-inst" className={inputCls} value={f.institucionContraparte} onChange={set("institucionContraparte")}>
              <option value="">Selecciona…</option>
              {INSTITUCIONES.map((i) => <option key={i.clave} value={i.clave}>{i.clave} · {i.nombre}</option>)}
            </select>
          </Campo>
          <Campo label="Nombre beneficiario" htmlFor="stp-nombre"><input id="stp-nombre" className={inputCls} value={f.nombreBeneficiario} onChange={set("nombreBeneficiario")} /></Campo>
          <Campo label="RFC / CURP beneficiario" htmlFor="stp-rfc"><input id="stp-rfc" placeholder="ND" className={inputCls} value={f.rfcCurpBeneficiario} onChange={set("rfcCurpBeneficiario")} /></Campo>
          <Campo label="Monto (MXN)" htmlFor="stp-monto"><input id="stp-monto" type="number" step="0.01" min="0" className={inputCls} value={f.monto} onChange={set("monto")} /></Campo>
          <Campo label="Concepto de pago" htmlFor="stp-concepto"><input id="stp-concepto" maxLength={39} className={inputCls} value={f.conceptoPago} onChange={set("conceptoPago")} /></Campo>
          <div className="sm:col-span-2 lg:col-span-4">
            <p className="mb-1 text-xs tracking-wide text-fg-muted uppercase">Cadena original</p>
            <pre className="overflow-x-auto rounded-lg border border-border bg-black/30 p-3 font-mono text-xs break-all whitespace-pre-wrap text-[#d4af37]" data-testid="stp-cadena">{ordenPrevia.cadenaOriginal}</pre>
          </div>
          <div className="sm:col-span-2 lg:col-span-4"><BotonShimmer type="submit" disabled={busy}><Save /> Registrar orden</BotonShimmer></div>
        </form>
      </Card>

      <Card>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <Titulo icon={<ArrowLeftRight />}>Órdenes SPEI</Titulo>
          <div className="flex items-center gap-2">
            {!cfg.relay && <span className="text-xs text-fg-muted">Para enviar a STP configura la URL del relay.</span>}
            <button type="button" onClick={() => void cargar()} className="rounded-lg border border-border p-2 text-fg-muted hover:text-fg" aria-label="Actualizar"><RefreshCw className="size-4" /></button>
          </div>
        </div>
        {cargando ? <p className="text-sm text-fg-muted">Cargando…</p> : ordenes.length === 0 ? <p className="text-sm text-fg-muted">Sin órdenes registradas.</p> : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-xs tracking-wide text-fg-muted uppercase"><tr><th className="py-2 pr-3">Clave de rastreo</th><th className="pr-3">Beneficiario</th><th className="pr-3">Monto</th><th className="pr-3">Concepto</th><th className="pr-3">Estado</th><th className="pr-3">Fecha</th><th /></tr></thead>
              <tbody>
                {ordenes.map((o) => (
                  <tr key={o.claveRastreo} className="border-t border-border align-top">
                    <td className="py-2 pr-3 font-mono text-xs">{o.claveRastreo}<div className="text-fg-subtle">Ref. {o.referenciaNumerica}</div></td>
                    <td className="pr-3">{o.nombreBeneficiario}<div className="font-mono text-xs text-fg-muted">{o.cuentaBeneficiario} · {nombreInst(o.institucionContraparte)}</div></td>
                    <td className="pr-3 tabular-nums">{fmtMXN(o.monto)}</td>
                    <td className="pr-3">{o.conceptoPago}</td>
                    <td className="pr-3"><span className={cn("rounded-md px-2 py-0.5 text-xs font-semibold", o.stp_id ? "bg-[rgba(0,212,170,0.15)] text-accent" : "bg-[rgba(212,175,55,0.15)] text-[#d4af37]")}>{o.estado}</span>{o.stp_id && <div className="mt-1 text-[11px] text-fg-muted">id STP {o.stp_id}</div>}</td>
                    <td className="pr-3 text-xs text-fg-muted">{fmtFecha(o.creado_at)}</td>
                    <td className="py-2">
                      <button type="button" disabled={busy || !!o.stp_id} title={cfg.relay ? "Enviar a STP" : "Pendiente de relay STP: la orden queda guardada"} onClick={() => void enviar(o)} className="rounded-lg border border-border px-2.5 py-1 text-xs whitespace-nowrap enabled:hover:border-[rgba(0,212,170,0.4)] disabled:opacity-40">Enviar a STP</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Card>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <Titulo icon={<Inbox />} sub="CSV: fechaOperacion, claveRastreo, monto, ordenante, concepto">Abonos recibidos · conciliación STP</Titulo>
          <div className="flex flex-wrap gap-2">
            <label className="flex h-10 cursor-pointer items-center gap-2 rounded-lg border border-border px-4 text-sm text-fg-muted hover:text-fg">
              <FileUp className="size-4" /> Importar CSV
              <input type="file" accept=".csv,text/csv" className="hidden" onChange={(e) => { void importar(e.target.files?.[0]); e.target.value = ""; }} />
            </label>
            <BotonShimmer type="button" disabled={busy || abonos.length === 0} onClick={() => void conciliar()}><CheckCircle2 /> Conciliar con pasarela</BotonShimmer>
          </div>
        </div>
        {cargando ? <p className="text-sm text-fg-muted">Cargando…</p> : abonos.length === 0 ? <p className="text-sm text-fg-muted">Sin abonos importados.</p> : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-xs tracking-wide text-fg-muted uppercase"><tr><th className="py-2 pr-3">Fecha</th><th className="pr-3">Clave de rastreo</th><th className="pr-3">Monto</th><th className="pr-3">Ordenante</th><th className="pr-3">Concepto</th><th>Conciliación</th></tr></thead>
              <tbody>
                {abonos.map((a) => (
                  <tr key={a.claveRastreo} className="border-t border-border">
                    <td className="py-2 pr-3 text-xs">{a.fechaOperacion}</td>
                    <td className="pr-3 font-mono text-xs">{a.claveRastreo}</td>
                    <td className="pr-3 tabular-nums">{fmtMXN(a.monto)}</td>
                    <td className="pr-3">{a.ordenante}</td>
                    <td className="pr-3">{a.concepto}</td>
                    <td>{a.conciliado ? <span className="rounded-md bg-[rgba(0,212,170,0.15)] px-2 py-0.5 text-xs font-semibold text-accent">CONCILIADO · {a.folio_pasarela}</span> : <span className="rounded-md bg-[rgba(212,175,55,0.15)] px-2 py-0.5 text-xs font-semibold text-[#d4af37]">PENDIENTE</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
