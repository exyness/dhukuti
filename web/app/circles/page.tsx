"use client";

import { Plus, Search } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { AppShell, Panel, StatTile, TokenScopeNotice } from "@/components/app/app-shell";
import { Badge, BadgeButton } from "@/components/ui/badge";
import { DropdownSelect } from "@/components/ui/dropdown-select";
import { useCirclesQuery } from "@/lib/data/queries";
import type { CircleSummary } from "@/lib/data/types";

type ContributionFilter = "all" | "gt-5" | "lt-1" | "one-five";
type ModeFilter = "all" | "dutch" | "fixed";
type SortMode = "newest" | "pot-high" | "rep-low";

const modeOptions: { label: string; value: ModeFilter }[] = [
  { label: "Payout Mode: All", value: "all" },
  { label: "Fixed Rotation", value: "fixed" },
  { label: "Dutch Bid", value: "dutch" },
];

const contributionOptions: { label: string; value: ContributionFilter }[] = [
  { label: "Contribution: All", value: "all" },
  { label: "< 1 SOL", value: "lt-1" },
  { label: "1 - 5 SOL", value: "one-five" },
  { label: "5+ SOL", value: "gt-5" },
];

const sortOptions: { label: string; value: SortMode }[] = [
  { label: "Sort: Newest", value: "newest" },
  { label: "Pot: High First", value: "pot-high" },
  { label: "Rep: Low First", value: "rep-low" },
];

