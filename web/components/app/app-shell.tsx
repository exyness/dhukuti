"use client";

import {
  Award,
  BadgeDollarSign,
  Check,
  Copy,
  ExternalLink,
  History,
  KeyRound,
  Layers,
  LayoutGrid,
  Loader2,
  LockKeyhole,
  LogOut,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  ScrollText,
  Users,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { type HTMLAttributes, type ReactNode, useEffect, useRef, useState } from "react";
import { NoiseCanvas } from "@/components/layout/noise-canvas";
import { Badge } from "@/components/ui/badge";
import { Tooltip } from "@/components/ui/Tooltip";
import { WalletConnectCard } from "@/components/wallet/wallet-connect";
import { cn } from "@/lib/cn";
import { explorerAddressUrl } from "@/lib/constants";
import { useProfileQuery } from "@/lib/data/queries";
import type { ProfileData } from "@/lib/data/types";
import { appNavItems } from "@/lib/navigation";
import { useSupabaseAuth } from "@/lib/supabase/auth-context";
import { useWalletIdentity } from "@/lib/use-wallet-identity";
import { truncateAddress } from "@/lib/wallet";

const navIcons = {
  "Contribution History": History,
  "Explore Marketplace": LayoutGrid,
  "My Circles": Users,
  "Reputation Score": Award,
  "Activity Log": ScrollText,
};

export function AppShell({
  children,
  contentClassName,
  title,
}: {
  children: ReactNode;
  contentClassName?: string;
  title: string;
}) {
  const pathname = usePathname();
  const mobileMenuTriggerRef = useRef<HTMLButtonElement>(null);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [railCollapsed, setRailCollapsed] = useState(false);
  const { address, isConnected } = useWalletIdentity();
  const reputationQuery = useProfileQuery(address);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 hidden overflow-hidden border-r border-[rgba(245,245,245,0.05)] bg-[#151719] pt-6 pb-10 transition-[width] duration-[400ms] ease-[cubic-bezier(0.4,0,0.2,1)] lg:flex lg:flex-col",
          railCollapsed ? "w-[88px]" : "w-[420px]",
        )}
      >
        <NoiseCanvas />
        <div
          className="pointer-events-none absolute inset-0 z-[1]"
          style={{
            background:
              "linear-gradient(180deg, rgba(245,245,245,0.045), rgba(245,245,245,0) 34%), radial-gradient(120% 78% at 50% 112%, rgba(255,107,74,0.18), rgba(255,107,74,0.055) 28%, rgba(255,107,74,0) 62%), linear-gradient(180deg, rgba(22,24,25,0), rgba(5,6,7,0.24))",
          }}
        />

        <div className="relative z-[2]">
          <Link
            href="/"
            aria-label="Dhukuti home"
            className="grid h-10 w-[420px] grid-cols-[88px_1fr] items-center overflow-hidden text-[#f0ece6] [text-shadow:0_1px_0_rgba(0,0,0,0.45)]"
          >
            <Layers className="mx-auto h-5 w-5" aria-hidden="true" />
            <span
              className={cn(
                "-ml-4 text-[0.95rem] font-semibold tracking-tight transition-[opacity,transform] duration-200 ease-out",
                railCollapsed ? "translate-x-1 opacity-0" : "translate-x-0 opacity-100 delay-100",
              )}
              aria-hidden={railCollapsed}
            >
              Dhukuti
            </span>
          </Link>
        </div>

        <nav
          aria-label="Main Menu"
          className="relative z-[2] mt-14 mb-auto flex w-[420px] flex-col gap-2"
        >
          <div className="flex w-[420px] flex-col gap-2">
            <span
              className={cn(
                "ml-[72px] font-mono text-[0.6rem] font-medium uppercase tracking-[0.2em] text-[#7a756e] transition-[opacity,transform] duration-200 ease-out",
                railCollapsed ? "translate-x-1 opacity-0" : "translate-x-0 opacity-100 delay-100",
              )}
              aria-hidden={railCollapsed}
            >
              Main Menu
            </span>
            {appNavItems.map((item) => {
              const Icon = navIcons[item.label];
              const active = isActiveNavItem(pathname, item);

              return (
                <Tooltip
                  key={item.href}
                  className={cn("overflow-hidden", railCollapsed ? "w-[88px]" : "w-[420px]")}
                  enabled={railCollapsed}
                  label={item.label}
                >
                  <Link
                    href={item.href}
                    aria-label={item.label}
                    className={cn(
                      "group relative grid h-11 w-[420px] grid-cols-[88px_1fr] items-center overflow-hidden text-[#aaa49b] no-underline transition-colors duration-150 ease-out hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                      active && "text-accent",
                    )}
                  >
                    <span
                      className={cn(
                        "pointer-events-none absolute inset-y-0 left-3 rounded-md border border-transparent transition-colors duration-150 ease-out",
                        railCollapsed ? "w-16" : "right-3",
                        active ? "border-accent/20 bg-accent/10" : "group-hover:bg-white/[0.055]",
                      )}
                      aria-hidden="true"
                    />
                    <Icon
                      className={cn(
                        "relative z-[1] mx-auto text-[#969189] transition-colors duration-150 ease-out group-hover:text-accent",
                        railCollapsed ? "h-4 w-4" : "h-3.5 w-3.5",
                        active && "text-accent",
                      )}
                      aria-hidden="true"
                    />
                    <span
                      className={cn(
                        "relative z-[1] -ml-4 text-[0.95rem] tracking-[-0.01em] transition-[opacity,transform] duration-200 ease-out",
                        railCollapsed
                          ? "translate-x-1 opacity-0"
                          : "translate-x-0 opacity-100 delay-100",
                      )}
                      aria-hidden={railCollapsed}
                    >
                      {item.label}
                    </span>
                  </Link>
                </Tooltip>
              );
            })}
          </div>
        </nav>

        <div
          className={cn(
            "relative z-[2] mt-auto w-[420px] transition-[opacity,transform] duration-200 ease-out",
            railCollapsed
              ? "pointer-events-none translate-x-1 opacity-0"
              : "translate-x-0 opacity-100 delay-100",
          )}
          aria-hidden={railCollapsed}
        >
          <SidebarReputation
            error={reputationQuery.error}
            isConnected={isConnected}
            isLoading={reputationQuery.isLoading}
            profile={reputationQuery.data}
          />

          <div className="mx-10 flex items-center gap-3 font-mono text-[0.62rem] uppercase tracking-[0.16em] text-[#6c665f]">
            <span>dhukuti.io</span>
            <span className="text-[#4b4742]">/</span>
            <span>v1.2.0</span>
          </div>
        </div>
      </aside>

      <Tooltip
        className={cn(
          "fixed bottom-5 z-[60] hidden lg:inline-flex",
          railCollapsed ? "left-6" : "left-[360px]",
        )}
        label={railCollapsed ? "Expand sidebar" : "Collapse sidebar"}
        side={railCollapsed ? "right" : "top"}
      >
        <button
          type="button"
          aria-label={railCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          className="group flex h-10 w-10 cursor-pointer items-center justify-center rounded-md border border-white/10 bg-white/[0.08] backdrop-blur-xl transition-[background] duration-[400ms] ease-in-out hover:bg-white/[0.12] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(255,210,196,0.85)]"
          onClick={() => setRailCollapsed((value) => !value)}
        >
          {railCollapsed ? (
            <PanelLeftOpen
              className="h-4 w-4 cursor-pointer text-white/60 transition-colors duration-200 group-hover:text-[var(--accent)]"
              aria-hidden="true"
            />
          ) : (
            <PanelLeftClose
              className="h-4 w-4 cursor-pointer text-white/60 transition-colors duration-200 group-hover:text-[var(--accent)]"
              aria-hidden="true"
            />
          )}
        </button>
      </Tooltip>

      <main
        className={cn(
          "dhukuti-scrollbar h-screen overflow-y-auto bg-background transition-[margin-left] duration-[400ms] ease-[cubic-bezier(0.4,0,0.2,1)]",
          railCollapsed ? "lg:ml-[88px]" : "lg:ml-[420px]",
        )}
      >
        <header className="sticky top-0 z-40 flex h-[72px] items-center justify-between gap-4 border-b border-[rgba(245,245,245,0.05)] bg-[rgba(10,10,10,0.86)] px-6 backdrop-blur-[12px] md:px-10">
          <h1 className="text-[1.1rem] font-medium tracking-tight">{title}</h1>
          <div className="flex items-center gap-2">
            <button
              ref={mobileMenuTriggerRef}
              type="button"
              aria-controls="mobile-navigation"
              aria-expanded={mobileNavOpen}
              className="flex h-10 w-10 items-center justify-center rounded-md border border-white/10 text-muted transition-colors hover:bg-white/[0.05] hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring lg:hidden"
              onClick={() => setMobileNavOpen((open) => !open)}
            >
              <Menu className="h-4 w-4" aria-hidden="true" />
              <span className="sr-only">Open navigation</span>
            </button>
            <WalletSummary />
          </div>
        </header>
        <div className={cn("mx-auto w-full max-w-[1120px] px-6 py-10 md:px-10", contentClassName)}>
          {isConnected ? children : <WalletRequiredPanel />}
        </div>
      </main>
      <MobileNavigation
        onClose={() => {
          setMobileNavOpen(false);
          mobileMenuTriggerRef.current?.focus();
        }}
        open={mobileNavOpen}
        pathname={pathname}
      />
    </div>
  );
}

