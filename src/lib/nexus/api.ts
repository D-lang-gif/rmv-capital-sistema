/**
 * Datos públicos de Bitcoin consultados DIRECTO desde el navegador
 * (sin funciones de servidor, para que funcione como sitio estático en GitHub Pages).
 * Todas estas fuentes permiten CORS: mempool.space, blockstream.info,
 * CoinGecko y blockchain.info/ticker. La gráfica de 30 días usa CoinGecko
 * (api.blockchain.info/charts no permite CORS).
 */
import type {
  AddressStats,
  ExplorerResult,
  NetworkSnapshot,
  PricePoint,
} from "./types";

const ESPLORA_BASES = [
  "https://mempool.space/api",
  "https://blockstream.info/api",
  "https://mempool.emzy.de/api",
];

async function fetchText(url: string, timeoutMs = 9000): Promise<string> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      signal: ctrl.signal,
      headers: { accept: "application/json, text/plain" },
    });
    if (!res.ok) {
      const err = new Error(`HTTP ${res.status}`) as Error & { definitivo?: boolean };
      // 4xx = respuesta definitiva (no existe / no válida): no tiene caso preguntar a otro servidor.
      err.definitivo = res.status >= 400 && res.status < 500 && res.status !== 429;
      throw err;
    }
    return await res.text();
  } finally {
    clearTimeout(t);
  }
}

async function fetchJson<T>(url: string, timeoutMs = 9000): Promise<T> {
  const text = await fetchText(url, timeoutMs);
  return JSON.parse(text) as T;
}

async function esploraText(path: string): Promise<string> {
  let last: unknown;
  for (const base of ESPLORA_BASES) {
    try {
      return await fetchText(`${base}${path}`);
    } catch (err) {
      last = err;
      if ((err as { definitivo?: boolean })?.definitivo) break;
    }
  }
  throw last instanceof Error ? last : new Error("Esplora unavailable");
}

async function esploraJson<T>(path: string): Promise<T> {
  const text = await esploraText(path);
  return JSON.parse(text) as T;
}

function fulfilled<T>(r: PromiseSettledResult<T>): T | null {
  return r.status === "fulfilled" ? r.value : null;
}

type MempoolAddress = {
  address?: string;
  chain_stats: {
    funded_txo_sum: number;
    spent_txo_sum: number;
    tx_count: number;
  };
  mempool_stats: {
    funded_txo_sum: number;
    spent_txo_sum: number;
    tx_count: number;
  };
};

function toStats(address: string, data: MempoolAddress): AddressStats {
  const funded = data.chain_stats.funded_txo_sum;
  const spent = data.chain_stats.spent_txo_sum;
  const mFunded = data.mempool_stats.funded_txo_sum;
  const mSpent = data.mempool_stats.spent_txo_sum;
  return {
    address,
    fundedSats: funded,
    spentSats: spent,
    confirmedSats: funded - spent,
    mempoolSats: mFunded - mSpent,
    txCount: data.chain_stats.tx_count,
    mempoolTxCount: data.mempool_stats.tx_count,
    ok: true,
  };
}

type FeeMap = Record<string, number>;

function ladderFromEstimates(est: FeeMap | null) {
  if (!est) return null;
  const pick = (...keys: string[]) => {
    for (const k of keys) {
      const n = est[k];
      if (typeof n === "number" && Number.isFinite(n)) return Math.max(1, Math.round(n));
    }
    return null;
  };
  const fastest = pick("1", "2");
  const halfHour = pick("3", "2", "4");
  const hour = pick("6", "5", "8");
  const economy = pick("144", "24", "12");
  if (fastest == null || halfHour == null || hour == null || economy == null) return null;
  return { fastest, halfHour, hour, economy };
}

type Cotizacion = { usd: number | null; mxn: number | null; at: number };
let cacheCotizacion: Cotizacion | null = null;
const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : null);

/** USD de mempool.space; MXN de CoinGecko (cache 2 min, límite gratuito). Respaldo: blockchain.info/ticker. */
async function cotizacion(): Promise<Cotizacion> {
  if (cacheCotizacion && Date.now() - cacheCotizacion.at < 120_000 && cacheCotizacion.mxn != null) {
    const usd = await fetchJson<{ USD?: number }>("https://mempool.space/api/v1/prices", 6000)
      .then((r) => num(r.USD))
      .catch(() => null);
    return { ...cacheCotizacion, usd: usd ?? cacheCotizacion.usd };
  }
  const [memR, geckoR] = await Promise.allSettled([
    fetchJson<{ USD?: number }>("https://mempool.space/api/v1/prices", 6000),
    fetchJson<{ bitcoin?: { mxn?: number; usd?: number } }>(
      "https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd,mxn",
      6000,
    ),
  ]);
  let usd = num(fulfilled(memR)?.USD) ?? num(fulfilled(geckoR)?.bitcoin?.usd);
  let mxn = num(fulfilled(geckoR)?.bitcoin?.mxn);
  if (usd == null || mxn == null) {
    try {
      const t = await fetchJson<Record<string, { last?: number }>>("https://blockchain.info/ticker", 6000);
      usd = usd ?? num(t?.USD?.last);
      mxn = mxn ?? num(t?.MXN?.last);
    } catch {
      /* sin respaldo */
    }
  }
  if (mxn != null && (mxn < 200_000 || mxn > 8_000_000)) mxn = null;
  const c = { usd, mxn, at: Date.now() };
  if (mxn != null) cacheCotizacion = c;
  return c;
}

