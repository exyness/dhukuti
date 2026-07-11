"use client";

import type { WalletName } from "@solana/wallet-adapter-base";
import type { Wallet as AdapterWallet } from "@solana/wallet-adapter-react";
import {
  Check,
  ChevronDown,
  Copy,
  ExternalLink,
  KeyRound,
  Loader2,
  LogOut,
  Wallet,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";
import { explorerAddressUrl } from "@/lib/constants";
import { useSupabaseAuth } from "@/lib/supabase/auth-context";
import { useClientMounted } from "@/lib/use-client-mounted";
import { useWalletIdentity } from "@/lib/use-wallet-identity";
import {
  isWalletReady,
  normalizeWalletError,
  sortSupportedWallets,
  truncateAddress,
  walletReadyLabel,
} from "@/lib/wallet";

const WALLET_PANEL = {
  transition: { duration: 0.1, ease: "easeOut" as const },
};

export function WalletConnectCard() {
  const { address, wallets, wallet, isConnected, connecting, select, connect, disconnect } =
    useWalletIdentity();
  const {
    error: authError,
    signInWithWallet,
    signOut: signOutSession,
    status: authStatus,
  } = useSupabaseAuth();
  const [choosing, setChoosing] = useState(false);
  const [pendingWalletName, setPendingWalletName] = useState<WalletName | null>(null);
  const [error, setError] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const [copyState, setCopyState] = useState<"idle" | "copied" | "failed">("idle");
  const menuRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const hasMounted = useClientMounted();
  const supportedWallets = hasMounted ? sortSupportedWallets(wallets) : [];
  const providerName = wallet?.adapter.name ?? "wallet";
  const isChoosing = choosing || connecting || Boolean(error);
  const sessionActive = authStatus === "authenticated";
  const sessionBusy = authStatus === "authenticating";
  const currentAddress = address ?? "";

  const connectWallet = useCallback(
    (nextWallet: AdapterWallet) => {
      setError("");

      if (!isWalletReady(nextWallet)) {
        setError(`${nextWallet.adapter.name} is not installed in this browser.`);
        return;
      }

      setPendingWalletName(nextWallet.adapter.name);
      select(nextWallet.adapter.name);
    },
    [select],
  );

  useEffect(() => {
    if (!pendingWalletName || wallet?.adapter.name !== pendingWalletName) return;
    let cancelled = false;

    const runConnection = async () => {
      try {
        await connect();
        if (cancelled) return;
        setChoosing(false);
        setPendingWalletName(null);
      } catch (walletError) {
        if (cancelled) return;
        setError(normalizeWalletError(walletError));
        setPendingWalletName(null);
      }
    };

    void runConnection();

    return () => {
      cancelled = true;
    };
  }, [connect, pendingWalletName, wallet?.adapter.name]);

  const disconnectWallet = useCallback(async () => {
    try {
      if (sessionActive) {
        await signOutSession();
      }
    } catch {
      // Continue disconnecting the wallet even if session cleanup fails.
    }
    await disconnect();
    setMenuOpen(false);
    setChoosing(false);
    setError("");
    setPendingWalletName(null);
    triggerRef.current?.focus();
  }, [disconnect, sessionActive, signOutSession]);

  const toggleSession = useCallback(async () => {
    try {
      if (sessionActive) {
        await signOutSession();
        return;
      }

      await signInWithWallet();
    } catch {
      // SupabaseAuthProvider owns the user-facing error copy.
    }
  }, [sessionActive, signInWithWallet, signOutSession]);

  const copyAddress = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(currentAddress);
      setCopyState("copied");
    } catch {
      setCopyState("failed");
    }
    window.setTimeout(() => setCopyState("idle"), 1200);
  }, [currentAddress]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setMenuOpen(false);
        setChoosing(false);
      }
    };
    const onPointerDown = (event: PointerEvent) => {
      if (!menuOpen) return;
      const target = event.target as Node;
      if (menuRef.current?.contains(target) || triggerRef.current?.contains(target)) return;
      setMenuOpen(false);
    };
    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("pointerdown", onPointerDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("pointerdown", onPointerDown);
    };
  }, [menuOpen]);

  return (
    <div className="relative w-full max-w-sm">
      <div className="rounded-lg border border-border bg-foreground/[0.045] p-3 backdrop-blur-xl">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div>
            <p className="font-mono text-[0.62rem] uppercase tracking-[0.12em] text-accent">
              Wallet Access
            </p>
            <p className="mt-1 text-sm text-muted">Devnet preview mode</p>
          </div>
          <span
            className={cn(
              "h-2.5 w-2.5 rounded-full",
              isConnected ? "bg-success shadow-[0_0_0_4px_rgba(60,203,127,0.14)]" : "bg-warning",
            )}
            aria-hidden="true"
          />
        </div>

        <Button
          ref={triggerRef}
          variant={isConnected ? "secondary" : "primary"}
          size="lg"
          className="w-full justify-between"
          aria-expanded={isConnected ? menuOpen : isChoosing}
          aria-controls={isConnected ? "wallet-account-menu" : "wallet-provider-panel"}
          aria-busy={connecting}
          disabled={connecting}
          onClick={() => {
            if (isConnected) {
              setMenuOpen((open) => !open);
              return;
            }
            setChoosing((open) => !open);
          }}
        >
          <span className="flex min-w-0 items-center gap-2">
            {connecting ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            ) : isConnected && wallet?.adapter.icon ? (
              <WalletProviderIcon iconUrl={wallet.adapter.icon} className="h-5 w-5 rounded-md" />
            ) : (
              <Wallet className="h-4 w-4" aria-hidden="true" />
            )}
            <span className="truncate">
              {isConnected
                ? truncateAddress(currentAddress)
                : connecting
                  ? "Connecting"
                  : "Connect Wallet"}
            </span>
          </span>
          <ChevronDown
            className={cn(
              "h-4 w-4 transition-transform duration-150 ease-out",
              (menuOpen || isChoosing) && "rotate-180",
            )}
            aria-hidden="true"
          />
        </Button>

        <AnimatePresence>
          {isChoosing && !isConnected ? (
            <motion.div
              id="wallet-provider-panel"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={WALLET_PANEL.transition}
              className="mt-3"
            >
              <div className="space-y-2">
                {supportedWallets.map((providerWallet) => (
                  <button
                    key={providerWallet.adapter.name}
                    type="button"
                    className="flex min-h-14 w-full cursor-pointer items-center gap-3 rounded-md border border-border bg-surface/80 px-3 text-left transition-colors duration-100 ease-out hover:border-foreground/20 hover:bg-foreground/8 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                    onClick={() => connectWallet(providerWallet)}
                  >
                    <WalletProviderIcon
                      iconUrl={providerWallet.adapter.icon}
                      className="h-8 w-8 rounded-md"
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-medium text-foreground">
                        {providerWallet.adapter.name}
                      </span>
                      <span className="block font-mono text-[0.62rem] uppercase tracking-[0.08em] text-muted">
                        {walletReadyLabel(providerWallet)}
                      </span>
                    </span>
                    {!isWalletReady(providerWallet) ? (
                      <ExternalLink className="h-4 w-4 text-muted" aria-hidden="true" />
                    ) : null}
                  </button>
                ))}
              </div>
              {error ? <p className="mt-3 text-sm leading-6 text-warning">{error}</p> : null}
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {menuOpen && isConnected ? (
          <motion.div
            ref={menuRef}
            id="wallet-account-menu"
            role="menu"
            aria-label="Wallet actions"
            initial={{ opacity: 0, y: 6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6, scale: 0.98 }}
            transition={{ type: "spring", stiffness: 520, damping: 34 }}
            className="absolute left-0 right-0 top-[calc(100%+0.5rem)] z-30 rounded-lg border border-border bg-popover p-2 shadow-2xl shadow-black/40"
          >
            <div className="border-b border-border px-2 py-2">
              <p className="font-mono text-[0.62rem] uppercase tracking-[0.1em] text-muted">
                Connected with {providerName}
              </p>
              <p className="mt-1 truncate font-mono text-sm text-foreground">{currentAddress}</p>
              <p className="mt-1 font-mono text-[0.55rem] text-muted">
                {sessionActive ? "Wallet verified" : "Wallet verification pending"}
              </p>
            </div>
            <button
              type="button"
              role="menuitem"
              className="mt-2 flex min-h-10 w-full items-center gap-2 rounded-md px-2 text-sm text-foreground transition-colors duration-100 ease-out hover:bg-foreground/8 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              onClick={() => void copyAddress()}
            >
              {copyState === "copied" ? (
                <Check className="h-4 w-4 text-success" aria-hidden="true" />
              ) : (
                <Copy className="h-4 w-4 text-muted" aria-hidden="true" />
              )}
              {copyState === "copied"
                ? "Copied address"
                : copyState === "failed"
                  ? "Copy failed"
                  : "Copy address"}
            </button>
            <a
              role="menuitem"
              href={explorerAddressUrl(currentAddress)}
              target="_blank"
              rel="noreferrer"
              className="flex min-h-10 w-full items-center gap-2 rounded-md px-2 text-sm text-foreground transition-colors duration-100 ease-out hover:bg-foreground/8 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <ExternalLink className="h-4 w-4 text-muted" aria-hidden="true" />
              View on explorer
            </a>
            <button
              type="button"
              role="menuitem"
              className="flex min-h-10 w-full items-center gap-2 rounded-md px-2 text-sm text-foreground transition-colors duration-100 ease-out hover:bg-foreground/8 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              disabled={sessionBusy}
              onClick={() => void toggleSession()}
            >
              {sessionBusy ? (
                <Loader2 className="h-4 w-4 animate-spin text-muted" aria-hidden="true" />
              ) : (
                <KeyRound className="h-4 w-4 text-muted" aria-hidden="true" />
              )}
              {sessionActive ? "End verification" : "Verify wallet"}
            </button>
            {authError ? (
              <p className="px-2 py-1 text-sm leading-5 text-warning">{authError}</p>
            ) : null}
            <button
              type="button"
              role="menuitem"
              className="flex min-h-10 w-full items-center gap-2 rounded-md px-2 text-sm text-warning transition-colors duration-100 ease-out hover:bg-warning/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              onClick={() => void disconnectWallet()}
            >
              <LogOut className="h-4 w-4" aria-hidden="true" />
              Disconnect
            </button>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

function WalletProviderIcon({ iconUrl, className }: { iconUrl?: string; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center justify-center overflow-hidden bg-foreground/[0.06]",
        className,
      )}
      aria-hidden="true"
    >
      <span
        className="h-full w-full bg-contain bg-center bg-no-repeat"
        style={{ backgroundImage: `url(${JSON.stringify(iconUrl)})` }}
      />
    </span>
  );
}
