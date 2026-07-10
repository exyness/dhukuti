"use client";

import type { WalletName } from "@solana/wallet-adapter-base";
import type { Wallet as AdapterWallet } from "@solana/wallet-adapter-react";
import { useWallet } from "@solana/wallet-adapter-react";
import { ArrowLeft, ChevronDown, ChevronRight, Wallet } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";
import {
  isWalletReady,
  normalizeWalletError,
  OPEN_WALLET_EVENT,
  sortSupportedWallets,
  truncateAddress,
  walletReadyLabel,
} from "@/lib/wallet";

type SidebarView = "intro" | "wallet";
type WalletPanelState = "choice" | "connecting" | "connected";

const MOCK_WALLET_ADDRESS = "7xKX11111111111111111111111111111111p2aB";

export function SidebarWalletFlow() {
  const { wallets, wallet, publicKey, connected, connecting, select, connect, disconnect } =
    useWallet();
  const [view, setView] = useState<SidebarView>("intro");
  const [walletState, setWalletState] = useState<WalletPanelState>("choice");
  const [selectedProviderName, setSelectedProviderName] = useState("wallet");
  const [pendingWalletName, setPendingWalletName] = useState<WalletName | null>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [error, setError] = useState("");
  const [copyLabel, setCopyLabel] = useState("Copy");
  const connectButtonRef = useRef<HTMLButtonElement>(null);
  const firstProviderRef = useRef<HTMLButtonElement>(null);
  const accountMenuRef = useRef<HTMLDivElement>(null);

  const supportedWallets = sortSupportedWallets(wallets);
  const currentAddress = publicKey?.toBase58() ?? "";
  const isConnected = connected && Boolean(currentAddress);
  const displayWalletState: WalletPanelState = isConnected
    ? "connected"
    : connecting || walletState === "connecting"
      ? "connecting"
      : "choice";
  const shortAddress = isConnected ? truncateAddress(currentAddress) : "";
  const selectedWalletIconUrl = isConnected ? wallet?.adapter.icon : undefined;

  const closeWalletAccountMenu = useCallback(() => {
    setIsMenuOpen(false);
  }, []);

  const showSidebarWalletMode = useCallback(() => {
    closeWalletAccountMenu();
    setView("wallet");
    setWalletState("choice");
    window.setTimeout(() => firstProviderRef.current?.focus(), 0);
  }, [closeWalletAccountMenu]);

  const showSidebarIntroMode = useCallback(() => {
    setView("intro");
    window.setTimeout(() => connectButtonRef.current?.focus(), 0);
  }, []);

  const connectWallet = useCallback(
    (nextWallet: AdapterWallet) => {
      const walletName = nextWallet.adapter.name;
      setSelectedProviderName(walletName);
      setError("");

      if (!isWalletReady(nextWallet)) {
        setError(`${walletName} is not installed in this browser.`);
        setWalletState("choice");
        return;
      }

      setWalletState("connecting");
      setPendingWalletName(walletName);
      select(walletName);
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
        setWalletState("connected");
        setPendingWalletName(null);
        window.setTimeout(() => {
          setWalletState("choice");
          setView("intro");
          connectButtonRef.current?.focus();
        }, 650);
      } catch (walletError) {
        if (cancelled) return;
        setError(normalizeWalletError(walletError));
        setWalletState("choice");
        setPendingWalletName(null);
      }
    };

    void runConnection();

    return () => {
      cancelled = true;
    };
  }, [connect, pendingWalletName, wallet?.adapter.name]);

  const resetConnectedWallet = useCallback(async () => {
    await disconnect();
    closeWalletAccountMenu();
    setSelectedProviderName("wallet");
    setPendingWalletName(null);
    setWalletState("choice");
    setError("");
  }, [closeWalletAccountMenu, disconnect]);

  const copyWalletAddress = useCallback(
    async (label = "Copy") => {
      const sourceAddress = currentAddress || MOCK_WALLET_ADDRESS;
      const originalLabel = label;

      try {
        await navigator.clipboard.writeText(sourceAddress);
        setCopyLabel("Copied");
      } catch {
        setCopyLabel("Copy failed");
      }

      window.setTimeout(() => setCopyLabel(originalLabel), 1200);
    },
    [currentAddress],
  );

  useEffect(() => {
    const openWalletFlow = () => showSidebarWalletMode();
    window.addEventListener(OPEN_WALLET_EVENT, openWalletFlow);
    return () => window.removeEventListener(OPEN_WALLET_EVENT, openWalletFlow);
  }, [showSidebarWalletMode]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;

      if (isMenuOpen) {
        closeWalletAccountMenu();
        connectButtonRef.current?.focus();
        return;
      }

      if (view === "wallet") {
        showSidebarIntroMode();
      }
    };

    const onPointerDown = (event: PointerEvent) => {
      if (!isMenuOpen) return;
      const target = event.target as Node;
      if (accountMenuRef.current?.contains(target) || connectButtonRef.current?.contains(target)) {
        return;
      }
      closeWalletAccountMenu();
    };

    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("pointerdown", onPointerDown);

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("pointerdown", onPointerDown);
    };
  }, [closeWalletAccountMenu, isMenuOpen, showSidebarIntroMode, view]);

  return (
    <div className="relative z-10 mb-12 flex min-h-[min(560px,calc(100vh-210px))] items-center">
      <div
        className={cn(
          "w-full animate-[sidebar-view-enter_180ms_cubic-bezier(0.23,1,0.32,1)]",
          view !== "intro" && "hidden",
        )}
      >
        <h1 className="font-geist mb-6 text-[2.5rem] font-bold leading-[1.1] tracking-tight">
          Community savings, built for the on-chain era.
        </h1>
        <p className="font-geist mb-10 max-w-sm text-lg font-light leading-relaxed text-white/60">
          The ancient ROSCA model, reimagined on Solana. Secure, transparent, and globally
          accessible rotating capital.
        </p>

        <div className="flex w-full items-center gap-4">
          <div className="relative inline-flex">
            <Button
              ref={connectButtonRef}
              variant="primary"
              size="md"
              className={cn(
                "min-w-[156px] focus-visible:ring-[rgba(255,210,196,0.92)] focus-visible:ring-offset-[3px] focus-visible:ring-offset-[#0a0a0a]",
                isConnected && "normal-case tracking-[0.04em]",
              )}
              aria-controls={isConnected ? "walletAccountMenu" : "sidebarWalletView"}
              aria-expanded={isConnected ? isMenuOpen : view === "wallet"}
              aria-haspopup={isConnected ? "menu" : undefined}
              aria-busy={connecting || walletState === "connecting"}
              disabled={connecting || walletState === "connecting"}
              onClick={() => {
                if (isConnected) {
                  setIsMenuOpen((open) => !open);
                  return;
                }

                showSidebarWalletMode();
              }}
            >
              {isConnected && selectedWalletIconUrl ? (
                <WalletProviderIcon
                  iconUrl={selectedWalletIconUrl}
                  className="mr-1 h-5 w-5 rounded-[4px]"
                />
              ) : null}
              <span>
                {isConnected
                  ? shortAddress
                  : connecting || walletState === "connecting"
                    ? "Connecting..."
                    : "Connect Wallet"}
              </span>
              {!isConnected ? (
                <Wallet
                  className="h-3.5 w-3.5 drop-shadow-[0_1px_1px_rgba(90,18,8,0.35)]"
                  aria-hidden="true"
                />
              ) : null}
              {isConnected ? (
                <ChevronDown
                  className={cn(
                    "h-[0.85rem] w-[0.85rem] shrink-0 drop-shadow-[0_1px_1px_rgba(90,18,8,0.35)] transition-transform duration-100 ease-out",
                    isMenuOpen && "rotate-180",
                  )}
                  aria-hidden="true"
                />
              ) : null}
            </Button>

            {isMenuOpen ? (
              <div
                ref={accountMenuRef}
                id="walletAccountMenu"
                role="menu"
                aria-label="Wallet actions"
                className="absolute left-0 top-[calc(100%+0.55rem)] z-30 w-[178px] animate-[wallet-menu-enter_120ms_ease-out] rounded-lg border border-white/[0.12] bg-[linear-gradient(180deg,rgba(245,245,245,0.065),rgba(245,245,245,0.028)),#111315] p-[0.35rem] shadow-[0_14px_34px_rgba(0,0,0,0.36)]"
              >
                <button
                  type="button"
                  role="menuitem"
                  className="flex min-h-9 w-full cursor-pointer items-center justify-between rounded-md px-[0.65rem] font-mono text-[0.62rem] uppercase tracking-[0.06em] text-white/80 transition-colors duration-100 ease-out hover:bg-white/[0.07] hover:text-[var(--ink)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(255,210,196,0.85)]"
                  onClick={() => void copyWalletAddress("Copy address")}
                >
                  <span>{copyLabel === "Copy" ? "Copy address" : copyLabel}</span>
                </button>
                <button
                  type="button"
                  role="menuitem"
                  className="flex min-h-9 w-full cursor-pointer items-center justify-between rounded-md px-[0.65rem] font-mono text-[0.62rem] uppercase tracking-[0.06em] text-white/80 transition-colors duration-100 ease-out hover:bg-white/[0.07] hover:text-[#ffac9a] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(255,210,196,0.85)]"
                  onClick={() => {
                    void resetConnectedWallet();
                    showSidebarIntroMode();
                  }}
                >
                  <span>Disconnect</span>
                </button>
              </div>
            ) : null}
          </div>

          <button
            type="button"
            className="cursor-pointer border-b border-white/20 bg-transparent pb-0.5 font-mono text-[0.7rem] font-medium uppercase tracking-wide text-white transition-colors duration-100 ease-out hover:border-white/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(255,210,196,0.85)]"
          >
            Read Whitepaper
          </button>
        </div>
      </div>

      <div
        id="sidebarWalletView"
        className={cn(
          "w-full animate-[sidebar-view-enter_180ms_cubic-bezier(0.23,1,0.32,1)]",
          view !== "wallet" && "hidden",
        )}
      >
        <div className="w-[min(100%,352px)]">
          <div className="mb-3 font-mono text-[0.65rem] uppercase tracking-[0.16em] text-[var(--accent)]">
            Wallet Access
          </div>
          <h2 className="font-geist mb-4 text-[2.15rem] font-bold leading-[1.08] tracking-normal text-[var(--ink)]">
            {displayWalletState === "choice"
              ? "Connect your Solana wallet."
              : displayWalletState === "connecting"
                ? "Approve connection."
                : "Wallet connected."}
          </h2>
          <p className="font-geist mb-[1.35rem] max-w-[22rem] text-[0.98rem] leading-[1.65] text-white/60">
            {displayWalletState === "choice"
              ? "Choose a provider to preview member circles, reputation history, and payout readiness."
              : displayWalletState === "connecting"
                ? "This flow mirrors the wallet approval step before the app can read your public address."
                : "Your wallet is ready. From here the app can reveal private circles and member actions."}
          </p>

          {displayWalletState === "choice" ? (
            <div>
              <div className="flex flex-col gap-[0.55rem]">
                {supportedWallets.map((providerWallet, index) => (
                  <button
                    ref={index === 0 ? firstProviderRef : undefined}
                    key={providerWallet.adapter.name}
                    type="button"
                    className="flex min-h-[58px] w-full cursor-pointer items-center gap-[0.7rem] rounded-lg border border-white/10 bg-[linear-gradient(180deg,rgba(245,245,245,0.055),rgba(245,245,245,0.03)),rgba(9,10,11,0.24)] px-[0.78rem] py-[0.7rem] text-left text-[var(--ink)] backdrop-blur-[10px] transition-[background,border-color] duration-100 ease-out hover:border-white/[0.18] hover:bg-[linear-gradient(180deg,rgba(245,245,245,0.078),rgba(245,245,245,0.042)),rgba(9,10,11,0.3)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(255,210,196,0.85)]"
                    data-wallet-provider={providerWallet.adapter.name}
                    onClick={() => connectWallet(providerWallet)}
                  >
                    <WalletProviderIcon
                      iconUrl={providerWallet.adapter.icon}
                      className="h-9 w-9 rounded-lg"
                    />
                    <span className="flex min-w-0 flex-1 flex-col gap-[0.1rem]">
                      <span className="font-geist text-[0.88rem] font-medium">
                        {providerWallet.adapter.name}
                      </span>
                      <span className="font-mono text-[0.6rem] uppercase tracking-[0.08em] text-[var(--ink-dim)]">
                        {walletReadyLabel(providerWallet)}
                      </span>
                    </span>
                    <ChevronRight
                      className="h-[15px] w-[15px] shrink-0 text-white/35"
                      aria-hidden="true"
                    />
                  </button>
                ))}
              </div>
              {error ? <p className="mt-3 text-sm leading-6 text-[#ffac9a]">{error}</p> : null}
            </div>
          ) : null}

          {displayWalletState === "connecting" ? (
            <div className="flex items-center gap-3 rounded-[9px] border border-white/10 bg-white/[0.04] p-[0.95rem]">
              <span
                className="h-[18px] w-[18px] shrink-0 animate-[wallet-spin_700ms_linear_infinite] rounded-full border-2 border-white/15 border-t-[var(--accent)]"
                aria-hidden="true"
              />
              <span>
                <span className="font-geist block text-[0.82rem] font-semibold text-[var(--ink)]">
                  Connecting to {selectedProviderName}
                </span>
                <span className="mt-[0.12rem] block font-mono text-[0.58rem] leading-[1.5] text-[var(--ink-dim)]">
                  Approve the request in your wallet.
                </span>
              </span>
            </div>
          ) : null}

          {displayWalletState === "connected" ? (
            <div>
              <div className="flex items-center gap-3 rounded-[9px] border border-white/10 bg-white/[0.04] p-[0.95rem]">
                {selectedWalletIconUrl ? (
                  <WalletProviderIcon
                    iconUrl={selectedWalletIconUrl}
                    className="h-9 w-9 rounded-lg"
                  />
                ) : (
                  <span
                    className="h-[0.55rem] w-[0.55rem] shrink-0 rounded-full bg-[#28c840] shadow-[0_0_0_3px_rgba(40,200,64,0.13)]"
                    aria-hidden="true"
                  />
                )}
                <span>
                  <span className="font-geist block text-[0.82rem] font-semibold text-[var(--ink)]">
                    {shortAddress || "7xKX...p2aB"}
                  </span>
                  <span className="mt-[0.12rem] block font-mono text-[0.58rem] leading-[1.5] text-[var(--ink-dim)]">
                    Connected with {selectedProviderName}
                  </span>
                </span>
              </div>
              <div className="mt-[0.7rem] grid grid-cols-2 gap-[0.55rem]">
                <Button
                  variant="secondary"
                  size="sm"
                  className="min-h-[38px] rounded-[7px] text-[0.58rem] text-[var(--ink)]"
                  onClick={() => void copyWalletAddress("Copy")}
                >
                  {copyLabel}
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  className="min-h-[38px] rounded-[7px] text-[0.58rem] text-[var(--ink)]"
                  onClick={() => {
                    void resetConnectedWallet();
                    showSidebarIntroMode();
                  }}
                >
                  Disconnect
                </Button>
              </div>
            </div>
          ) : null}

          <div className="mt-4 flex items-center justify-between gap-3">
            <Button
              variant="secondary"
              size="sm"
              className="focus-visible:ring-[rgba(255,210,196,0.85)]"
              onClick={showSidebarIntroMode}
            >
              <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
              Back
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function WalletProviderIcon({ iconUrl, className }: { iconUrl?: string; className?: string }) {
  if (!iconUrl) return null;

  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center justify-center overflow-hidden bg-white/[0.06]",
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
