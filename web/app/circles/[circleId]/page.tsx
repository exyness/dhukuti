import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  CircleDollarSign,
  ShieldAlert,
  ShieldCheck,
  UserRound,
  Vote,
} from "lucide-react";
import Link from "next/link";
import { AppPageHeader, AppShell, Panel, StatTile } from "@/components/app/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { circleMembers, currentCircle, payoutSchedule } from "@/lib/app-data";

export default function CircleDetailsPage() {
  return (
    <AppShell title="Circle Dashboard">
      <AppPageHeader
        eyebrow="Current Circle"
        title={currentCircle.name}
        copy="Track round contributions, payout resolution, default proposals, vouches, and position transferability for one active SOL circle."
        actions={
          <Link
            href="/market"
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md border border-border px-4 font-mono text-[0.7rem] font-medium uppercase tracking-[0.08em] text-foreground transition-colors hover:border-accent/40 hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            View Position Market
            <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
          </Link>
        }
      />

      <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-4">
        <StatTile label="Round" value={currentCircle.round} />
        <StatTile label="Contribution" value={currentCircle.contribution} />
        <StatTile label="Insurance" value={currentCircle.insurance} />
        <StatTile label="Deadline" value={currentCircle.deadline} />
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.45fr)_minmax(22rem,0.55fr)]">
        <div className="space-y-6">
          <Panel className="p-6">
            <div className="mb-5 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="font-mono text-[0.62rem] uppercase tracking-[0.12em] text-muted">
                  Round Action
                </p>
                <h2 className="mt-1 text-xl font-semibold">Contribution window is open</h2>
              </div>
              <div className="flex flex-wrap gap-3">
                <Button variant="primary">
                  Contribute {currentCircle.contribution}
                  <CircleDollarSign className="h-3.5 w-3.5" aria-hidden="true" />
                </Button>
                <Button variant="secondary">Place Dutch Bid</Button>
              </div>
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              <InstructionCard
                icon={<CheckCircle2 className="h-4 w-4 text-success" aria-hidden="true" />}
                label="contribute"
                text="Transfers the round contribution, routes insurance fee, and marks your member bit."
              />
              <InstructionCard
                icon={<CircleDollarSign className="h-4 w-4 text-info" aria-hidden="true" />}
                label="place_dutch_bid"
                text="Accepts an early payout discount for auction-enabled rounds."
              />
              <InstructionCard
                icon={<ShieldCheck className="h-4 w-4 text-accent" aria-hidden="true" />}
                label="resolve_round"
                text="Pays the selected recipient after contribution/default checks are satisfied."
              />
            </div>
          </Panel>

          <Panel className="overflow-hidden">
            <div className="flex items-center justify-between border-b border-border px-6 py-4">
              <span className="font-mono text-[0.68rem] uppercase tracking-widest text-muted">
                Circle Members
              </span>
              <Badge tone="info">
                {currentCircle.members}/{currentCircle.memberCap}
              </Badge>
            </div>
            <div className="grid grid-cols-1 gap-0 md:grid-cols-2 xl:grid-cols-3">
              {circleMembers.map((member) => (
                <div
                  key={member.handle}
                  className="border-b border-r border-border p-5 last:border-r-0"
                >
                  <div className="mb-3 flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full border border-border bg-white/[0.04]">
                      <UserRound className="h-4 w-4 text-muted" aria-hidden="true" />
                    </div>
                    <div>
                      <p className="font-mono text-[0.78rem] text-foreground">{member.handle}</p>
                      <p className="font-mono text-[0.58rem] uppercase tracking-[0.08em] text-muted">
                        {member.role}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between gap-4">
                    <Badge
                      tone={
                        member.state === "Paid"
                          ? "success"
                          : member.state === "Default risk"
                            ? "warning"
                            : "muted"
                      }
                    >
                      {member.state}
                    </Badge>
                    <span className="font-mono text-[0.72rem] text-muted">
                      Rep {member.reputation}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </Panel>

          <Panel className="overflow-hidden">
            <div className="border-b border-border px-6 py-4">
              <span className="font-mono text-[0.68rem] uppercase tracking-widest text-muted">
                Payout Schedule
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[620px] text-left">
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
                    <tr key={row.round} className="border-b border-border last:border-b-0">
                      <td className="px-6 py-4 font-mono text-[0.72rem]">{row.round}</td>
                      <td className="px-6 py-4 font-mono text-[0.72rem] text-muted">
                        {row.recipient}
                      </td>
                      <td className="px-6 py-4 font-mono text-[0.72rem]">{row.amount}</td>
                      <td className="px-6 py-4">
                        <Badge tone={row.status === "Default vote" ? "warning" : "muted"}>
                          {row.status}
                        </Badge>
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
            <div className="mb-4 flex items-center gap-2 text-warning">
              <AlertCircle className="h-4 w-4" aria-hidden="true" />
              <span className="font-mono text-[0.62rem] uppercase tracking-[0.12em]">
                Default Proposal
              </span>
            </div>
            <p className="text-sm leading-6 text-muted">
              One member missed the round deadline. Active non-defaulting members can vote or wait
              for the 24 hour grace window to expire.
            </p>
            <div className="mt-5 grid grid-cols-2 gap-3">
              <Button variant="primary">
                Approve
                <Vote className="h-3.5 w-3.5" aria-hidden="true" />
              </Button>
              <Button variant="secondary">Reject</Button>
            </div>
          </Panel>

          <Panel className="p-6">
            <div className="mb-4 flex items-center gap-2">
              <ShieldAlert className="h-4 w-4 text-accent" aria-hidden="true" />
              <span className="font-mono text-[0.62rem] uppercase tracking-[0.12em] text-muted">
                Vouch Controls
              </span>
            </div>
            <p className="text-sm leading-6 text-muted">
              Active members can stake social trust behind a member. Clean completion releases the
              vouch; default can slash it into insurance.
            </p>
            <div className="mt-5 space-y-3">
              <Button variant="secondary" className="w-full">
                Vouch 0.25 SOL
              </Button>
              <Button variant="secondary" className="w-full">
                Release Vouch
              </Button>
            </div>
          </Panel>

          <Panel className="p-6">
            <span className="font-mono text-[0.62rem] uppercase tracking-[0.12em] text-muted">
              Host Lifecycle
            </span>
            <div className="mt-5 space-y-3">
              <Button variant="secondary" className="w-full">
                Start Circle
              </Button>
              <Button variant="secondary" className="w-full">
                Resolve Round
              </Button>
              <Button variant="secondary" className="w-full">
                Complete Circle
              </Button>
            </div>
          </Panel>
        </aside>
      </div>
    </AppShell>
  );
}

function InstructionCard({
  icon,
  label,
  text,
}: {
  icon: React.ReactNode;
  label: string;
  text: string;
}) {
  return (
    <div className="rounded-lg border border-border bg-white/[0.025] p-4">
      <div className="mb-3 flex items-center gap-2">
        {icon}
        <span className="font-mono text-[0.62rem] uppercase tracking-[0.1em] text-muted">
          {label}
        </span>
      </div>
      <p className="text-sm leading-6 text-muted">{text}</p>
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
