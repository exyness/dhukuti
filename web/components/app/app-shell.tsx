"use client";

import {
  BadgeDollarSign,
  CircleDollarSign,
  Layers,
  LayoutGrid,
  Plus,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { WalletConnectCard } from "@/components/wallet/wallet-connect";
import { appNavItems, programExplorerUrl, programFacts } from "@/lib/app-data";
import { cn } from "@/lib/cn";

const navIcons = {
  Browse: LayoutGrid,
  Create: Plus,
  Market: CircleDollarSign,
  Profile: UserRound,
};

export function AppShell({ children, title }: { children: ReactNode; title: string }) {
  const pathname = usePathname();

  return (
    <div className="flex min-h-screen bg-background text-foreground">
      <aside className="hidden h-screen w-[300px] shrink-0 border-r border-border bg-[#0d0d0d] lg:flex lg:flex-col">
        <div className="border-b border-border p-7">
          <Link href="/" className="flex w-fit items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-md border border-accent/30 bg-accent/10">
              <Layers className="h-4 w-4 text-accent" aria-hidden="true" />
            </span>
            <span>
              <span className="block text-[1.02rem] font-semibold tracking-tight">Dhukuti</span>
              <span className="block font-mono text-[0.58rem] uppercase tracking-[0.14em] text-muted">
                Devnet App
              </span>
            </span>
          </Link>
        </div>

        <nav aria-label="App" className="flex flex-col gap-1 p-4">
          {appNavItems.map((item) => {
            const Icon = navIcons[item.label];
            const active =
              item.href === "/circles"
                ? pathname === "/circles" || pathname.startsWith("/circles/")
                : pathname === item.href;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex min-h-14 items-center gap-3 rounded-md border px-3 transition-colors duration-100 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  active
                    ? "border-accent/25 bg-accent/10 text-foreground"
                    : "border-transparent text-muted hover:border-border hover:bg-foreground/[0.04] hover:text-foreground",
                )}
              >
                <Icon className="h-4 w-4" aria-hidden="true" />
                <span>
                  <span className="block text-sm font-medium">{item.label}</span>
                  <span className="block font-mono text-[0.58rem] uppercase tracking-[0.08em] opacity-70">
                    {item.description}
                  </span>
                </span>
              </Link>
            );
          })}
        </nav>

        <div className="mt-auto border-t border-border p-4">
          <div className="rounded-lg border border-border bg-white/[0.025] p-4">
            <div className="mb-4 flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-success" aria-hidden="true" />
              <span className="font-mono text-[0.62rem] uppercase tracking-[0.12em] text-muted">
                Program Status
              </span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {programFacts.map((fact) => (
                <div key={fact.label}>
                  <span className="block font-mono text-[0.52rem] uppercase text-muted">
                    {fact.label}
                  </span>
                  <span className="mt-1 block font-mono text-[0.68rem] text-foreground">
                    {fact.value}
                  </span>
                </div>
              ))}
            </div>
            <a
              href={programExplorerUrl}
              target="_blank"
              rel="noreferrer"
              className="mt-4 inline-flex min-h-9 items-center rounded-md border border-border px-3 font-mono text-[0.62rem] uppercase tracking-[0.08em] text-muted transition-colors hover:border-foreground/20 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              View Explorer
            </a>
          </div>
        </div>
      </aside>

      <main className="dhukuti-scrollbar h-screen flex-1 overflow-y-auto">
        <header className="sticky top-0 z-40 flex min-h-[78px] items-center justify-between gap-4 border-b border-border bg-[rgba(10,10,10,0.9)] px-5 backdrop-blur-[12px] md:px-8">
          <div>
            <p className="font-mono text-[0.62rem] uppercase tracking-[0.14em] text-accent">
              Dhukuti Protocol
            </p>
            <h1 className="mt-1 text-[1.05rem] font-semibold tracking-tight">{title}</h1>
          </div>
          <div className="hidden w-[18rem] sm:block">
            <WalletConnectCard />
          </div>
        </header>
        <div className="mx-auto w-full max-w-7xl px-5 py-8 md:px-8 md:py-10">{children}</div>
      </main>
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
    <div className="mb-8 flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
      <div className="max-w-3xl">
        <p className="font-mono text-[0.68rem] uppercase tracking-widest text-accent">{eyebrow}</p>
        <h2 className="mt-2 text-3xl font-semibold tracking-tight">{title}</h2>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-muted">{copy}</p>
      </div>
      {actions ? <div className="flex shrink-0 flex-wrap items-center gap-3">{actions}</div> : null}
    </div>
  );
}

export function Panel({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn("rounded-lg border border-border bg-white/[0.025]", className)}>
      {children}
    </div>
  );
}

export function StatTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-white/[0.025] p-5">
      <span className="block font-mono text-[0.58rem] uppercase tracking-[0.1em] text-muted">
        {label}
      </span>
      <span className="mt-2 block font-mono text-xl font-medium text-foreground">{value}</span>
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
