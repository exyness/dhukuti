import { ArrowRight, ChevronDown, LockKeyhole, WalletCards } from "lucide-react";
import type { ReactNode } from "react";
import { AppPageHeader, AppShell, Panel, TokenScopeNotice } from "@/components/app/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";

export default function NewCirclePage() {
  return (
    <AppShell title="Create Circle" contentClassName="!max-w-7xl !px-6 !py-10 md:!px-10">
      <AppPageHeader
        eyebrow="Circle Builder"
        title="Configure a savings circle."
        copy="Set the economic rules, admission gate, and payout model before publishing. These terms become fixed after the first member joins."
      />

      <div className="grid items-start gap-8 xl:grid-cols-[minmax(0,1fr)_23.75rem]">
        <form className="space-y-[1.125rem]">
          <Panel className="p-6">
            <fieldset className="m-0 min-w-0">
              <legend className="font-mono text-[0.68rem] uppercase tracking-widest text-muted">
                01. Circle Terms
              </legend>
              <p className="mt-1 mb-[1.375rem] max-w-2xl text-sm leading-6 text-muted">
                Define the core parameters members will review before they join.
              </p>
              <div className="grid gap-[1.125rem] md:grid-cols-2">
                <Field label="Circle name" htmlFor="circle-name">
                  <input
                    id="circle-name"
                    name="circle-name"
                    type="text"
                    placeholder="Dev guild savings"
                    autoComplete="off"
                    spellCheck={false}
                    className="input-control"
                  />
                </Field>
                <Field label="Cycle duration" htmlFor="cycle-duration">
                  <SelectShell>
                    <select
                      id="cycle-duration"
                      name="cycle-duration"
                      className="input-control appearance-none pr-10 font-mono text-[0.84rem]"
                      defaultValue="30"
                    >
                      <option value="7">Weekly - 7 days</option>
                      <option value="30">Monthly - 30 days</option>
                      <option value="90">Quarterly - 90 days</option>
                    </select>
                  </SelectShell>
                </Field>
                <Field label="Contribution amount" htmlFor="contribution">
                  <AmountInput id="contribution" name="contribution" defaultValue="5.00" />
                </Field>
                <Field label="Max participants" htmlFor="member-cap">
                  <input
                    id="member-cap"
                    name="member-cap"
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    defaultValue={12}
                    autoComplete="off"
                    className="input-control"
                  />
                </Field>
              </div>
            </fieldset>
          </Panel>

          <Panel className="p-6">
            <fieldset className="m-0 min-w-0">
              <legend className="font-mono text-[0.68rem] uppercase tracking-widest text-muted">
                02. Payout Strategy
              </legend>
              <p className="mt-1 mb-[1.375rem] max-w-2xl text-sm leading-6 text-muted">
                Choose how each cycle&apos;s recipient is selected.
              </p>
              <div className="grid gap-3 md:grid-cols-3">
                <StrategyCard
                  checked
                  description="Recipient order is locked before the circle opens."
                  kicker="Fixed Order"
                  label="Sequential"
                  name="strategy"
                  value="fixed"
                />
                <StrategyCard
                  description="A verifiable draw selects the recipient each cycle."
                  kicker="Random"
                  label="Lottery Pot"
                  name="strategy"
                  value="lottery"
                />
                <StrategyCard
                  description="Members bid a yield discount to receive early."
                  kicker="Bidding"
                  label="Dutch Auction"
                  name="strategy"
                  value="auction"
                />
              </div>
            </fieldset>
          </Panel>

          <Panel className="p-6">
            <fieldset className="m-0 min-w-0">
              <legend className="font-mono text-[0.68rem] uppercase tracking-widest text-muted">
                03. Admission Rules
              </legend>
              <p className="mt-1 mb-[1.375rem] max-w-2xl text-sm leading-6 text-muted">
                Keep the circle open enough to fill, but gated enough to feel trustworthy.
              </p>
              <div className="grid gap-[1.125rem] md:grid-cols-2">
                <div className="flex min-w-0 flex-col gap-2">
                  <span className="font-mono text-[0.66rem] uppercase tracking-[0.12em] text-muted">
                    Minimum reputation
                  </span>
                  <div className="grid grid-cols-[minmax(0,1fr)_4.5rem] items-center gap-3.5">
                    <input
                      className="h-1.5 w-full cursor-pointer accent-[var(--accent)]"
                      type="range"
                      name="reputation"
                      min="0"
                      max="1000"
                      defaultValue="450"
                      aria-label="Minimum reputation"
                    />
                    <span className="flex min-h-11 items-center justify-center rounded-md border border-border bg-white/[0.035] font-mono text-[0.84rem] text-foreground">
                      450
                    </span>
                  </div>
                  <p className="m-0 text-[0.76rem] leading-5 text-muted">
                    Recommended for public circles with 10 or more participants.
                  </p>
                </div>

                <div className="flex min-w-0 flex-col gap-2">
                  <span className="font-mono text-[0.66rem] uppercase tracking-[0.12em] text-muted">
                    Privacy
                  </span>
                  <div className="grid grid-cols-2 gap-2">
                    <ChoiceCard checked label="Public" name="privacy" value="public" />
                    <ChoiceCard label="Invite Only" name="privacy" value="invite" />
                  </div>
                  <p className="m-0 text-[0.76rem] leading-5 text-muted">
                    Invite-only circles require an approval list.
                  </p>
                </div>

                <label className="flex min-h-14 cursor-pointer items-center gap-3 rounded-lg border border-border bg-white/[0.024] px-4 text-sm leading-5 text-foreground transition-colors hover:border-white/15 hover:bg-white/[0.035] focus-within:ring-2 focus-within:ring-ring md:col-span-2">
                  <input
                    type="checkbox"
                    name="identity-check"
                    defaultChecked
                    className="h-4 w-4 shrink-0 cursor-pointer accent-[var(--accent)]"
                  />
                  <span>
                    Require identity verification before a member can reserve a payout slot.
                  </span>
                </label>

                <Field
                  hint="Held in escrow until the circle completes."
                  label="Security bond"
                  htmlFor="security-bond"
                >
                  <AmountInput
                    id="security-bond"
                    name="security-bond"
                    defaultValue="2.50"
                    readOnly
                  />
                </Field>
              </div>
            </fieldset>
          </Panel>

          <div className="flex flex-wrap justify-end gap-3 pt-1">
            <Button variant="secondary">Save Draft</Button>
            <Button type="submit" variant="primary">
              Continue to Review
              <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
            </Button>
          </div>
        </form>

        <aside className="space-y-6">
          <Panel className="sticky top-24 p-6">
            <div className="mb-7 flex items-center justify-between">
              <span className="font-mono text-[0.62rem] uppercase tracking-[0.12em] text-muted">
                Live Preview
              </span>
              <Badge tone="accent">Draft Terms</Badge>
            </div>
            <span className="block font-mono text-[0.58rem] uppercase tracking-[0.1em] text-muted">
              Projected pot value
            </span>
            <div className="mt-2 flex items-baseline gap-2">
              <strong className="font-mono text-[2.45rem] font-semibold tracking-tight">
                60.00
              </strong>
              <span className="font-mono text-sm text-muted">SOL</span>
            </div>
            <p className="mt-1 mb-7 text-[0.78rem] leading-5 text-muted">
              Based on 5.00 SOL across 12 committed member slots.
            </p>
            <div className="mt-6 grid grid-cols-2 gap-3">
              <PreviewStat label="Cycle" value="Monthly" />
              <PreviewStat label="Length" value="12 Months" />
              <PreviewStat label="Model" value="Fixed" />
              <PreviewStat label="Gate" value="450 Rep" />
            </div>

            <div className="mt-7 border-t border-border pt-6">
              <div className="mb-3 font-mono text-[0.62rem] uppercase tracking-[0.12em] text-muted">
                Projected payout schedule
              </div>
              <PreviewRow label="Cycle 01 - Mar 2027" value="60.00 SOL" />
              <PreviewRow label="Cycle 02 - Apr 2027" value="60.00 SOL" />
              <PreviewRow label="Cycle 03 - May 2027" value="60.00 SOL" />
            </div>

            <div className="mt-7 border-t border-border pt-6">
              <div className="mb-3 font-mono text-[0.62rem] uppercase tracking-[0.12em] text-muted">
                Fee breakdown
              </div>
              <PreviewRow label="Protocol fee" value="0.30 SOL" />
              <PreviewRow label="Insurance reserve" value="0.10 SOL" />
              <PreviewRow label="Security bond" value="2.50 SOL" />
            </div>
          </Panel>

          <TokenScopeNotice />

          <Panel className="p-6">
            <div className="mb-4 flex items-center gap-2">
              <WalletCards className="h-4 w-4 text-accent" aria-hidden="true" />
              <span className="font-mono text-[0.62rem] uppercase tracking-[0.12em] text-muted">
                Instruction Map
              </span>
            </div>
            <ul className="space-y-3 text-sm leading-6 text-muted">
              <li>
                <strong className="font-medium text-foreground">create_circle</strong> creates
                circle, vault, and insurance PDAs.
              </li>
              <li>
                <strong className="font-medium text-foreground">join_circle</strong> locks
                collateral and mints the member position NFT.
              </li>
              <li>
                <strong className="font-medium text-foreground">start_circle</strong> opens round
                zero after the host is ready.
              </li>
            </ul>
          </Panel>

          <Panel className="p-6">
            <div className="mb-3 flex items-center gap-2">
              <LockKeyhole className="h-4 w-4 text-warning" aria-hidden="true" />
              <span className="font-mono text-[0.62rem] uppercase tracking-[0.12em] text-warning">
                Mainnet Gate
              </span>
            </div>
            <p className="text-sm leading-6 text-muted">
              Transaction signing stays disabled in this UI slice until simulation, confirmation,
              and decoded Anchor errors are wired.
            </p>
          </Panel>
        </aside>
      </div>
    </AppShell>
  );
}

