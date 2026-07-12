"use client";

import { ArrowRight, ExternalLink, Inbox, RefreshCw, Terminal } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import Link from "next/link";
import { useEffect, useState } from "react";

import { AppPageHeader, AppShell, Panel } from "@/components/app/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Pagination } from "@/components/ui/pagination";
import { cn } from "@/lib/cn";
import { explorerTransactionUrl } from "@/lib/constants";
import { useActivityQuery } from "@/lib/data/queries";
import type { ActivityLogEntry } from "@/lib/data/types";
import { useWalletIdentity } from "@/lib/use-wallet-identity";

/*
 * PAGE CONTENT STORYBOARD
 *
 * Static shell (nav, sidebar) never re-animates.
 *
 *    0ms   page header settles into place
 *  120ms   indexed activity list reveals in sequence
*/
const TIMING = {
  header: 0,
  list: 120,
};

const HEADER_SPRING = { damping: 28, stiffness: 350, type: "spring" as const };
const LIST_SPRING = { damping: 28, stiffness: 340, type: "spring" as const };

const PAGE_SIZE = 10;
const ROW_MIN_HEIGHT = "min-h-[88px]";

export default function ActivityPage() {
  const { address } = useWalletIdentity();
  const activityQuery = useActivityQuery(address);
  const reducedMotion = useReducedMotion();
  const [stage, setStage] = useState(0);
  const [page, setPage] = useState(1);
  const loadStage = reducedMotion ? 2 : stage;
  const activity = activityQuery.data ?? [];

  const totalPages = Math.max(1, Math.ceil(activity.length / PAGE_SIZE));
  // Clamp in case the underlying data shrank and the saved page is out of range.
  const currentPage = Math.min(Math.max(1, page), totalPages);
  const startIndex = (currentPage - 1) * PAGE_SIZE;
  const endIndex = Math.min(startIndex + PAGE_SIZE, activity.length);
  const paged = activity.slice(startIndex, endIndex);
  // If the last page has fewer rows than PAGE_SIZE, pad with empty rows so the
  // table height stays constant across pages (no layout jump on next/prev).
  const fillerCount = Math.max(0, PAGE_SIZE - paged.length);
  // Stable counter for filler row keys (avoids the noArrayIndexKey lint rule).
  // Re-initialized every render, which is fine because the filler rows are
  // also regenerated every render.
  let fillerIndex = 0;

  useEffect(() => {
    if (reducedMotion) return;

    const headerTimer = window.setTimeout(() => setStage(1), TIMING.header);
    const listTimer = window.setTimeout(() => setStage(2), TIMING.list);
    return () => {
      window.clearTimeout(headerTimer);
      window.clearTimeout(listTimer);
    };
  }, [reducedMotion]);

  return (
    <AppShell title="Activity Log" contentClassName="!max-w-none px-6 py-10 md:px-12">
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: loadStage >= 1 ? 1 : 0, y: loadStage >= 1 ? 0 : -12 }}
        transition={reducedMotion ? { duration: 0 } : HEADER_SPRING}
      >
        <AppPageHeader
          eyebrow="Protocol Activity"
          title="Every circle event, in one place."
          copy="This log combines transactions attributed to your wallet with activity from circles where you hold a position."
          actions={
            <Button
              type="button"
              variant="secondary"
              disabled={activityQuery.isFetching}
              onClick={() => void activityQuery.refetch()}
            >
              <RefreshCw
                className={activityQuery.isFetching ? "h-3.5 w-3.5 animate-spin" : "h-3.5 w-3.5"}
                aria-hidden="true"
              />
              Refresh log
            </Button>
          }
        />
      </motion.div>

      <motion.section
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: loadStage >= 2 ? 1 : 0, y: loadStage >= 2 ? 0 : 16 }}
        transition={reducedMotion ? { duration: 0 } : LIST_SPRING}
      >
        {activityQuery.isLoading ? <ActivitySkeleton /> : null}
        {activityQuery.error ? (
          <ActivityError error={activityQuery.error} onRetry={() => void activityQuery.refetch()} />
        ) : null}
        {!activityQuery.isLoading && !activityQuery.error && activity.length === 0 ? (
          <ActivityEmpty />
        ) : null}
        {!activityQuery.isLoading && !activityQuery.error && activity.length > 0 ? (
          <Panel className="overflow-hidden">
            <div className="sm:overflow-x-auto">
              <table className="block w-full border-collapse text-left sm:table sm:min-w-[640px]">
                <caption className="sr-only">
                  Circle activity log, most recent first. Columns: activity, circle, time, and
                  on-chain transaction link.
                </caption>
                <thead className="hidden sm:table-header-group">
                  <tr className="border-b border-border bg-white/[0.02]">
                    <th
                      scope="col"
                      className="w-[55%] px-5 py-3 text-left font-mono text-[0.62rem] uppercase tracking-[0.1em] text-muted"
                    >
                      Activity
                    </th>
                    <th
                      scope="col"
                      className="px-5 py-3 text-left font-mono text-[0.62rem] uppercase tracking-[0.1em] text-muted"
                    >
                      Circle
                    </th>
                    <th
                      scope="col"
                      className="px-5 py-3 text-left font-mono text-[0.62rem] uppercase tracking-[0.1em] text-muted"
                    >
                      Time
                    </th>
                    <th
                      scope="col"
                      className="px-5 py-3 text-right font-mono text-[0.62rem] uppercase tracking-[0.1em] text-muted"
                    >
                      Tx
                    </th>
                  </tr>
                </thead>
                <tbody className="block divide-y divide-border sm:table-row-group">
                  {paged.map((entry, index) => (
                    <ActivityRow
                      key={entry.id}
                      entry={entry}
                      index={index}
                      loadStage={loadStage}
                      reducedMotion={!!reducedMotion}
                    />
                  ))}
                  {Array.from({ length: fillerCount }).map(() => (
                    <FillerRow key={`filler-${++fillerIndex}`} />
                  ))}
                </tbody>
              </table>
            </div>

            <div className="border-t border-border bg-white/[0.025] px-5 py-4">
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={setPage}
                summary={
                  <span className="inline-flex flex-wrap items-center gap-2">
                    <span>Showing</span>
                    <Badge tone="muted" shape="square" size="xs">
                      {startIndex + 1}–{endIndex}
                    </Badge>
                    <span>of</span>
                    <Badge tone="accent" shape="square" size="xs">
                      {activity.length} events
                    </Badge>
                  </span>
                }
              />
            </div>
          </Panel>
        ) : null}
      </motion.section>
    </AppShell>
  );
}

