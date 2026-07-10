import { WalletReadyState } from "@solana/wallet-adapter-base";
import type { Wallet } from "@solana/wallet-adapter-react";

export const WALLET_STORAGE_KEY = "dhukuti:selected-wallet";
export const OPEN_WALLET_EVENT = "dhukuti:open-wallet";

const WALLET_ORDER = ["Phantom", "Backpack", "Solflare"];

export function sortSupportedWallets(wallets: Wallet[]) {
  return WALLET_ORDER.map((name) => wallets.find((wallet) => wallet.adapter.name === name)).filter(
    (wallet): wallet is Wallet => Boolean(wallet),
  );
}

export function isWalletReady(wallet: Wallet) {
  return (
    wallet.readyState === WalletReadyState.Installed ||
    wallet.readyState === WalletReadyState.Loadable
  );
}

export function walletReadyLabel(wallet: Wallet) {
  if (wallet.readyState === WalletReadyState.Installed) return "Detected";
  if (wallet.readyState === WalletReadyState.Loadable) return "Available";
  return "Install wallet";
}

export function truncateAddress(address: string, chars = 4) {
  if (address.length <= chars * 2 + 3) return address;
  return `${address.slice(0, chars)}...${address.slice(-chars)}`;
}

export function normalizeWalletError(error: unknown) {
  if (error instanceof Error) {
    if (/reject|cancel/i.test(error.message)) return "Connection rejected in wallet.";
    if (/lock/i.test(error.message)) return "Unlock your wallet and try again.";
    return error.message;
  }
  return "Wallet connection failed.";
}
