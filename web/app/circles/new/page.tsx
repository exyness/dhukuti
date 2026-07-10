import { ArrowRight, LockKeyhole, WalletCards } from "lucide-react";
import type { ReactNode } from "react";
import { AppPageHeader, AppShell, Panel, TokenScopeNotice } from "@/components/app/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";

export default function NewCirclePage() {
  return (
    <AppShell title="Create Circle">
      <AppPageHeader
        eyebrow="Circle Builder"
        title="Configure a savings circle."
        copy="Set the economic rules, collateral, and payout model before publishing. These terms become fixed after the first member joins."
      />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_24rem]">
        <form className="space-y-6">
          <Panel className="p-7">
            <fieldset>
              <legend className="font-mono text-[0.68rem] uppercase tracking-widest text-muted">
                01. Circle Terms
              </legend>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">
                V1 circles settle in native SOL and enforce 2 to 64 members so contribution and vote
                bitmaps fit safely in program state.
              </p>
              <div className="mt-6 grid gap-5 md:grid-cols-2">
                <Field label="Circle name" htmlFor="circle-name">
                  <input
                    id="circle-name"
                    name="circle-name"
                    type="text"
                    placeholder="Kathmandu builder circle"
                    autoComplete="off"
                    className="input-control"
                  />
                </Field>
                <Field label="Cycle duration" htmlFor="cycle-duration">
                  <select
                    id="cycle-duration"
                    name="cycle-duration"
                    className="input-control"
                    defaultValue="30"
                  >
                    <option value="7">Weekly · 7 days</option>
                    <option value="14">Biweekly · 14 days</option>
                    <option value="30">Monthly · 30 days</option>
                  </select>
                </Field>
                <Field label="Contribution amount" htmlFor="contribution">
                  <AmountInput id="contribution" name="contribution" defaultValue="2.00" />
                </Field>
                <Field label="Max members" htmlFor="member-cap">
                  <input
                    id="member-cap"
                    name="member-cap"
                    type="number"
                    inputMode="numeric"
                    min={2}
                    max={64}
                    defaultValue={8}
                    autoComplete="off"
                    className="input-control"
                  />
                </Field>
              </div>
            </fieldset>
          </Panel>

          <Panel className="p-7">
            <fieldset>
              <legend className="font-mono text-[0.68rem] uppercase tracking-widest text-muted">
                02. Payout Curve
              </legend>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">
                The deployed program supports fixed-order payouts and early payout Dutch bids.
              </p>
              <div className="mt-6 grid gap-4 md:grid-cols-3">
                <StrategyCard
                  checked
                  description="Recipient order is fixed before the circle starts."
                  label="Fixed order"
                  name="payout-curve"
                  value="fixed"
                />
                <StrategyCard
                  description="Members can accept an early payout discount."
                  label="Dutch bid"
                  name="payout-curve"
                  value="dutch"
                />
                <StrategyCard
                  description="Reserved until a VRF oracle integration is implemented."
                  disabled
                  label="Lottery"
                  name="payout-curve"
                  value="lottery"
                />
              </div>
            </fieldset>
          </Panel>

          <Panel className="p-7">
            <fieldset>
              <legend className="font-mono text-[0.68rem] uppercase tracking-widest text-muted">
                03. Trust Rules
              </legend>
              <div className="mt-6 grid gap-5 md:grid-cols-2">
                <Field label="Minimum reputation" htmlFor="min-reputation">
                  <input
                    id="min-reputation"
                    name="min-reputation"
                    type="number"
                    inputMode="numeric"
                    min={0}
                    defaultValue={180}
                    autoComplete="off"
                    className="input-control"
                  />
                </Field>
                <Field label="Collateral per member" htmlFor="collateral">
                  <AmountInput id="collateral" name="collateral" defaultValue="1.00" />
                </Field>
                <label className="md:col-span-2 flex min-h-14 cursor-pointer items-center gap-3 rounded-lg border border-border bg-surface/60 px-4 text-sm text-foreground">
                  <input
                    type="checkbox"
                    name="allow-vouches"
                    defaultChecked
                    className="h-4 w-4 accent-[var(--accent)]"
                  />
                  Allow active members to vouch stake behind new members
                </label>
              </div>
            </fieldset>
          </Panel>

          <div className="flex flex-wrap justify-end gap-3">
            <Button variant="secondary">Save Draft</Button>
            <Button variant="primary">
              Review Create Instruction
              <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
            </Button>
          </div>
        </form>

        <aside className="space-y-6">
          <Panel className="p-7">
            <div className="mb-5 flex items-center justify-between">
              <span className="font-mono text-[0.62rem] uppercase tracking-[0.12em] text-muted">
                Live Preview
              </span>
              <Badge tone="accent">Draft</Badge>
            </div>
            <span className="block font-mono text-[0.58rem] uppercase tracking-[0.1em] text-muted">
              Projected pot
            </span>
            <div className="mt-2 flex items-baseline gap-2">
              <strong className="font-mono text-4xl font-medium">16.00</strong>
              <span className="font-mono text-sm text-muted">SOL</span>
            </div>
            <p className="mt-3 text-sm leading-6 text-muted">
              Based on 2.00 SOL across 8 committed member slots.
            </p>
            <div className="mt-6 grid grid-cols-2 gap-3">
              <PreviewStat label="Cycle" value="Monthly" />
              <PreviewStat label="Members" value="8 max" />
              <PreviewStat label="Mode" value="Fixed" />
              <PreviewStat label="Collateral" value="1 SOL" />
            </div>

            <div className="mt-7 border-t border-border pt-6">
              <div className="mb-3 font-mono text-[0.62rem] uppercase tracking-[0.12em] text-muted">
                Projected payout schedule
              </div>
              <PreviewRow label="Cycle 01" value="16.00 SOL" />
              <PreviewRow label="Cycle 02" value="16.00 SOL" />
              <PreviewRow label="Cycle 03" value="16.00 SOL" />
            </div>

            <div className="mt-7 border-t border-border pt-6">
              <div className="mb-3 font-mono text-[0.62rem] uppercase tracking-[0.12em] text-muted">
                Program funds
              </div>
              <PreviewRow label="Insurance reserve" value="0.32 SOL" />
              <PreviewRow label="Collateral locked" value="8.00 SOL" />
              <PreviewRow label="Settlement asset" value="SOL" />
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
  label,
}: {
  children: ReactNode;
  htmlFor: string;
  label: string;
}) {
  return (
    <div>
      <label
        htmlFor={htmlFor}
        className="mb-2 block font-mono text-[0.62rem] uppercase tracking-[0.1em] text-muted"
      >
        {label}
      </label>
      {children}
    </div>
  );
}