function MobileNavigation({
  onClose,
  open,
  pathname,
}: {
  onClose: () => void;
  open: boolean;
  pathname: string;
}) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    const getFocusableElements = () =>
      Array.from(
        panelRef.current?.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ) ?? [],
      );
    const initialFocus = getFocusableElements()[0];
    initialFocus?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }

      if (event.key !== "Tab") return;

      const focusableElements = getFocusableElements();
      const firstElement = focusableElements[0];
      const lastElement = focusableElements.at(-1);
      if (!firstElement || !lastElement) {
        event.preventDefault();
        return;
      }

      const activeElement = document.activeElement;
      if (!panelRef.current?.contains(activeElement)) {
        event.preventDefault();
        (event.shiftKey ? lastElement : firstElement).focus();
      } else if (event.shiftKey && activeElement === firstElement) {
        event.preventDefault();
        lastElement.focus();
      } else if (!event.shiftKey && activeElement === lastElement) {
        event.preventDefault();
        firstElement.focus();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onClose, open]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[80] lg:hidden"
      role="dialog"
      aria-modal="true"
      aria-label="Navigation"
    >
      <button
        type="button"
        aria-label="Close navigation"
        className="absolute inset-0 cursor-default bg-black/60"
        onClick={onClose}
      />
      <div
        ref={panelRef}
        id="mobile-navigation"
        className="absolute inset-x-4 top-4 rounded-lg border border-border bg-popover p-4 shadow-[0_18px_44px_rgba(0,0,0,0.45)]"
      >
        <div className="mb-4 flex items-center justify-between">
          <span className="font-mono text-[0.62rem] uppercase tracking-[0.1em] text-muted">
            Dhukuti
          </span>
          <button
            type="button"
            aria-label="Close navigation"
            className="flex h-10 w-10 items-center justify-center rounded-md text-muted transition-colors hover:bg-white/[0.06] hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            onClick={onClose}
          >
            <PanelLeftClose className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
        <nav aria-label="Mobile navigation" className="grid gap-1">
          {appNavItems.map((item) => {
            const Icon = navIcons[item.label];
            const active = isActiveNavItem(pathname, item);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex min-h-11 items-center gap-3 rounded-md px-3 font-mono text-[0.68rem] uppercase tracking-[0.08em] text-muted transition-colors hover:bg-white/[0.055] hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  active && "bg-accent/10 text-accent",
                )}
                onClick={onClose}
              >
                <Icon className="h-4 w-4" aria-hidden="true" />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}

