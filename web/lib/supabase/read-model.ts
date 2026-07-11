import "server-only";

import { formatSolValue, shortAddress, toBigIntString } from "@/lib/data/format";
import {
  emptyProfile,
  mapCircleDetail,
  mapCircleSummary,
  mapMarketListing,
} from "@/lib/data/mappers";
import type {
  ActivityLogEntry,
  CircleDetail,
  CircleSummary,
  MarketListing,
  ProfileData,
} from "@/lib/data/types";
import { createSupabaseServerClient, isSupabaseConfigured } from "@/lib/supabase/server";
import type {
  DhukutiCircleRow,
  DhukutiContributionRow,
  DhukutiDefaultProposalRow,
  DhukutiEventLogRow,
  DhukutiListingRow,
  DhukutiMembershipRow,
  DhukutiReputationRow,
  DhukutiRoundRow,
  DhukutiVouchRow,
} from "@/lib/supabase/types";

const ZERO_BIGINT = BigInt(0);

export async function getCircleSummaries(): Promise<CircleSummary[]> {
  if (!isSupabaseConfigured()) return [];

  const supabase = createSupabaseServerClient();
  const { data: circles, error } = await supabase
    .from("dhukuti_circles")
    .select("*")
    .order("updated_at", { ascending: false });

  if (error) throw error;
  if (!circles?.length) return [];

  const circleIds = circles.map((circle) => circle.circle);
  const [memberships, rounds, contributions] = await Promise.all([
    selectByCircles<DhukutiMembershipRow>("dhukuti_memberships", circleIds),
    selectByCircles<DhukutiRoundRow>("dhukuti_rounds", circleIds),
    selectByCircles<DhukutiContributionRow>("dhukuti_contributions", circleIds),
  ]);

  return (circles as DhukutiCircleRow[]).map((row) =>
    mapCircleSummary({
      contributions: contributions.filter((item) => item.circle === row.circle),
      memberships: memberships.filter((item) => item.circle === row.circle),
      row,
      rounds: rounds.filter((item) => item.circle === row.circle),
    }),
  );
}

export async function getCircleDetail(circleAddress: string): Promise<CircleDetail | null> {
  if (!isSupabaseConfigured()) return null;

  const supabase = createSupabaseServerClient();
  const { data: circle, error } = await supabase
    .from("dhukuti_circles")
    .select("*")
    .eq("circle", circleAddress)
    .maybeSingle();

  if (error) throw error;
  if (!circle) return null;

  const [memberships, rounds, contributions, defaultProposals, vouches] = await Promise.all([
    selectByCircles<DhukutiMembershipRow>("dhukuti_memberships", [circleAddress]),
    selectByCircles<DhukutiRoundRow>("dhukuti_rounds", [circleAddress]),
    selectByCircles<DhukutiContributionRow>("dhukuti_contributions", [circleAddress]),
    selectByCircles<DhukutiDefaultProposalRow>("dhukuti_default_proposals", [circleAddress]),
    selectByCircles<DhukutiVouchRow>("dhukuti_vouches", [circleAddress]),
  ]);
  const reputations = await selectByWallets<DhukutiReputationRow>(
    "dhukuti_reputations",
    memberships.map((membership) => membership.member),
  );

  return mapCircleDetail({
    contributions,
    defaultProposals,
    memberships,
    reputations,
    row: circle as DhukutiCircleRow,
    rounds,
    vouches,
  });
}

