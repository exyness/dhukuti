"use client";

import { useConnection } from "@solana/wallet-adapter-react";
import { PublicKey } from "@solana/web3.js";
import { useMemo, useState } from "react";
import type { CircleDetail } from "@/lib/data/types";
import {
  buildContributeInstruction,
  buildJoinCircleInstruction,
  buildResolveRoundInstruction,
  buildStartCircleInstruction,
  deriveMembershipPda,
  fetchRoundState,
  type ProgramInstructionBundle,
} from "@/lib/program";
import { useProgramTransaction } from "@/lib/use-program-transaction";
import { useWalletIdentity } from "@/lib/use-wallet-identity";
import { truncateAddress as shortAddress } from "@/lib/wallet";

export type PrimaryAction = {
  label: string;
  onClick: () => void;
  tone: "accent" | "muted";
  disabled?: boolean;
};

export function useCirclePrimaryAction(detail: CircleDetail) {
  const { connection } = useConnection();
  const { address } = useWalletIdentity();
  const transaction = useProgramTransaction();
  const [localError, setLocalError] = useState("");
  const { circle, members } = detail;
  const wallet = address ?? "";
  const walletKey = useMemo(() => (wallet ? new PublicKey(wallet) : null), [wallet]);
  const myMembership = members.find((member) => member.member === wallet);
  const activeMembers = members.filter((member) => member.active);
  const unpaidMembers = activeMembers.filter((member) => member.state !== "Paid");
  const allActiveMembersPaid = activeMembers.length > 0 && unpaidMembers.length === 0;
  const isHost = circle.creator === wallet;

  function getContext() {
    return {
      circle: new PublicKey(circle.address),
      circleId: BigInt(circle.circleId),
      creator: new PublicKey(circle.creator),
      currentRoundIndex: circle.currentRoundIndex,
    };
  }

  function requestReview(
    title: string,
    description: string,
    details: { label: string; value: string }[],
    bundle: ProgramInstructionBundle,
  ) {
    setLocalError("");
    void transaction.preview({ bundle, description, details, title }).catch(() => undefined);
  }

  function reviewJoin() {
    if (!walletKey) return;
    const context = getContext();
    const bundle = buildJoinCircleInstruction({
      circle: context.circle,
      member: walletKey,
      minReputation: BigInt(circle.minReputation),
    });
    requestReview(
      "Join circle",
      "Lock the required collateral and mint a 1-of-1 payout position to your wallet.",
      [
        { label: "Circle", value: circle.name },
        { label: "Collateral", value: circle.collateral },
        { label: "Admission gate", value: `${circle.minReputation} reputation` },
        { label: "Position mint", value: shortAddress(bundle.positionNftMint.toBase58(), 5) },
      ],
      bundle,
    );
  }

  function reviewStart() {
    if (!walletKey) return;
    const context = getContext();
    requestReview(
      "Start circle",
      "Lock admissions and create the first contribution round on devnet.",
      [
        { label: "Circle", value: circle.name },
        { label: "Members", value: `${circle.members}/${circle.memberCap}` },
        { label: "First deadline", value: `${circle.cycle} from confirmation` },
      ],
      buildStartCircleInstruction({ circle: context.circle, starter: walletKey }),
    );
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

  let primaryAction: PrimaryAction | null = null;

  if (circle.status === "Forming" && !myMembership) {
    primaryAction = { label: "Review join", onClick: reviewJoin, tone: "accent" };
  } else if (
    circle.status === "Forming" &&
    ((isHost && circle.members >= 2) || circle.members >= circle.memberCap)
  ) {
    primaryAction = { label: "Review start", onClick: reviewStart, tone: "accent" };
  } else if (circle.status === "Active" && myMembership?.active && myMembership.state !== "Paid") {
    primaryAction = { label: "Review contribution", onClick: reviewContribution, tone: "accent" };
  } else if (circle.status === "Active" && allActiveMembersPaid) {
    primaryAction = {
      label: "Review payout",
      onClick: () => void reviewResolveRound(),
      tone: "accent",
    };
  }

  return { localError, primaryAction, transaction };
}
