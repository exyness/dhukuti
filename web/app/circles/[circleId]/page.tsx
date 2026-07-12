"use client";

import { Clock3 } from "lucide-react";
import { useParams } from "next/navigation";
import { AppShell, Panel } from "@/components/app/app-shell";
import { CircleMemberAvatar } from "@/components/app/circle-member-avatar";
import { CircleActionDesk } from "@/components/program/circle-action-desk";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/cn";
import { useCircleDetailQuery } from "@/lib/data/queries";
import type { CircleSummary } from "@/lib/data/types";
import { useWalletIdentity } from "@/lib/use-wallet-identity";

export default function CircleDetailsPage() {
  const params = useParams<{ circleId: string }>();
  const circleId = decodeURIComponent(params.circleId);
  const { data, error, isLoading } = useCircleDetailQuery(circleId);
  const { address } = useWalletIdentity();
  const currentCircle = data?.circle;
  const circleMembers = data?.members ?? [];
  const payoutSchedule = data?.payoutSchedule ?? [];
  const openSlots = currentCircle ? Math.max(currentCircle.memberCap - circleMembers.length, 0) : 0;
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
      summary: `Open slot gated by ${currentCircle?.minReputation ?? 0}+ reputation and ${currentCircle?.collateral ?? "indexed"} collateral.`,
      vouch: "Available",
    };
  });
  const countdown = currentCircle ? getCountdownUnits(currentCircle.deadlineAt) : null;

  if (isLoading) {
    return (
      <AppShell title="Circle" contentClassName="!max-w-7xl px-6 py-10 md:px-10">
        <StatePanel message="Loading the latest circle details." title="Loading circle" />
      </AppShell>
    );
  }

  if (!data || !currentCircle) {
    return (
      <AppShell title="Circle" contentClassName="!max-w-7xl px-6 py-10 md:px-10">
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

  return (
    <AppShell title={currentCircle.name} contentClassName="!max-w-7xl px-6 py-10 md:px-10">
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
                <div className="flex items-start justify-center gap-3">
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
            <Badge tone={currentCircle.status === "Completed" ? "success" : "accent"}>
              {circleStatusAction(currentCircle)}
            </Badge>
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
                    {payoutSchedule.map((row) => (
                      <tr
                        key={row.round}
                        className={cn(
                          "group border-b border-border transition-colors hover:bg-white/[0.03] last:border-b-0",
                          row.status === "Default vote"
                            ? "bg-white/[0.02]"
                            : "opacity-70 hover:opacity-100",
                        )}
                      >
                        <td className="p-4 font-medium text-accent">
                          {row.round}/{currentCircle.memberCap}
                        </td>
                        <td className="p-4">
                          <div className="flex items-center gap-2">
                            <span
                              className="h-4 w-4 rounded-full border border-white/15 bg-white/5"
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
                    ))}
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