export async function getMarketListings(): Promise<MarketListing[]> {
  if (!isSupabaseConfigured()) return [];

  const supabase = createSupabaseServerClient();
  const { data: listings, error } = await supabase
    .from("dhukuti_listings")
    .select("*")
    .eq("active", true)
    .eq("cancelled", false)
    .eq("sold", false)
    .order("updated_at", { ascending: false });

  if (error) throw error;
  if (!listings?.length) return [];

  const circleAddresses = Array.from(new Set(listings.map((listing) => listing.circle)));
  const sellerAddresses = Array.from(new Set(listings.map((listing) => listing.seller)));
  const [circles, reputations] = await Promise.all([
    getCircleSummaries(),
    selectByWallets<DhukutiReputationRow>("dhukuti_reputations", sellerAddresses),
  ]);
  const circleByAddress = new Map(circles.map((circle) => [circle.address, circle]));
  const reputationByWallet = new Map(reputations.map((row) => [row.wallet, row]));

  return (listings as DhukutiListingRow[])
    .filter((listing) => circleAddresses.includes(listing.circle))
    .map((listing) =>
      mapMarketListing({
        circle: circleByAddress.get(listing.circle),
        listing,
        reputation: reputationByWallet.get(listing.seller),
      }),
    );
}

export async function getProfileData(wallet: string | null): Promise<ProfileData> {
  if (!wallet || !isSupabaseConfigured()) return emptyProfile(wallet);

  const supabase = createSupabaseServerClient();
  const [
    { data: reputation, error: reputationError },
    memberships,
    contributions,
    listings,
    vouches,
  ] = await Promise.all([
    supabase.from("dhukuti_reputations").select("*").eq("wallet", wallet).maybeSingle(),
    selectByMember<DhukutiMembershipRow>("dhukuti_memberships", wallet),
    selectByMember<DhukutiContributionRow>("dhukuti_contributions", wallet),
    selectBySeller<DhukutiListingRow>("dhukuti_listings", wallet),
    selectByVoucher<DhukutiVouchRow>("dhukuti_vouches", wallet),
  ]);

  if (reputationError) throw reputationError;

  const allCircles = await getCircleSummaries();
  const hostedCircles = allCircles.filter((circle) => circle.creator === wallet);
  const circleAddresses = Array.from(
    new Set([
      ...memberships.map((membership) => membership.circle),
      ...contributions.map((contribution) => contribution.circle),
      ...listings.map((listing) => listing.circle),
      ...hostedCircles.map((circle) => circle.address),
    ]),
  );
  const circles = allCircles.filter((circle) => circleAddresses.includes(circle.address));
  const activeMembershipCircles = new Set(
    memberships.filter((membership) => membership.active).map((membership) => membership.circle),
  );
  const inactiveMembershipCircles = new Set(
    memberships.filter((membership) => !membership.active).map((membership) => membership.circle),
  );
  const activeCircles = circles.filter(
    (circle) =>
      circle.status !== "Completed" &&
      (activeMembershipCircles.has(circle.address) || circle.creator === wallet),
  );
  const circleHistory = circles.filter(
    (circle) => circle.status === "Completed" || inactiveMembershipCircles.has(circle.address),
  );
  const contributionVolume = contributions.reduce(
    (total, contribution) => total + BigInt(toBigIntString(contribution.contribution_amount)),
    ZERO_BIGINT,
  );
  const collateralLocked = memberships
    .filter((membership) => membership.active)
    .reduce(
      (total, membership) => total + BigInt(toBigIntString(membership.collateral_deposited)),
      ZERO_BIGINT,
    );
  const vouchedStake = vouches
    .filter((vouch) => vouch.active)
    .reduce((total, vouch) => total + BigInt(toBigIntString(vouch.stake_lamports)), ZERO_BIGINT);
  const marketListings = listings.map((listing) =>
    mapMarketListing({
      circle: circles.find((circle) => circle.address === listing.circle),
      listing,
      reputation: reputation ? (reputation as DhukutiReputationRow) : undefined,
    }),
  );

  return {
    activeCircles,
    circleHistory,
    hostedCircles,
    listings: marketListings,
    positions: memberships.map((membership) => ({
      active: membership.active,
      circle: membership.circle,
      defaulted: membership.defaulted,
      joinOrder: membership.join_order,
      positionNftMint: membership.position_nft_mint,
    })),
    stats: {
      activeCircles: String(activeCircles.length),
      collateralLocked: formatSolValue(collateralLocked.toString()),
      completedCircles: String((reputation as DhukutiReputationRow | null)?.circles_completed ?? 0),
      contributionVolume: formatSolValue(contributionVolume.toString()),
      defaultedCircles: String((reputation as DhukutiReputationRow | null)?.circles_defaulted ?? 0),
      discountTier: String((reputation as DhukutiReputationRow | null)?.discount_tier ?? 0),
      hostedCircles: String(hostedCircles.length),
      hostCompletions: String((reputation as DhukutiReputationRow | null)?.circles_hosted ?? 0),
      memberReputation: String((reputation as DhukutiReputationRow | null)?.score ?? 0),
      vouchesMade: String((reputation as DhukutiReputationRow | null)?.vouches_made ?? 0),
      vouchedStake: formatSolValue(vouchedStake.toString()),
    },
    wallet,
  };
}