function Field({
  children,
  htmlFor,
  hint,
  label,
}: {
  children: ReactNode;
  htmlFor: string;
  hint?: string;
  label: string;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-2">
      <label
        htmlFor={htmlFor}
        className="font-mono text-[0.66rem] uppercase tracking-[0.12em] text-muted"
      >
        {label}
      </label>
      {children}
      {hint ? <p className="m-0 text-[0.76rem] leading-5 text-muted">{hint}</p> : null}
    </div>
  );
}

function SelectShell({ children }: { children: ReactNode }) {
  return (
    <div className="relative">
      {children}
      <ChevronDown
        className="pointer-events-none absolute top-1/2 right-3.5 h-4 w-4 -translate-y-1/2 text-muted"
        aria-hidden="true"
      />
    </div>
  );
}

function AmountInput({
  defaultValue,
  id,
  name,
  readOnly,
}: {
  defaultValue: string;
  id: string;
  name: string;
  readOnly?: boolean;
}) {
  return (
    <div className="relative">
      <input
        id={id}
        name={name}
        type="text"
        inputMode="decimal"
        defaultValue={defaultValue}
        autoComplete="off"
        readOnly={readOnly}
        className={cn("input-control pr-14 font-mono text-[0.84rem]", readOnly && "text-muted")}
      />
      <span className="pointer-events-none absolute top-1/2 right-3.5 -translate-y-1/2 font-mono text-[0.68rem] text-muted">
        SOL
      </span>
    </div>
  );
}

