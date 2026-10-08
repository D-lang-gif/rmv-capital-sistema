import { useQuery } from "@tanstack/react-query";
import {
  getAddressBundle,
  getAddressTxs,
  getNetworkSnapshot,
  getPriceHistory,
} from "./api";
import { PRIMARY_ADDRESS } from "./config";
import { useNexusStore } from "./store";

export function useNetwork() {
  return useQuery({
    queryKey: ["nexus", "network"],
    queryFn: () => getNetworkSnapshot(),
    refetchInterval: 30_000,
    staleTime: 15_000,
  });
}

export function usePriceHistory() {
  return useQuery({
    queryKey: ["nexus", "prices"],
    queryFn: () => getPriceHistory(),
    staleTime: 5 * 60_000,
  });
}

export function useAddressMap() {
  const wallets = useNexusStore((s) => s.wallets);
  const whales = useNexusStore((s) => s.whales);
  const addresses = [
    ...new Set([...wallets.map((w) => w.address), ...whales.map((w) => w.address)]),
  ];
  return useQuery({
    queryKey: ["nexus", "addresses", addresses],
    queryFn: () => getAddressBundle({ data: { addresses } }),
    refetchInterval: 60_000,
    staleTime: 20_000,
  });
}

export function usePrimaryTxs() {
  return useQuery({
    queryKey: ["nexus", "txs", PRIMARY_ADDRESS],
    queryFn: () => getAddressTxs({ data: { address: PRIMARY_ADDRESS } }),
    refetchInterval: 60_000,
    staleTime: 20_000,
  });
}
