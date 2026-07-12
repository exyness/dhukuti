"use client";

import { BackpackWalletAdapter } from "@solana/wallet-adapter-backpack";
import { WalletAdapterNetwork } from "@solana/wallet-adapter-base";
import { ConnectionProvider, WalletProvider } from "@solana/wallet-adapter-react";
import { PhantomWalletAdapter, SolflareWalletAdapter } from "@solana/wallet-adapter-wallets";
import { clusterApiUrl } from "@solana/web3.js";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { type ReactNode, useMemo, useState } from "react";
import { Toaster } from "sonner";
import { SupabaseAuthProvider } from "@/lib/supabase/auth-context";
import { WALLET_STORAGE_KEY } from "@/lib/wallet";

const network = WalletAdapterNetwork.Devnet;
const endpoint = process.env.NEXT_PUBLIC_SOLANA_RPC_URL ?? clusterApiUrl(network);

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            refetchOnWindowFocus: false,
            staleTime: 15_000,
          },
        },
      }),
  );
  const wallets = useMemo(
    () => [
      new PhantomWalletAdapter(),
      new BackpackWalletAdapter(),
      new SolflareWalletAdapter({ network }),
    ],
    [],
  );

  return (
    <QueryClientProvider client={queryClient}>
      <ConnectionProvider endpoint={endpoint}>
        <WalletProvider wallets={wallets} autoConnect localStorageKey={WALLET_STORAGE_KEY}>
          <SupabaseAuthProvider>{children}</SupabaseAuthProvider>
        </WalletProvider>
      </ConnectionProvider>
      <Toaster
        closeButton
        position="bottom-right"
        theme="dark"
        toastOptions={{
          classNames: {
            toast:
              "group rounded-lg border border-[rgba(245,245,245,0.1)] bg-[#151719] text-[#f5f5f5] font-mono text-xs shadow-[0_16px_40px_rgba(0,0,0,0.42)]",
            title:
              "font-mono text-[0.7rem] font-medium uppercase tracking-[0.08em] text-foreground",
            description: "font-mono text-[0.62rem] text-muted",
            actionButton: "bg-accent text-white",
            cancelButton: "bg-white/10 text-muted",
            error: "border-l-2 border-l-[#ff6b4a]",
            success: "border-l-2 border-l-[#3ccb7f]",
            warning: "border-l-2 border-l-[#f5b85d]",
            info: "border-l-2 border-l-[#6ea8fe]",
            closeButton: "text-muted hover:text-foreground",
          },
        }}
      />
    </QueryClientProvider>
  );
}
