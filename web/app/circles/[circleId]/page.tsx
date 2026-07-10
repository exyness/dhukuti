import {
  AlertCircle,
  CircleDollarSign,
  Clock3,
  ExternalLink,
  ShieldAlert,
  ShieldCheck,
  Vote,
} from "lucide-react";
import { AppShell, Panel } from "@/components/app/app-shell";
import { CircleMemberAvatar } from "@/components/app/circle-member-avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { circleMembers, currentCircle, payoutSchedule } from "@/lib/app-data";
import { cn } from "@/lib/cn";

export default function CircleDetailsPage() {
  const openSlots = Math.max(currentCircle.memberCap - circleMembers.length, 0);
  const openSlotMembers = Array.from({ length: openSlots }, (_, index) => {
    const slotNumber = circleMembers.length + index + 1;

    return {
      collateral: "Not locked",
      handle: `Slot ${slotNumber}`,
      nextPayout: "Unassigned",
      reputation: 0,
      role: "Open",
      state: "Open",
      summary: `Open slot gated by ${currentCircle.minReputation}+ reputation and ${currentCircle.collateral} collateral.`,
      vouch: "Available",
    };
  });

  return (
    <AppShell title={currentCircle.name} contentClassName="!max-w-7xl !px-6 !py-10 md:!px-10">
      <div className="space-y-8">
        <section className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <Panel className="flex min-h-[17rem] flex-col items-center justify-between gap-6 p-6 text-center">
            <div className="w-full">
              <div className="mb-5 flex items-center justify-center gap-2">
                <Clock3 className="h-4 w-4 text-accent" aria-hidden="true" />
                <span className="font-mono text-[0.65rem] uppercase tracking-widest text-muted">
                  Round {currentCircle.round} closes in
                </span>
              </div>
              <div className="flex items-start justify-center gap-3">
                <CountdownUnit value="02" label="Days" />
                <span className="mt-1 font-mono text-3xl text-white/20">:</span>
                <CountdownUnit value="14" label="Hrs" />
                <span className="mt-1 font-mono text-3xl text-white/20">:</span>
                <CountdownUnit value="38" label="Mins" />
              </div>
            </div>
            <Button variant="primary" className="w-full">
              Contribute {currentCircle.contribution}
              <CircleDollarSign className="h-3.5 w-3.5" aria-hidden="true" />
            </Button>
          </Panel>

          <Panel className="p-6 lg:col-span-2">
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
            <div className="grid grid-cols-3 gap-4 sm:grid-cols-4 md:grid-cols-6">
              {circleMembers.map((member) => (
                <CircleMemberAvatar
                  key={member.handle}
                  fallbackCollateral={currentCircle.collateral}
                  member={member}
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
                        <td className="p-4 font-medium">{row.amount}</td>
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
                  <div className="h-full w-[68%] rounded-full bg-accent" />
                </div>
                <p className="mt-3 font-mono text-[0.6rem] leading-relaxed text-muted">
                  SOL reserve covers defaults through program insurance and slashed vouches.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4 border-t border-border pt-6">
                <HealthMetric label="Collateral" value={currentCircle.collateral} />
                <HealthMetric label="Min rep" value={String(currentCircle.minReputation)} />
              </div>

              <div className="border-t border-border pt-6">
                <div className="mb-3 flex items-center gap-2 text-accent">
                  <AlertCircle className="h-4 w-4" aria-hidden="true" />
                  <span className="font-mono text-[0.65rem] font-semibold uppercase">
                    Action Required
                  </span>
                </div>
                <p className="text-[0.75rem] leading-relaxed text-muted">
                  One member is past deadline. Non-defaulting members can vote before handle_default
                  resolves the round.
                </p>
                <div className="mt-4 grid grid-cols-2 gap-3">
                  <Button variant="primary" size="sm">
                    Vote
                    <Vote className="h-3.5 w-3.5" aria-hidden="true" />
                  </Button>
                  <Button variant="secondary" size="sm">
                    Reject
                  </Button>
                </div>
                <Button variant="ghost" size="sm" className="mt-3 w-full">
                  View member proof
                  <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                </Button>
              </div>
            </Panel>

            <Panel className="space-y-5 p-6">
              <div className="flex items-center gap-2">
                <ShieldAlert className="h-4 w-4 text-accent" aria-hidden="true" />
                <span className="font-mono text-[0.62rem] uppercase tracking-[0.12em] text-muted">
                  Vouch Controls
                </span>
              </div>
              <p className="text-sm leading-6 text-muted">
                Stake social trust behind a member. Clean completion releases the vouch; default can
                slash it into insurance.
              </p>
              <div className="grid gap-3">
                <Button variant="secondary" className="w-full">
                  Vouch 0.25 SOL
                </Button>
                <Button variant="secondary" className="w-full">
                  Release Vouch
                </Button>
              </div>
            </Panel>

            <Panel className="space-y-5 p-6">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-success" aria-hidden="true" />
                <span className="font-mono text-[0.62rem] uppercase tracking-[0.12em] text-muted">
                  Host Lifecycle
                </span>
              </div>
              <div className="grid gap-3">
                <Button variant="secondary" className="w-full">
                  Resolve Round
                </Button>
                <Button variant="secondary" className="w-full">
                  Complete Circle
                </Button>
              </div>
            </Panel>
          </div>
        </section>
      </div>
    </AppShell>
  );
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

function legendDotClassName(tone: "paid" | "pending" | "default") {
  if (tone === "paid") {
    return "h-2 w-2 rounded-full bg-success";
  }

  if (tone === "default") {
    return "h-2 w-2 rounded-full bg-accent";
  }

  return "h-2 w-2 rounded-full bg-warning";
}
