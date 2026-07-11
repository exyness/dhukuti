"use client";

import { Activity, ArrowRight, ExternalLink, RefreshCw, Terminal } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { AppPageHeader, AppShell, Panel } from "@/components/app/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { explorerTransactionUrl } from "@/lib/constants";
import { useActivityQuery } from "@/lib/data/queries";
import type { ActivityLogEntry } from "@/lib/data/types";
import { useWalletIdentity } from "@/lib/use-wallet-identity";

/* ─────────────────────────────────────────────────────────
 * PAGE CONTENT STORYBOARD
 *
 * Static shell (nav, sidebar) never re-animates.
 *
 *    0ms   page header settles into place
 *  120ms   indexed activity list reveals in sequence
 * ───────────────────────────────────────────────────────── */
const TIMING = {
  header: 0,
  list: 120,
};

const HEADER_SPRING = { damping: 28, stiffness: 350, type: "spring" as const };
const LIST_SPRING = { damping: 28, stiffness: 340, type: "spring" as const };

export default function ActivityPage() {
  const { address } = useWalletIdentity();
  const activityQuery = useActivityQuery(address);
  const reducedMotion = useReducedMotion();
  const [stage, setStage] = useState(0);
  const loadStage = reducedMotion ? 2 : stage;
  const activity = activityQuery.data ?? [];

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
    <AppShell title="Activity Log" contentClassName="!max-w-6xl">
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
            <div className="flex items-center justify-between border-b border-border bg-white/[0.025] px-5 py-4">
              <div className="flex items-center gap-2">
                <Activity className="h-4 w-4 text-accent" aria-hidden="true" />
                <span className="font-mono text-[0.62rem] uppercase tracking-[0.1em] text-muted">
                  Circle activity
                </span>
              </div>
              <span className="font-mono text-[0.68rem] tabular-nums text-muted">
                {activity.length} shown
              </span>
            </div>
            <ol className="divide-y divide-border">
              {activity.map((entry, index) => (
                <motion.li
                  key={entry.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: loadStage >= 2 ? 1 : 0, y: loadStage >= 2 ? 0 : 8 }}
                  transition={
                    reducedMotion
                      ? { duration: 0 }
                      : { ...LIST_SPRING, delay: Math.min(index, 9) * 0.03 }
                  }
                >
                  <ActivityRow entry={entry} />
                </motion.li>
              ))}
            </ol>
          </Panel>
        ) : null}
      </motion.section>
    </AppShell>
  );
}

function ActivityRow({ entry }: { entry: ActivityLogEntry }) {
  return (
    <div className="grid gap-4 px-5 py-5 md:grid-cols-[minmax(0,1fr)_10rem_8rem] md:items-center">
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
          {entry.circle && entry.circleLabel ? (
            <Link
              href={`/circles/${entry.circle}`}
              className="mt-2 inline-flex font-mono text-[0.62rem] uppercase tracking-[0.08em] text-accent transition-colors hover:text-accent-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {entry.circleLabel}
            </Link>
          ) : null}
        </div>
      </div>
      <span className="font-mono text-[0.68rem] tabular-nums text-muted">
        {formatActivityTime(entry.occurredAt)}
      </span>
      <a
        href={explorerTransactionUrl(entry.signature)}
        target="_blank"
        rel="noreferrer"
        className="inline-flex min-h-10 items-center justify-start gap-2 font-mono text-[0.64rem] uppercase tracking-[0.08em] text-muted transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring md:justify-end"
      >
        View tx
        <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
      </a>
    </div>
  );
}

function ActivitySkeleton() {
  return (
    <Panel className="overflow-hidden" aria-label="Loading activity">
      {["one", "two", "three", "four", "five"].map((key) => (
        <div key={key} className="flex gap-3 border-b border-border px-5 py-5 last:border-b-0">
          <div className="h-9 w-9 animate-pulse rounded-md bg-white/[0.06]" />
          <div className="flex-1 space-y-2">
            <div className="h-4 w-36 animate-pulse rounded bg-white/[0.06]" />
            <div className="h-3 w-3/4 animate-pulse rounded bg-white/[0.04]" />
          </div>
        </div>
      ))}
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
        <Activity className="h-5 w-5" aria-hidden="true" />
      </span>
      <h2 className="mt-5 text-lg font-medium">No activity yet</h2>
      <p className="mt-2 max-w-md text-sm leading-6 text-muted">
        Create or join a circle, then confirmed transactions will appear here shortly.
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
