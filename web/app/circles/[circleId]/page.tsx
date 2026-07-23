"use client";

import { useQueryClient } from "@tanstack/react-query";
import { AlertCircle, Clock3, ShieldAlert } from "lucide-react";
import { useParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { AppShell, Panel } from "@/components/app/app-shell";
import { CircleMemberAvatar } from "@/components/app/circle-member-avatar";
import { TransactionReviewModal } from "@/components/circles/TransactionReviewModal";
import { CircleActionDesk } from "@/components/program/circle-action-desk";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useCountdown } from "@/components/ui/countdown-timer";
import { cn } from "@/lib/cn";
import { queryKeys, useCircleDetailQuery } from "@/lib/data/queries";
import type { CircleDetail, CircleSummary, DefaultProposal, ProfileData } from "@/lib/data/types";
import { useCirclePrimaryAction } from "@/lib/use-circle-primary-action";
import { useWalletIdentity } from "@/lib/use-wallet-identity";

export default function CircleDetailsPage() {
  const params = useParams<{ circleId: string }>();
  const circleId = decodeURIComponent(params.circleId);
  const { address } = useWalletIdentity();
  const { data, error, isLoading } = useCircleDetailQuery(circleId, address);

  if (!data?.circle) {
    if (isLoading) {
      return (
        <AppShell title="Circle" contentClassName="!max-w-none px-6 py-10 md:px-12">
          <CircleDetailsSkeleton />
        </AppShell>
      );
    }

    return (
      <AppShell title="Circle" contentClassName="!max-w-none px-6 py-10 md:px-12">
        <StatePanel
          message={
            error
              ? "We couldn't load this circle. Try again in a moment."
              : "This circle is not available yet."
          }
          title="Circle unavailable"
        />
      </AppShell>
    );
  }

  return <CircleDetailsInner data={data} />;
}

