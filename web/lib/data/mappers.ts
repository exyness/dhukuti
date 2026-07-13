import {
  formatCollateral,
  formatCycle,
  formatDeadline,
  formatPot,
  formatSolValue,
  shortAddress,
  toBigIntString,
  toInteger,
} from "@/lib/data/format";
import type {
  CircleDetail,
  CircleMember,
  CircleMode,
  CircleStatus,
  CircleSummary,
  CircleVouch,
  DefaultProposal,
  MarketListing,
  PayoutScheduleRow,
  ProfileData,
} from "@/lib/data/types";
import type {
  DhukutiCircleRow,
  DhukutiContributionRow,
  DhukutiDefaultProposalRow,
  DhukutiListingRow,
  DhukutiMembershipRow,
  DhukutiReputationRow,
  DhukutiRoundRow,
  DhukutiVouchRow,
} from "@/lib/supabase/types";

const ZERO_BIGINT = BigInt(0);
const BPS_DENOMINATOR = BigInt(10_000);

type CircleMapInput = {
  contributions?: DhukutiContributionRow[];
  defaultProposals?: DhukutiDefaultProposalRow[];
  memberships?: DhukutiMembershipRow[];
  reputations?: DhukutiReputationRow[];
  row: DhukutiCircleRow;
  rounds?: DhukutiRoundRow[];
  viewerWallet?: string;
  vouches?: DhukutiVouchRow[];
};

export function mapCircleSummary({
  contributions = [],
  memberships = [],
  row,
  rounds = [],
  viewerWallet,
}: CircleMapInput): CircleSummary {
  const contributionAmount = toBigIntString(row.contribution_amount);
  const activeMembers = memberships.filter((member) => member.active && !member.defaulted);
  const memberCount = activeMembers.length;
  const status = mapCircleStatus(row.status);
  const maxMembers = row.max_members;
  const payoutRoundTarget = status === "Forming" ? maxMembers : Math.max(memberships.length, 1);
  const roundState = getCurrentRoundState(rounds, payoutRoundTarget, status);
  const { allRoundsResolved, currentRound, currentRoundIndex } = roundState;
  const insuranceLamports = contributions.reduce(
    (total, contribution) => total + BigInt(toBigIntString(contribution.insurance_fee)),
    ZERO_BIGINT,
  );
  const isViewerMember = viewerWallet
    ? memberships.some((member) => member.member === viewerWallet)
    : false;
  const isViewerHost = Boolean(viewerWallet && viewerWallet === row.creator);
  const displayRoundNumber =
    payoutRoundTarget > 0
      ? Math.min(currentRoundIndex + 1, payoutRoundTarget)
      : currentRoundIndex + 1;

  return {
    address: row.circle,
    circleId: toBigIntString(row.circle_id),
    collateral: formatCollateral(contributionAmount, row.collateral_bps),
    collateralBps: row.collateral_bps,
    contribution: formatSolValue(contributionAmount),
    contributionLamports: contributionAmount,
    creator: row.creator,
    currentRoundIndex,
    cycle: formatCycle(toInteger(row.cycle_duration_seconds)),
    cycleDurationSeconds: toInteger(row.cycle_duration_seconds),
    deadline: allRoundsResolved ? "All settled" : formatDeadline(currentRound?.deadline_ts),
    deadlineAt: currentRound?.deadline_ts ?? null,
    id: row.circle,
    insurance: formatSolValue(insuranceLamports.toString()),
    insuranceFeeBps: row.insurance_fee_bps,
    memberCap: maxMembers,
    members: memberCount,
    minReputation: toInteger(row.min_reputation),
    mode: mapPayoutCurve(row.payout_curve),
    name: row.name || `Dhukuti #${row.circle_id}`,
    nextAction:
      status === "Forming"
        ? memberCount >= maxMembers
          ? "Start circle"
          : isViewerMember
            ? "Awaiting start"
            : "Join Circle"
        : nextActionForStatus(status, row.payout_curve, allRoundsResolved, isViewerHost),
    nextPayout: allRoundsResolved
      ? "Settlement"
      : currentRound
        ? `Round ${String(currentRound.round_index + 1).padStart(2, "0")}`
        : "Start circle",
    pot: formatPot(contributionAmount, maxMembers),
    progress: maxMembers > 0 ? Math.round((memberCount / maxMembers) * 100) : 0,
    reserveRatioBps: row.reserve_ratio_bps,
    round:
      currentRound || allRoundsResolved
        ? `${displayRoundNumber} / ${payoutRoundTarget}`
        : `0 / ${payoutRoundTarget}`,
    status,
    updatedAt: row.updated_at,
  };
}

