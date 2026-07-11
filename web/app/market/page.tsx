"use client";

import {
  ChevronLeft,
  ChevronRight,
  Filter,
  ListPlus,
  ShieldAlert,
  ShieldCheck,
  ShoppingCart,
} from "lucide-react";
import { AppShell, Panel } from "@/components/app/app-shell";
import { Button } from "@/components/ui/button";
import { useMarketListingsQuery } from "@/lib/data/queries";
import type { MarketListing } from "@/lib/data/types";

export default function MarketPage() {
  const { data, error, isLoading } = useMarketListingsQuery();
  const marketListings = data ?? [];

  return (
    <AppShell title="Secondary Market">
      <div className="space-y-10">
        <section>
          <Panel className="flex flex-col gap-6 border-accent/20 bg-accent/8 p-6 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-[1.1rem] font-semibold">Liquidate your position</h2>
              <p className="mt-1 max-w-2xl text-[0.85rem] leading-6 text-muted">
                Need immediate capital? List your future payout round for other participants to buy.
              </p>
            </div>
            <Button variant="primary" className="w-full md:w-auto">
              List New Position
              <ListPlus className="h-3.5 w-3.5" aria-hidden="true" />
            </Button>
          </Panel>
        </section>

        <section>
          <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex gap-4 overflow-x-auto">
              <MarketTab active>Active Listings</MarketTab>
              <MarketTab>Your Listings</MarketTab>
              <MarketTab>History</MarketTab>
            </div>
            <div className="flex items-center gap-2">
              <Filter className="h-3.5 w-3.5 text-muted" aria-hidden="true" />
              <span className="font-mono text-[0.65rem] uppercase text-muted">
                Sort: Most Discounted
              </span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] border-separate border-spacing-0 text-left">
              <thead>
                <tr>
                  <TableHead>Circle / Round</TableHead>
                  <TableHead>Value (SOL)</TableHead>
                  <TableHead>Discount</TableHead>
                  <TableHead>Seller Rep</TableHead>
                  <TableHead>Asking Price</TableHead>
                  <TableHead>Action</TableHead>
                </tr>
              </thead>
              <tbody>
                {marketListings.map((listing) => (
                  <MarketRow key={listing.id} listing={listing} />
                ))}
              </tbody>
            </table>
          </div>

          {error ? (
            <StatePanel message={error.message} title="Unable to load indexed listings" />
          ) : null}
          {isLoading ? (
            <StatePanel message="Fetching Supabase read models." title="Loading listings" />
          ) : null}
          {!isLoading && !error && marketListings.length === 0 ? (
            <StatePanel
              message="No active position listings have been indexed yet."
              title="No indexed listings"
            />
          ) : null}

          <div className="mt-10 flex flex-col gap-4 border-t border-border pt-10 md:flex-row md:items-center md:justify-between">
            <p className="font-mono text-[0.62rem] uppercase tracking-widest text-muted">
              Showing {marketListings.length} active listings
            </p>
            <div className="flex gap-2">
              <PageButton label="Previous page">
                <ChevronLeft className="h-4 w-4" aria-hidden="true" />
              </PageButton>
              <PageButton active label="Page 1">
                1
              </PageButton>
              <PageButton label="Next page">
                <ChevronRight className="h-4 w-4" aria-hidden="true" />
              </PageButton>
            </div>
          </div>
        </section>
      </div>
    </AppShell>
  );
}

function MarketRow({ listing }: { listing: MarketListing }) {
  return (
    <tr className="group transition-colors hover:bg-white/[0.02]">
      <td className="border-b border-border px-4 py-5">
        <div>
          <p className="text-[0.88rem] font-medium">{listing.circle}</p>
          <p className="mt-1 font-mono text-[0.62rem] text-muted">{listing.round}</p>
        </div>
      </td>
      <td className="border-b border-border px-4 py-5 font-mono text-[0.88rem]">
        {stripSol(listing.value)}
      </td>
      <td className="border-b border-border px-4 py-5">
        <span className="font-mono text-[0.88rem] text-success">-{listing.discount}</span>
      </td>
      <td className="border-b border-border px-4 py-5">
        <RepPill value={listing.sellerRep} />
      </td>
      <td className="border-b border-border px-4 py-5">
        <div>
          <p className="font-mono text-[0.88rem]">{listing.ask}</p>
          <p className="mt-1 text-[0.62rem] text-muted">Escrowed listing {listing.id}</p>
        </div>
      </td>
      <td className="border-b border-border px-4 py-5">
        <Button variant="primary" size="sm">
          Buy Position
          <ShoppingCart className="h-3.5 w-3.5" aria-hidden="true" />
        </Button>
      </td>
    </tr>
  );
}

function RepPill({ value }: { value: number }) {
  const trusted = value >= 600;
  const Icon = trusted ? ShieldCheck : ShieldAlert;

  return (
    <div className="inline-flex min-h-8 items-center gap-1.5 rounded-full border border-border bg-white/[0.04] px-3 font-mono text-[0.7rem]">
      <Icon
        className={trusted ? "h-3 w-3 text-success" : "h-3 w-3 text-accent"}
        aria-hidden="true"
      />
      <span>{value}</span>
    </div>
  );
}

function StatePanel({ message, title }: { message: string; title: string }) {
  return (
    <Panel className="mt-6 p-6">
      <h3 className="font-medium text-foreground">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-muted">{message}</p>
    </Panel>
  );
}

function MarketTab({ active, children }: { active?: boolean; children: React.ReactNode }) {
  return (
    <button
      type="button"
      className={
        active
          ? "min-h-10 border-accent border-b-2 px-3 py-1.5 font-mono text-[0.62rem] uppercase tracking-widest text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          : "min-h-10 px-3 py-1.5 font-mono text-[0.62rem] uppercase tracking-widest text-muted transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      }
    >
      {children}
    </button>
  );
}

function PageButton({
  active,
  children,
  label,
}: {
  active?: boolean;
  children: React.ReactNode;
  label: string;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      className={
        active
          ? "flex h-8 w-8 items-center justify-center rounded border border-white/10 bg-white/5 font-mono text-sm text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          : "flex h-8 w-8 items-center justify-center rounded border border-white/5 font-mono text-sm text-muted transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      }
    >
      {children}
    </button>
  );
}

function TableHead({ children }: { children: React.ReactNode }) {
  return (
    <th className="border-b border-border px-4 py-3 font-mono text-[0.62rem] uppercase tracking-[0.1em] text-muted">
      {children}
    </th>
  );
}

function stripSol(value: string) {
  return value.replace(" SOL", "");
}