function CircleDetailsInner({ data }: { data: CircleDetail }) {
  const { address } = useWalletIdentity();
  const currentCircle = data.circle;
  const circleMembers = data.members ?? [];
  const payoutSchedule = data.payoutSchedule ?? [];
  const queryClient = useQueryClient();
  const openSlots =
    currentCircle.status === "Forming"
      ? Math.max(currentCircle.memberCap - circleMembers.length, 0)
      : 0;
  const myMembership = circleMembers.find((member) => member.member === address);
  const activeMembers = circleMembers.filter((member) => member.active);
  const unpaidMembers = activeMembers.filter((member) => member.state !== "Paid");
  const allActiveMembersPaid = activeMembers.length > 0 && unpaidMembers.length === 0;
  const payoutRoundTarget = Math.max(circleMembers.length, currentCircle.members, 1);
  const allPayoutRowsSettled =
    payoutSchedule.length >= payoutRoundTarget &&
    payoutSchedule.every((row) => row.status === "Completed" || row.status === "Auction settled");
  const allRoundsResolved =
    currentCircle.currentRoundIndex >= payoutRoundTarget || allPayoutRowsSettled;
  const [justResolved, setJustResolved] = useState(false);
  const processedClaimReview = useRef("");
  const processedCompleteReview = useRef("");
  const processedResolveReview = useRef("");
  const { localError, primaryAction, reputationGate, transaction } = useCirclePrimaryAction(data, {
    justResolved,
  });

  useEffect(() => {
    const review = transaction.review;
    if (review?.status !== "confirmed" || review.title !== "Join circle" || !address) return;

    queryClient.setQueryData<CircleSummary[]>(queryKeys.circles(address), (circles = []) =>
      circles.map((circle) =>
        circle.address === currentCircle.address
          ? {
              ...circle,
              members: circle.nextAction === "Awaiting start" ? circle.members : circle.members + 1,
              progress:
                circle.memberCap > 0
                  ? Math.round(
                      (Math.min(circle.members + 1, circle.memberCap) / circle.memberCap) * 100,
                    )
                  : circle.progress,
              nextAction: "Awaiting start",
            }
          : circle,
      ),
    );

    queryClient.setQueryData<ProfileData>(queryKeys.profile(address), (profile) => {
      if (!profile) return profile;
      return {
        ...profile,
        activeCircles: profile.activeCircles.map((circle) =>
          circle.address === currentCircle.address
            ? { ...circle, nextAction: "Awaiting start" }
            : circle,
        ),
      };
    });
  }, [address, currentCircle.address, queryClient, transaction.review]);

  useEffect(() => {
    const review = transaction.review;
    if (review?.status !== "confirmed" || !isPayoutResolutionTitle(review.title)) return;
    const reviewKey = `${review.title}:${review.signature ?? "confirmed"}`;
    if (processedResolveReview.current === reviewKey) return;
    processedResolveReview.current = reviewKey;

    setJustResolved(true);
    const nextRoundIndex = currentCircle.currentRoundIndex + 1;
    const isLastRound = nextRoundIndex >= payoutRoundTarget;
    const displayRoundNumber = Math.min(nextRoundIndex + 1, payoutRoundTarget);
    const nextCircleSummary: CircleSummary = {
      ...currentCircle,
      currentRoundIndex: nextRoundIndex,
      deadline: isLastRound ? "All settled" : currentCircle.deadline,
      deadlineAt: isLastRound ? null : currentCircle.deadlineAt,
      nextAction: isLastRound
        ? currentCircle.creator === address
          ? "Complete circle"
          : "View settlement"
        : currentCircle.mode === "Dutch bid"
          ? "Accept Dutch bid"
          : "Contribute",
      nextPayout: isLastRound
        ? "Settlement"
        : `Round ${String(displayRoundNumber).padStart(2, "0")}`,
      round: `${displayRoundNumber} / ${payoutRoundTarget}`,
    };

    queryClient.setQueryData<CircleDetail>(
      [...queryKeys.circle(currentCircle.address), address ?? "guest"],
      (detail) => {
        if (!detail) return detail;
        const nextRoundIndex = detail.circle.currentRoundIndex + 1;
        const detailRoundTarget = Math.max(detail.members.length, detail.circle.members, 1);
        const isLastRound = nextRoundIndex >= detailRoundTarget;
        const displayRoundNumber = Math.min(nextRoundIndex + 1, detailRoundTarget);
        return {
          ...detail,
          circle: {
            ...detail.circle,
            currentRoundIndex: nextRoundIndex,
            deadline: isLastRound ? "All settled" : detail.circle.deadline,
            deadlineAt: isLastRound ? null : detail.circle.deadlineAt,
            round: `${displayRoundNumber} / ${detailRoundTarget}`,
            nextAction: isLastRound
              ? "Complete circle"
              : detail.circle.mode === "Dutch bid"
                ? "Accept Dutch bid"
                : "Contribute",
          },
          members: detail.members.map((member) => ({
            ...member,
            state: isLastRound ? "Paid" : "Pending",
          })),
          payoutSchedule: detail.payoutSchedule.map((row) =>
            Number.parseInt(row.round, 10) === detail.circle.currentRoundIndex + 1
              ? {
                  ...row,
                  status: detail.circle.mode === "Dutch bid" ? "Auction settled" : "Completed",
                }
              : row,
          ),
        };
      },
    );

    queryClient.setQueryData<CircleSummary[]>(queryKeys.circles(address), (circles = []) =>
      circles.map((circle) =>
        circle.address === currentCircle.address ? { ...circle, ...nextCircleSummary } : circle,
      ),
    );

    queryClient.setQueryData<ProfileData>(queryKeys.profile(address), (profile) => {
      if (!profile) return profile;
      return {
        ...profile,
        activeCircles: profile.activeCircles.map((circle) =>
          circle.address === currentCircle.address ? { ...circle, ...nextCircleSummary } : circle,
        ),
        hostedCircles: profile.hostedCircles.map((circle) =>
          circle.address === currentCircle.address ? { ...circle, ...nextCircleSummary } : circle,
        ),
      };
    });
  }, [address, currentCircle, payoutRoundTarget, queryClient, transaction.review]);

  useEffect(() => {
    const review = transaction.review;
    if (review?.status !== "confirmed" || review.title !== "Complete circle") return;
    const reviewKey = `${review.title}:${review.signature ?? "confirmed"}`;
    if (processedCompleteReview.current === reviewKey) return;
    processedCompleteReview.current = reviewKey;
    if (currentCircle.status === "Completed") return;

    const completedCircle = {
      ...currentCircle,
      deadline: "Completed",
      deadlineAt: null,
      nextAction: "View settlement",
      nextPayout: "Completed",
      status: "Completed" as const,
    };

    queryClient.setQueryData<CircleDetail>(
      [...queryKeys.circle(currentCircle.address), address ?? "guest"],
      (detail) =>
        detail
          ? {
              ...detail,
              circle: {
                ...detail.circle,
                deadline: "Completed",
                deadlineAt: null,
                nextAction: "View settlement",
                nextPayout: "Completed",
                status: "Completed",
              },
            }
          : detail,
    );

    queryClient.setQueryData<CircleSummary[]>(queryKeys.circles(address), (circles = []) =>
      circles.map((circle) =>
        circle.address === currentCircle.address ? { ...circle, ...completedCircle } : circle,
      ),
    );

    queryClient.setQueryData<ProfileData>(queryKeys.profile(address), (profile) => {
      if (!profile) return profile;
      return {
        ...profile,
        activeCircles: profile.activeCircles
          .map((circle) =>
            circle.address === currentCircle.address ? { ...circle, ...completedCircle } : circle,
          )
          .filter((circle) => circle.status !== "Completed"),
        circleHistory: upsertCircleSummary(profile.circleHistory, completedCircle),
        hostedCircles: profile.hostedCircles.map((circle) =>
          circle.address === currentCircle.address ? { ...circle, ...completedCircle } : circle,
        ),
      };
    });
  }, [address, currentCircle, queryClient, transaction.review]);

  useEffect(() => {
    const review = transaction.review;
    if (review?.status !== "confirmed" || !isReputationClaimTitle(review.title) || !address) {
      return;
    }
    const claimTitle = review.title;
    const reviewKey = `${review.title}:${review.signature ?? "confirmed"}`;
    if (processedClaimReview.current === reviewKey) return;
    processedClaimReview.current = reviewKey;

    queryClient.setQueryData<ProfileData>(queryKeys.profile(address), (profile) =>
      profile ? applyConfirmedReputationClaim(profile, claimTitle) : profile,
    );
  }, [address, queryClient, transaction.review]);

  const openSlotMembers = Array.from({ length: openSlots }, (_, index) => {
    const slotNumber = circleMembers.length + index + 1;

    return {
      active: false,
      collateral: "Not locked",
      defaulted: false,
      handle: `Slot ${slotNumber}`,
      joinOrder: slotNumber - 1,
      nextPayout: "Unassigned",
      positionNftMint: "",
      reputation: 0,
      role: "Open",
      state: "Open",
      summary: `Open slot gated by ${currentCircle.minReputation}+ reputation and ${currentCircle.collateral} collateral.`,
      vouch: "Available",
    };
  });
  const countdown = useCountdown(currentCircle.deadlineAt);

  return (
    <AppShell title={currentCircle.name} contentClassName="!max-w-none px-6 py-10 md:px-12">
      <TransactionReviewModal
        error={transaction.error}
        onDismiss={transaction.dismiss}
        onSign={() => void transaction.sign()}
        review={transaction.review}
      />
      {localError ? (
        <Panel className="mb-8 border-warning/25 bg-warning/8 p-4" role="alert">
          <p className="text-sm leading-6 text-foreground">{localError}</p>
        </Panel>
      ) : null}
      <div className="space-y-8">
        <section className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <Panel className="flex min-h-[17rem] flex-col items-center justify-center gap-6 p-8 text-center">
            <div className="w-full">
              <div className="mb-5 flex items-center justify-center gap-2">
                <Clock3 className="h-4 w-4 text-accent" aria-hidden="true" />
                <span className="font-mono text-[0.65rem] uppercase tracking-widest text-muted">
                  Round {currentCircle.round} deadline
                </span>
              </div>
              {countdown ? (
                <div className="flex items-start justify-center gap-3" aria-live="polite">
                  {countdown.days && (
                    <>
                      <CountdownUnit value={countdown.days} label="Days" />
                      <span className="mt-1 font-mono text-3xl text-white/20">:</span>
                    </>
                  )}
                  <CountdownUnit value={countdown.hours} label="Hrs" />
                  <span className="mt-1 font-mono text-3xl text-white/20">:</span>
                  <CountdownUnit value={countdown.minutes} label="Mins" />
                  {!countdown.days && (
                    <>
                      <span className="mt-1 font-mono text-3xl text-white/20">:</span>
                      <CountdownUnit value={countdown.seconds} label="Secs" />
                    </>
                  )}
                </div>
              ) : (
                <div className="flex min-h-[4.4rem] items-center justify-center">
                  <span className="font-mono text-xl text-muted">{currentCircle.deadline}</span>
                </div>
              )}
            </div>
            {reputationGate?.status === "blocked" ? (
              <div
                className="flex w-full items-start gap-3 rounded-md border border-warning/25 bg-warning/8 px-4 py-3 text-left"
                role="status"
              >
                <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-warning" aria-hidden="true" />
                <div className="min-w-0">
                  <p className="font-mono text-[0.7rem] font-medium uppercase tracking-widest text-warning">
                    Reputation required
                  </p>
                  <p className="mt-1 text-xs leading-5 text-muted">
                    Your reputation is {reputationGate.current}. This circle requires at least{" "}
                    {reputationGate.required}.
                  </p>
                  <p className="mt-1 text-xs leading-5 text-muted">
                    Complete a circle without defaulting to build your reputation.
                  </p>
                </div>
              </div>
            ) : primaryAction ? (
              <Button
                type="button"
                variant="primary"
                disabled={primaryAction.disabled}
                className="w-full font-mono text-[0.7rem] font-medium uppercase tracking-widest"
                onClick={primaryAction.onClick}
              >
                {primaryAction.label}
              </Button>
            ) : (
              <Badge tone={currentCircle.status === "Completed" ? "success" : "accent"}>
                {circleStatusAction(currentCircle, myMembership)}
              </Badge>
            )}
          </Panel>

          <Panel className="p-8 lg:col-span-2">
            <div className="mb-6 flex items-center justify-between gap-4">
              <span className="font-mono text-[0.65rem] uppercase tracking-widest text-muted">
                Circle Members ({currentCircle.memberCap})
              </span>
              <div className="flex flex-wrap gap-4 font-mono text-[0.55rem] uppercase tracking-wide text-muted">
                <LegendDot label="Paid" tone="paid" />
                <LegendDot label="Pending" tone="pending" />
                <LegendDot label="Default risk" tone="default" />
              </div>
            </div>
            <div className="grid grid-cols-4 gap-6 md:grid-cols-6">
              {circleMembers.map((member) => (
                <CircleMemberAvatar
                  key={member.handle}
                  fallbackCollateral={currentCircle.collateral}
                  member={
                    member.member === address
                      ? { ...member, role: member.role === "Host" ? "You · Host" : "You" }
                      : member
                  }
                  minReputation={currentCircle.minReputation}
                />
              ))}
              {openSlotMembers.map((member) => (
                <CircleMemberAvatar
                  key={member.handle}
                  fallbackCollateral={currentCircle.collateral}
                  member={member}
                  minReputation={currentCircle.minReputation}
                />
              ))}
            </div>
          </Panel>
        </section>

        {currentCircle.status === "Active" && (
          <Panel className="p-5">
            <div className="flex flex-wrap items-center gap-3 text-sm leading-6">
              {allRoundsResolved ? (
                <>
                  <Badge tone="success" shape="square" size="xs">
                    Payouts settled
                  </Badge>
                  <span className="text-muted">
                    All payout rounds are complete. The host can close the circle.
                  </span>
                </>
              ) : allActiveMembersPaid ? (
                <>
                  <Badge tone="success" shape="square" size="xs">
                    All paid
                  </Badge>
                  <span className="text-muted">
                    {currentCircle.mode === "Dutch bid"
                      ? "The round is funded. A member can accept the Dutch bid, then the host settles the auction payout. Prior recipients are ineligible."
                      : "All members contributed. The host can resolve the payout and open the next round."}
                  </span>
                </>
              ) : (
                <>
                  <Badge tone="accent" shape="square" size="xs">
                    Round {currentCircle.currentRoundIndex + 1} open
                  </Badge>
                  <span className="text-muted">
                    {unpaidMembers.length === circleMembers.length
                      ? `All members need to contribute ${currentCircle.contribution}.`
                      : `${unpaidMembers.length} of ${circleMembers.length} members haven't contributed yet.`}
                  </span>
                </>
              )}
            </div>
          </Panel>
        )}

        <CircleActionDesk detail={data} />

        <Panel className="p-6">
          <div className="mb-6 flex items-baseline justify-between gap-4">
            <span className="font-mono text-[0.68rem] uppercase tracking-widest text-muted">
              Circle economics
            </span>
            <span className="font-mono text-[0.6rem] text-muted">Program-defined order</span>
          </div>

          <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
            <div className="space-y-3 lg:col-span-2">
              <span className="block font-mono text-[0.6rem] uppercase tracking-[0.08em] text-muted">
                Payout schedule
              </span>
              <div className="overflow-hidden rounded-lg border border-border">
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[620px] text-left font-mono text-[0.7rem]">
                    <thead className="border-b border-border bg-white/[0.03]">
                      <tr>
                        <TableHead>Round</TableHead>
                        <TableHead>Recipient</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Status</TableHead>
                      </tr>
                    </thead>
                    <tbody>
                      {payoutSchedule.map((row) => {
                        const isCurrent = row.round === currentCircle.round;
                        const isCompleted =
                          row.status === "Completed" || row.status === "Auction settled";
                        const isDefault = row.status === "Default vote";
                        return (
                          <tr
                            key={row.round}
                            className={cn(
                              "border-b border-border transition-colors last:border-b-0 hover:bg-white/[0.03]",
                              isCompleted && "opacity-60",
                              isDefault && "bg-white/[0.02]",
                              !isCompleted && !isDefault && "opacity-70 hover:opacity-100",
                            )}
                          >
                            <td
                              className={cn(
                                "p-4 font-mono",
                                isCurrent && "font-medium text-accent",
                              )}
                            >
                              {row.round}/{payoutRoundTarget}
                            </td>
                            <td className="p-4">
                              <div className="flex items-center gap-2">
                                <span
                                  className={cn(
                                    "h-4 w-4 rounded-full",
                                    isCompleted
                                      ? "border border-white/15 bg-white/5"
                                      : isCurrent
                                        ? "border border-accent/30 bg-accent/15"
                                        : "border border-white/15 bg-white/5",
                                  )}
                                  aria-hidden="true"
                                />
                                <span className="text-muted">{row.recipient}</span>
                              </div>
                            </td>
                            <td className="p-4 font-mono font-medium tabular-nums">{row.amount}</td>
                            <td className="p-4">
                              <PayoutStatus status={row.status} />
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <span className="block font-mono text-[0.6rem] uppercase tracking-[0.08em] text-muted">
                Circle health
              </span>
              <div className="space-y-6">
                <div>
                  <div className="mb-2 flex items-end justify-between">
                    <span className="font-mono text-[0.55rem] uppercase text-muted">
                      Insurance Pool
                    </span>
                    <span className="font-mono text-sm font-medium">{currentCircle.insurance}</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-white/[0.06]">
                    <div
                      className="h-full rounded-full bg-accent"
                      style={{
                        width: `${healthCoveragePercent(currentCircle)}%`,
                      }}
                    />
                  </div>
                  <p className="mt-3 font-mono text-[0.6rem] leading-relaxed text-muted">
                    Reserve target: {(currentCircle.reserveRatioBps / 100).toFixed(2)}% of indexed
                    obligations.
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4 border-t border-border pt-6">
                  <HealthMetric label="Collateral" value={currentCircle.collateral} />
                  <HealthMetric label="Min rep" value={String(currentCircle.minReputation)} />
                </div>

                <ActionRequiredBlock proposal={data.defaultProposal} />
              </div>
            </div>
          </div>
        </Panel>
      </div>
    </AppShell>
  );
}

function isPayoutResolutionTitle(title: string) {
  return title === "Resolve payout" || title === "Settle auction payout";
}

type ReputationClaimTitle = "Claim member reputation" | "Claim host reputation";

const MEMBER_COMPLETION_SCORE_DELTA = 100;
const HOST_COMPLETION_SCORE_DELTA = 150;

function isReputationClaimTitle(title: string): title is ReputationClaimTitle {
  return title === "Claim member reputation" || title === "Claim host reputation";
}

function applyConfirmedReputationClaim(
  profile: ProfileData,
  title: ReputationClaimTitle,
): ProfileData {
  const isMemberClaim = title === "Claim member reputation";
  const scoreDelta = isMemberClaim ? MEMBER_COMPLETION_SCORE_DELTA : HOST_COMPLETION_SCORE_DELTA;

  return {
    ...profile,
    stats: {
      ...profile.stats,
      completedCircles: isMemberClaim
        ? incrementIntegerString(profile.stats.completedCircles)
        : profile.stats.completedCircles,
      hostCompletions: isMemberClaim
        ? profile.stats.hostCompletions
        : incrementIntegerString(profile.stats.hostCompletions),
      memberReputation: incrementIntegerString(profile.stats.memberReputation, scoreDelta),
    },
  };
}

function incrementIntegerString(value: string, increment = 1) {
  const parsed = Number.parseInt(value, 10);
  return String((Number.isFinite(parsed) ? parsed : 0) + increment);
}

function upsertCircleSummary(circles: CircleSummary[], nextCircle: CircleSummary) {
  const existingIndex = circles.findIndex((circle) => circle.address === nextCircle.address);
  if (existingIndex < 0) return [nextCircle, ...circles];

  return circles.map((circle, index) => (index === existingIndex ? nextCircle : circle));
}

function circleStatusAction(
  circle: CircleSummary,
  myMembership?: { active: boolean; state: string },
) {
  if (circle.status === "Forming" && circle.members >= circle.memberCap) return "Ready to start";
  if (
    circle.status === "Active" &&
    (circle.currentRoundIndex >= circle.memberCap ||
      circle.deadline === "All settled" ||
      circle.nextPayout === "Settlement")
  ) {
    return "Ready to complete";
  }
  if (circle.status === "Active" && myMembership?.active && myMembership.state === "Paid")
    return "Paid";
  return circle.nextAction;
}

function ActionRequiredBlock({ proposal }: { proposal: DefaultProposal | null }) {
  if (!proposal) return null;

  const deadlineLabel = proposal.graceDeadline
    ? `Voting for member exclusion begins ${formatRelative(proposal.graceDeadline)}.`
    : "Voting for member exclusion is open now.";

  return (
    <div className="border-t border-border pt-6">
      <div className="mb-3 flex items-center gap-2 text-accent">
        <AlertCircle className="h-4 w-4" aria-hidden="true" />
        <span className="font-mono text-[0.65rem] font-semibold uppercase tracking-wider">
          Action required
        </span>
      </div>
      <p className="text-[0.75rem] leading-relaxed text-muted">
        {proposal.candidateHandle
          ? `Default proposal open for ${proposal.candidateHandle}. ${deadlineLabel}`
          : `A default proposal is open for exclusion. ${deadlineLabel}`}
      </p>
      <Button type="button" variant="secondary" className="mt-4 w-full">
        View governance
      </Button>
    </div>
  );
}

function formatRelative(iso: string): string {
  const ms = new Date(iso).getTime() - Date.now();
  if (Number.isNaN(ms)) return "soon";
  if (ms <= 0) return "now";
  const hours = Math.floor(ms / 3_600_000);
  if (hours < 1) return `in ${Math.max(1, Math.floor(ms / 60_000))}m`;
  if (hours < 48) return `in ${hours}h`;
  const days = Math.floor(hours / 24);
  return `in ${days}d`;
}

function healthCoveragePercent(circle: CircleSummary) {
  const insurance = parseSolDisplay(circle.insurance);
  const pot = parseSolDisplay(circle.pot);
  if (insurance <= 0 || pot <= 0) return 0;
  return Math.min(Math.max((insurance / pot) * 100, 2), 100);
}

function parseSolDisplay(value: string) {
  const parsed = Number.parseFloat(value.replace(/[^\d.]/g, ""));
  return Number.isFinite(parsed) ? parsed : 0;
}

function CountdownUnit({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-14 text-center">
      <span className="block font-mono text-3xl font-medium">{value}</span>
      <span className="font-mono text-[0.55rem] uppercase text-muted">{label}</span>
    </div>
  );
}

function LegendDot({ label, tone }: { label: string; tone: "paid" | "pending" | "default" }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className={legendDotClassName(tone)} aria-hidden="true" />
      {label}
    </span>
  );
}

function HealthMetric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span className="block font-mono text-[0.55rem] uppercase text-muted">{label}</span>
      <span className="font-mono text-sm font-medium">{value}</span>
    </div>
  );
}

function TableHead({ children }: { children: React.ReactNode }) {
  return <th className="p-4 font-medium uppercase tracking-wider text-muted">{children}</th>;
}

function PayoutStatus({ status }: { status: string }) {
  if (status === "Completed") {
    return (
      <Badge tone="success" shape="square" size="xs">
        {status}
      </Badge>
    );
  }

  if (status === "Default vote") {
    return (
      <Badge tone="accent" shape="square" size="xs">
        {status}
      </Badge>
    );
  }

  if (status === "Auction settled") {
    return (
      <Badge tone="success" shape="square" size="xs">
        Auction settled
      </Badge>
    );
  }

  return (
    <Badge tone="muted" shape="square" size="xs">
      {status}
    </Badge>
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

function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-md bg-white/[0.06] ${className}`} />;
}

const MEMBER_SKELETON_KEYS = Array.from({ length: 12 }, (_, index) => `member-${index}`);
const TABLE_SKELETON_KEYS = Array.from({ length: 5 }, (_, index) => `row-${index}`);

function CircleDetailsSkeleton() {
  return (
    <div className="space-y-8">
      <section className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Panel className="flex min-h-[17rem] flex-col items-center justify-between gap-6 p-8">
          <div className="w-full space-y-4 text-center">
            <Skeleton className="mx-auto h-3 w-40" />
            <div className="flex items-start justify-center gap-3">
              <Skeleton className="h-10 w-10" />
              <Skeleton className="h-10 w-10" />
              <Skeleton className="h-10 w-10" />
            </div>
          </div>
          <Skeleton className="h-11 w-full" />
        </Panel>

        <Panel className="p-8 lg:col-span-2">
          <div className="mb-6 flex items-center justify-between">
            <Skeleton className="h-3 w-32" />
            <Skeleton className="h-3 w-24" />
          </div>
          <div className="grid grid-cols-4 gap-6 md:grid-cols-6">
            {MEMBER_SKELETON_KEYS.map((key) => (
              <Skeleton key={key} className="mx-auto h-12 w-12 rounded-full" />
            ))}
          </div>
        </Panel>
      </section>

      <Panel className="p-6">
        <Skeleton className="mb-6 h-3 w-40" />
        <div className="space-y-4">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      </Panel>

      <Panel className="p-6">
        <Skeleton className="mb-6 h-3 w-40" />
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
          <div className="space-y-3 lg:col-span-2">
            <Skeleton className="h-3 w-32" />
            <div className="overflow-hidden rounded-lg border border-border">
              {TABLE_SKELETON_KEYS.map((key) => (
                <div
                  key={key}
                  className="flex items-center gap-4 border-b border-border p-4 last:border-b-0"
                >
                  <Skeleton className="h-4 w-12" />
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="ml-auto h-4 w-16" />
                  <Skeleton className="h-4 w-16" />
                </div>
              ))}
            </div>
          </div>
          <div className="space-y-6">
            <Skeleton className="h-3 w-28" />
            <Skeleton className="h-2 w-full" />
            <div className="grid grid-cols-2 gap-4 border-t border-border pt-6">
              <Skeleton className="h-9 w-full" />
              <Skeleton className="h-9 w-full" />
            </div>
          </div>
        </div>
      </Panel>
    </div>
  );
}

function legendDotClassName(tone: "paid" | "pending" | "default") {
  if (tone === "paid") {
    return "h-2 w-2 rounded-full bg-success";
  }

  if (tone === "default") {
    return "h-2 w-2 rounded-full bg-accent";
  }

  return "h-2 w-2 rounded-full bg-warning";
}
