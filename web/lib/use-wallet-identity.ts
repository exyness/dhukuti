"use client";

import type { Wallet as AdapterWallet } from "@solana/wallet-adapter-react";
import { useWallet } from "@solana/wallet-adapter-react";
import { useCallback, useMemo, useSyncExternalStore } from "react";

type WalletAdapter = AdapterWallet["adapter"];

const EMPTY_WALLET_SNAPSHOT = "0:";

function getServerWalletSnapshot() {
  return EMPTY_WALLET_SNAPSHOT;
}

function readWalletSnapshot(adapter: WalletAdapter | null) {
  const address = adapter?.publicKey?.toBase58() ?? "";
  return `${adapter?.connected ? "1" : "0"}:${address}`;
}

function parseWalletSnapshot(snapshot: string) {
  const [connectedFlag, ...addressParts] = snapshot.split(":");
  const address = addressParts.join(":");

  return {
    adapterAddress: address || null,
    adapterConnected: connectedFlag === "1",
  };
}

export function useWalletIdentity() {
  const walletContext = useWallet();
  const adapter = walletContext.wallet?.adapter ?? null;

  const subscribe = useCallback(
    (onStoreChange: () => void) => {
      if (!adapter) return () => {};

      adapter.on("connect", onStoreChange);
      adapter.on("disconnect", onStoreChange);
      adapter.on("readyStateChange", onStoreChange);

      return () => {
        adapter.off("connect", onStoreChange);
        adapter.off("disconnect", onStoreChange);
        adapter.off("readyStateChange", onStoreChange);
      };
    },
    [adapter],
  );
  const getSnapshot = useCallback(() => readWalletSnapshot(adapter), [adapter]);
  const adapterSnapshot = useSyncExternalStore(subscribe, getSnapshot, getServerWalletSnapshot);
  const { adapterAddress, adapterConnected } = useMemo(
    () => parseWalletSnapshot(adapterSnapshot),
    [adapterSnapshot],
  );
  const contextAddress = walletContext.publicKey?.toBase58() ?? null;
  const address = contextAddress ?? adapterAddress;
  const isConnected = Boolean(address) && (walletContext.connected || adapterConnected);

  return {
    ...walletContext,
    address,
    isConnected,
  };
}
