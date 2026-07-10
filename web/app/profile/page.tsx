import { ChevronDown, MoreHorizontal, Plus } from "lucide-react";
import Link from "next/link";
import { AppShell, Panel } from "@/components/app/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { circles, contributionHistory, marketListings, profileStats } from "@/lib/app-data";

type CircleCardData = (typeof circles)[number];
type ListingData = (typeof marketListings)[number];

export default function ProfilePage() {
  return (
    <AppShell title="Profile & Assets">
      <div className="space-y-12">
        <section id="reputation" className="scroll-mt-24 grid grid-cols-1 gap-8 md:grid-cols-3">
          <Panel className="flex flex-col justify-between gap-8 p-8 md:col-span-2 lg:flex-row lg:items-center">
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <span className="font-mono text-[0.65rem] uppercase tracking-widest text-accent">
                  Member Standing
                </span>
                <Badge tone="accent">Silver Tier</Badge>
              </div>
              <div className="flex items-baseline gap-3">
                <h2 className="text-5xl font-semibold">{profileStats.memberReputation}</h2>
                <span className="font-mono text-[0.9rem] text-muted">/ 1000 Rep</span>
              </div>
              <div className="w-full max-w-sm">
                <div className="mb-2 flex justify-between font-mono text-[0.65rem] text-muted">
                  <span>Next Tier: Gold</span>
                  <span>358 pts needed</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-white/[0.06]">
                  <div className="h-full w-[64%] rounded-full bg-accent" />
                </div>
              </div>
            </div>

            <div className="border-border pt-6 lg:border-l lg:pt-0 lg:pl-12">
              <span className="mb-4 block font-mono text-[0.6rem] uppercase text-muted">
                Performance metrics
              </span>
              <div className="space-y-3">
                <ProfileMetric label="On-time rate" value="100%" />
                <ProfileMetric label="Circles Completed" value={profileStats.completedCircles} />
                <ProfileMetric label="Total Volume" value={profileStats.contributionVolume} />
              </div>
            </div>
          </Panel>

          <Panel className="flex flex-col justify-center p-8">
            <span className="mb-4 font-mono text-[0.6rem] uppercase tracking-widest text-muted">
              Insurance Coverage
            </span>
            <div className="mb-2 text-3xl font-medium">{profileStats.collateralLocked}</div>
            <p className="text-[0.75rem] leading-relaxed text-muted">
              Your locked SOL collateral and vouches back active circle obligations.
            </p>
            <Button variant="secondary" className="mt-6 w-full">
              Manage Stake
            </Button>
          </Panel>
        </section>

        <section>
          <div className="mb-8 flex items-baseline justify-between">
            <h2 className="text-xl font-semibold">My Active Circles</h2>
            <Link
              href="/circles"
              className="font-mono text-[0.65rem] text-muted transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              View History →
            </Link>
          </div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {circles.slice(0, 2).map((circle) => (
              <ActiveCircleCard key={circle.id} circle={circle} />
            ))}
            <Link
              href="/circles"
              className="flex min-h-[13rem] flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-border bg-white/[0.01] py-8 transition-colors hover:bg-white/[0.025] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-faint">
                <Plus className="h-4 w-4 text-muted" aria-hidden="true" />
              </span>
              <span className="font-mono text-[0.65rem] uppercase tracking-widest text-muted">
                Join New Circle
              </span>
            </Link>
          </div>
        </section>

        <section id="contributions" className="scroll-mt-24 grid grid-cols-1 gap-12 xl:grid-cols-3">
          <div className="space-y-6 xl:col-span-2">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold">Contribution History</h2>
              <button
                type="button"
                className="inline-flex min-h-9 items-center gap-2 rounded-md border border-white/10 bg-white/5 px-3 font-mono text-[0.65rem] transition-colors hover:bg-white/8 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                All Status
                <ChevronDown className="h-3 w-3" aria-hidden="true" />
              </button>
            </div>

            <Panel className="overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[620px] text-left">
                  <thead className="border-b border-border bg-white/5">
                    <tr>
                      <TableHead>Date</TableHead>
                      <TableHead>Circle</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead align="right">Status</TableHead>
                    </tr>
                  </thead>
                  <tbody>
                    {contributionHistory.map((row) => (
                      <tr
                        key={`${row.date}-${row.circle}`}
                        className="border-b border-border last:border-b-0"
                      >
                        <td className="px-6 py-4 font-mono text-[0.7rem]">{row.date}</td>
                        <td className="px-6 py-4 text-sm font-medium">{row.circle}</td>
                        <td className="px-6 py-4 font-mono text-[0.75rem]">{row.amount}</td>
                        <td className="px-6 py-4 text-right">
                          <StatusBadge>
                            {row.status === "Paid" ? "Success" : row.status}
                          </StatusBadge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Panel>
          </div>

          <div className="space-y-6">
            <h2 className="text-xl font-semibold">Market Listings</h2>
            <div className="space-y-4">
              {marketListings.slice(0, 2).map((listing) => (
                <ProfileListing key={listing.id} listing={listing} />
              ))}
            </div>
          </div>
        </section>
      </div>
    </AppShell>
  );
}

function ActiveCircleCard({ circle }: { circle: CircleCardData }) {
  return (
    <Panel className="p-5">
      <div className="mb-4 flex items-start justify-between">
        <h3 className="text-[0.95rem] font-medium">{circle.name}</h3>
        <button
          type="button"
          aria-label={`Open ${circle.name} actions`}
          className="flex h-10 w-10 items-center justify-center rounded-md text-muted transition-colors hover:bg-white/5 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <MoreHorizontal className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
      <div className="space-y-4">
        <MiniMetric label="Next Payout" value={circle.pot} />
        <MiniMetric label="My Turn" value={circle.nextPayout} />
        <div className="border-t border-border pt-4">
          <div className="flex items-center justify-between gap-4">
            <span className="font-mono text-[0.65rem] text-muted">
              Progress: {circle.progress}%
            </span>
            <StatusBadge>{circle.nextAction}</StatusBadge>
          </div>
        </div>
      </div>
    </Panel>
  );
}

function ProfileListing({ listing }: { listing: ListingData }) {
  return (
    <Panel className="p-4">
      <div className="mb-3 flex items-start justify-between gap-4">
        <div>
          <span className="mb-1 block font-mono text-[0.55rem] uppercase text-muted">
            Selling {listing.round}
          </span>
          <span className="text-sm font-medium">{listing.circle}</span>
        </div>
        <button
          type="button"
          className="min-h-8 px-2 font-mono text-[0.6rem] text-accent transition-colors hover:text-accent-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          Cancel
        </button>
      </div>
      <div className="flex items-end justify-between">
        <div>
          <span className="mb-0.5 block font-mono text-[0.55rem] uppercase text-muted">
            List Price
          </span>
          <span className="font-mono text-[0.85rem]">{listing.ask}</span>
        </div>
        <span className="font-mono text-[0.6rem] text-white/20">ID: {listing.id}</span>
      </div>
    </Panel>
  );
}

function MiniMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between font-mono text-[0.7rem]">
      <span className="text-muted">{label}</span>
      <span>{value}</span>
    </div>
  );
}

function ProfileMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-8 text-sm">
      <span className="text-muted">{label}</span>
      <span className="font-mono">{value}</span>
    </div>
  );
}

function StatusBadge({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex min-h-6 items-center rounded-full border border-success/25 bg-success/12 px-2 font-mono text-[0.58rem] uppercase tracking-[0.08em] text-success">
      {children}
    </span>
  );
}

function TableHead({
  align = "left",
  children,
}: {
  align?: "left" | "right";
  children: React.ReactNode;
}) {
  return (
    <th
      className={
        align === "right"
          ? "px-6 py-3 text-right font-mono text-[0.6rem] uppercase text-muted"
          : "px-6 py-3 font-mono text-[0.6rem] uppercase text-muted"
      }
    >
      {children}
    </th>
  );
}
