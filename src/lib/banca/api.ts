/**
 * Cliente opcional para "RMV CORP - API MAESTRA v3.0" (carpeta api/).
 * APAGADO por defecto: no se hace ninguna consulta hasta que el usuario
 * activa "Conectar con mi servidor" en Banca → Servidor.
 * Si el servidor no responde, la Banca sigue en modo local.
 * Dirección por defecto: VITE_RMV_API_URL o http://127.0.0.1:5001
 */
const CLAVE_URL = "rmv-api-url";
const CLAVE_TOKEN = "rmv-api-token";
const CLAVE_ACTIVA = "rmv-api-activa";

/** ¿El usuario activó la conexión con su servidor? (por defecto: no) */
export function apiActiva(): boolean {
  try {
    return localStorage.getItem(CLAVE_ACTIVA) === "1";
  } catch {
    return false;
  }
}
export function guardarApiActiva(activa: boolean) {
  try {
    if (activa) localStorage.setItem(CLAVE_ACTIVA, "1");
    else localStorage.removeItem(CLAVE_ACTIVA);
  } catch {
    /* sin almacenamiento */
  }
}

export const API_POR_DEFECTO =
  (import.meta.env.VITE_RMV_API_URL as string | undefined) || "http://127.0.0.1:5001";

export function urlApi(): string {
  try {
    return localStorage.getItem(CLAVE_URL) || API_POR_DEFECTO;
  } catch {
    return API_POR_DEFECTO;
  }
}
export function guardarUrlApi(url: string) {
  try {
    localStorage.setItem(CLAVE_URL, url.replace(/\/+$/, ""));
  } catch {
    /* sin almacenamiento */
  }
}
export function tokenApi(): string | null {
  try {
    return sessionStorage.getItem(CLAVE_TOKEN);
  } catch {
    return null;
  }
}
function guardarToken(t: string | null) {
  try {
    if (t) sessionStorage.setItem(CLAVE_TOKEN, t);
    else sessionStorage.removeItem(CLAVE_TOKEN);
  } catch {
    /* sin almacenamiento */
  }
}

export type Salud = {
  status: string;
  version: string;
  cuentas_registradas: number;
  transacciones_totales: number;
  firma: string;
  timestamp: string;
};
export type CuentaApi = { id: number; numero: string; titular: string; saldo: number; moneda: string; activa: number; creada: string };
export type TxApi = { id: number; folio: string; tipo: string; monto: number; concepto: string; estado: string; firma: string; fecha: string };

async function pedir<T>(ruta: string, init: RequestInit = {}, ms = 5000): Promise<T> {
  if (!apiActiva()) throw new Error("Conexión con el servidor desactivada (modo local)");
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  const headers = new Headers(init.headers);
  const tok = tokenApi();
  if (tok) headers.set("Authorization", `Bearer ${tok}`);
  if (init.body) headers.set("Content-Type", "application/json");
  try {
    let res: Response;
    try {
      res = await fetch(`${urlApi()}${ruta}`, { ...init, headers, signal: ctrl.signal });
    } catch {
      throw new Error("Sin conexión con el servidor");
    }
    const data = (await res.json().catch(() => ({}))) as T & { error?: string };
    if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`);
    return data;
  } finally {
    clearTimeout(t);
  }
}

export type BanxicoResumen = {
  consultado_at: string;
  fuente: string;
  indicadores: Record<string, { valor: number | string; fecha: string }>;
};
export type PasarelaStats = { total: number; pendientes: number; conciliados: number; monto_total: number; timestamp: string };
export type PasarelaOp = {
  id: number;
  folio: string;
  origen: string | null;
  cuenta_destino: string | null;
  monto: number;
  moneda: string;
  concepto: string | null;
  estado: string;
  metodo: string | null;
  conciliado: number;
  fecha_operacion: string | null;
  creado: string | null;
};

export const api = {
  salud: () => pedir<Salud>("/api/health", {}, 3000),
  async entrar(usuario: string, password: string) {
    const r = await pedir<{ token: string; usuario: string; rol: string }>("/api/login", {
      method: "POST",
      body: JSON.stringify({ usuario, password }),
    });
    guardarToken(r.token);
    return r;
  },
  salir: () => guardarToken(null),
  cuentas: () => pedir<CuentaApi[]>("/api/cuentas"),
  transacciones: (limite = 20) => pedir<TxApi[]>(`/api/transacciones?limite=${limite}`),
  modulos: () =>
    pedir<{ banxico: boolean; banxico_token: boolean; pasarela: boolean }>("/api/modulos", {}, 3000),
  banxico: () => pedir<BanxicoResumen>("/api/banxico/resumen", {}, 20000),
  pasarelaStats: () => pedir<PasarelaStats>("/api/pasarela/stats"),
  pasarelaOperaciones: () => pedir<PasarelaOp[]>("/api/pasarela/operaciones"),
  transaccion: (d: { origen: string; destino: string; monto: number; concepto: string }) =>
    pedir<{ status: string; folio: string; firma: string; monto: number }>("/api/transaccion", {
      method: "POST",
      body: JSON.stringify(d),
    }),
};
