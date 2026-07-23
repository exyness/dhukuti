"use client";

import { useConnection } from "@solana/wallet-adapter-react";
import { PublicKey } from "@solana/web3.js";
import {
  BadgeCheck,
  Check,
  CircleDollarSign,
  Gavel,
  Landmark,
  UserCheck,
  Vote,
} from "lucide-react";
import { type ReactNode, useMemo, useState } from "react";
import { Panel } from "@/components/app/app-shell";
import { TransactionReviewModal } from "@/components/circles/TransactionReviewModal";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DropdownSelect } from "@/components/ui/dropdown-select";
import { cn } from "@/lib/cn";
import type { CircleDetail } from "@/lib/data/types";
import {
  buildCompleteCircleInstruction,
  buildContributeInstruction,
  buildDutchBidInstruction,
  buildHandleDefaultInstruction,
  buildOpenDefaultProposalInstruction,
  buildReleaseVouchInstruction,
  buildResolveRoundInstruction,
  buildSlashVouchInstruction,
  buildVoteDefaultInstruction,
  buildVouchMemberInstruction,
  deriveMembershipPda,
  fetchCircleState,
  fetchRoundState,
  type ProgramInstructionBundle,
  solToLamports,
} from "@/lib/program";
import { useProgramTransaction } from "@/lib/use-program-transaction";
import { useWalletIdentity } from "@/lib/use-wallet-identity";
import { truncateAddress as shortAddress } from "@/lib/wallet";

