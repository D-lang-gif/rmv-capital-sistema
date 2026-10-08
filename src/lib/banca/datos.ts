/**
 * ============================================================
 *  RMV Capital · DATOS DE BANCA (archivo editable)
 * ============================================================
 *  Aquí están TODOS los saldos y datos que muestra la sección
 *  "Banca". Cambia los valores, guarda el archivo y vuelve a
 *  construir (npm run build). No hace falta tocar nada más.
 *
 *  Reglas rápidas:
 *   - Los números van SIN comas ni signo de pesos: 35276917.8
 *   - Los textos van entre comillas: "RAÚL MUÑOZ VILLA"
 *   - De las tarjetas solo se guardan los ÚLTIMOS 4 dígitos.
 * ============================================================
 */

export const TITULAR = "RAÚL MUÑOZ VILLA";

/** Nombre del portal (encabezado de la sección Banca). */
export const NOMBRE_BANCO = "RMV Bank";
export const LEMA_BANCO = "Banca Digital Soberana";
export const VERSION_BANCO = "4.0";

/** Saldos del tablero (Dashboard). */
export const SALDOS = {
  /** Saldo total en pesos mexicanos. */
  mxn: 35276917.8,
  /** Bitcoin (hasta 8 decimales). */
  btc: 586.31760894,
  /** Ethereum Classic (hasta 8 decimales). */
  etc: 248597.58242645,
};

/** Firma que aparece en la tarjeta "Firma". */
export const FIRMA = "SINCRO-SVR-99X-ALPHA";

/** Cuenta de origen que aparece (solo lectura) en SPEI. */
export const CUENTA_ORIGEN = "RMV Capital · Cuenta Soberana MXN";

export type Tarjeta = {
  id: string;
  nombre: string;
  red: "VISA" | "MASTERCARD";
  /** Solo los últimos 4 dígitos. */
  ultimos4: string;
  saldo: number;
  /** Color del borde izquierdo de la tarjeta. */
  color: string;
  vence: string;
};

export const TARJETAS: Tarjeta[] = [
  {
    id: "visa-black",
    nombre: "VISA CORPORATE BLACK",
    red: "VISA",
    ultimos4: "0791",
    saldo: 245000.0,
    color: "#6366f1", // índigo
    vence: "12/30",
  },
  {
    id: "mc-platinum",
    nombre: "MASTERCARD PLATINUM",
    red: "MASTERCARD",
    ultimos4: "0791",
    saldo: 137500.25,
    color: "#a855f7", // morado
    vence: "12/30",
  },
];

/** Tipos de tarjeta que se pueden solicitar en la pestaña Tarjetas. */
export const TARJETAS_SOLICITABLES = [
  "VISA CORPORATE BLACK",
  "MASTERCARD PLATINUM",
  "Débito Soberana",
  "Tarjeta digital",
];

/** Servicios de la pestaña Pagos. */
export const SERVICIOS = ["CFE", "Telmex / Infinitum", "Izzi", "SACMEX", "Naturgy"];

/** Compañías y montos de la pestaña Recargas. */
export const COMPANIAS = ["Telcel", "Movistar", "AT&T"];
export const MONTOS_RECARGA = [50, 100, 150, 200, 300, 500, 1000];

/** Certificados (pestaña Certificados). */
export const CERTIFICADOS = [
  {
    titulo: "Certificado Institucional RMV-CERT",
    descripcion: "Certificado institucional de RMV Capital a nombre del titular.",
    codigo: "RMV-CERT",
  },
  {
    titulo: "Registro de Firmas",
    descripcion: "Registro de la firma de sincronización del titular.",
    codigo: FIRMA,
  },
  {
    titulo: "Protocolo SÉPTIMO ÁNGEL",
    descripcion: "Protocolo de seguridad SÉPTIMO ÁNGEL.",
    codigo: "SÉPTIMO ÁNGEL",
  },
];

/** APY Fast: tasa anual base (en %). */
export const APY_TASA_BASE = 18.47;