export function mapCircleDetail(input: CircleMapInput): CircleDetail {
  const circle = mapCircleSummary(input);
  const allRoundsResolved = circle.currentRoundIndex >= circle.memberCap;
  const reputationByWallet = new Map(
    (input.reputations ?? []).map((reputation) => [reputation.wallet, reputation]),
  );
  const currentRoundContributors = new Set(
    (input.contributions ?? [])
      .filter((contribution) => contribution.round_index === circle.currentRoundIndex)
      .map((contribution) => contribution.member),
  );
  const vouches = mapCircleVouches(input.vouches ?? []);
  const members = [...(input.memberships ?? [])]
    .sort((a, b) => a.join_order - b.join_order)
    .map((membership): CircleMember => {
      const member = membership.member;
      const memberVouches = vouches.filter((vouch) => vouch.candidate === member && vouch.active);
      const state = membership.defaulted
        ? "Default risk"
        : membership.active
          ? allRoundsResolved || currentRoundContributors.has(member)
            ? "Paid"
            : "Pending"
          : "Inactive";

      return {
        active: membership.active,
        collateral: formatSolValue(membership.collateral_deposited),
        defaulted: membership.defaulted,
        handle: shortAddress(member),
        joinOrder: membership.join_order,
        member,
        nextPayout: `Round ${String(membership.join_order + 1).padStart(2, "0")}`,
        positionNftMint: membership.position_nft_mint,
        reputation: toInteger(reputationByWallet.get(member)?.score),
        role: membership.join_order === 0 ? "Host" : "Member",
        state,
        summary: membership.defaulted
          ? "This membership was marked in default."
          : "Membership confirmed by the circle.",
        vouch:
          memberVouches.length > 0
            ? `${memberVouches.length} active ${memberVouches.length === 1 ? "vouch" : "vouches"}`
            : "No active vouch",
      };
    });

  const payoutSchedule = buildPayoutSchedule(circle, input.rounds ?? [], members);
  const defaultProposal = mapDefaultProposal(input.defaultProposals ?? [], members, circle);

  return { circle, defaultProposal, members, payoutSchedule, vouches };
}

export function mapMarketListing({
  circle,
  listing,
  reputation,
}: {
  circle?: CircleSummary;
  listing: DhukutiListingRow;
  reputation?: DhukutiReputationRow;
}): MarketListing {
  const askLamports = toBigIntString(listing.ask_price);
  const contributionLamports = circle?.contributionLamports ?? "0";
  const payoutValue = contributionLamports === "0" ? askLamports : contributionLamports;
  const discountBps =
    BigInt(payoutValue) > ZERO_BIGINT
      ? Number(
          ((BigInt(payoutValue) - BigInt(askLamports)) * BPS_DENOMINATOR) / BigInt(payoutValue),
        )
      : 0;

  return {
    active: listing.active,
    ask: formatSolValue(askLamports),
    askLamports,
    cancelled: listing.cancelled,
    circle: circle?.name ?? shortAddress(listing.circle),
    circleAddress: listing.circle,
    discount: `${Math.max(discountBps / 100, 0).toFixed(1)}%`,
    id: shortAddress(listing.listing, 3),
    listing: listing.listing,
    round:
      listing.join_order === null
        ? "Indexed position"
        : `Round ${String(listing.join_order + 1).padStart(2, "0")}`,
    seller: listing.seller,
    sellerRep: toInteger(reputation?.score),
    sold: listing.sold,
    positionNftMint: listing.position_nft_mint,
    value: formatSolValue(payoutValue),
  };
}

export function emptyProfile(wallet: string | null): ProfileData {
  return {
    activeCircles: [],
    circleHistory: [],
    hostedCircles: [],
    listings: [],
    positions: [],
    stats: {
      activeCircles: "0",
      collateralLocked: "0 SOL",
      completedCircles: "0",
      contributionVolume: "0 SOL",
      defaultedCircles: "0",
      discountTier: "0",
      hostedCircles: "0",
      hostCompletions: "0",
      memberReputation: "0",
      vouchesMade: "0",
      vouchedStake: "0 SOL",
    },
    wallet,
  };
}

