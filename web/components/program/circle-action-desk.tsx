"use client";

import { useConnection } from "@solana/wallet-adapter-react";
import { PublicKey } from "@solana/web3.js";
import { BadgeCheck, CircleDollarSign, Gavel, Landmark, UserCheck, Vote } from "lucide-react";
import { type ReactNode, useMemo, useState } from "react";
import { Panel } from "@/components/app/app-shell";
import { TransactionReviewModal } from "@/components/circles/TransactionReviewModal";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";
import type { CircleDetail } from "@/lib/data/types";
import {
  buildClaimHostReputationInstruction,
  buildCompleteCircleInstruction,
  buildContributeInstruction,
  buildDutchBidInstruction,
  buildHandleDefaultInstruction,
  buildOpenDefaultProposalInstruction,
  buildReleaseVouchInstruction,
  buildResolveRoundInstruction,
  buildSlashVouchInstruction,
  buildUpdateReputationInstruction,
  buildVoteDefaultInstruction,
  buildVouchMemberInstruction,
  deriveMembershipPda,
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
  const { circle, defaultProposal, members, vouches } = detail;
  const wallet = address ?? "";
  const myMembership = members.find((member) => member.member === wallet);
  const activeMembers = members.filter((member) => member.active);
  const unpaidMembers = activeMembers.filter((member) => member.state !== "Paid");
  const allActiveMembersPaid = activeMembers.length > 0 && unpaidMembers.length === 0;
  const allRoundsResolved = circle.currentRoundIndex >= circle.memberCap;
  const isHost = circle.creator === wallet;
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

  function reviewContribution() {
    if (!walletKey) return;
    const context = getContext();
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
  }

  function reviewDutchBid() {
    if (!walletKey) return;
    const context = getContext();
    requestReview(
      "Accept Dutch bid",
      "Accept the current clearing discount for this round. If no earlier bid exists, your wallet becomes the payout recipient.",
      [
        { label: "Circle", value: circle.name },
        { label: "Round", value: String(context.currentRoundIndex + 1) },
        { label: "Payout model", value: "Dutch auction" },
      ],
      buildDutchBidInstruction({ ...context, bidder: walletKey }),
    );
  }

  async function reviewResolveRound() {
    if (!walletKey) return;
    setLocalError("");

    try {
      const context = getContext();
      let recipient = members.find(
        (member) => member.joinOrder === context.currentRoundIndex,
      )?.member;

      if (circle.mode === "Dutch bid") {
        const round = await fetchRoundState(connection, context.circle, context.currentRoundIndex);
        recipient = round.auctionWinner ?? undefined;
      }

      if (!recipient) {
        throw new Error("No payout recipient is available for this round yet.");
      }

      requestReview(
        "Resolve payout",
        "Pay the funded round from the program vault and atomically open the next round.",
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

  function reviewCompleteCircle() {
    if (!walletKey) return;
    const context = getContext();
    requestReview(
      "Complete circle",
      "Return verified collateral to every active position holder and mark the circle complete.",
      [
        { label: "Circle", value: circle.name },
        { label: "Active members", value: String(activeMembers.length) },
        { label: "Collateral return", value: circle.collateral },
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

  function reviewMemberReputation() {
    if (!walletKey || !myMembership) return;
    const context = getContext();
    const event = myMembership.defaulted ? "CircleDefaulted" : "CircleCompleted";
    requestReview(
      myMembership.defaulted ? "Record default reputation" : "Claim member reputation",
      "Write the verified circle outcome into your portable on-chain reputation account.",
      [
        { label: "Circle", value: circle.name },
        { label: "Outcome", value: myMembership.defaulted ? "Defaulted" : "Completed" },
      ],
      buildUpdateReputationInstruction({
        circle: context.circle,
        cranker: walletKey,
        event,
        wallet: walletKey,
      }),
    );
  }

  function reviewHostReputation() {
    if (!walletKey) return;
    const context = getContext();
    requestReview(
      "Claim host reputation",
      "Record the completed hosting outcome in your portable reputation account.",
      [
        { label: "Circle", value: circle.name },
        { label: "Defaults handled", value: "Verified on-chain" },
      ],
      buildClaimHostReputationInstruction({
        circle: context.circle,
        cranker: walletKey,
        host: walletKey,
      }),
    );
  }

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
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-[0.62rem] uppercase tracking-[0.1em] text-accent">
                Protocol controls
              </span>
              <Badge
                tone={circle.status === "Completed" ? "success" : "accent"}
                shape="square"
                size="xs"
              >
                {circle.status}
              </Badge>
            </div>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">
              Every action is checked before wallet signing and includes a clear transaction review.
            </p>
          </div>
          <Badge
            tone={circle.status === "Completed" ? "success" : "accent"}
            shape="square"
            size="sm"
          >
            {circle.status}
          </Badge>
        </div>
      </Panel>

      <Panel className="p-5">
        <div className="mb-6 flex items-center gap-2">
          <CircleDollarSign className="h-4 w-4 text-accent" aria-hidden="true" />
          <h2 className="font-mono text-[0.64rem] uppercase tracking-[0.1em] text-muted">
            Circle controls
          </h2>
        </div>
        <div className="grid gap-x-8 gap-y-8 lg:grid-cols-2">
          <section className="space-y-4">
            <h3 className="font-mono text-[0.6rem] uppercase tracking-[0.1em] text-muted">
              Round lifecycle
            </h3>
            {circle.status === "Active" ? (
              <div className="grid gap-3 md:grid-cols-2">
                {myMembership?.active && myMembership.state !== "Paid" ? (
                  <ActionButton
                    copy={`Pay ${circle.contribution} into the current round.`}
                    icon={<CircleDollarSign className="h-4 w-4" aria-hidden="true" />}
                    label="Review contribution"
                    onClick={reviewContribution}
                    primary
                  />
                ) : null}
                {circle.mode === "Dutch bid" && myMembership?.active ? (
                  <ActionButton
                    copy="Accept the current Dutch clearing discount for an early payout."
                    icon={<Gavel className="h-4 w-4" aria-hidden="true" />}
                    label="Review Dutch bid"
                    onClick={reviewDutchBid}
                  />
                ) : null}
                <ActionButton
                  copy={
                    allActiveMembersPaid
                      ? "All active contribution slots are funded. Resolve the payout and open the next round."
                      : `${unpaidMembers.length} active contribution ${unpaidMembers.length === 1 ? "slot remains" : "slots remain"}.`
                  }
                  disabled={!allActiveMembersPaid}
                  icon={<Landmark className="h-4 w-4" aria-hidden="true" />}
                  label="Review payout resolution"
                  onClick={() => void reviewResolveRound()}
                />
                {isHost ? (
                  <ActionButton
                    copy={
                      allRoundsResolved
                        ? "Every payout is resolved. Return collateral and close the circle."
                        : `${circle.memberCap - circle.currentRoundIndex} payout ${circle.memberCap - circle.currentRoundIndex === 1 ? "round remains" : "rounds remain"} before collateral can be returned.`
                    }
                    disabled={!allRoundsResolved}
                    icon={<BadgeCheck className="h-4 w-4" aria-hidden="true" />}
                    label="Review circle completion"
                    onClick={reviewCompleteCircle}
                  />
                ) : null}
              </div>
            ) : (
              <p className="text-sm leading-6 text-muted">
                {circle.status === "Forming"
                  ? circle.members >= circle.memberCap
                    ? "This circle is full. Any connected wallet can start the first round."
                    : "Join the circle until the host starts its first round."
                  : "This circle has completed its payout lifecycle."}
              </p>
            )}
          </section>

          <section className="space-y-4">
            <h3 className="font-mono text-[0.6rem] uppercase tracking-[0.1em] text-muted">
              Default governance
            </h3>
            {circle.status !== "Active" ? (
              <p className="text-sm leading-6 text-muted">
                Default controls unlock only during an active round.
              </p>
            ) : defaultProposal ? (
              <div className="space-y-3">
                <p className="text-sm leading-6 text-muted">
                  {defaultProposal.candidateHandle} is under proposal for round{" "}
                  {defaultProposal.roundIndex + 1}.
                </p>
                {myMembership?.active && myMembership.member !== defaultProposal.candidate ? (
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant="primary"
                      onClick={() => reviewVote(true)}
                    >
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
                <Button
                  type="button"
                  variant="secondary"
                  className="w-full"
                  onClick={reviewHandleDefault}
                >
                  Review default handling
                </Button>
              </div>
            ) : myMembership?.active ? (
              <>
                <label className="block">
                  <span className="mb-2 block font-mono text-[0.58rem] uppercase tracking-[0.08em] text-muted">
                    Missed contributor
                  </span>
                  <select
                    className="input-control font-mono text-[0.75rem]"
                    value={selectedDefaultCandidate}
                    onChange={(event) => setDefaultCandidate(event.target.value)}
                  >
                    {unpaidMembers.length === 0 ? (
                      <option value="">No missed contributors</option>
                    ) : null}
                    {unpaidMembers.map((member) => (
                      <option key={member.member} value={member.member}>
                        {member.handle}
                      </option>
                    ))}
                  </select>
                </label>
                <Button
                  type="button"
                  variant="secondary"
                  className="w-full"
                  disabled={!selectedDefaultCandidate}
                  onClick={reviewOpenDefault}
                >
                  Review default proposal
                </Button>
              </>
            ) : (
              <p className="text-sm leading-6 text-muted">
                Only active members can open a default proposal.
              </p>
            )}
          </section>

          <section className="space-y-4">
            <h3 className="font-mono text-[0.6rem] uppercase tracking-[0.1em] text-muted">
              Social collateral
            </h3>
            {myMembership?.active && circle.status !== "Completed" ? (
              <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_8.5rem_auto] sm:items-end">
                <label className="block">
                  <span className="mb-2 block font-mono text-[0.58rem] uppercase tracking-[0.08em] text-muted">
                    Member
                  </span>
                  <select
                    className="input-control font-mono text-[0.75rem]"
                    value={selectedVouchCandidate}
                    onChange={(event) => setVouchCandidate(event.target.value)}
                  >
                    {candidateOptions.map((member) => (
                      <option key={member.member} value={member.member}>
                        {member.handle} · rep {member.reputation}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block">
                  <span className="mb-2 block font-mono text-[0.58rem] uppercase tracking-[0.08em] text-muted">
                    Stake (SOL)
                  </span>
                  <input
                    className="input-control font-mono text-[0.75rem]"
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
                  Review vouch
                </Button>
              </div>
            ) : null}
            {circle.status === "Completed" && activeVouches.length > 0 ? (
              <div className="space-y-2">
                {activeVouches.map((vouch) => (
                  <Button
                    key={vouch.vouch}
                    type="button"
                    variant="secondary"
                    className="w-full justify-between"
                    onClick={() => reviewReleaseVouch(vouch.candidate)}
                  >
                    Release vouch for {shortAddress(vouch.candidate)}
                    <span className="font-mono tabular-nums normal-case tracking-normal">
                      {vouch.stake}
                    </span>
                  </Button>
                ))}
              </div>
            ) : null}
            {vouches.some(
              (vouch) =>
                vouch.active &&
                members.some((member) => member.member === vouch.candidate && member.defaulted),
            ) ? (
              <div className="space-y-2 border-t border-border pt-4">
                {vouches
                  .filter(
                    (vouch) =>
                      vouch.active &&
                      members.some(
                        (member) => member.member === vouch.candidate && member.defaulted,
                      ),
                  )
                  .map((vouch) => (
                    <Button
                      key={vouch.vouch}
                      type="button"
                      variant="secondary"
                      className="w-full"
                      onClick={() => reviewSlashVouch(vouch.voucher, vouch.candidate)}
                    >
                      Review vouch slash · {shortAddress(vouch.candidate)}
                    </Button>
                  ))}
              </div>
            ) : null}
            {!myMembership?.active && circle.status !== "Completed" ? (
              <p className="text-sm leading-6 text-muted">
                Join as an active member before creating a vouch.
              </p>
            ) : null}
          </section>

          <section className="space-y-4">
            <h3 className="font-mono text-[0.6rem] uppercase tracking-[0.1em] text-muted">
              Reputation settlement
            </h3>
            {(circle.status === "Completed" || myMembership?.defaulted) && myMembership ? (
              <ActionButton
                copy={
                  myMembership.defaulted
                    ? "Record the defaulted circle outcome in your reputation account."
                    : "Claim your member completion score from the verified circle outcome."
                }
                icon={<UserCheck className="h-4 w-4" aria-hidden="true" />}
                label={
                  myMembership.defaulted ? "Review default reputation" : "Review member reputation"
                }
                onClick={reviewMemberReputation}
              />
            ) : null}
            {circle.status === "Completed" && isHost ? (
              <ActionButton
                copy="Record the completed host outcome and any default history."
                icon={<BadgeCheck className="h-4 w-4" aria-hidden="true" />}
                label="Review host reputation"
                onClick={reviewHostReputation}
              />
            ) : null}
            {circle.status !== "Completed" && !myMembership?.defaulted ? (
              <p className="text-sm leading-6 text-muted">
                Reputation settlement becomes available after the full circle lifecycle completes.
              </p>
            ) : null}
          </section>
        </div>
      </Panel>
    </section>
  );
}

function ActionButton({
  copy,
  disabled,
  icon,
  label,
  onClick,
  primary,
}: {
  copy: string;
  disabled?: boolean;
  icon: ReactNode;
  label: string;
  onClick: () => void;
  primary?: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-md border border-border bg-white/[0.02] p-4",
        disabled && "opacity-65",
      )}
    >
      <div className="flex items-start gap-3">
        <span className="mt-0.5 text-accent">{icon}</span>
        <p className="text-sm leading-6 text-muted">{copy}</p>
      </div>
      <Button
        type="button"
        variant={primary ? "primary" : "secondary"}
        size="sm"
        className="mt-4"
        disabled={disabled}
        onClick={onClick}
      >
        {label}
      </Button>
    </div>
  );
}
