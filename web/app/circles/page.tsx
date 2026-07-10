import { ArrowRight, Search, SlidersHorizontal } from "lucide-react";
import Link from "next/link";
import {
  AppPageHeader,
  AppShell,
  Panel,
  StatTile,
  TokenScopeNotice,
} from "@/components/app/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { circles } from "@/lib/app-data";

export default function CirclesPage() {
  const openCircles = circles.filter((circle) => circle.status === "Forming").length;
  const activeCircles = circles.filter((circle) => circle.status === "Active").length;

  return (
    <AppShell title="Browse Circles">
      <AppPageHeader
        eyebrow="Marketplace"
        title="Open Dhukuti circles"
        copy="Find SOL-only savings circles backed by collateral, insurance fees, wallet reputation, and transferable position NFTs."
        actions={
          <Link
            href="/circles/new"
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md border border-[rgba(255,196,178,0.42)] bg-[#bf4934] px-5 font-mono text-[0.7rem] font-medium uppercase tracking-[0.08em] text-white transition-[filter,border-color] hover:border-[rgba(255,225,216,0.5)] hover:brightness-[1.01] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            Create Circle
            <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
          </Link>
        }
      />

      <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-4">
        <StatTile label="Open circles" value={String(openCircles)} />
        <StatTile label="Active circles" value={String(activeCircles)} />
        <StatTile label="Settlement" value="SOL only" />
        <StatTile label="Payout modes" value="Fixed + Dutch" />
      </div>

      <div className="mb-8 grid gap-4 lg:grid-cols-[1fr_22rem]">
        <Panel className="p-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-center">
            <label className="relative block flex-1">
              <span className="sr-only">Search circles</span>
              <Search
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted"
                aria-hidden="true"
              />
              <input
                type="search"
                placeholder="Search by circle, host, or mode"
                className="min-h-11 w-full rounded-md border border-border bg-surface/70 pl-10 pr-3 text-sm text-foreground placeholder:text-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </label>
            <label className="sr-only" htmlFor="mode-filter">
              Payout mode
            </label>
            <select
              id="mode-filter"
              className="min-h-11 rounded-md border border-border bg-surface/70 px-3 font-mono text-[0.72rem] text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              defaultValue="all"
            >
              <option value="all">Mode: All supported</option>
              <option value="fixed">Fixed order</option>
              <option value="dutch">Dutch bid</option>
            </select>
            <Button variant="secondary" size="md">
              <SlidersHorizontal className="h-3.5 w-3.5" aria-hidden="true" />
              Filters
            </Button>
          </div>
        </Panel>
        <TokenScopeNotice />
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
        {circles.map((circle) => (
          <Panel key={circle.id} className="p-6 transition-colors hover:border-foreground/20">
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

            <div className="mt-7 flex flex-col gap-3 border-t border-border pt-5 sm:flex-row sm:items-center sm:justify-between">
              <span className="font-mono text-[0.68rem] text-muted">
                Next: {circle.nextPayout} · deadline {circle.deadline}
              </span>
              <Link
                href={`/circles/${circle.id}`}
                className="inline-flex min-h-10 items-center justify-center gap-2 rounded-md border border-border px-4 font-mono text-[0.68rem] font-medium uppercase tracking-[0.08em] text-foreground transition-colors hover:border-accent/40 hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {circle.nextAction}
                <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
              </Link>
            </div>
          </Panel>
        ))}
      </div>
    </AppShell>
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