export async function getActivityLog(wallet: string | null): Promise<ActivityLogEntry[]> {
  if (!wallet || !isSupabaseConfigured()) return [];

  const supabase = createSupabaseServerClient();
  const [{ data: walletEvents, error: walletEventsError }, memberships, circles] =
    await Promise.all([
      supabase
        .from("dhukuti_event_log")
        .select("*")
        .eq("wallet", wallet)
        .order("slot", { ascending: false })
        .limit(100),
      selectByMember<DhukutiMembershipRow>("dhukuti_memberships", wallet),
      getCircleSummaries(),
    ]);

  if (walletEventsError) throw walletEventsError;

  const circleAddresses = Array.from(new Set(memberships.map((membership) => membership.circle)));
  const circleEvents = await selectEventsByCircles(circleAddresses);
  const circleNames = new Map(circles.map((circle) => [circle.address, circle.name]));
  const eventRows = [...((walletEvents ?? []) as DhukutiEventLogRow[]), ...circleEvents]
    .filter((event) => event.event_name !== "CircleNamedEvent")
    .filter((event, index, all) => all.findIndex((item) => item.id === event.id) === index)
    .sort((a, b) => Number(b.slot) - Number(a.slot))
    .slice(0, 100);

  return eventRows.map((event) => mapActivityLogEntry(event, circleNames));
}

async function selectByCircles<T>(table: string, circles: string[]): Promise<T[]> {
  if (circles.length === 0) return [];
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase.from(table).select("*").in("circle", circles);
  if (error) throw error;
  return (data ?? []) as T[];
}

async function selectByWallets<T>(table: string, wallets: string[]): Promise<T[]> {
  if (wallets.length === 0) return [];
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase.from(table).select("*").in("wallet", wallets);
  if (error) throw error;
  return (data ?? []) as T[];
}

async function selectByMember<T>(table: string, member: string): Promise<T[]> {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase.from(table).select("*").eq("member", member);
  if (error) throw error;
  return (data ?? []) as T[];
}

async function selectBySeller<T>(table: string, seller: string): Promise<T[]> {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase.from(table).select("*").eq("seller", seller);
  if (error) throw error;
  return (data ?? []) as T[];
}

async function selectByVoucher<T>(table: string, voucher: string): Promise<T[]> {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase.from(table).select("*").eq("voucher", voucher);
  if (error) throw error;
  return (data ?? []) as T[];
}

async function selectEventsByCircles(circles: string[]): Promise<DhukutiEventLogRow[]> {
  if (circles.length === 0) return [];
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("dhukuti_event_log")
    .select("*")
    .in("circle", circles)
    .order("slot", { ascending: false })
    .limit(100);
  if (error) throw error;
  return (data ?? []) as DhukutiEventLogRow[];
}

function mapActivityLogEntry(
  event: DhukutiEventLogRow,
  circleNames: Map<string, string>,
): ActivityLogEntry {
  const payload = asRecord(event.payload);
  const circle = event.circle;
  const circleLabel = circle ? (circleNames.get(circle) ?? shortAddress(circle)) : null;

  return {
    action: activityAction(event.event_name),
    circle,
    circleLabel,
    detail: activityDetail(event.event_name, payload, circleLabel),
    eventName: event.event_name,
    id: event.id,
    occurredAt: event.block_time ?? event.inserted_at,
    signature: event.signature,
    slot: toBigIntString(event.slot),
  };
}

