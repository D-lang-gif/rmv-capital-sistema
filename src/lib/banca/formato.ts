const mxn = new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" });
const cripto = new Intl.NumberFormat("es-MX", { minimumFractionDigits: 8, maximumFractionDigits: 8 });
const fecha = new Intl.DateTimeFormat("es-MX", {
  day: "2-digit",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

export const fmtMXN = (n: number) => mxn.format(n);
export const fmtCripto = (n: number) => cripto.format(n);
export const fmtFecha = (iso: string) => {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : fecha.format(d);
};
export const enmascarar = (ultimos4: string) => `•••• ${ultimos4}`;

/** Bancos más comunes por los 3 primeros dígitos de la CLABE. */
const BANCOS: Record<string, string> = {
  "002": "Banamex",
  "012": "BBVA México",
  "014": "Santander",
  "021": "HSBC",
  "030": "BanBajío",
  "036": "Inbursa",
  "044": "Scotiabank",
  "058": "Banregio",
  "072": "Banorte",
  "127": "Banco Azteca",
  "137": "BanCoppel",
  "638": "Nu México",
  "646": "STP",
  "722": "Mercado Pago",
};

export function bancoDeClabe(clabe: string): string | null {
  return clabe.length >= 3 ? (BANCOS[clabe.slice(0, 3)] ?? null) : null;
}

/** Valida una CLABE de 18 dígitos con su dígito verificador (pesos 3-7-1). */
export function clabeValida(clabe: string): boolean {
  if (!/^\d{18}$/.test(clabe)) return false;
  const pesos = [3, 7, 1];
  let suma = 0;
  for (let i = 0; i < 17; i++) suma += ((Number(clabe[i]) * pesos[i % 3]) % 10);
  const dv = (10 - (suma % 10)) % 10;
  return dv === Number(clabe[17]);
}
