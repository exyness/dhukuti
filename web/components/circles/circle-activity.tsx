"use client";

import { ExternalLink, Inbox, RefreshCw, Terminal } from "lucide-react";
import { useState } from "react";

import { Panel } from "@/components/app/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Pagination } from "@/components/ui/pagination";
import { explorerTransactionUrl } from "@/lib/constants";
import { useCircleActivityQuery } from "@/lib/data/queries";
import type { ActivityLogEntry } from "@/lib/data/types";

const PAGE_SIZE = 8;

export function CircleActivity({ circleAddress }: { circleAddress: string }) {
  const activityQuery = useCircleActivityQuery(circleAddress);
  const [page, setPage] = useState(1);
  const activity = activityQuery.data ?? [];
  const totalPages = Math.max(1, Math.ceil(activity.length / PAGE_SIZE));
  const currentPage = Math.min(Math.max(1, page), totalPages);
  const startIndex = (currentPage - 1) * PAGE_SIZE;
  const paged = activity.slice(startIndex, startIndex + PAGE_SIZE);
  const endIndex = Math.min(startIndex + PAGE_SIZE, activity.length);

  return (
    <section className="space-y-3" aria-labelledby="circle-activity-heading">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2
            id="circle-activity-heading"
            className="font-mono text-[0.68rem] uppercase tracking-widest text-muted"
          >
            Circle activity
          </h2>
          <p className="mt-2 text-sm leading-6 text-muted">
            Confirmed events indexed for this circle.
          </p>
        </div>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          disabled={activityQuery.isFetching}
          onClick={() => void activityQuery.refetch()}
        >
          <RefreshCw
            className={activityQuery.isFetching ? "h-3.5 w-3.5 animate-spin" : "h-3.5 w-3.5"}
            aria-hidden="true"
          />
          Refresh
        </Button>
      </div>

      {activityQuery.isLoading ? <CircleActivitySkeleton /> : null}
      {activityQuery.error ? (
        <Panel className="border-warning/25 bg-warning/8 p-6" role="alert">
          <h3 className="font-medium text-foreground">Couldn&apos;t load circle activity</h3>
          <p className="mt-2 text-sm leading-6 text-muted">
            {activityQuery.error instanceof Error
              ? activityQuery.error.message
              : "Try again in a moment."}
          </p>
          <Button
            type="button"
            variant="secondary"
            className="mt-4"
            onClick={() => void activityQuery.refetch()}
          >
            Try again
          </Button>
        </Panel>
      ) : null}
      {!activityQuery.isLoading && !activityQuery.error && activity.length === 0 ? (
        <Panel className="flex min-h-48 flex-col items-center justify-center px-6 py-10 text-center">
          <span className="flex h-11 w-11 items-center justify-center rounded-full border border-accent/20 bg-accent/10 text-accent">
            <Inbox className="h-5 w-5" aria-hidden="true" />
          </span>
          <h3 className="mt-4 text-base font-medium">No activity yet</h3>
          <p className="mt-2 max-w-md text-sm leading-6 text-muted">
            Confirmed circle events will appear here after the indexer processes them.
          </p>
        </Panel>
      ) : null}
      {!activityQuery.isLoading && !activityQuery.error && activity.length > 0 ? (
        <Panel className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[620px] border-collapse text-left">
              <caption className="sr-only">
                Circle activity, most recent first. Columns: activity, time, and transaction link.
              </caption>
              <thead>
                <tr className="border-b border-border bg-white/[0.02]">
                  <th className="w-[65%] px-5 py-3 font-mono text-[0.62rem] uppercase tracking-[0.1em] text-muted">
                    Activity
                  </th>
                  <th className="px-5 py-3 font-mono text-[0.62rem] uppercase tracking-[0.1em] text-muted">
                    Time
                  </th>
                  <th className="px-5 py-3 text-right font-mono text-[0.62rem] uppercase tracking-[0.1em] text-muted">
                    Tx
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {paged.map((entry) => (
                  <CircleActivityRow key={entry.id} entry={entry} />
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
    </section>
  );
}

function CircleActivityRow({ entry }: { entry: ActivityLogEntry }) {
  return (
    <tr className="align-top transition-colors hover:bg-white/[0.025]">
      <td className="px-5 py-5">
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
      <td className="whitespace-nowrap px-5 py-5 align-middle font-mono text-[0.68rem] tabular-nums text-muted">
        {formatActivityTime(entry.occurredAt)}
      </td>
      <td className="px-5 py-5 text-right align-middle">
        <a
          href={explorerTransactionUrl(entry.signature)}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-2 font-mono text-[0.64rem] uppercase tracking-[0.08em] text-muted transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          View tx
          <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
        </a>
      </td>
    </tr>
  );
}

function CircleActivitySkeleton() {
  return (
    <Panel className="overflow-hidden" aria-label="Loading circle activity">
      <div
        role="status"
        aria-label="Loading circle activity rows"
        className="divide-y divide-border"
      >
        {["one", "two", "three"].map((key) => (
          <div key={key} className="flex items-center gap-3 p-5">
            <div className="h-9 w-9 shrink-0 animate-pulse rounded-md bg-white/[0.06]" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-40 animate-pulse rounded bg-white/[0.06]" />
              <div className="h-3 w-3/4 animate-pulse rounded bg-white/[0.04]" />
            </div>
            <div className="hidden h-3 w-20 animate-pulse rounded bg-white/[0.06] sm:block" />
          </div>
        ))}
      </div>
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
