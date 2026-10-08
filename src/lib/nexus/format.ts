const btcFmt = new Intl.NumberFormat("en-US", {
  minimumFractionDigits: 8,
  maximumFractionDigits: 8,
});

const satsFmt = new Intl.NumberFormat("es-MX");

const usdFmt = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

const usdPrecise = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 2,
});

const mxnFmt = new Intl.NumberFormat("es-MX", {
  style: "currency",
  currency: "MXN",
  maximumFractionDigits: 0,
});

export function satsToBtc(sats: number): number {
  return sats / 1e8;
}

export function formatBtc(btc: number): string {
  if (!Number.isFinite(btc)) return "—";
  return `${btcFmt.format(btc)} BTC`;
}

export function formatSats(sats: number): string {
  if (!Number.isFinite(sats)) return "—";
  return `${satsFmt.format(Math.round(sats))} sats`;
}

export function formatBtcSmart(sats: number): { btc: string; sub: string } {
  const btc = satsToBtc(sats);
  return {
    btc: formatBtc(btc),
    sub: Math.abs(sats) < 1e5 ? formatSats(sats) : `${satsFmt.format(Math.round(sats))} sats`,
  };
}

export function formatUsd(n: number | null | undefined, precise = false): string {
  if (n == null || !Number.isFinite(n)) return "—";
  return (precise ? usdPrecise : usdFmt).format(n);
}

export function formatMxn(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return "—";
  return mxnFmt.format(n);
}

export function fiatFromSats(
  sats: number,
  usd: number | null,
  mxn: number | null,
): { usd: string; mxn: string } {
  const btc = satsToBtc(sats);
  return {
    usd: usd != null ? formatUsd(btc * usd, true) : "—",
    mxn: mxn != null ? formatMxn(btc * mxn) : "—",
  };
}

export function truncateMiddle(value: string, head = 10, tail = 8): string {
  if (value.length <= head + tail + 1) return value;
  return `${value.slice(0, head)}…${value.slice(-tail)}`;
}

export function formatHeight(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return "—";
  return satsFmt.format(n);
}

export function formatAgo(unixSeconds: number): string {
  const delta = Date.now() / 1000 - unixSeconds;
  if (!Number.isFinite(delta)) return "—";
  if (delta < 60) return "ahora";
  if (delta < 3600) return `${Math.floor(delta / 60)} min`;
  if (delta < 86400) return `${Math.floor(delta / 3600)} h`;
  return `${Math.floor(delta / 86400)} d`;
}

export function isLikelyTxid(q: string): boolean {
  return /^[0-9a-fA-F]{64}$/.test(q.trim());
}

export function isLikelyAddress(q: string): boolean {
  const s = q.trim();
  return (
    /^(bc1|[13])[a-zA-HJ-NP-Z0-9]{24,74}$/.test(s) ||
    /^tb1[a-z0-9]{25,74}$/.test(s)
  );
}

export function localRef(): string {
  const d = new Date();
  const stamp = `${d.getUTCFullYear()}${String(d.getUTCMonth() + 1).padStart(2, "0")}${String(d.getUTCDate()).padStart(2, "0")}`;
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `RMV-${stamp}-${rand}`;
}