function activityAction(eventName: string) {
  const actions: Record<string, string> = {
    CircleCompletedEvent: "Circle completed",
    CircleCreatedEvent: "Circle created",
    CircleStartedEvent: "Circle started",
    ContributionMadeEvent: "Contribution recorded",
    DefaultHandledEvent: "Default handled",
    DefaultProposalOpenedEvent: "Default proposed",
    DefaultVoteCastEvent: "Default vote cast",
    DutchBidAcceptedEvent: "Dutch bid accepted",
    ListingCancelledEvent: "Listing cancelled",
    MemberJoinedEvent: "Member joined",
    PositionBoughtEvent: "Position purchased",
    PositionListedEvent: "Position listed",
    ReputationUpdatedEvent: "Reputation updated",
    RoundResolvedEvent: "Payout resolved",
    VouchCreatedEvent: "Vouch created",
    VouchReleasedEvent: "Vouch released",
    VouchSlashedEvent: "Vouch slashed",
  };

  return actions[eventName] ?? eventName;
}

function activityDetail(
  eventName: string,
  payload: Record<string, unknown>,
  circleLabel: string | null,
) {
  const member = getPayloadAddress(payload, "member", "buyer", "seller", "bidder", "voucher");
  const amount = getPayloadAmount(
    payload,
    "contribution_amount",
    "payout",
    "ask_price",
    "stake_lamports",
    "collateral_slashed",
  );

  if (eventName === "CircleCreatedEvent") {
    const name = getPayloadString(payload, "name") ?? circleLabel;
    return `${name ? `${name} · ` : ""}${getPayloadNumber(payload, "max_members")} members · ${amount ?? "Terms indexed"}`;
  }
  if (eventName === "ContributionMadeEvent") {
    return `${member ?? "Member"} contributed ${amount ?? "SOL"}.`;
  }
  if (eventName === "RoundResolvedEvent") {
    return `${member ?? "Recipient"} received ${amount ?? "the round payout"}.`;
  }
  if (eventName === "MemberJoinedEvent") {
    return `${member ?? "Member"} reserved a payout position.`;
  }
  if (eventName === "PositionListedEvent" || eventName === "PositionBoughtEvent") {
    return `${member ?? "Position"}${amount ? ` · ${amount}` : ""}`;
  }
  if (eventName === "ReputationUpdatedEvent") {
    return `Score ${getPayloadNumber(payload, "score") ?? "updated"} · tier ${getPayloadNumber(payload, "discount_tier") ?? 0}`;
  }
  if (eventName === "DefaultVoteCastEvent") {
    return payload.approve === true
      ? "Approved the default proposal."
      : "Rejected the default proposal.";
  }
  if (eventName === "DutchBidAcceptedEvent") {
    return `${member ?? "Member"} accepted a ${getPayloadNumber(payload, "discount_bps") ?? 0} bps discount.`;
  }

  return member ? `${member} · confirmed on devnet.` : "Confirmed on devnet.";
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function getPayloadAddress(payload: Record<string, unknown>, ...keys: string[]) {
  const value = keys
    .map((key) => payload[key])
    .find((candidate): candidate is string => typeof candidate === "string");
  return value ? shortAddress(value) : null;
}

function getPayloadAmount(payload: Record<string, unknown>, ...keys: string[]) {
  const value = keys
    .map((key) => payload[key])
    .find(
      (candidate): candidate is string | number =>
        typeof candidate === "string" || typeof candidate === "number",
    );
  return value === undefined ? null : formatSolValue(value);
}

function getPayloadNumber(payload: Record<string, unknown>, key: string) {
  const value = payload[key];
  if (typeof value === "number" || typeof value === "string") return String(value);
  return null;
}

function getPayloadString(payload: Record<string, unknown>, key: string) {
  const value = payload[key];
  return typeof value === "string" ? value : null;
}