function AmountInput({
  defaultValue,
  id,
  name,
}: {
  defaultValue: string;
  id: string;
  name: string;
}) {
  return (
    <div className="flex min-h-11 overflow-hidden rounded-md border border-border bg-surface/70 focus-within:ring-2 focus-within:ring-ring">
      <input
        id={id}
        name={name}
        type="text"
        inputMode="decimal"
        defaultValue={defaultValue}
        autoComplete="off"
        className="min-w-0 flex-1 bg-transparent px-3 text-sm text-foreground focus:outline-none"
      />
      <span className="flex items-center border-l border-border px-3 font-mono text-[0.68rem] text-muted">
        SOL
      </span>
    </div>
  );
}

function StrategyCard({
  checked,
  description,
  disabled,
  label,
  name,
  value,
}: {
  checked?: boolean;
  description: string;
  disabled?: boolean;
  label: string;
  name: string;
  value: string;
}) {
  return (
    <label
      className={cn(
        "flex min-h-[8.5rem] cursor-pointer flex-col rounded-lg border border-border bg-surface/60 p-4",
        disabled && "cursor-not-allowed opacity-55",
      )}
    >
      <input
        type="radio"
        name={name}
        value={value}
        defaultChecked={checked}
        disabled={disabled}
        className="h-4 w-4 accent-[var(--accent)]"
      />
      <span className="mt-4 text-sm font-semibold text-foreground">{label}</span>
      <span className="mt-2 text-sm leading-6 text-muted">{description}</span>
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