function SidebarReputation({
  error,
  isConnected,
  isLoading,
  profile,
}: {
  error: Error | null;
  isConnected: boolean;
  isLoading: boolean;
  profile: ProfileData | undefined;
}) {
  const score = Number.parseInt(profile?.stats.memberReputation ?? "0", 10) || 0;
  const tier = Number.parseInt(profile?.stats.discountTier ?? "0", 10) || 0;
  const tierProgress = getTierProgress(score);

  return (
    <div className="mx-10 mb-8 rounded-lg border border-[rgba(240,236,230,0.08)] bg-[rgba(20,22,22,0.74)] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.035)]">
      <div className="mb-4 flex items-center justify-between">
        <span className="font-mono text-[0.6rem] uppercase tracking-[0.08em] text-[#8d877f]">
          Your Reputation
        </span>
        <span className="font-mono text-[0.7rem] text-accent">
          {isConnected ? `Tier ${tier}` : "Wallet required"}
        </span>
      </div>
      {isLoading ? (
        <div className="space-y-3" role="status">
          <span className="sr-only">Loading reputation</span>
          <div className="h-1 animate-pulse rounded-full bg-white/[0.08]" />
          <div className="h-3 w-32 animate-pulse rounded bg-white/[0.06]" />
        </div>
      ) : error ? (
        <p className="font-mono text-[0.56rem] leading-5 text-warning">
          Unable to load indexed reputation.
        </p>
      ) : !isConnected ? (
        <p className="font-mono text-[0.56rem] leading-5 text-[#7a756e]">
          Connect a wallet to load your on-chain standing.
        </p>
      ) : (
        <>
          <div className="mb-2 h-1 overflow-hidden rounded-full bg-[rgba(245,242,237,0.06)]">
            <div
              className="h-full rounded-full bg-accent transition-[width] duration-150 ease-out"
              style={{ width: `${tierProgress.percent}%` }}
            />
          </div>
          <p className="font-mono text-[0.56rem] text-[#7a756e]">
            {tierProgress.next
              ? `${score} points · next tier at ${tierProgress.next}`
              : `${score} points · top tier`}
          </p>
        </>
      )}
    </div>
  );
}