function ActivityRow({
  entry,
  index,
  loadStage,
  reducedMotion,
}: {
  entry: ActivityLogEntry;
  index: number;
  loadStage: number;
  reducedMotion: boolean;
}) {
  return (
    <motion.tr
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: loadStage >= 2 ? 1 : 0, y: loadStage >= 2 ? 0 : 8 }}
      transition={
        reducedMotion ? { duration: 0 } : { ...LIST_SPRING, delay: Math.min(index, 9) * 0.03 }
      }
      className={cn(
        // Mobile: stack as a card.
        "block p-4",
        // Desktop (sm+): real table row.
        "sm:table-row sm:p-0",
        ROW_MIN_HEIGHT,
        "align-top transition-colors hover:bg-white/[0.025]",
      )}
    >
      <td className="block pb-3 sm:table-cell sm:px-5 sm:py-5 sm:pb-5">
        <div className="flex min-w-0 gap-3">
          <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-accent/20 bg-accent/10 text-accent">
            <Terminal className="h-4 w-4" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-sm font-medium text-foreground">{entry.action}</p>
              <Badge tone="muted" shape="square" size="xs">
                {entry.eventName.replace(/Event$/, "")}
              </Badge>
            </div>
            <p className="mt-1 text-sm leading-6 text-muted">{entry.detail}</p>
          </div>
        </div>
      </td>
      <td className="block px-0 py-1.5 sm:table-cell sm:px-5 sm:py-5 sm:align-middle">
        <span className="mb-1 block font-mono text-[0.6rem] uppercase tracking-[0.1em] text-muted sm:hidden">
          Circle
        </span>
        {entry.circle && entry.circleLabel ? (
          <Link
            href={`/circles/${entry.circle}`}
            className="inline-flex font-mono text-[0.62rem] uppercase tracking-[0.08em] text-accent transition-colors hover:text-accent-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {entry.circleLabel}
          </Link>
        ) : (
          <span className="font-mono text-[0.62rem] uppercase tracking-[0.08em] text-muted/60">
            —
          </span>
        )}
      </td>
      <td className="block px-0 py-1.5 sm:table-cell sm:px-5 sm:py-5 sm:align-middle">
        <span className="mb-1 block font-mono text-[0.6rem] uppercase tracking-[0.1em] text-muted sm:hidden">
          Time
        </span>
        <span className="font-mono text-[0.68rem] tabular-nums text-muted">
          {formatActivityTime(entry.occurredAt)}
        </span>
      </td>
      <td className="block px-0 py-1.5 sm:table-cell sm:px-5 sm:py-5 sm:align-middle sm:text-right">
        <span className="mb-1 block font-mono text-[0.6rem] uppercase tracking-[0.1em] text-muted sm:hidden">
          Tx
        </span>
        <a
          href={explorerTransactionUrl(entry.signature)}
          target="_blank"
          rel="noreferrer"
          className="inline-flex min-h-10 items-center justify-start gap-2 font-mono text-[0.64rem] uppercase tracking-[0.08em] text-muted transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:justify-end"
        >
          View tx
          <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
        </a>
      </td>
    </motion.tr>
  );
}