function StrategyCard({
  checked,
  description,
  kicker,
  label,
  name,
  value,
}: {
  checked?: boolean;
  description: string;
  kicker: string;
  label: string;
  name: string;
  value: string;
}) {
  return (
    <label className="group relative flex min-h-[8.5rem] cursor-pointer flex-col overflow-hidden rounded-lg border border-border bg-white/[0.024] p-4 transition-colors hover:border-white/15 hover:bg-white/[0.035] has-checked:border-accent/35 has-checked:bg-accent/8 focus-within:ring-2 focus-within:ring-ring">
      <input
        type="radio"
        name={name}
        value={value}
        defaultChecked={checked}
        className="peer absolute inset-0 cursor-pointer opacity-0"
      />
      <span className="mb-2.5 block font-mono text-[0.58rem] uppercase tracking-[0.12em] text-accent">
        {kicker}
      </span>
      <span className="mb-1.5 block text-[0.92rem] font-medium text-foreground">{label}</span>
      <span className="text-[0.76rem] leading-5 text-muted">{description}</span>
    </label>
  );
}

function ChoiceCard({
  checked,
  label,
  name,
  value,
}: {
  checked?: boolean;
  label: string;
  name: string;
  value: string;
}) {
  return (
    <label className="relative flex min-h-11 cursor-pointer items-center justify-center rounded-md border border-border bg-white/[0.024] px-3 font-mono text-[0.68rem] uppercase tracking-[0.08em] text-muted transition-colors hover:border-white/15 hover:text-foreground has-checked:border-accent/35 has-checked:bg-accent/8 has-checked:text-accent focus-within:ring-2 focus-within:ring-ring">
      <input
        type="radio"
        name={name}
        value={value}
        defaultChecked={checked}
        className="absolute inset-0 cursor-pointer opacity-0"
      />
      {label}
    </label>
  );
}

function PreviewStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-border bg-white/[0.025] p-3">
      <span className="block font-mono text-[0.52rem] uppercase tracking-[0.08em] text-muted">
        {label}
      </span>
      <span className="mt-1 block font-mono text-[0.75rem] text-foreground">{value}</span>
    </div>
  );
}

function PreviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between border-b border-border py-2 last:border-b-0">
      <span className="font-mono text-[0.64rem] text-muted">{label}</span>
      <strong className="font-mono text-[0.72rem] font-medium text-foreground">{value}</strong>
    </div>
  );
}
