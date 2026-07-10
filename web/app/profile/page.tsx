import { Award, CircleDollarSign, ListChecks, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { AppPageHeader, AppShell, Panel, StatTile } from "@/components/app/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { circles, contributionHistory, marketListings, profileStats } from "@/lib/app-data";

export default function ProfilePage() {
  return (
    <AppShell title="Profile & Assets">
      <AppPageHeader
        eyebrow="Wallet Reputation"
        title="Reputation, memberships, and position NFTs"
        copy="A wallet-scoped profile for completion/default outcomes, host reputation, vouches, active memberships, and listed position NFTs."
      />

      <Panel className="mb-6 grid grid-cols-1 overflow-hidden md:grid-cols-4">
        <StatTile label="Member reputation" value={profileStats.memberReputation} />
        <StatTile label="Active circles" value={profileStats.activeCircles} />
        <StatTile label="Collateral locked" value={profileStats.collateralLocked} />
        <StatTile label="Vouched stake" value={profileStats.vouchedStake} />
      </Panel>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(22rem,0.8fr)]">
        <div className="space-y-6">
          <Panel className="p-6">
            <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
              <div>
                <div className="mb-3 flex items-center gap-3">
                  <Award className="h-5 w-5 text-accent" aria-hidden="true" />
                  <Badge tone="accent">Silver Tier</Badge>
                </div>
                <div className="flex items-baseline gap-3">
                  <span className="text-5xl font-semibold">{profileStats.memberReputation}</span>
                  <span className="font-mono text-sm text-muted">rep points</span>
                </div>
                <div className="mt-5 max-w-sm">
                  <div className="mb-2 flex justify-between font-mono text-[0.62rem] uppercase tracking-[0.08em] text-muted">
                    <span>Next tier</span>
                    <span>158 pts needed</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-white/[0.06]">
                    <div className="h-full w-[64%] rounded-full bg-accent" />
                  </div>
                </div>
              </div>
              <div className="grid min-w-[15rem] gap-3 border-border md:border-l md:pl-8">
                <ProfileMetric label="Completed" value={profileStats.completedCircles} />
                <ProfileMetric label="Host completions" value={profileStats.hostCompletions} />
                <ProfileMetric label="Volume" value={profileStats.contributionVolume} />
              </div>
            </div>
          </Panel>

          <Panel className="p-6">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-xl font-semibold">My Active Circles</h2>
              <Link
                href="/circles"
                className="font-mono text-[0.65rem] uppercase tracking-[0.08em] text-muted transition-colors hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                Browse more
              </Link>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              {circles.slice(0, 3).map((circle) => (
                <div
                  key={circle.id}
                  className="rounded-lg border border-border bg-white/[0.02] p-4"
                >
                  <div className="mb-4 flex items-start justify-between gap-3">
                    <div>
                      <h3 className="font-medium">{circle.name}</h3>
                      <p className="mt-1 font-mono text-[0.62rem] text-muted">{circle.round}</p>
                    </div>
                    <Badge tone={circle.status === "Active" ? "success" : "muted"}>
                      {circle.status}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between border-t border-border pt-4">
                    <span className="font-mono text-[0.62rem] text-muted">Next action</span>
                    <span className="font-mono text-[0.68rem]">{circle.nextAction}</span>
                  </div>
                </div>
              ))}
            </div>
          </Panel>

          <Panel className="overflow-hidden">
            <div className="border-b border-border px-6 py-4">
              <h2 className="text-xl font-semibold">Contribution History</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[620px] text-left">
                <thead className="border-b border-border bg-white/[0.03]">
                  <tr>
                    <TableHead>Date</TableHead>
                    <TableHead>Circle</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                  </tr>
                </thead>
                <tbody>
                  {contributionHistory.map((row) => (
                    <tr
                      key={`${row.date}-${row.circle}`}
                      className="border-b border-border last:border-b-0"
                    >
                      <td className="px-6 py-4 font-mono text-[0.72rem] text-muted">{row.date}</td>
                      <td className="px-6 py-4 text-sm font-medium">{row.circle}</td>
                      <td className="px-6 py-4 font-mono text-[0.72rem]">{row.amount}</td>
                      <td className="px-6 py-4">
                        <Badge tone="success">{row.status}</Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Panel>
        </div>

        <aside className="space-y-6">
          <Panel className="p-6">
            <div className="mb-4 flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-success" aria-hidden="true" />
              <span className="font-mono text-[0.62rem] uppercase tracking-[0.12em] text-muted">
                Claimable Reputation
              </span>
            </div>
            <p className="text-sm leading-6 text-muted">
              Completion/default outcomes are wallet-scoped and non-replayable. Claim member, host,
              and vouch outcomes after the relevant circle state is finalized.
            </p>
            <Button variant="primary" className="mt-5 w-full">
              Claim Reputation
            </Button>
          </Panel>

          <Panel className="p-6">
            <div className="mb-4 flex items-center gap-2">
              <CircleDollarSign className="h-4 w-4 text-accent" aria-hidden="true" />
              <span className="font-mono text-[0.62rem] uppercase tracking-[0.12em] text-muted">
                Market Listings
              </span>
            </div>
            <div className="space-y-3">
              {marketListings.slice(0, 2).map((listing) => (
                <div
                  key={listing.id}
                  className="rounded-md border border-border bg-white/[0.02] p-3"
                >
                  <div className="mb-2 flex items-start justify-between gap-3">
                    <span className="text-sm font-medium">{listing.circle}</span>
                    <button
                      type="button"
                      className="min-h-8 rounded-md px-2 font-mono text-[0.58rem] uppercase tracking-[0.08em] text-accent transition-colors hover:bg-accent/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      Cancel
                    </button>
                  </div>
                  <div className="flex items-center justify-between font-mono text-[0.68rem] text-muted">
                    <span>{listing.round}</span>
                    <span>{listing.ask}</span>
                  </div>
                </div>
              ))}
            </div>
          </Panel>

          <Panel className="p-6">
            <div className="mb-4 flex items-center gap-2">
              <ListChecks className="h-4 w-4 text-info" aria-hidden="true" />
              <span className="font-mono text-[0.62rem] uppercase tracking-[0.12em] text-muted">
                User Actions
              </span>
            </div>
            <div className="space-y-3">
              <Button variant="secondary" className="w-full">
                Update Member Reputation
              </Button>
              <Button variant="secondary" className="w-full">
                Claim Host Reputation
              </Button>
              <Button variant="secondary" className="w-full">
                Release Vouch
              </Button>
            </div>
          </Panel>
        </aside>
      </div>
    </AppShell>
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

function TableHead({ children }: { children: React.ReactNode }) {
  return (
    <th className="px-6 py-3 font-mono text-[0.6rem] uppercase tracking-[0.1em] text-muted">
      {children}
    </th>
  );
}
