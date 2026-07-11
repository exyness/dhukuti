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
  MarketListing,
  PayoutScheduleRow,
  ProfileData,
} from "@/lib/data/types";
import type {
  DhukutiCircleRow,
  DhukutiContributionRow,
  DhukutiListingRow,
  DhukutiMembershipRow,
  DhukutiReputationRow,
  DhukutiRoundRow,
} from "@/lib/supabase/types";

const ZERO_BIGINT = BigInt(0);
const BPS_DENOMINATOR = BigInt(10_000);

type CircleMapInput = {
  contributions?: DhukutiContributionRow[];
  memberships?: DhukutiMembershipRow[];
  row: DhukutiCircleRow;
  rounds?: DhukutiRoundRow[];
};

export function mapCircleSummary({
  contributions = [],
  memberships = [],
  row,
  rounds = [],
}: CircleMapInput): CircleSummary {
  const contributionAmount = toBigIntString(row.contribution_amount);
  const activeMembers = memberships.filter((member) => member.active && !member.defaulted);
  const memberCount = activeMembers.length;
  const currentRound = latestRound(rounds);
  const status = mapCircleStatus(row.status);
  const insuranceLamports = contributions.reduce(
    (total, contribution) => total + BigInt(toBigIntString(contribution.insurance_fee)),
    ZERO_BIGINT,
  );
  const maxMembers = row.max_members;

  return {
    address: row.circle,
    collateral: formatCollateral(contributionAmount, row.collateral_bps),
    collateralBps: row.collateral_bps,
    contribution: formatSolValue(contributionAmount),
    contributionLamports: contributionAmount,
    creator: row.creator,
    cycle: formatCycle(toInteger(row.cycle_duration_seconds)),
    cycleDurationSeconds: toInteger(row.cycle_duration_seconds),
    deadline: formatDeadline(currentRound?.deadline_ts),
    deadlineAt: currentRound?.deadline_ts ?? null,
    id: row.circle,
    insurance: formatSolValue(insuranceLamports.toString()),
    insuranceFeeBps: row.insurance_fee_bps,
    memberCap: maxMembers,
    members: memberCount,
    minReputation: toInteger(row.min_reputation),
    mode: mapPayoutCurve(row.payout_curve),
    name: `Dhukuti #${row.circle_id}`,
    nextAction: nextActionForStatus(status, row.payout_curve),
    nextPayout: currentRound
      ? `Round ${String(currentRound.round_index + 1).padStart(2, "0")}`
      : "Start circle",
    pot: formatPot(contributionAmount, maxMembers),
    progress: maxMembers > 0 ? Math.round((memberCount / maxMembers) * 100) : 0,
    reserveRatioBps: row.reserve_ratio_bps,
    round: currentRound ? `${currentRound.round_index + 1} / ${maxMembers}` : `0 / ${maxMembers}`,
    status,
    updatedAt: row.updated_at,
  };
}

export function mapCircleDetail(input: CircleMapInput): CircleDetail {
  const circle = mapCircleSummary(input);
  const members = [...(input.memberships ?? [])]
    .sort((a, b) => a.join_order - b.join_order)
    .map((membership): CircleMember => {
      const member = membership.member;
      const state = membership.defaulted
        ? "Default risk"
        : membership.active
          ? "Joined"
          : "Inactive";

      return {
        collateral: formatSolValue(membership.collateral_deposited),
        handle: shortAddress(member),
        member,
        nextPayout: `Round ${String(membership.join_order + 1).padStart(2, "0")}`,
        reputation: 0,
        role: membership.join_order === 0 ? "Host" : "Member",
        state,
        summary: membership.defaulted
          ? "Indexed default state from program events."
          : "Membership indexed from the program event stream.",
        vouch: "Indexed separately",
      };
    });

  const payoutSchedule = buildPayoutSchedule(circle, input.rounds ?? [], members);

  return { circle, members, payoutSchedule };
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
    ask: formatSolValue(askLamports),
    askLamports,
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
    value: formatSolValue(payoutValue),
  };
}

export function emptyProfile(wallet: string | null): ProfileData {
  return {
    activeCircles: [],
    contributionHistory: [],
    listings: [],
    stats: {
      activeCircles: "0",
      collateralLocked: "0 SOL",
      completedCircles: "0",
      contributionVolume: "0 SOL",
      hostCompletions: "0",
      memberReputation: "0",
      vouchedStake: "0 SOL",
    },
    wallet,
  };
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
        status: round.resolved ? "Completed" : round.deadline_ts ? "Open" : "Pending",
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

function latestRound(rounds: DhukutiRoundRow[]) {
  return [...rounds].sort((a, b) => b.round_index - a.round_index)[0];
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

function nextActionForStatus(status: CircleStatus, payoutCurve: string) {
  if (status === "Forming") return "Join Circle";
  if (status === "Completed") return "View Settlement";
  if (status === "Default vote") return "Vote Default";
  return payoutCurve === "DutchAuction" ? "Place Bid" : "Contribute";
}