export function CircleActionDesk({ detail }: { detail: CircleDetail }) {
  const { connection } = useConnection();
  const { address } = useWalletIdentity();
  const transaction = useProgramTransaction();
  const [defaultCandidate, setDefaultCandidate] = useState("");
  const [localError, setLocalError] = useState("");
  const [vouchCandidate, setVouchCandidate] = useState("");
  const [vouchStake, setVouchStake] = useState("0.25");
  const { circle, defaultProposal, members, payoutSchedule, vouches } = detail;
  const wallet = address ?? "";
  const myMembership = members.find((member) => member.member === wallet);
  const activeMembers = members.filter((member) => member.active);
  const unpaidMembers = activeMembers.filter((member) => member.state !== "Paid");
  const allActiveMembersPaid = activeMembers.length > 0 && unpaidMembers.length === 0;
  const payoutRoundTarget = Math.max(members.length, circle.members, 1);
  const allPayoutRowsSettled =
    payoutSchedule.length >= payoutRoundTarget &&
    payoutSchedule.every((row) => row.status === "Completed" || row.status === "Auction settled");
  const allRoundsResolved = circle.currentRoundIndex >= payoutRoundTarget || allPayoutRowsSettled;
  const isHost = circle.creator === wallet;
  const isDutch = circle.mode === "Dutch bid";
  const resolvePayoutLabel = isDutch ? "Settle auction payout" : "Resolve payout";
  const walletKey = useMemo(() => (wallet ? new PublicKey(wallet) : null), [wallet]);
  const candidateOptions = activeMembers.filter((member) => member.member !== wallet);
  const activeVouches = vouches.filter((vouch) => vouch.active && vouch.voucher === wallet);
  const selectedVouchCandidate = candidateOptions.some((member) => member.member === vouchCandidate)
    ? vouchCandidate
    : (candidateOptions[0]?.member ?? "");
  const selectedDefaultCandidate = unpaidMembers.some(
    (member) => member.member === defaultCandidate,
  )
    ? defaultCandidate
    : (unpaidMembers[0]?.member ?? "");
  const defaultCandidateOptions = unpaidMembers.length
    ? unpaidMembers.map((member) => ({ label: member.handle, value: member.member }))
    : [{ label: "No missed contributors", value: "" }];
  const vouchCandidateOptions = candidateOptions.length
    ? candidateOptions.map((member) => ({
        label: `${member.handle} · rep ${member.reputation}`,
        value: member.member,
      }))
    : [{ label: "No eligible members", value: "" }];

  function requestReview(
    title: string,
    description: string,
    details: { label: string; value: string }[],
    bundle: ProgramInstructionBundle,
  ) {
    setLocalError("");
    void transaction.preview({ bundle, description, details, title }).catch(() => undefined);
  }

  function getContext() {
    return {
      circle: new PublicKey(circle.address),
      circleId: BigInt(circle.circleId),
      creator: new PublicKey(circle.creator),
      currentRoundIndex: circle.currentRoundIndex,
    };
  }

  async function getCurrentRoundContext() {
    const context = getContext();
    const onChainCircle = await fetchCircleState(connection, context.circle);
    return { ...context, ...onChainCircle };
  }

  async function reviewContribution() {
    if (!walletKey) return;
    try {
      const context = await getCurrentRoundContext();
      requestReview(
        "Contribute",
        "Transfer this round's SOL contribution into the program vault. The insurance fee is routed automatically.",
        [
          { label: "Circle", value: circle.name },
          { label: "Round", value: String(context.currentRoundIndex + 1) },
          { label: "Contribution", value: circle.contribution },
          { label: "Insurance fee", value: `${circle.insuranceFeeBps / 100}%` },
        ],
        buildContributeInstruction({ ...context, member: walletKey }),
      );
    } catch (error) {
      setLocalError(
        error instanceof Error ? error.message : "Unable to prepare this contribution.",
      );
    }
  }

  async function reviewDutchBid() {
    if (!walletKey) return;
    try {
      const context = await getCurrentRoundContext();
      requestReview(
        "Accept Dutch bid",
        "Accept the current clearing discount for this round. Prior payout recipients are ineligible, so each active member can receive at most once.",
        [
          { label: "Circle", value: circle.name },
          { label: "Round", value: String(context.currentRoundIndex + 1) },
          { label: "Payout model", value: "Dutch auction" },
        ],
        buildDutchBidInstruction({ ...context, bidder: walletKey }),
      );
    } catch (error) {
      setLocalError(error instanceof Error ? error.message : "Unable to prepare this Dutch bid.");
    }
  }

  async function reviewResolveRound() {
    if (!walletKey) return;
    setLocalError("");

    try {
      const context = await getCurrentRoundContext();
      if (context.currentRoundIndex >= context.currentMembers) {
        throw new Error("Every payout round has already been resolved on-chain.");
      }

      const round = await fetchRoundState(connection, context.circle, context.currentRoundIndex);
      if (round.resolved) {
        throw new Error("This payout round has already been resolved. Refresh and continue.");
      }

      if (
        (round.contributionsBitmap & context.activeMembersBitmap) !==
        context.activeMembersBitmap
      ) {
        throw new Error(
          `Round ${context.currentRoundIndex + 1} is not fully funded on-chain yet. Refresh the circle and collect this round's contributions first.`,
        );
      }

      let recipient = members.find(
        (member) => member.joinOrder === context.currentRoundIndex,
      )?.member;

      if (circle.mode === "Dutch bid") {
        recipient = round.auctionWinner ?? undefined;
      }

      if (!recipient) {
        throw new Error("No payout recipient is available for this round yet.");
      }

      requestReview(
        resolvePayoutLabel,
        isDutch
          ? "Pay the accepted Dutch bid from the program vault and atomically open the next round."
          : "Pay the funded round from the program vault and atomically open the next round.",
        [
          { label: "Circle", value: circle.name },
          { label: "Round", value: String(context.currentRoundIndex + 1) },
          { label: "Recipient", value: shortAddress(recipient) },
          { label: "Payout", value: circle.pot },
        ],
        buildResolveRoundInstruction({
          activeMemberships: activeMembers.map((member) => ({
            member: new PublicKey(member.member),
            membership: deriveMembershipPda(context.circle, new PublicKey(member.member)),
          })),
          ...context,
          cranker: walletKey,
          recipient: new PublicKey(recipient),
        }),
      );
    } catch (error) {
      setLocalError(
        error instanceof Error ? error.message : "Unable to prepare payout resolution.",
      );
    }
  }

  async function reviewCompleteCircle() {
    if (!walletKey) return;
    setLocalError("");

    try {
      const context = await getCurrentRoundContext();
      if (context.currentRoundIndex < context.currentMembers) {
        throw new Error(
          "Every payout round must be resolved on-chain before the circle can be completed.",
        );
      }

      requestReview(
        "Complete circle",
        "Return verified collateral to every active position holder and mark the circle complete.",
        [
          { label: "Circle", value: circle.name },
          { label: "Active members", value: String(activeMembers.length) },
          { label: "Collateral return", value: `${circle.collateral} each` },
        ],
        buildCompleteCircleInstruction({
          activeMemberships: activeMembers.map((member) => ({
            member: new PublicKey(member.member),
            membership: deriveMembershipPda(context.circle, new PublicKey(member.member)),
          })),
          circle: context.circle,
          creator: walletKey,
        }),
      );
    } catch (error) {
      setLocalError(
        error instanceof Error ? error.message : "Unable to prepare circle completion.",
      );
    }
  }

  function reviewOpenDefault() {
    if (!walletKey || !selectedDefaultCandidate) return;
    const context = getContext();
    const candidate = new PublicKey(selectedDefaultCandidate);
    requestReview(
      "Open default proposal",
      "Propose handling a missed contribution after the round deadline. Members can vote during the grace period.",
      [
        { label: "Circle", value: circle.name },
        { label: "Round", value: String(context.currentRoundIndex + 1) },
        { label: "Member", value: shortAddress(selectedDefaultCandidate) },
      ],
      buildOpenDefaultProposalInstruction({
        ...context,
        defaultingMember: candidate,
        proposer: walletKey,
      }),
    );
  }

  function reviewVote(approve: boolean) {
    if (!walletKey || !defaultProposal) return;
    const context = getContext();
    requestReview(
      approve ? "Approve default" : "Reject default",
      "Cast your member-governance vote on the open default proposal.",
      [
        { label: "Circle", value: circle.name },
        { label: "Member", value: defaultProposal.candidateHandle },
        { label: "Vote", value: approve ? "Approve" : "Reject" },
      ],
      buildVoteDefaultInstruction({
        approve,
        ...context,
        defaultingMember: new PublicKey(defaultProposal.candidate),
        voter: walletKey,
      }),
    );
  }

  function reviewHandleDefault() {
    if (!walletKey || !defaultProposal) return;
    const context = getContext();
    requestReview(
      "Handle default",
      "Slash the defaulted position's collateral, use insurance for the missed contribution, and unblock payout resolution.",
      [
        { label: "Circle", value: circle.name },
        { label: "Member", value: defaultProposal.candidateHandle },
        { label: "Backstop", value: "Insurance pool" },
      ],
      buildHandleDefaultInstruction({
        ...context,
        cranker: walletKey,
        defaultingMember: new PublicKey(defaultProposal.candidate),
      }),
    );
  }

  function reviewVouch() {
    if (!walletKey || !selectedVouchCandidate) return;
    try {
      const stakeLamports = solToLamports(vouchStake);
      if (stakeLamports <= 0n) throw new Error("Enter a vouch stake greater than zero.");
      const context = getContext();
      requestReview(
        "Vouch for member",
        "Lock social collateral behind another active member. The stake is released after clean completion or slashed into insurance on default.",
        [
          { label: "Circle", value: circle.name },
          { label: "Candidate", value: shortAddress(selectedVouchCandidate) },
          { label: "Stake", value: `${vouchStake} SOL` },
        ],
        buildVouchMemberInstruction({
          candidate: new PublicKey(selectedVouchCandidate),
          circle: context.circle,
          stakeLamports,
          voucher: walletKey,
        }),
      );
    } catch (error) {
      setLocalError(error instanceof Error ? error.message : "Enter a valid vouch stake.");
    }
  }

  function reviewReleaseVouch(candidate: string) {
    if (!walletKey) return;
    const context = getContext();
    requestReview(
      "Release vouch",
      "Return your social collateral after the vouched member completed the circle cleanly.",
      [
        { label: "Circle", value: circle.name },
        { label: "Candidate", value: shortAddress(candidate) },
      ],
      buildReleaseVouchInstruction({
        candidate: new PublicKey(candidate),
        circle: context.circle,
        voucher: walletKey,
      }),
    );
  }

  function reviewSlashVouch(voucher: string, candidate: string) {
    if (!walletKey) return;
    const context = getContext();
    requestReview(
      "Slash vouch",
      "Move a vouch stake into the insurance pool after the candidate was defaulted.",
      [
        { label: "Circle", value: circle.name },
        { label: "Voucher", value: shortAddress(voucher) },
        { label: "Candidate", value: shortAddress(candidate) },
      ],
      buildSlashVouchInstruction({
        candidate: new PublicKey(candidate),
        circle: context.circle,
        cranker: walletKey,
        voucher: new PublicKey(voucher),
      }),
    );
  }

  const lifecycle = (() => {
    const steps = [
      {
        copy: "Members join and lock collateral until the circle is ready to start.",
        title: "Forming",
      },
      {
        copy: "The host locks admissions and opens the first contribution round.",
        title: "Start round",
      },
      {
        copy: "Each active member funds the round; a slice routes to the insurance pool.",
        title: "Contribute",
      },
      {
        copy: isDutch
          ? "An accepted Dutch bid settles the payout; the next round opens automatically."
          : "The round recipient claims the pot; the next round opens automatically.",
        title: isDutch ? "Settle auction" : "Settle payout",
      },
      {
        copy: "Collateral returns to members and the outcome writes to on-chain reputation.",
        title: "Complete",
      },
    ];

    let current = 1;
    if (circle.status === "Forming") {
      current = circle.members >= circle.memberCap ? 2 : 1;
    } else if (circle.status === "Active") {
      if (allRoundsResolved) current = 5;
      else if (allActiveMembersPaid) current = 4;
      else current = 3;
    } else if (circle.status === "Completed") {
      current = 6;
    }

    return { current, steps };
  })();

  const circleControls = (
    <div className="grid gap-5 lg:grid-cols-2">
      <section className="space-y-2">
        <h3 className="px-1 font-mono text-[0.58rem] uppercase tracking-[0.1em] text-muted">
          Round lifecycle
        </h3>
        {circle.status === "Active" && allRoundsResolved ? (
          isHost ? (
            <ControlListItem
              copy="All payouts are settled. Return collateral and close the circle."
              icon={<BadgeCheck className="h-4 w-4" aria-hidden="true" />}
              label="Complete circle"
              onClick={() => void reviewCompleteCircle()}
            />
          ) : (
            <p className="px-1 text-xs leading-5 text-muted">
              All payout rounds are settled. The host can close the circle.
            </p>
          )
        ) : circle.status === "Active" ? (
          <div className="space-y-1">
            {myMembership?.active && myMembership.state !== "Paid" ? (
              <ControlListItem
                copy={`Pay ${circle.contribution} into the current round.`}
                icon={<CircleDollarSign className="h-4 w-4" aria-hidden="true" />}
                label={`Contribute ${circle.contribution}`}
                onClick={() => void reviewContribution()}
              />
            ) : null}
            {circle.mode === "Dutch bid" && myMembership?.active ? (
              <ControlListItem
                copy="Accept the current Dutch clearing discount. Prior payout recipients cannot win again."
                icon={<Gavel className="h-4 w-4" aria-hidden="true" />}
                label="Accept Dutch bid"
                onClick={() => void reviewDutchBid()}
              />
            ) : null}
            <ControlListItem
              copy={
                allRoundsResolved
                  ? "All payout rounds are already settled."
                  : allActiveMembersPaid
                    ? isDutch
                      ? "Settle the accepted bid and open the next auction round. Prior recipients stay ineligible."
                      : "Resolve the payout and open the next round."
                    : `${unpaidMembers.length} contribution ${unpaidMembers.length === 1 ? "slot" : "slots"} unpaid.`
              }
              disabled={!allActiveMembersPaid || !isHost || allRoundsResolved}
              icon={<Landmark className="h-4 w-4" aria-hidden="true" />}
              label={resolvePayoutLabel}
              onClick={() => void reviewResolveRound()}
            />
            {isHost ? (
              <ControlListItem
                copy={
                  allRoundsResolved
                    ? "Return collateral and close the circle."
                    : `${Math.max(payoutRoundTarget - circle.currentRoundIndex, 0)} payout ${Math.max(payoutRoundTarget - circle.currentRoundIndex, 0) === 1 ? "round" : "rounds"} remain.`
                }
                disabled={!allRoundsResolved}
                icon={<BadgeCheck className="h-4 w-4" aria-hidden="true" />}
                label="Complete circle"
                onClick={() => void reviewCompleteCircle()}
              />
            ) : null}
          </div>
        ) : (
          <p className="px-1 text-xs leading-5 text-muted">
            {circle.status === "Forming"
              ? circle.members >= circle.memberCap
                ? "This circle is full. Any wallet can start the first round."
                : "Join until the host starts the first round."
              : "This circle has completed its payout lifecycle."}
          </p>
        )}
      </section>

      <section className="space-y-2">
        <h3 className="px-1 font-mono text-[0.58rem] uppercase tracking-[0.1em] text-muted">
          Default governance
        </h3>
        {allRoundsResolved ? (
          <p className="px-1 text-xs leading-5 text-muted">
            Default controls are closed after every payout round has settled.
          </p>
        ) : circle.status !== "Active" ? (
          <p className="px-1 text-xs leading-5 text-muted">
            Default controls unlock during an active round.
          </p>
        ) : defaultProposal ? (
          <div className="space-y-2">
            <p className="px-1 text-xs leading-5 text-muted">
              {defaultProposal.candidateHandle} is under proposal for round{" "}
              {defaultProposal.roundIndex + 1}.
            </p>
            {myMembership?.active && myMembership.member !== defaultProposal.candidate ? (
              <div className="flex gap-2 px-1">
                <Button type="button" size="sm" variant="primary" onClick={() => reviewVote(true)}>
                  <Vote className="h-3.5 w-3.5" aria-hidden="true" />
                  Approve
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  onClick={() => reviewVote(false)}
                >
                  Reject
                </Button>
              </div>
            ) : null}
            <ControlListItem
              copy="Resolve the default through the insurance pool."
              icon={<Landmark className="h-4 w-4" aria-hidden="true" />}
              label="Handle default"
              onClick={reviewHandleDefault}
            />
          </div>
        ) : myMembership?.active ? (
          <div className="space-y-2 px-1">
            <div>
              <span className="mb-1.5 block font-mono text-[0.52rem] uppercase tracking-[0.08em] text-muted">
                Missed contributor
              </span>
              <DropdownSelect
                disabled={!unpaidMembers.length}
                label="Missed contributor"
                onChange={setDefaultCandidate}
                options={defaultCandidateOptions}
                value={selectedDefaultCandidate}
              />
            </div>
            <Button
              type="button"
              variant="secondary"
              disabled={!selectedDefaultCandidate}
              onClick={reviewOpenDefault}
            >
              Propose default
            </Button>
          </div>
        ) : (
          <p className="px-1 text-xs leading-5 text-muted">
            Only active members can open a default proposal.
          </p>
        )}
      </section>
    </div>
  );

  return (
    <section id="circle-actions" className="scroll-mt-24 space-y-5" aria-label="Circle actions">
      <TransactionReviewModal
        error={transaction.error}
        onDismiss={transaction.dismiss}
        onSign={() => void transaction.sign()}
        review={transaction.review}
      />
      {localError ? (
        <Panel className="border-warning/25 bg-warning/8 p-4" role="alert">
          <p className="text-sm leading-6 text-foreground">{localError}</p>
        </Panel>
      ) : null}

      <Panel className="p-5">
        <div className="mb-5 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="font-mono text-[0.62rem] uppercase tracking-[0.1em] text-accent">
              Circle lifecycle
            </span>
            <Badge
              tone={circle.status === "Completed" ? "success" : "accent"}
              shape="square"
              size="xs"
            >
              {circle.status}
            </Badge>
          </div>
        </div>
        <p className="mb-6 max-w-2xl text-sm leading-6 text-muted">
          Every action is checked before wallet signing and includes a clear transaction review.
          Follow the phases below — your place in the circle is highlighted.
        </p>
        <ol className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {lifecycle.steps.map((step, index) => {
            const ordinal = index + 1;
            const state =
              ordinal < lifecycle.current
                ? "done"
                : ordinal === lifecycle.current
                  ? "current"
                  : "upcoming";
            return (
              <li
                key={step.title}
                className={cn(
                  "rounded-md border p-4",
                  state === "current" && "border-accent/40 bg-accent/[0.06]",
                  state === "done" && "border-success/30 bg-success/[0.04]",
                  state === "upcoming" && "border-border bg-white/[0.02]",
                )}
              >
                <div className="flex items-center gap-2">
                  <span
                    className={cn(
                      "flex h-6 w-6 items-center justify-center rounded-full font-mono text-[0.65rem]",
                      state === "current" && "bg-accent text-black",
                      state === "done" && "bg-success/20 text-success",
                      state === "upcoming" && "bg-white/[0.06] text-muted",
                    )}
                  >
                    {state === "done" ? (
                      <Check className="h-3.5 w-3.5" aria-hidden="true" />
                    ) : (
                      ordinal
                    )}
                  </span>
                  <span
                    className={cn(
                      "font-mono text-[0.6rem] uppercase tracking-[0.08em]",
                      state === "current" ? "text-accent" : "text-muted",
                    )}
                  >
                    {step.title}
                  </span>
                </div>
                <p className="mt-2 text-xs leading-5 text-muted">{step.copy}</p>
              </li>
            );
          })}
        </ol>
        <div className="mt-5 border-t border-border pt-5">{circleControls}</div>
      </Panel>

      <Panel className="p-5">
        <h3 className="mb-4 font-mono text-[0.62rem] uppercase tracking-[0.1em] text-accent">
          Social collateral
        </h3>
        {allRoundsResolved && circle.status !== "Completed" ? (
          <p className="text-xs leading-5 text-muted">
            Vouch release unlocks after the host completes the circle.
          </p>
        ) : null}
        {myMembership?.active && circle.status !== "Completed" && !allRoundsResolved ? (
          <div className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_8rem_auto] sm:items-end">
              <div>
                <span className="mb-1.5 block font-mono text-[0.52rem] uppercase tracking-[0.08em] text-muted">
                  Member
                </span>
                <DropdownSelect
                  disabled={!candidateOptions.length}
                  label="Member"
                  onChange={setVouchCandidate}
                  options={vouchCandidateOptions}
                  value={selectedVouchCandidate}
                />
              </div>
              <label className="block">
                <span className="mb-1.5 block font-mono text-[0.52rem] uppercase tracking-[0.08em] text-muted">
                  Stake (SOL)
                </span>
                <input
                  className="input-control font-mono text-[0.7rem]"
                  inputMode="decimal"
                  type="text"
                  value={vouchStake}
                  onChange={(event) => setVouchStake(event.target.value)}
                />
              </label>
              <Button
                type="button"
                variant="secondary"
                disabled={!selectedVouchCandidate}
                onClick={reviewVouch}
              >
                Vouch
              </Button>
            </div>
            <p className="text-xs leading-5 text-muted">
              Lock social collateral behind another active member. The stake is released after clean
              completion or slashed on default.
            </p>
          </div>
        ) : null}
        {circle.status === "Completed" && activeVouches.length > 0 ? (
          <div className="space-y-1">
            {activeVouches.map((vouch) => (
              <ControlListItem
                key={vouch.vouch}
                copy={`Release your vouch for ${shortAddress(vouch.candidate)}.`}
                icon={<UserCheck className="h-4 w-4" aria-hidden="true" />}
                label={`Release vouch · ${vouch.stake} SOL`}
                onClick={() => reviewReleaseVouch(vouch.candidate)}
              />
            ))}
          </div>
        ) : null}
        {vouches.some(
          (vouch) =>
            vouch.active &&
            members.some((member) => member.member === vouch.candidate && member.defaulted),
        ) ? (
          <div className="space-y-1 border-t border-white/10 pt-3">
            {vouches
              .filter(
                (vouch) =>
                  vouch.active &&
                  members.some((member) => member.member === vouch.candidate && member.defaulted),
              )
              .map((vouch) => (
                <ControlListItem
                  key={vouch.vouch}
                  copy={`${shortAddress(vouch.candidate)} defaulted.`}
                  icon={<UserCheck className="h-4 w-4" aria-hidden="true" />}
                  label="Slash vouch"
                  onClick={() => reviewSlashVouch(vouch.voucher, vouch.candidate)}
                />
              ))}
          </div>
        ) : null}
        {!myMembership?.active && circle.status !== "Completed" && !allRoundsResolved ? (
          <p className="text-xs leading-5 text-muted">Join as an active member before vouching.</p>
        ) : null}
      </Panel>
    </section>
  );
}

function ControlListItem({
  copy,
  disabled,
  icon,
  label,
  onClick,
}: {
  copy: string;
  disabled?: boolean;
  icon: ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "flex w-full items-start gap-3 rounded-md px-2 py-2 text-left transition-colors hover:bg-white/[0.05] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-40",
      )}
    >
      <span className="mt-0.5 text-accent">{icon}</span>
      <span className="min-w-0">
        <span className="block text-sm font-medium text-foreground">{label}</span>
        <span className="mt-0.5 block text-xs leading-5 text-muted">{copy}</span>
      </span>
    </button>
  );
}
