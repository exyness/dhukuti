"use client";

import { ArrowRight, History, Plus } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { AppShell, Panel } from "@/components/app/app-shell";
import { Badge } from "@/components/ui/badge";
import { useProfileQuery } from "@/lib/data/queries";
import type { CircleSummary, MarketListing, ProfileData } from "@/lib/data/types";
import { useWalletIdentity } from "@/lib/use-wallet-identity";

type CircleCardData = CircleSummary;
type ListingData = MarketListing;

const emptyProfile: ProfileData = {
  activeCircles: [],
  circleHistory: [],
  hostedCircles: [],
  listings: [],
  positions: [],
  stats: {
    activeCircles: "0",
    collateralLocked: "0 SOL",
    completedCircles: "0",
    contributionVolume: "0 SOL",
    defaultedCircles: "0",
    discountTier: "0",
    hostedCircles: "0",
    hostCompletions: "0",
    memberReputation: "0",
    vouchesMade: "0",
    vouchedStake: "0 SOL",
  },
  wallet: null,
};

export default function ProfilePage() {
  const { address } = useWalletIdentity();
  const wallet = address ?? null;
  const { data, error, isLoading } = useProfileQuery(wallet);
  const profile = data ?? emptyProfile;
  const profileStats = profile.stats;
  const reputationScore = Number.parseInt(profileStats.memberReputation, 10) || 0;
  const reputationProgress = getReputationProgress(reputationScore);

  return (
    <AppShell title="Profile & Assets" contentClassName="!max-w-none px-6 py-10 md:px-12">
      <div className="space-y-12">
        {!wallet ? (
          <StatePanel
            message="Connect a wallet to load indexed memberships, activity, and reputation."
            title="Wallet required"
          />
        ) : null}
        {error ? <StatePanel message={error.message} title="Unable to load profile" /> : null}
        {isLoading ? (
          <StatePanel
            message="Loading your circle positions and standing."
            title="Loading profile"
          />
        ) : null}

        <section id="reputation" className="scroll-mt-24 grid grid-cols-1 gap-8 md:grid-cols-3">
          <Panel className="flex flex-col justify-between gap-8 p-8 md:col-span-2 lg:flex-row lg:items-center">
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <span className="font-mono text-[0.65rem] uppercase tracking-widest text-accent">
                  Member Standing
                </span>
                <Badge tone="accent">Indexed</Badge>
              </div>
              <div className="flex items-baseline gap-3">
                <h2 className="text-5xl font-semibold">{profileStats.memberReputation}</h2>
                <span className="font-mono text-[0.9rem] text-muted">Rep</span>
              </div>
              <div className="w-full max-w-sm">
                <div className="mb-2 flex justify-between font-mono text-[0.65rem] text-muted">
                  <span>Verified from your circle outcomes</span>
                  <span>{reputationProgress.percent}%</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-white/[0.06]">
                  <div
                    className="h-full rounded-full bg-accent"
                    style={{ width: `${reputationProgress.percent}%` }}
                  />
                </div>
              </div>
            </div>

            <div className="border-border pt-6 lg:border-l lg:pt-0 lg:pl-12">
              <span className="mb-4 block font-mono text-[0.6rem] uppercase text-muted">
                Performance metrics
              </span>
              <div className="space-y-3">
                <ProfileMetric label="Discount tier" value={`Tier ${profileStats.discountTier}`} />
                <ProfileMetric label="Circles Completed" value={profileStats.completedCircles} />
                <ProfileMetric label="Hosted circles" value={profileStats.hostedCircles} />
                <ProfileMetric label="Host completions" value={profileStats.hostCompletions} />
                <ProfileMetric label="Defaults" value={profileStats.defaultedCircles} />
                <ProfileMetric label="Vouches made" value={profileStats.vouchesMade} />
              </div>
            </div>
          </Panel>

          <Panel className="flex flex-col justify-center p-8">
            <span className="mb-4 font-mono text-[0.6rem] uppercase tracking-widest text-muted">
              Insurance Coverage
            </span>
            <div className="mb-2 font-mono text-3xl font-medium tabular-nums">
              {profileStats.collateralLocked}
            </div>
            <p className="text-[0.75rem] leading-relaxed text-muted">
              Your locked SOL collateral and vouches back active circle obligations.
            </p>
            <Link
              href="/circles"
              className="mt-6 inline-flex min-h-11 items-center justify-center rounded-md border border-white/10 bg-white/[0.04] px-4 font-mono text-[0.68rem] uppercase tracking-[0.08em] text-foreground transition-colors hover:bg-white/[0.08] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              View active obligations
            </Link>
          </Panel>
        </section>

        <section id="circles" className="scroll-mt-24">
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
            {profile.activeCircles.slice(0, 2).map((circle) => (
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
            {profile.activeCircles.length === 0 ? (
              <Panel className="flex min-h-[13rem] flex-col justify-center p-6 md:col-span-2">
                <h3 className="font-medium">No active circles yet</h3>
                <p className="mt-2 text-sm leading-6 text-muted">
                  Join a forming circle to reserve a payout position and see your round obligations
                  here.
                </p>
              </Panel>
            ) : null}
          </div>
        </section>

        <section id="hosted-circles" className="scroll-mt-24">
          <div className="mb-6 flex items-baseline justify-between gap-4">
            <div>
              <span className="font-mono text-[0.62rem] uppercase tracking-[0.1em] text-accent">
                Hosted circles
              </span>
              <h2 className="mt-2 text-xl font-semibold">Circles created by this wallet</h2>
            </div>
            <Link
              href="/circles/new"
              className="font-mono text-[0.65rem] uppercase tracking-[0.08em] text-muted transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              Create circle →
            </Link>
          </div>
          {profile.hostedCircles.length === 0 ? (
            <Panel className="flex min-h-36 flex-col justify-center p-6">
              <h3 className="font-medium">No hosted circles yet</h3>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">
                Created circles will appear here after the circle-created event is indexed.
              </p>
            </Panel>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {profile.hostedCircles.map((circle) => (
                <HostedCircleCard key={circle.id} circle={circle} />
              ))}
            </div>
          )}
        </section>

        <section id="market-listings" className="scroll-mt-24">
          <div className="mb-6 flex items-baseline justify-between gap-4">
            <div>
              <span className="font-mono text-[0.62rem] uppercase tracking-[0.1em] text-accent">
                Secondary market
              </span>
              <h2 className="mt-2 text-xl font-semibold">My payout listings</h2>
            </div>
            <Link
              href="/market"
              className="font-mono text-[0.65rem] uppercase tracking-[0.08em] text-muted transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              Open market →
            </Link>
          </div>
          {profile.listings.length === 0 ? (
            <Panel className="flex min-h-32 items-center justify-between gap-4 p-6">
              <p className="text-sm leading-6 text-muted">
                No payout positions are listed from this wallet yet.
              </p>
              <Link
                href="/market"
                className="inline-flex min-h-10 shrink-0 items-center rounded-md border border-border px-3 font-mono text-[0.62rem] uppercase tracking-[0.08em] text-accent transition-colors hover:bg-white/[0.04] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                List position
              </Link>
            </Panel>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {profile.listings.slice(0, 3).map((listing) => (
                <ProfileListing key={listing.listing} listing={listing} />
              ))}
            </div>
          )}
        </section>

        <section id="history" className="scroll-mt-24">
          <div className="mb-6 flex items-baseline justify-between gap-4">
            <div>
              <span className="font-mono text-[0.62rem] uppercase tracking-[0.1em] text-accent">
                Circle history
              </span>
              <h2 className="mt-2 text-xl font-semibold">Past positions and settlement claims</h2>
            </div>
            <span className="font-mono text-[0.68rem] tabular-nums text-muted">
              {profile.circleHistory.length} completed
            </span>
          </div>
          {profile.circleHistory.length === 0 ? (
            <Panel className="flex min-h-40 items-center gap-4 p-6">
              <History className="h-5 w-5 text-muted" aria-hidden="true" />
              <p className="text-sm leading-6 text-muted">
                Completed or defaulted positions will appear here. Open a circle to claim any
                available reputation settlement.
              </p>
            </Panel>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {profile.circleHistory.map((circle) => (
                <CircleHistoryCard key={circle.id} circle={circle} />
              ))}
            </div>
          )}
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
        <Link
          href={`/circles/${circle.address}`}
          className="inline-flex min-h-10 items-center font-mono text-[0.62rem] uppercase tracking-[0.08em] text-accent transition-colors hover:text-accent-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          Open
        </Link>
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

function HostedCircleCard({ circle }: { circle: CircleCardData }) {
  return (
    <Panel className="p-5">
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <h3 className="text-[0.95rem] font-medium">{circle.name}</h3>
          <p className="mt-1 font-mono text-[0.62rem] text-muted">
            {circle.members}/{circle.memberCap} members
          </p>
        </div>
        <Badge tone={circle.status === "Completed" ? "success" : "accent"} shape="square" size="xs">
          {circle.status}
        </Badge>
      </div>
      <div className="space-y-3 border-t border-border pt-4">
        <MiniMetric label="Contribution" value={circle.contribution} />
        <MiniMetric label="Payout model" value={circle.mode} />
        <MiniMetric label="Next action" value={circle.nextAction} />
      </div>
      <Link
        href={`/circles/${circle.address}`}
        className="mt-5 inline-flex min-h-10 items-center gap-2 font-mono text-[0.62rem] uppercase tracking-[0.08em] text-accent transition-colors hover:text-accent-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        Open circle
        <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
      </Link>
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
        <Link
          href="/market"
          className="inline-flex min-h-8 items-center px-2 font-mono text-[0.6rem] uppercase tracking-[0.08em] text-accent transition-colors hover:text-accent-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          Manage
        </Link>
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

function CircleHistoryCard({ circle }: { circle: CircleCardData }) {
  return (
    <Panel className="p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="font-medium">{circle.name}</h3>
          <p className="mt-1 font-mono text-[0.62rem] text-muted">{circle.pot} settled</p>
        </div>
        <Badge
          tone={circle.status === "Completed" ? "success" : "warning"}
          shape="square"
          size="xs"
        >
          {circle.status}
        </Badge>
      </div>
      <div className="mt-5 flex items-center justify-between border-t border-border pt-4">
        <span className="font-mono text-[0.62rem] text-muted">{circle.mode}</span>
        <Link
          href={`/circles/${circle.address}`}
          className="inline-flex min-h-9 items-center gap-2 font-mono text-[0.62rem] uppercase tracking-[0.08em] text-accent transition-colors hover:text-accent-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          Review position
          <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
        </Link>
      </div>
    </Panel>
  );
}

function StatePanel({ message, title }: { message: string; title: string }) {
  return (
    <Panel className="p-6">
      <h2 className="font-medium text-foreground">{title}</h2>
      <p className="mt-2 text-sm leading-6 text-muted">{message}</p>
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
      <span className="font-mono tabular-nums">{value}</span>
    </div>
  );
}

function StatusBadge({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex min-h-6 items-center rounded-full border border-success/25 bg-success/12 px-2 font-mono text-[0.58rem] uppercase tracking-[0.08em] text-success">
      {children}
    </span>
  );
}

function getReputationProgress(score: number) {
  if (score >= 10_000) return { percent: 100 };
  if (score >= 5_000) return { percent: Math.round(((score - 5_000) / 5_000) * 100) };
  if (score >= 1_000) return { percent: Math.round(((score - 1_000) / 4_000) * 100) };
  return { percent: Math.round((score / 1_000) * 100) };
}
