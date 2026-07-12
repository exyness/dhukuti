"use client";

import { AlertCircle, Clock3 } from "lucide-react";
import { useParams } from "next/navigation";
import { AppShell, Panel } from "@/components/app/app-shell";
import { CircleMemberAvatar } from "@/components/app/circle-member-avatar";
import { CircleActionDesk } from "@/components/program/circle-action-desk";
import { TransactionReviewPanel } from "@/components/program/transaction-review";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";
import { useCircleDetailQuery } from "@/lib/data/queries";
import type { CircleDetail, CircleSummary, DefaultProposal } from "@/lib/data/types";
import { useCirclePrimaryAction } from "@/lib/use-circle-primary-action";
import { useWalletIdentity } from "@/lib/use-wallet-identity";

export default function CircleDetailsPage() {
  const params = useParams<{ circleId: string }>();
  const circleId = decodeURIComponent(params.circleId);
  const { data, error, isLoading } = useCircleDetailQuery(circleId);

  if (isLoading) {
    return (
      <AppShell title="Circle" contentClassName="!max-w-none px-6 py-10 md:px-12">
        <StatePanel message="Loading the latest circle details." title="Loading circle" />
      </AppShell>
    );
  }

  if (!data || !data.circle) {
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
  const { localError, primaryAction, transaction } = useCirclePrimaryAction(data);
  const openSlots = Math.max(currentCircle.memberCap - circleMembers.length, 0);
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
  const countdown = getCountdownUnits(currentCircle.deadlineAt);

  return (
    <AppShell title={currentCircle.name} contentClassName="!max-w-none px-6 py-10 md:px-12">
      <TransactionReviewPanel
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
          <Panel className="flex min-h-[17rem] flex-col items-center justify-between gap-6 p-8 text-center">
            <div className="w-full">
              <div className="mb-5 flex items-center justify-center gap-2">
                <Clock3 className="h-4 w-4 text-accent" aria-hidden="true" />
                <span className="font-mono text-[0.65rem] uppercase tracking-widest text-muted">
                  Round {currentCircle.round} deadline
                </span>
              </div>
              {countdown ? (
                <div className="flex items-start justify-center gap-3" aria-live="polite">
                  <CountdownUnit value={countdown.days} label="Days" />
                  <span className="mt-1 font-mono text-3xl text-white/20">:</span>
                  <CountdownUnit value={countdown.hours} label="Hrs" />
                  <span className="mt-1 font-mono text-3xl text-white/20">:</span>
                  <CountdownUnit value={countdown.minutes} label="Mins" />
                </div>
              ) : (
                <div className="flex min-h-[4.4rem] items-center justify-center">
                  <span className="font-mono text-xl text-muted">{currentCircle.deadline}</span>
                </div>
              )}
            </div>
            {primaryAction ? (
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
                {circleStatusAction(currentCircle)}
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

        <CircleActionDesk detail={data} />

        <section className="grid grid-cols-1 gap-8 lg:grid-cols-3">
          <div className="space-y-6 lg:col-span-2">
            <div className="flex items-baseline justify-between gap-4">
              <span className="font-mono text-[0.68rem] uppercase tracking-widest text-muted">
                Payout Schedule
              </span>
              <span className="font-mono text-[0.6rem] text-muted">Program-defined order</span>
            </div>

            <Panel className="overflow-hidden">
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
                      const isCompleted = row.status === "Completed";
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
                            {row.round}/{currentCircle.memberCap}
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
            </Panel>
          </div>

          <div className="space-y-6">
            <span className="block font-mono text-[0.68rem] uppercase tracking-widest text-muted">
              Circle Health
            </span>

            <Panel className="space-y-6 p-6">
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
            </Panel>
          </div>
        </section>
      </div>
    </AppShell>
  );
}

function circleStatusAction(circle: CircleSummary) {
  if (circle.status === "Forming" && circle.members >= circle.memberCap) return "Ready to start";
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

  if (status === "Dutch bid settled") {
    return (
      <Badge tone="info" shape="square" size="xs">
        Settled
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

function getCountdownUnits(deadlineAt: string | null) {
  if (!deadlineAt) return null;

  const diffMs = new Date(deadlineAt).getTime() - Date.now();
  if (diffMs <= 0) return null;

  const totalMinutes = Math.ceil(diffMs / 60_000);
  const days = Math.floor(totalMinutes / (24 * 60));
  const hours = Math.floor((totalMinutes % (24 * 60)) / 60);
  const minutes = totalMinutes % 60;

  return {
    days: String(days).padStart(2, "0"),
    hours: String(hours).padStart(2, "0"),
    minutes: String(minutes).padStart(2, "0"),
  };
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
