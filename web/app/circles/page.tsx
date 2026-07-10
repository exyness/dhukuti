import { ArrowRight, ChevronDown, Search } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { AppShell, Panel, StatTile, TokenScopeNotice } from "@/components/app/app-shell";
import { Badge } from "@/components/ui/badge";
import { circles } from "@/lib/app-data";

export default function CirclesPage() {
  const openCircles = circles.filter((circle) => circle.status === "Forming").length;
  const activeCircles = circles.filter((circle) => circle.status === "Active").length;

  return (
    <AppShell title="Browse Circles">
      <header className="mb-8 flex flex-col justify-between gap-6 md:flex-row md:items-end">
        <div>
          <span className="mb-2 block font-mono text-[0.68rem] uppercase tracking-widest text-accent">
            Marketplace
          </span>
          <h2 className="text-3xl font-semibold tracking-tight">Open Saving Circles</h2>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <label className="relative block">
            <span className="sr-only">Search circles</span>
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-white/20"
              aria-hidden="true"
            />
            <input
              type="search"
              placeholder="Search circles..."
              className="h-10 w-full min-w-[13rem] rounded-md border border-border bg-white/[0.03] pl-9 pr-3 font-mono text-[0.7rem] text-foreground placeholder:text-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:w-[14rem]"
            />
          </label>
          <label className="sr-only" htmlFor="payout-mode">
            Payout mode
          </label>
          <select id="payout-mode" className="filter-control" defaultValue="all">
            <option value="all">Payout Mode: All</option>
            <option value="fixed">Fixed Rotation</option>
            <option value="dutch">Dutch Bid</option>
          </select>
          <label className="sr-only" htmlFor="contribution-range">
            Contribution range
          </label>
          <select id="contribution-range" className="filter-control" defaultValue="all">
            <option value="all">Contribution: All</option>
            <option value="lt-1">&lt; 1 SOL</option>
            <option value="one-five">1 - 5 SOL</option>
            <option value="gt-5">5+ SOL</option>
          </select>
          <button type="button" className="filter-control inline-flex items-center gap-2">
            Sort: Newest
            <ChevronDown className="h-3 w-3" aria-hidden="true" />
          </button>
        </div>
      </header>

      <TokenScopeNotice className="mb-6" />

      <Panel className="mb-6 grid grid-cols-1 overflow-hidden md:grid-cols-4">
        <StatTile label="Open circles" value={String(openCircles)} />
        <StatTile label="Active circles" value={String(activeCircles)} />
        <StatTile label="Settlement" value="SOL only" />
        <StatTile label="Payout modes" value="Fixed + Dutch" />
      </Panel>

      <div className="mb-8 flex flex-wrap items-center gap-2">
        <FilterChip active>Fixed order</FilterChip>
        <FilterChip>Dutch bid</FilterChip>
        <FilterChip>Native SOL</FilterChip>
        <FilterChip>2-64 members</FilterChip>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
        {circles.map((circle) => (
          <Panel
            key={circle.id}
            className="p-6 transition-[border-color,background] duration-150 ease-out hover:border-white/10 hover:bg-white/[0.035]"
          >
            <div className="mb-6 flex items-start justify-between gap-4">
              <div>
                <h3 className="text-lg font-semibold tracking-tight">{circle.name}</h3>
                <p className="mt-1 font-mono text-[0.65rem] text-muted">Host: {circle.host}</p>
              </div>
              <Badge tone={circle.status === "Default vote" ? "warning" : "accent"}>
                {circle.mode}
              </Badge>
            </div>

            <div className="mb-5 flex flex-wrap gap-2">
              <Badge tone="muted">Min rep {circle.minReputation}</Badge>
              <Badge tone={circle.status === "Active" ? "success" : "info"}>{circle.status}</Badge>
              <Badge tone="muted">
                {circle.members}/{circle.memberCap} members
              </Badge>
            </div>

            <div className="mb-6">
              <div className="mb-2 flex justify-between font-mono text-[0.62rem] uppercase tracking-[0.08em] text-muted">
                <span>Capacity</span>
                <span>{circle.progress}% filled</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-white/[0.06]">
                <div
                  className="h-full rounded-full bg-accent"
                  style={{ width: `${circle.progress}%` }}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
              <CircleCardStat label="Contribution" value={circle.contribution} />
              <CircleCardStat label="Pot" value={circle.pot} />
              <CircleCardStat label="Collateral" value={circle.collateral} />
              <CircleCardStat label="Round" value={circle.round} />
            </div>

            <div className="mt-7 border-t border-border pt-5">
              <span className="font-mono text-[0.68rem] text-muted">
                Next: {circle.nextPayout} · deadline {circle.deadline}
              </span>
              <Link
                href={`/circles/${circle.id}`}
                className="mt-5 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-md border border-white/5 bg-white/5 px-4 font-mono text-[0.68rem] font-medium uppercase tracking-[0.08em] text-foreground transition-colors hover:border-white/10 hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {circle.nextAction}
                <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
              </Link>
            </div>
          </Panel>
        ))}
      </div>

      <footer className="mt-20 flex items-center justify-between border-t border-[var(--ink-faint)] pt-12">
        <div className="flex items-center gap-6 font-mono text-[0.65rem] text-muted">
          <span>Marketplace Status: devnet preview</span>
          <span>Settlement: native SOL</span>
        </div>
        <div className="flex items-center gap-3 font-mono text-[0.7rem]">
          <button
            type="button"
            className="flex h-8 w-8 cursor-pointer items-center justify-center rounded bg-white/[0.05] text-muted transition-colors hover:bg-white/10 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            1
          </button>
          <span className="text-muted">of</span>
          <span>1</span>
        </div>
      </footer>
    </AppShell>
  );
}

function FilterChip({ active, children }: { active?: boolean; children: ReactNode }) {
  return (
    <span
      className={
        active
          ? "inline-flex min-h-[30px] items-center rounded-full border border-accent/30 bg-accent/10 px-3 font-mono text-[0.6rem] uppercase tracking-[0.06em] text-accent"
          : "inline-flex min-h-[30px] items-center rounded-full border border-white/[0.08] bg-white/[0.035] px-3 font-mono text-[0.6rem] uppercase tracking-[0.06em] text-muted"
      }
    >
      {children}
    </span>
  );
}

function CircleCardStat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span className="block font-mono text-[0.56rem] uppercase tracking-[0.08em] text-muted">
        {label}
      </span>
      <span className="mt-1 block font-mono text-[0.88rem] font-medium text-foreground">
        {value}
      </span>
    </div>
  );
}
