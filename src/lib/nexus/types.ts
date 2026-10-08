export type NexusView =
  | "overview"
  | "wallets"
  | "journal"
  | "explorer"
  | "whales"
  | "identity"
  | "banca"
  | "apy";

export type WalletRole = "treasury" | "watch";

export type WatchedWallet = {
  id: string;
  name: string;
  address: string;
  role: WalletRole;
  note: string;
  created: string;
};

export type LedgerEntry = {
  id: string;
  createdAt: string;
  destination: string;
  amountBtc: number;
  memo: string;
  status: "anotado";
  onchainTxid?: string;
};

export type WhaleEntry = {
  id: string;
  name: string;
  address: string;
  blurb: string;
};

export type AddressStats = {
  address: string;
  fundedSats: number;
  spentSats: number;
  confirmedSats: number;
  mempoolSats: number;
  txCount: number;
  mempoolTxCount: number;
  ok: boolean;
  error?: string;
};

export type BlockPulse = {
  id: string;
  height: number;
  timestamp: number;
  txCount: number;
  size: number;
};

export type FeeLadder = {
  fastest: number;
  halfHour: number;
  hour: number;
  economy: number;
};

export type NetworkSnapshot = {
  height: number | null;
  usd: number | null;
  mxn: number | null;
  fees: FeeLadder | null;
  mempoolTxs: number | null;
  mempoolVsize: number | null;
  difficultyChange: number | null;
  blocks: BlockPulse[];
  online: boolean;
  fetchedAt: number;
};

export type PricePoint = {
  t: number;
  usd: number;
};

export type ExplorerTx = {
  kind: "tx";
  txid: string;
  confirmed: boolean;
  blockHeight: number | null;
  blockTime: number | null;
  fee: number;
  valueSats: number;
  vinCount: number;
  voutCount: number;
};

export type ExplorerAddress = {
  kind: "address";
  stats: AddressStats;
};

export type ExplorerResult =
  | ExplorerTx
  | ExplorerAddress
  | { kind: "empty"; query: string };
