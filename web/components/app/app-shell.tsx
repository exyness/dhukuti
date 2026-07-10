"use client";

import { useWallet } from "@solana/wallet-adapter-react";
import {
  Award,
  BadgeDollarSign,
  History,
  Layers,
  LayoutGrid,
  PanelLeft,
  Users,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { type ReactNode, useState } from "react";
import { NoiseCanvas } from "@/components/layout/noise-canvas";
import { appNavItems } from "@/lib/app-data";
import { cn } from "@/lib/cn";
import { truncateAddress } from "@/lib/wallet";

const navIcons = {
  "Contribution History": History,
  "Explore Marketplace": LayoutGrid,
  "My Circles": Users,
  "Reputation Score": Award,
};

export function AppShell({ children, title }: { children: ReactNode; title: string }) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 hidden w-[420px] overflow-hidden border-r border-[rgba(245,245,245,0.05)] bg-[#151719] p-10 transition-transform duration-[400ms] ease-[cubic-bezier(0.4,0,0.2,1)] lg:flex lg:flex-col",
          collapsed && "-translate-x-full",
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
            className="flex w-fit items-center gap-2 text-[#f0ece6] [text-shadow:0_1px_0_rgba(0,0,0,0.45)]"
          >
            <Layers className="h-5 w-5" aria-hidden="true" />
            <span className="text-[0.95rem] font-semibold tracking-tight">Dhukuti</span>
          </Link>
        </div>

        <nav aria-label="Main Menu" className="relative z-[2] mt-24 mb-auto flex flex-col gap-8">
          <div className="flex flex-col gap-4">
            <span className="font-mono text-[0.62rem] font-medium uppercase tracking-[0.2em] text-[#7a756e]">
              Main Menu
            </span>
            {appNavItems.map((item) => {
              const Icon = navIcons[item.label];
              const active = isActiveNavItem(pathname, item);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "group relative flex min-h-8 items-center gap-3 text-[1rem] tracking-[-0.01em] text-[#aaa49b] no-underline transition-colors duration-150 ease-out before:absolute before:-inset-x-2.5 before:-inset-y-2 before:-z-10 before:rounded-md before:bg-[rgba(245,245,245,0.055)] before:opacity-0 before:transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    active ? "text-accent" : "hover:text-accent hover:before:opacity-100",
                  )}
                >
                  <Icon
                    className={cn(
                      "h-4 w-4 text-[#969189] transition-colors duration-150 ease-out group-hover:text-accent",
                      active && "text-accent",
                    )}
                    aria-hidden="true"
                  />
                  {item.label}
                </Link>
              );
            })}
          </div>
        </nav>

        <div className="relative z-[2] mt-auto">
          <div className="mb-8 rounded-lg border border-[rgba(240,236,230,0.08)] bg-[rgba(20,22,22,0.74)] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.035)]">
            <div className="mb-4 flex items-center justify-between">
              <span className="font-mono text-[0.6rem] uppercase tracking-[0.08em] text-[#8d877f]">
                Your Reputation
              </span>
              <span className="font-mono text-[0.7rem] text-accent">Level 4</span>
            </div>
            <div className="mb-2 h-1 overflow-hidden rounded-full bg-[rgba(245,242,237,0.06)]">
              <div className="h-full w-[72%] rounded-full bg-accent" />
            </div>
            <p className="font-mono text-[0.56rem] text-[#7a756e]">Next Tier: 850 Points</p>
          </div>

          <div className="flex items-center gap-3 font-mono text-[0.62rem] uppercase tracking-[0.16em] text-[#6c665f]">
            <span>dhukuti.io</span>
            <span className="text-[#4b4742]">/</span>
            <span>v1.2.0</span>
          </div>
        </div>
      </aside>

      <button
        type="button"
        aria-label="Toggle sidebar"
        className={cn(
          "fixed bottom-5 z-[60] hidden h-10 w-10 items-center justify-center rounded-md border border-[rgba(245,245,245,0.1)] bg-[rgba(245,245,245,0.05)] text-white/60 backdrop-blur-lg transition-[left,background,color] duration-[400ms] ease-[cubic-bezier(0.4,0,0.2,1)] hover:bg-[rgba(245,245,245,0.1)] hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring lg:flex",
          collapsed ? "left-5" : "left-[360px]",
        )}
        onClick={() => setCollapsed((value) => !value)}
      >
        <PanelLeft className="h-4 w-4" aria-hidden="true" />
      </button>

      <main
        className={cn(
          "dhukuti-scrollbar h-screen overflow-y-auto bg-background transition-[margin-left,width] duration-[400ms] ease-[cubic-bezier(0.4,0,0.2,1)]",
          collapsed ? "lg:ml-0 lg:w-full" : "lg:ml-[420px] lg:w-[calc(100%_-_420px)]",
        )}
      >
        <header className="sticky top-0 z-40 flex h-[72px] items-center justify-between gap-4 border-b border-[rgba(245,245,245,0.05)] bg-[rgba(10,10,10,0.86)] px-6 backdrop-blur-[12px] md:px-10">
          <h1 className="text-[1.1rem] font-medium tracking-tight">{title}</h1>
          <WalletSummary />
        </header>
        <div className="mx-auto w-full max-w-[1120px] px-6 py-10 md:px-10">{children}</div>
      </main>
    </div>
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
  const { connected, publicKey, wallet } = useWallet();
  const address = publicKey?.toBase58();

  if (!connected || !address) {
    return (
      <Link
        href="/"
        className="inline-flex min-h-10 items-center gap-2 rounded-md bg-foreground px-4 font-mono text-[0.68rem] font-medium uppercase tracking-[0.08em] text-background transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        Connect Wallet
      </Link>
    );
  }

  return (
    <div className="flex items-center gap-3">
      <div className="text-right">
        <p className="font-mono text-[0.7rem] leading-none text-foreground">
          {truncateAddress(address)}
        </p>
        <p className="mt-1 font-mono text-[0.55rem] text-muted">
          {wallet?.adapter.name ?? "Wallet"}
        </p>
      </div>
      <div className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-gradient-to-tr from-[#ff6b4a] to-[#ffb09c] font-mono text-[0.65rem] text-background">
        {wallet?.adapter.name?.slice(0, 1) ?? "W"}
      </div>
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

export function Panel({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        "rounded-lg border border-[var(--ink-faint)] bg-[rgba(245,245,245,0.02)]",
        className,
      )}
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

export function TokenScopeNotice() {
  return (
    <div className="flex items-start gap-3 rounded-lg border border-warning/20 bg-warning/8 p-4">
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