function getTierProgress(score: number) {
  if (score >= 10_000) return { next: null, percent: 100 };
  if (score >= 5_000) return { next: 10_000, percent: Math.round(((score - 5_000) / 5_000) * 100) };
  if (score >= 1_000) return { next: 5_000, percent: Math.round(((score - 1_000) / 4_000) * 100) };
  return { next: 1_000, percent: Math.round((score / 1_000) * 100) };
}

function WalletRequiredPanel() {
  return (
    <section
      id="wallet-access"
      className="mx-auto flex min-h-[calc(100vh-152px)] w-full max-w-3xl items-center justify-center py-10"
    >
      <div className="grid w-full gap-6 lg:grid-cols-[1fr_22rem] lg:items-center">
        <div>
          <Badge tone="accent">Wallet required</Badge>
          <div className="mt-5 flex items-start gap-4">
            <span
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md border border-accent/20 bg-accent/10 text-accent"
              aria-hidden="true"
            >
              <LockKeyhole className="h-5 w-5" />
            </span>
            <div>
              <h2 className="text-2xl font-semibold tracking-tight">Connect to continue</h2>
              <p className="mt-3 max-w-md text-sm leading-6 text-muted">
                Dhukuti actions are scoped to your Solana wallet. Connect a devnet wallet to load
                indexed circles, reputation, positions, and transaction controls.
              </p>
            </div>
          </div>
        </div>
        <WalletConnectCard />
      </div>
    </section>
  );
}

function isActiveNavItem(pathname: string, item: (typeof appNavItems)[number]) {
  if (item.href === "/circles") {
    return pathname === "/circles";
  }

  if (item.label === "My Circles") {
    return pathname.startsWith("/circles/") && pathname !== "/circles/new";
  }

  if (item.label === "Reputation Score") {
    return pathname === "/profile";
  }

  return pathname === item.href;
}