function mapDefaultProposal(
  proposals: DhukutiDefaultProposalRow[],
  members: CircleMember[],
  circle: CircleSummary,
): DefaultProposal | null {
  const proposal = proposals.find(
    (item) => !item.resolved && item.round_index === circle.currentRoundIndex,
  );
  if (!proposal) return null;

  return {
    approvals: bitCount(toBigIntString(proposal.approvals_bitmap)),
    candidate: proposal.member,
    candidateHandle:
      members.find((member) => member.member === proposal.member)?.handle ??
      shortAddress(proposal.member),
    graceDeadline: proposal.grace_deadline_ts,
    proposal: proposal.proposal,
    rejections: bitCount(toBigIntString(proposal.rejections_bitmap)),
    roundIndex: proposal.round_index,
  };
}

function mapCircleVouches(rows: DhukutiVouchRow[]): CircleVouch[] {
  return rows.map((row) => ({
    active: row.active,
    candidate: row.candidate,
    released: row.released,
    slashed: row.slashed,
    stake: formatSolValue(row.stake_lamports),
    vouch: row.vouch,
    voucher: row.voucher,
  }));
}

function bitCount(value: string) {
  let bits = BigInt(value);
  let count = 0;
  while (bits > 0n) {
    bits &= bits - 1n;
    count += 1;
  }
  return count;
}

function buildPayoutSchedule(
  circle: CircleSummary,
  rounds: DhukutiRoundRow[],
  members: CircleMember[],
): PayoutScheduleRow[] {
  const rows = rounds
    .sort((a, b) => a.round_index - b.round_index)
    .map(
      (round): PayoutScheduleRow => ({
        amount: round.payout ? formatSolValue(round.payout) : circle.pot,
        recipient: round.recipient ? shortAddress(round.recipient) : "Unassigned",
        round: String(round.round_index + 1).padStart(2, "0"),
        status: round.resolved
          ? circle.mode === "Dutch bid"
            ? "Auction settled"
            : "Completed"
          : round.deadline_ts
            ? "Open"
            : "Pending",
      }),
    );

  if (rows.length > 0) return rows;

  return members.map((member, index) => ({
    amount: circle.pot,
    recipient: member.handle,
    round: String(index + 1).padStart(2, "0"),
    status: "Pending",
  }));
}

function getCurrentRoundState(rounds: DhukutiRoundRow[], maxMembers: number, status: CircleStatus) {
  if (status === "Completed") {
    return { allRoundsResolved: true, currentRound: null, currentRoundIndex: maxMembers };
  }

  const orderedRounds = [...rounds].sort((a, b) => a.round_index - b.round_index);
  const currentRound = orderedRounds.find((round) => !round.resolved) ?? null;
  if (currentRound) {
    return {
      allRoundsResolved: false,
      currentRound,
      currentRoundIndex: currentRound.round_index,
    };
  }

  const latestResolvedRound = [...orderedRounds].reverse().find((round) => round.resolved);
  const currentRoundIndex = latestResolvedRound
    ? Math.min(latestResolvedRound.round_index + 1, maxMembers)
    : 0;

  return {
    allRoundsResolved: maxMembers > 0 && currentRoundIndex >= maxMembers,
    currentRound: null,
    currentRoundIndex,
  };
}

function mapPayoutCurve(value: string): CircleMode {
  if (value === "DutchAuction") return "Dutch bid";
  if (value === "VrfLottery") return "VRF lottery";
  return "Fixed order";
}

function mapCircleStatus(value: string): CircleStatus {
  if (value === "Active") return "Active";
  if (value === "Complete" || value === "Completed") return "Completed";
  if (value === "Default vote") return "Default vote";
  return "Forming";
}

function nextActionForStatus(
  status: CircleStatus,
  payoutCurve: string,
  allRoundsResolved: boolean,
  isViewerHost: boolean,
) {
  if (status === "Forming") return "Join Circle";
  if (status === "Completed") return "View settlement";
  if (status === "Default vote") return "Vote Default";
  if (allRoundsResolved) return isViewerHost ? "Complete circle" : "View settlement";
  return payoutCurve === "DutchAuction" ? "Accept Dutch bid" : "Contribute";
}
