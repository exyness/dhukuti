import {
  AlertCircle,
  CircleDollarSign,
  Clock3,
  ShieldAlert,
  ShieldCheck,
  UserMinus,
  UserRound,
  Vote,
} from "lucide-react";
import { AppShell, Panel } from "@/components/app/app-shell";
import { Button } from "@/components/ui/button";
import { circleMembers, currentCircle, payoutSchedule } from "@/lib/app-data";

type MemberAvatarData = {
  handle: string;
  reputation: number;
  role: string;
  state: string;
};

export default function CircleDetailsPage() {
  const openSlots = Math.max(currentCircle.memberCap - circleMembers.length, 0);
  const openSlotMembers = Array.from({ length: openSlots }, (_, index) => {
    const slotNumber = circleMembers.length + index + 1;

    return {
      handle: `Slot ${slotNumber}`,
      reputation: 0,
      role: "Open",
      state: "Pending",
    };
  });

  return (
    <AppShell title={currentCircle.name}>
      <div className="space-y-8">
        <section className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <Panel className="flex flex-col justify-between p-8">
            <div>
              <div className="mb-5 flex items-center gap-2">
                <Clock3 className="h-4 w-4 text-accent" aria-hidden="true" />
                <span className="font-mono text-[0.65rem] uppercase tracking-widest text-muted">
                  Round {currentCircle.round} closes in
                </span>
              </div>
              <div className="flex items-start gap-4">
                <CountdownUnit value="02" label="Days" />
                <span className="mt-1 font-mono text-3xl text-white/20">:</span>
                <CountdownUnit value="14" label="Hrs" />
                <span className="mt-1 font-mono text-3xl text-white/20">:</span>
                <CountdownUnit value="38" label="Mins" />
              </div>
            </div>
            <Button variant="primary" className="mt-8 w-full">
              Contribute {currentCircle.contribution}
              <CircleDollarSign className="h-3.5 w-3.5" aria-hidden="true" />
            </Button>
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
            <div className="grid grid-cols-3 gap-5 sm:grid-cols-4 md:grid-cols-6">
              {circleMembers.map((member) => (
                <MemberAvatar key={member.handle} member={member} />
              ))}
              {openSlotMembers.map((member) => (
                <MemberAvatar key={member.handle} member={member} />
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
                        className={
                          row.status === "Default vote"
                            ? "border-b border-border bg-white/[0.02]"
                            : "border-b border-border opacity-70 last:border-b-0"
                        }
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
                        <td className={statusClassName(row.status)}>{row.status}</td>
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
    <div className="text-center">
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

function MemberAvatar({ member }: { member: MemberAvatarData }) {
  const isYou = member.role === "You";
  const isDefault = member.state === "Default risk";
  const isPaid = member.state === "Paid";

  return (
    <button
      type="button"
      className="group flex min-h-24 flex-col items-center justify-center gap-2 rounded-md transition-colors hover:bg-white/[0.035] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <div className={avatarRingClassName({ isDefault, isYou })}>
        {isDefault ? (
          <UserMinus className="h-5 w-5 text-accent" aria-hidden="true" />
        ) : (
          <UserRound
            className={isYou ? "h-5 w-5 text-accent" : "h-5 w-5 text-white/40"}
            aria-hidden="true"
          />
        )}
        <span className={statusDotClassName({ isDefault, isPaid })} aria-hidden="true" />
      </div>
      <span
        className={
          isYou || isDefault
            ? "font-mono text-[0.6rem] text-accent"
            : "font-mono text-[0.6rem] text-muted group-hover:text-foreground"
        }
      >
        {member.handle}
      </span>
      {member.reputation > 0 ? (
        <span className="font-mono text-[0.52rem] text-white/25">Rep {member.reputation}</span>
      ) : null}
    </button>
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

function avatarRingClassName({ isDefault, isYou }: { isDefault: boolean; isYou: boolean }) {
  if (isYou) {
    return "relative flex h-12 w-12 items-center justify-center rounded-full border border-accent/40 bg-accent/8";
  }

  if (isDefault) {
    return "relative flex h-12 w-12 items-center justify-center rounded-full border border-accent/25 bg-white/[0.02]";
  }

  return "relative flex h-12 w-12 items-center justify-center rounded-full border border-border bg-white/[0.03]";
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

function statusClassName(status: string) {
  if (status === "Completed") {
    return "p-4 text-success";
  }

  if (status === "Default vote") {
    return "p-4 text-accent";
  }

  return "p-4 text-muted";
}

function statusDotClassName({ isDefault, isPaid }: { isDefault: boolean; isPaid: boolean }) {
  if (isDefault) {
    return "absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border border-background bg-accent";
  }

  if (isPaid) {
    return "absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border border-background bg-success";
  }

  return "absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border border-background bg-warning";
}
