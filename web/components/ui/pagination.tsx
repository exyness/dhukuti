"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import type { ButtonHTMLAttributes, ReactNode } from "react";

import { cn } from "@/lib/cn";

const DEFAULT_SIBLING_COUNT = 1;

/*
 * PAGINATION
 *
 * Controlled component — the parent owns page state.
 * Always renders so the pager is visible even for a single page
 * (Prev/Next simply disable at the ends).
 *
 *   <Pagination
 *     currentPage={page}
 *     totalPages={Math.ceil(items.length / pageSize)}
 *     onPageChange={setPage}
 *     summary={<>Showing <Badge>1–10</Badge> of <Badge>42</Badge></>}
 *   />
 */

export type PaginationProps = {
  /** 1-based current page. */
  currentPage: number;
  /** Total number of pages. */
  totalPages: number;
  /** Called with the new 1-based page number. */
  onPageChange: (page: number) => void;
  /** Optional summary node, typically shown on the left (e.g. range + total). */
  summary?: ReactNode;
  /** Sibling pages shown on each side of the current page. Defaults to 1. */
  siblingCount?: number;
  className?: string;
};

function buildPageList(current: number, total: number, siblings: number): (number | "ellipsis")[] {
  // Total slots we want to render before and after the current page.
  // 2*siblings for siblings, +2 for first/last, +2 for ellipses.
  const totalSlots = 2 * siblings + 5;

  // If everything fits, just return 1..total.
  if (total <= totalSlots) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }

  const left = current - siblings;
  const right = current + siblings;
  const showLeftEllipsis = left > 2;
  const showRightEllipsis = right < total - 1;

  const pages: (number | "ellipsis")[] = [];

  // First page (always shown unless we're already in the leading window).
  pages.push(1);

  if (showLeftEllipsis) {
    pages.push("ellipsis");
    for (let i = left; i <= right; i++) pages.push(i);
  } else {
    for (let i = 2; i <= right; i++) pages.push(i);
  }

  if (showRightEllipsis) {
    pages.push("ellipsis");
  } else {
    for (let i = right + 1; i < total; i++) pages.push(i);
  }

  // Last page (always shown unless we're already in the trailing window).
  pages.push(total);

  return pages;
}

export function Pagination({
  currentPage,
  totalPages,
  onPageChange,
  summary,
  siblingCount = DEFAULT_SIBLING_COUNT,
  className,
}: PaginationProps) {
  const pages = buildPageList(currentPage, totalPages, siblingCount);
  const canPrev = currentPage > 1;
  const canNext = currentPage < totalPages;
  // Counter used to give ellipsis items stable, position-independent keys
  // (avoids the noArrayIndexKey lint warning).
  let ellipsisCount = 0;

  return (
    <nav
      aria-label="Pagination"
      className={cn(
        "flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between",
        className,
      )}
    >
      <div className="font-mono text-[0.68rem] uppercase tracking-[0.08em] text-muted">
        {summary ?? <span aria-hidden="true" />}
      </div>

      <ul className="flex flex-wrap items-center gap-1">
        <li>
          <PageButton
            onClick={() => onPageChange(currentPage - 1)}
            disabled={!canPrev}
            aria-label="Previous page"
          >
            <ChevronLeft className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Prev</span>
          </PageButton>
        </li>

        {pages.map((p) =>
          p === "ellipsis" ? (
            <li
              key={`ellipsis-${++ellipsisCount}`}
              aria-hidden="true"
              className="inline-flex h-8 min-w-8 select-none items-center justify-center px-1 font-mono text-[0.68rem] text-muted/60"
            >
              …
            </li>
          ) : (
            <li key={p}>
              <PageButton
                onClick={() => onPageChange(p)}
                active={p === currentPage}
                aria-current={p === currentPage ? "page" : undefined}
                aria-label={`Page ${p}`}
              >
                {p}
              </PageButton>
            </li>
          ),
        )}

        <li>
          <PageButton
            onClick={() => onPageChange(currentPage + 1)}
            disabled={!canNext}
            aria-label="Next page"
          >
            <span>Next</span>
            <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
          </PageButton>
        </li>
      </ul>
    </nav>
  );
}

/*
 * PageButton
 *
 * Two visual states: active (current page) and idle.
 * Hover/focus use the same accent ring as the rest of the system.
 */

type PageButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  active?: boolean;
};

function PageButton({ children, active = false, className, ...buttonProps }: PageButtonProps) {
  return (
    <button
      type="button"
      className={cn(
        "inline-flex h-8 min-w-8 items-center justify-center gap-1.5 rounded-md border px-2.5 font-mono text-[0.68rem] uppercase tracking-[0.06em] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        active
          ? "border-accent/40 bg-accent/15 text-accent"
          : "border-border bg-white/[0.025] text-muted hover:border-accent/25 hover:text-foreground",
        "disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-border disabled:hover:text-muted",
        className,
      )}
      {...buttonProps}
    >
      {children}
    </button>
  );
}