export default function CirclesPage() {
  const [contributionFilter, setContributionFilter] = useState<ContributionFilter>("all");
  const [memberRangeOnly, setMemberRangeOnly] = useState(true);
  const [modeFilter, setModeFilter] = useState<ModeFilter>("all");
  const [query, setQuery] = useState("");
  const [solOnly, setSolOnly] = useState(true);
  const [sortMode, setSortMode] = useState<SortMode>("newest");
  const { data, error, isLoading } = useCirclesQuery();
  const circles = useMemo(() => data ?? [], [data]);

  const openCircles = circles.filter((circle) => circle.status === "Forming").length;
  const activeCircles = circles.filter((circle) => circle.status === "Active").length;
  const filteredCircles = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return circles
      .filter((circle) => {
        const contribution = parseSol(circle.contribution);
        const matchesQuery =
          !normalizedQuery ||
          circle.name.toLowerCase().includes(normalizedQuery) ||
          circle.creator.toLowerCase().includes(normalizedQuery) ||
          circle.mode.toLowerCase().includes(normalizedQuery);
        const matchesMode =
          modeFilter === "all" ||
          (modeFilter === "fixed" && circle.mode === "Fixed order") ||
          (modeFilter === "dutch" && circle.mode === "Dutch bid");
        const matchesContribution =
          contributionFilter === "all" ||
          (contributionFilter === "lt-1" && contribution < 1) ||
          (contributionFilter === "one-five" && contribution >= 1 && contribution <= 5) ||
          (contributionFilter === "gt-5" && contribution > 5);
        const matchesMemberRange = !memberRangeOnly || circle.memberCap <= 64;

        return matchesQuery && matchesMode && matchesContribution && matchesMemberRange;
      })
      .sort((a, b) => {
        if (sortMode === "pot-high") {
          return parseSol(b.pot) - parseSol(a.pot);
        }

        if (sortMode === "rep-low") {
          return a.minReputation - b.minReputation;
        }

        return 0;
      });
  }, [circles, contributionFilter, memberRangeOnly, modeFilter, query, sortMode]);

  return (
    <AppShell title="Browse Circles" contentClassName="max-w-none px-6 py-10 md:px-12">
      <header className="mb-12 flex flex-col justify-between gap-6 md:flex-row md:items-end">
        <div>
          <span className="mb-2 block font-mono text-[0.68rem] uppercase tracking-widest text-accent">
            Marketplace
          </span>
          <h2 className="text-3xl font-semibold tracking-tight">Open Saving Circles</h2>
        </div>

        <div className="flex flex-col gap-3 md:items-end">
          <Link
            href="/circles/new"
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-accent px-4 font-mono text-[0.68rem] font-medium uppercase tracking-[0.08em] text-background transition-colors hover:bg-accent-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Plus className="h-3.5 w-3.5" aria-hidden="true" />
            Create circle
          </Link>
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
                className="search-input"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />
            </label>
            <DropdownSelect
              label="Payout mode"
              options={modeOptions}
              value={modeFilter}
              onChange={setModeFilter}
            />
            <DropdownSelect
              label="Contribution range"
              options={contributionOptions}
              value={contributionFilter}
              onChange={setContributionFilter}
            />
            <DropdownSelect
              label="Sort listings"
              options={sortOptions}
              value={sortMode}
              onChange={setSortMode}
            />
          </div>
        </div>
      </header>

      <TokenScopeNotice className="mb-6" />

      <Panel className="mb-4 grid grid-cols-1 overflow-hidden md:grid-cols-4">
        <StatTile label="Open circles" value={String(openCircles)} />
        <StatTile label="Active circles" value={String(activeCircles)} />
        <StatTile label="Settlement" value="SOL only" />
        <StatTile label="Payout modes" value="Fixed + Dutch" />
      </Panel>

      <div className="mb-8 flex flex-wrap items-center gap-2">
        <BadgeButton
          tone={modeFilter === "fixed" ? "filterActive" : "filter"}
          shape="pill"
          size="xs"
          aria-pressed={modeFilter === "fixed"}
          onClick={() => setModeFilter((current) => (current === "fixed" ? "all" : "fixed"))}
        >
          Fixed order
        </BadgeButton>
        <BadgeButton
          tone={modeFilter === "dutch" ? "filterActive" : "filter"}
          shape="pill"
          size="xs"
          aria-pressed={modeFilter === "dutch"}
          onClick={() => setModeFilter((current) => (current === "dutch" ? "all" : "dutch"))}
        >
          Dutch bid
        </BadgeButton>
        <BadgeButton
          tone={solOnly ? "filterActive" : "filter"}
          shape="pill"
          size="xs"
          aria-pressed={solOnly}
          onClick={() => setSolOnly((current) => !current)}
        >
          Native SOL
        </BadgeButton>
        <BadgeButton
          tone={memberRangeOnly ? "filterActive" : "filter"}
          shape="pill"
          size="xs"
          aria-pressed={memberRangeOnly}
          onClick={() => setMemberRangeOnly((current) => !current)}
        >
          2-64 members
        </BadgeButton>
      </div>

      {error ? <StatePanel message={error.message} title="Unable to load circles" /> : null}
      {isLoading ? (
        <StatePanel message="Loading available circles." title="Loading circles" />
      ) : null}
      {!isLoading && !error && filteredCircles.length === 0 ? (
        <StatePanel
          message="Create a circle to get started, or check back when new circles are available."
          title="No circles yet"
        />
      ) : null}

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
        {filteredCircles.map((circle) => (
          <CircleCard key={circle.id} circle={circle} />
        ))}
        <Link
          href="/circles/new"
          className="flex min-h-[21rem] flex-col items-center justify-center rounded-lg border border-dashed border-border bg-white/[0.02] p-6 text-left no-underline transition-[border-color,background,transform] duration-150 ease-out hover:-translate-y-0.5 hover:border-accent/30 hover:bg-white/[0.04] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-white/5">
            <Plus className="h-6 w-6 text-white/40" aria-hidden="true" />
          </div>
          <h3 className="mb-1 font-medium text-white/60">Create New Circle</h3>
          <p className="px-6 text-center font-mono text-[0.6rem] text-white/30">
            Host your own pool and earn reputation for coordination.
          </p>
        </Link>
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

function parseSol(value: string) {
  return Number.parseFloat(value.replace(/[^\d.]/g, "")) || 0;
}

function CircleCard({ circle }: { circle: CircleSummary }) {
  return (
    <Panel className="p-6 transition-[border-color,background,transform] duration-150 ease-out hover:-translate-y-0.5 hover:border-accent/30 hover:bg-white/[0.04]">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold tracking-tight">{circle.name}</h3>
          <p className="mt-1 font-mono text-[0.65rem] text-muted">Host: {circle.creator}</p>
        </div>
        <Badge tone={circle.mode === "Fixed order" ? "fixed" : "accent"} shape="square" size="xs">
          {circle.mode === "Fixed order" ? "Fixed" : "Dutch"}
        </Badge>
      </div>

      <div className="mb-6 flex flex-wrap gap-2">
        <Badge tone="rep" shape="square" size="xs">
          Min Rep: {circle.minReputation}
        </Badge>
        <Badge tone="muted" shape="square" size="xs">
          {circle.members}/{circle.memberCap} Slots
        </Badge>
      </div>

      <div className="mb-6">
        <div className="mb-2 flex justify-between font-mono text-[0.62rem] uppercase tracking-[0.08em] text-muted">
          <span>Capacity</span>
          <span>{circle.progress}% filled</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-white/[0.06]">
          <div className="h-full rounded-full bg-accent" style={{ width: `${circle.progress}%` }} />
        </div>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-4 border-t border-border pt-5">
        <CircleCardStat label={`${circle.cycle} Contribution`} value={circle.contribution} />
        <CircleCardStat label="Projected Pot" value={circle.pot} />
        <CircleCardStat label="Round" value={circle.round} />
        <CircleCardStat label="Deadline" value={circle.deadline} />
      </div>

      <Link
        href={`/circles/${circle.id}`}
        className="mt-8 inline-flex min-h-11 w-full items-center justify-center rounded-md border border-white/5 bg-white/5 px-4 font-mono text-[0.7rem] font-medium uppercase tracking-wider text-foreground transition-colors hover:border-white/10 hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        {circle.nextAction}
      </Link>
    </Panel>
  );
}

function StatePanel({ message, title }: { message: string; title: string }) {
  return (
    <Panel className="mb-6 p-6">
      <h3 className="font-medium text-foreground">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-muted">{message}</p>
    </Panel>
  );
}

function CircleCardStat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span className="block font-mono text-[0.56rem] uppercase tracking-[0.08em] text-muted">
        {label}
      </span>
      <span className="mt-1 block text-[1rem] font-medium text-foreground">{value}</span>
    </div>
  );
}