function WalletSummary() {
  const { address, disconnect, isConnected, wallet } = useWalletIdentity();
  const {
    error: authError,
    signInWithWallet,
    signOut: signOutSession,
    status: authStatus,
  } = useSupabaseAuth();
  const [copied, setCopied] = useState(false);
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const currentAddress = address ?? "";
  const sessionActive = authStatus === "authenticated";
  const sessionBusy = authStatus === "authenticating";

  useEffect(() => {
    function onPointerDown(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }

    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);

    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, []);

  if (!isConnected || !currentAddress) {
    return (
      <a
        href="#wallet-access"
        className="inline-flex min-h-10 items-center gap-2 rounded-md bg-foreground px-4 font-mono text-[0.68rem] font-medium uppercase tracking-[0.08em] text-background transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        Connect Wallet
      </a>
    );
  }

  async function copyAddress() {
    if (!currentAddress) return;

    await navigator.clipboard.writeText(currentAddress);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1400);
  }

  async function toggleSession() {
    if (sessionActive) {
      await signOutSession();
      return;
    }

    await signInWithWallet();
  }

  async function disconnectWallet() {
    if (sessionActive) {
      await signOutSession();
    }

    setOpen(false);
    await disconnect();
  }

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        aria-expanded={open}
        aria-haspopup="menu"
        className="flex min-h-11 items-center gap-3 rounded-md px-2 transition-colors hover:bg-white/[0.04] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        onClick={() => setOpen((current) => !current)}
      >
        <div className="text-right">
          <p className="font-mono text-[0.7rem] leading-none text-foreground">
            {truncateAddress(currentAddress)}
          </p>
          <p className="mt-1 font-mono text-[0.55rem] text-muted">
            {wallet?.adapter.name ?? "Wallet"}
          </p>
        </div>
        <div
          className="h-9 w-9 rounded-full border border-white/10 bg-gradient-to-tr from-[#ff6b4a] to-[#ffb09c]"
          aria-hidden="true"
        />
      </button>

      {open ? (
        <div
          role="menu"
          className="absolute right-0 z-50 mt-2 w-56 overflow-hidden rounded-md border border-border bg-[#151719] p-1 shadow-[0_16px_40px_rgba(0,0,0,0.42)]"
        >
          <div className="border-b border-border px-3 py-2">
            <p className="font-mono text-[0.62rem] text-foreground">
              {truncateAddress(currentAddress)}
            </p>
            <p className="mt-1 font-mono text-[0.55rem] text-muted">
              {sessionActive ? "Supabase session active" : "Session not signed"}
            </p>
          </div>
          <button
            type="button"
            role="menuitem"
            className="flex min-h-9 w-full items-center gap-2 rounded px-3 font-mono text-[0.65rem] uppercase tracking-[0.06em] text-muted transition-colors hover:bg-white/[0.055] hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            onClick={copyAddress}
          >
            {copied ? (
              <Check className="h-3.5 w-3.5 text-success" aria-hidden="true" />
            ) : (
              <Copy className="h-3.5 w-3.5" aria-hidden="true" />
            )}
            {copied ? "Copied" : "Copy address"}
          </button>
          <a
            role="menuitem"
            href={explorerAddressUrl(currentAddress)}
            target="_blank"
            rel="noreferrer"
            className="flex min-h-9 w-full items-center gap-2 rounded px-3 font-mono text-[0.65rem] uppercase tracking-[0.06em] text-muted transition-colors hover:bg-white/[0.055] hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
            View explorer
          </a>
          <button
            type="button"
            role="menuitem"
            className="flex min-h-9 w-full items-center gap-2 rounded px-3 font-mono text-[0.65rem] uppercase tracking-[0.06em] text-muted transition-colors hover:bg-white/[0.055] hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            disabled={sessionBusy}
            onClick={() => void toggleSession()}
          >
            {sessionBusy ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
            ) : (
              <KeyRound className="h-3.5 w-3.5" aria-hidden="true" />
            )}
            {sessionActive ? "Sign out session" : "Sign in session"}
          </button>
          {authError ? (
            <p className="px-3 py-1 text-xs leading-5 text-warning">{authError}</p>
          ) : null}
          <button
            type="button"
            role="menuitem"
            className="flex min-h-9 w-full items-center gap-2 rounded px-3 font-mono text-[0.65rem] uppercase tracking-[0.06em] text-accent transition-colors hover:bg-accent/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            onClick={() => {
              void disconnectWallet();
            }}
          >
            <LogOut className="h-3.5 w-3.5" aria-hidden="true" />
            Disconnect
          </button>
        </div>
      ) : null}
    </div>
  );
}

export function AppPageHeader({
  actions,
  eyebrow,
  title,
  copy,
}: {
  actions?: ReactNode;
  copy: string;
  eyebrow: string;
  title: string;
}) {
  return (
    <div className="mb-12 flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
      <div className="max-w-3xl">
        <p className="mb-2 block font-mono text-[0.68rem] uppercase tracking-widest text-accent">
          {eyebrow}
        </p>
        <h2 className="mt-2 text-3xl font-semibold tracking-tight">{title}</h2>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-muted">{copy}</p>
      </div>
      {actions ? <div className="flex shrink-0 flex-wrap items-center gap-3">{actions}</div> : null}
    </div>
  );
}

export function Panel({
  children,
  className,
  ...props
}: { children: ReactNode; className?: string } & HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-lg border border-[var(--ink-faint)] bg-[rgba(245,245,245,0.02)]",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export function StatTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-r border-[var(--ink-faint)] bg-[rgba(245,245,245,0.018)] p-4 last:border-r-0">
      <span className="block font-mono text-[0.58rem] uppercase tracking-[0.1em] text-muted">
        {label}
      </span>
      <span className="mt-1 block text-[1rem] font-medium text-foreground">{value}</span>
    </div>
  );
}

export function TokenScopeNotice({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "flex items-start gap-3 rounded-lg border border-warning/20 bg-warning/8 p-4",
        className,
      )}
    >
      <BadgeDollarSign className="mt-0.5 h-4 w-4 shrink-0 text-warning" aria-hidden="true" />
      <div>
        <p className="font-mono text-[0.62rem] uppercase tracking-[0.1em] text-warning">
          Native SOL V1
        </p>
        <p className="mt-1 text-sm leading-6 text-muted">
          The deployed program rejects custom token settlement today. USDC or Token-2022 support
          should be added only after program-level SPL account, mint, decimal, and transfer tests.
        </p>
      </div>
    </div>
  );
}