function FillerRow() {
  // Empty placeholder row used to keep the table at a consistent height on
  // short pages (e.g. last page with fewer than PAGE_SIZE records).
  // Hidden on mobile because the card view allows variable heights.
  // Empty cells are skipped by screen readers naturally, so we don't need
  // aria-hidden here (and the lint rule forbids it on table rows anyway).
  return (
    <tr className={cn("hidden sm:table-row", ROW_MIN_HEIGHT, "hover:bg-transparent")}>
      <td className="px-5 py-5" />
      <td className="px-5 py-5" />
      <td className="px-5 py-5" />
      <td className="px-5 py-5" />
    </tr>
  );
}

function ActivitySkeleton() {
  return (
    <Panel className="overflow-hidden" aria-label="Loading activity">
      <div role="status" aria-label="Loading activity rows" className="divide-y divide-border">
        {["one", "two", "three", "four", "five"].map((key) => (
          <div
            key={key}
            className="flex flex-col gap-3 p-4 sm:grid sm:grid-cols-[1fr_8rem_6rem_6rem] sm:items-center sm:gap-4 sm:px-5 sm:py-5"
          >
            <div className="flex gap-3">
              <div className="h-9 w-9 shrink-0 animate-pulse rounded-md bg-white/[0.06]" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-36 animate-pulse rounded bg-white/[0.06]" />
                <div className="h-3 w-3/4 animate-pulse rounded bg-white/[0.04]" />
              </div>
            </div>
            <div className="h-3 w-20 animate-pulse rounded bg-white/[0.06]" />
            <div className="h-3 w-16 animate-pulse rounded bg-white/[0.06]" />
            <div className="h-3 w-16 animate-pulse rounded bg-white/[0.04] sm:justify-self-end" />
          </div>
        ))}
      </div>
    </Panel>
  );
}

function ActivityError({ error, onRetry }: { error: Error; onRetry: () => void }) {
  return (
    <Panel className="border-warning/25 bg-warning/8 p-6">
      <h2 className="font-medium text-foreground">Couldn&apos;t load activity</h2>
      <p className="mt-2 text-sm leading-6 text-muted">{error.message}</p>
      <Button type="button" variant="secondary" className="mt-4" onClick={onRetry}>
        Try again
      </Button>
    </Panel>
  );
}

function ActivityEmpty() {
  return (
    <Panel className="flex min-h-80 flex-col items-center justify-center px-6 py-12 text-center">
      <span className="flex h-12 w-12 items-center justify-center rounded-full border border-accent/20 bg-accent/10 text-accent">
        <Inbox className="h-5 w-5" aria-hidden="true" />
      </span>
      <h2 className="mt-5 text-lg font-medium">No records found</h2>
      <p className="mt-2 max-w-md text-sm leading-6 text-muted">
        Once you create or join a circle, confirmed transactions will appear here.
      </p>
      <Link
        href="/circles"
        className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-md border border-accent/30 bg-accent/10 px-4 font-mono text-[0.68rem] uppercase tracking-[0.08em] text-accent transition-colors hover:bg-accent/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        Explore circles
        <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
      </Link>
    </Panel>
  );
}

function formatActivityTime(value: string | null) {
  if (!value) return "Confirmed";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Confirmed";
  return new Intl.DateTimeFormat("en-US", {
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    month: "short",
  }).format(date);
}