export async function getNetworkSnapshot(): Promise<NetworkSnapshot> {
  const [heightR, feesR, mempoolR, blocksR, precioR] = await Promise.allSettled([
    esploraText("/blocks/tip/height"),
    esploraJson<FeeMap>("/fee-estimates"),
    esploraJson<{ count: number; vsize: number }>("/mempool"),
    esploraJson<
      Array<{
        id: string;
        height: number;
        timestamp: number;
        tx_count: number;
        size: number;
      }>
    >("/blocks"),
    cotizacion(),
  ]);

  const heightRaw = fulfilled(heightR);
  const height = heightRaw ? Number.parseInt(heightRaw, 10) : null;
  const precio = fulfilled(precioR);
  const blocks = fulfilled(blocksR) ?? [];

  return {
    height: height != null && Number.isFinite(height) ? height : null,
    usd: precio?.usd ?? null,
    mxn: precio?.mxn ?? null,
    fees: ladderFromEstimates(fulfilled(feesR)),
    mempoolTxs: fulfilled(mempoolR)?.count ?? null,
    mempoolVsize: fulfilled(mempoolR)?.vsize ?? null,
    difficultyChange: null,
    blocks: blocks.slice(0, 8).map((b) => ({
      id: b.id,
      height: b.height,
      timestamp: b.timestamp,
      txCount: b.tx_count,
      size: b.size,
    })),
    online: height != null && Number.isFinite(height),
    fetchedAt: Date.now(),
  };
}

/** Precio de los últimos 30 días (CoinGecko, diario). */
export async function getPriceHistory(): Promise<PricePoint[]> {
  try {
    const data = await fetchJson<{ prices: Array<[number, number]> }>(
      "https://api.coingecko.com/api/v3/coins/bitcoin/market_chart?vs_currency=usd&days=30&interval=daily",
      10000,
    );
    return (data.prices ?? []).map(([t, usd]) => ({ t, usd }));
  } catch {
    return [];
  }
}

const esDireccion = (a: string) => a.length >= 26 && a.length <= 90;

export async function getAddressBundle({
  data,
}: {
  data: { addresses: string[] };
}): Promise<Record<string, AddressStats>> {
  const unique = [...new Set(data.addresses.map((a) => a.trim()).filter(esDireccion))].slice(0, 24);
  const results = await Promise.all(
    unique.map(async (address) => {
      try {
        const raw = await esploraJson<MempoolAddress>(`/address/${encodeURIComponent(address)}`);
        return [address, toStats(address, raw)] as const;
      } catch (err) {
        return [
          address,
          {
            address,
            fundedSats: 0,
            spentSats: 0,
            confirmedSats: 0,
            mempoolSats: 0,
            txCount: 0,
            mempoolTxCount: 0,
            ok: false,
            error: err instanceof Error ? err.message : "Error de red",
          } satisfies AddressStats,
        ] as const;
      }
    }),
  );
  return Object.fromEntries(results);
}

export type AddressTx = {
  txid: string;
  confirmed: boolean;
  blockTime: number | null;
  valueSats: number;
};

type RawTx = {
  txid: string;
  status?: { confirmed?: boolean; block_time?: number };
  vout?: Array<{ value: number; scriptpubkey_address?: string }>;
  vin?: Array<{ prevout?: { value?: number; scriptpubkey_address?: string } }>;
};

export async function getAddressTxs({ data }: { data: { address: string } }): Promise<AddressTx[]> {
  const address = data.address.trim();
  if (!esDireccion(address)) throw new Error("Dirección no válida");
  const rows = await esploraJson<RawTx[]>(`/address/${encodeURIComponent(address)}/txs`);
  return rows.slice(0, 8).map((tx) => {
    const received = (tx.vout ?? [])
      .filter((v) => v.scriptpubkey_address === address)
      .reduce((a, v) => a + v.value, 0);
    const sent = (tx.vin ?? [])
      .filter((v) => v.prevout?.scriptpubkey_address === address)
      .reduce((a, v) => a + (v.prevout?.value ?? 0), 0);
    return {
      txid: tx.txid,
      confirmed: Boolean(tx.status?.confirmed),
      blockTime: tx.status?.block_time ?? null,
      valueSats: received - sent,
    };
  });
}

export async function exploreQuery({ data }: { data: { query: string } }): Promise<ExplorerResult> {
  const query = data.query.trim();
  if (query.length < 20 || query.length > 128) throw new Error("Consulta no válida");
  const hex64 = /^[0-9a-fA-F]{64}$/.test(query);

  if (hex64) {
    try {
      const tx = await esploraJson<{
        txid: string;
        fee: number;
        vin: unknown[];
        vout: Array<{ value: number }>;
        status?: {
          confirmed?: boolean;
          block_height?: number;
          block_time?: number;
        };
      }>(`/tx/${query}`);
      const valueSats = (tx.vout ?? []).reduce((a, v) => a + v.value, 0);
      return {
        kind: "tx",
        txid: tx.txid,
        confirmed: Boolean(tx.status?.confirmed),
        blockHeight: tx.status?.block_height ?? null,
        blockTime: tx.status?.block_time ?? null,
        fee: tx.fee,
        valueSats,
        vinCount: tx.vin?.length ?? 0,
        voutCount: tx.vout?.length ?? 0,
      };
    } catch {
      /* sigue como dirección */
    }
  }

  if (hex64) return { kind: "empty", query }; // un txid no es dirección
  try {
    const raw = await esploraJson<MempoolAddress>(`/address/${encodeURIComponent(query)}`);
    return { kind: "address", stats: toStats(query, raw) };
  } catch {
    return { kind: "empty", query };
  }
}
