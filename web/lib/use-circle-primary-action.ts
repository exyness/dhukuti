"use client";

import { useConnection } from "@solana/wallet-adapter-react";
import { PublicKey } from "@solana/web3.js";
import { useEffect, useMemo, useState } from "react";
import { useProfileQuery } from "@/lib/data/queries";
import type { CircleDetail } from "@/lib/data/types";
import {
  buildClaimHostReputationInstruction,
  buildCompleteCircleInstruction,
  buildContributeInstruction,
  buildDutchBidInstruction,
  buildJoinCircleInstruction,
  buildResolveRoundInstruction,
  buildStartCircleInstruction,
  buildUpdateReputationInstruction,
  deriveMembershipPda,
  fetchCircleState,
  fetchMembershipState,
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

export type ReputationGate = {
  current: number;
  required: number;
  status: "blocked" | "checking";
};

type ReputationClaimState = {
  hostReputationClaimed: boolean;
  isLoading: boolean;
  key: string;
  memberCompletionClaimed: boolean;
};

const EMPTY_REPUTATION_CLAIM_STATE: ReputationClaimState = {
  hostReputationClaimed: false,
  isLoading: false,
  key: "",
  memberCompletionClaimed: false,
};

export function useCirclePrimaryAction(detail: CircleDetail, options?: { justResolved?: boolean }) {
  const { connection } = useConnection();
  const { address } = useWalletIdentity();
  const transaction = useProgramTransaction();
  const profileQuery = useProfileQuery(address);
  const [localError, setLocalError] = useState("");
  const [reputationClaimState, setReputationClaimState] = useState<ReputationClaimState>(
    EMPTY_REPUTATION_CLAIM_STATE,
  );
  const { circle, members, payoutSchedule } = detail;
  const wallet = address ?? "";
  const walletKey = useMemo(() => (wallet ? new PublicKey(wallet) : null), [wallet]);
  const myMembership = members.find((member) => member.member === wallet);
  const currentReputation =
    Number.parseInt(profileQuery.data?.stats.memberReputation ?? "0", 10) || 0;
  const isJoinCandidate = circle.status === "Forming" && !myMembership && Boolean(walletKey);
  const reputationGate: ReputationGate | null =
    isJoinCandidate &&
    circle.minReputation > 0 &&
    (profileQuery.isLoading || currentReputation < circle.minReputation)
      ? {
          current: currentReputation,
          required: circle.minReputation,
          status: profileQuery.isLoading ? "checking" : "blocked",
        }
      : null;
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
  const canClaimMemberReputation =
    circle.status === "Completed" && Boolean(myMembership?.active && !myMembership.defaulted);
  const canClaimHostReputation = circle.status === "Completed" && isHost;
  const canCheckReputationClaim =
    circle.status === "Completed" && Boolean(walletKey) && (canClaimMemberReputation || isHost);
  const reputationClaimKey = canCheckReputationClaim ? `${circle.address}:${wallet}` : "";
  const currentReputationClaimState =
    reputationClaimState.key === reputationClaimKey
      ? reputationClaimState
      : {
          ...EMPTY_REPUTATION_CLAIM_STATE,
          isLoading: canCheckReputationClaim,
          key: reputationClaimKey,
        };
  const hostReputationClaimed =
    currentReputationClaimState.hostReputationClaimed ||
    (transaction.review?.status === "confirmed" &&
      transaction.review.title === "Claim host reputation");
  const memberCompletionClaimed =
    currentReputationClaimState.memberCompletionClaimed ||
    (transaction.review?.status === "confirmed" &&
      transaction.review.title === "Claim member reputation");

  useEffect(() => {
    if (!canCheckReputationClaim || !walletKey) return;

    const circleKey = new PublicKey(circle.address);
    let cancelled = false;

    Promise.all([
      canClaimMemberReputation
        ? fetchMembershipState(connection, circleKey, walletKey)
        : Promise.resolve(null),
      isHost ? fetchCircleState(connection, circleKey) : Promise.resolve(null),
    ])
      .then(([membershipState, circleState]) => {
        if (cancelled) return;
        setReputationClaimState({
          hostReputationClaimed: circleState?.hostReputationClaimed ?? false,
          isLoading: false,
          key: reputationClaimKey,
          memberCompletionClaimed: membershipState?.completionReputationClaimed ?? false,
        });
      })
      .catch(() => {
        if (cancelled) return;
        setReputationClaimState({
          ...EMPTY_REPUTATION_CLAIM_STATE,
          key: reputationClaimKey,
        });
      });

    return () => {
      cancelled = true;
    };
  }, [
    canClaimMemberReputation,
    canCheckReputationClaim,
    circle.address,
    connection,
    isHost,
    reputationClaimKey,
    walletKey,
  ]);

  useEffect(() => {
    const review = transaction.review;
    if (review?.status !== "confirmed") return;
    if (review.title === "Claim host reputation") {
      Promise.resolve().then(() => {
        setReputationClaimState((state) =>
          state.key === reputationClaimKey ? { ...state, hostReputationClaimed: true } : state,
        );
      });
    }
    if (review.title === "Claim member reputation") {
      Promise.resolve().then(() => {
        setReputationClaimState((state) =>
          state.key === reputationClaimKey ? { ...state, memberCompletionClaimed: true } : state,
        );
      });
    }
  }, [reputationClaimKey, transaction.review]);

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

  async function reviewDutchBid() {
    if (!walletKey) return;
    try {
      const context = await getCurrentRoundContext();
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
    } catch (error) {
      setLocalError(error instanceof Error ? error.message : "Unable to prepare this Dutch bid.");
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

  async function reviewClaimMemberReputation() {
    if (!walletKey) return;
    setLocalError("");

    try {
      const context = getContext();
      const membershipState = await fetchMembershipState(connection, context.circle, walletKey);
      if (!membershipState.active || membershipState.roundsMissed > 0) {
        throw new Error(
          "Only active members without missed rounds can claim completion reputation.",
        );
      }
      if (membershipState.completionReputationClaimed) {
        setReputationClaimState((state) => ({ ...state, memberCompletionClaimed: true }));
        throw new Error("Member reputation was already claimed for this circle.");
      }

      requestReview(
        "Claim member reputation",
        "Record this completed circle on your protocol reputation account.",
        [
          { label: "Circle", value: circle.name },
          { label: "Wallet", value: shortAddress(walletKey.toBase58()) },
          { label: "Reward", value: "+100 member reputation" },
        ],
        buildUpdateReputationInstruction({
          circle: context.circle,
          cranker: walletKey,
          event: "CircleCompleted",
          wallet: walletKey,
        }),
      );
    } catch (error) {
      setLocalError(error instanceof Error ? error.message : "Unable to prepare reputation claim.");
    }
  }

  async function reviewClaimHostReputation() {
    if (!walletKey) return;
    setLocalError("");

    try {
      const context = getContext();
      const onChainCircle = await fetchCircleState(connection, context.circle);
      if (onChainCircle.hostReputationClaimed) {
        setReputationClaimState((state) => ({ ...state, hostReputationClaimed: true }));
        throw new Error("Host reputation was already claimed for this circle.");
      }

      requestReview(
        "Claim host reputation",
        "Record host completion credit for closing this circle successfully.",
        [
          { label: "Circle", value: circle.name },
          { label: "Host", value: shortAddress(circle.creator) },
          { label: "Reward", value: "+150 host reputation, plus no-default bonus if eligible" },
        ],
        buildClaimHostReputationInstruction({
          circle: context.circle,
          cranker: walletKey,
          host: new PublicKey(circle.creator),
        }),
      );
    } catch (error) {
      setLocalError(
        error instanceof Error ? error.message : "Unable to prepare host reputation claim.",
      );
    }
  }

  let primaryAction: PrimaryAction | null = null;

  if (circle.status === "Forming" && !myMembership) {
    if (reputationGate?.status === "checking") {
      primaryAction = {
        disabled: true,
        label: "Checking reputation",
        onClick: () => undefined,
        tone: "muted",
      };
    } else if (reputationGate?.status === "blocked") {
      primaryAction = {
        disabled: true,
        label: "Reputation required",
        onClick: () => undefined,
        tone: "muted",
      };
    } else {
      primaryAction = { label: "Join circle", onClick: reviewJoin, tone: "accent" };
    }
  } else if (
    circle.status === "Forming" &&
    ((isHost && circle.members >= 2) || circle.members >= circle.memberCap)
  ) {
    primaryAction = { label: "Start circle", onClick: reviewStart, tone: "accent" };
  } else if (circle.status === "Active" && isHost && allRoundsResolved) {
    primaryAction = {
      label: "Complete circle",
      onClick: () => void reviewCompleteCircle(),
      tone: "accent",
    };
  } else if (
    canClaimHostReputation &&
    currentReputationClaimState.isLoading &&
    !hostReputationClaimed
  ) {
    primaryAction = {
      disabled: true,
      label: "Checking reputation",
      onClick: () => undefined,
      tone: "muted",
    };
  } else if (canClaimHostReputation && !hostReputationClaimed) {
    primaryAction = {
      label: "Claim host reputation",
      onClick: () => void reviewClaimHostReputation(),
      tone: "accent",
    };
  } else if (
    canClaimMemberReputation &&
    currentReputationClaimState.isLoading &&
    !memberCompletionClaimed
  ) {
    primaryAction = {
      disabled: true,
      label: "Checking reputation",
      onClick: () => undefined,
      tone: "muted",
    };
  } else if (canClaimMemberReputation && !memberCompletionClaimed) {
    primaryAction = {
      label: "Claim member reputation",
      onClick: () => void reviewClaimMemberReputation(),
      tone: "accent",
    };
  } else if (circle.status === "Active" && myMembership?.active && myMembership.state !== "Paid") {
    primaryAction = {
      label: `Contribute ${circle.contribution}`,
      onClick: () => void reviewContribution(),
      tone: "accent",
    };
  } else if (
    circle.status === "Active" &&
    isHost &&
    allActiveMembersPaid &&
    !allRoundsResolved &&
    !options?.justResolved
  ) {
    primaryAction = {
      label: resolvePayoutLabel,
      onClick: () => void reviewResolveRound(),
      tone: "accent",
    };
  } else if (
    circle.status === "Active" &&
    isDutch &&
    myMembership?.active &&
    !allRoundsResolved &&
    !options?.justResolved
  ) {
    primaryAction = {
      label: "Accept Dutch bid",
      onClick: () => void reviewDutchBid(),
      tone: "accent",
    };
  }

  return { localError, primaryAction, reputationGate, transaction };
}
