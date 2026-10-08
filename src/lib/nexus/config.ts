export const VERSION = "11.0.0";
export const APP_NAME = "RMV Capital";
export const OWNER = "Raúl Muñoz Villa";
export const TITLE = "Señor Soberano";
export const PATENTE = "RMV-BANK-2026-001";
export const SELLO = "L-UNO::144K-VORTEX∞RAIZ-REVELACION{∴2025}";
export const FIRMA =
  "f8e7d6c5b4a3f2e1d0c9b8a7f6e5d4c3b2a1f0e9d8c7b6a5f4e3d2c1b0a9f8e7d6c5b4a3";

export const PRIMARY_ADDRESS =
  "bc1q8tty3kl9d48a34z7t8j6evwzs9n69srt0rl6ae";

export const LEGACY_WATCH_ADDRESS =
  "12XZMdaAGmcHf4ocFSqpd8jFd1WH7RHUPs";

export const GENESIS_ADDRESS = "1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa";

/** Chart / canvas stroke — keep in lockstep with --color-accent */
export const CHART_ACCENT = "#00d4aa";
export const CHART_MUTED = "#00d4aa33";

export const MEMPOOL_EXPLORER = "https://mempool.space";

export type WalletRole = "treasury" | "watch";

export type SeedWallet = {
  id: string;
  name: string;
  address: string;
  role: WalletRole;
  note: string;
  created: string;
};

export const SEED_WALLETS: SeedWallet[] = [
  {
    id: "treasury-soberana",
    name: "Tesorería Soberana",
    address: PRIMARY_ADDRESS,
    role: "treasury",
    note: "Dirección principal de la casa. Saldos leídos en vivo desde Bitcoin Mainnet.",
    created: "2026-03-28",
  },
  {
    id: "watch-legacy",
    name: "Legacy · alto tráfico",
    address: LEGACY_WATCH_ADDRESS,
    role: "watch",
    note: "Dirección pública de alto volumen en observación. El saldo on-chain no implica custodia.",
    created: "2026-03-28",
  },
];

export type WhaleSeed = {
  id: string;
  name: string;
  address: string;
  blurb: string;
};

export const SEED_WHALES: WhaleSeed[] = [
  {
    id: "genesis",
    name: "Bloque génesis",
    address: GENESIS_ADDRESS,
    blurb: "Salida del bloque 0. Dirección pública histórica — no es de esta casa.",
  },
  {
    id: "soberana",
    name: "Tesorería Soberana",
    address: PRIMARY_ADDRESS,
    blurb: "Dirección principal observada por RMV Capital Nexus.",
  },
];
