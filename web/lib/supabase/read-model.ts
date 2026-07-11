import "server-only";

import { formatDate, formatSolValue, toBigIntString } from "@/lib/data/format";
import {
  emptyProfile,
  mapCircleDetail,
  mapCircleSummary,
  mapMarketListing,
} from "@/lib/data/mappers";
import type { CircleDetail, CircleSummary, MarketListing, ProfileData } from "@/lib/data/types";
import { createSupabaseServerClient, isSupabaseConfigured } from "@/lib/supabase/server";
import type {
  DhukutiCircleRow,
  DhukutiContributionRow,
  DhukutiListingRow,
  DhukutiMembershipRow,
  DhukutiReputationRow,
  DhukutiRoundRow,
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

  const [memberships, rounds, contributions] = await Promise.all([
    selectByCircles<DhukutiMembershipRow>("dhukuti_memberships", [circleAddress]),
    selectByCircles<DhukutiRoundRow>("dhukuti_rounds", [circleAddress]),
    selectByCircles<DhukutiContributionRow>("dhukuti_contributions", [circleAddress]),
  ]);

  return mapCircleDetail({
    contributions,
    memberships,
    row: circle as DhukutiCircleRow,
    rounds,
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
  const [{ data: reputation, error: reputationError }, memberships, contributions, listings] =
    await Promise.all([
      supabase.from("dhukuti_reputations").select("*").eq("wallet", wallet).maybeSingle(),
      selectByMember<DhukutiMembershipRow>("dhukuti_memberships", wallet),
      selectByMember<DhukutiContributionRow>("dhukuti_contributions", wallet),
      selectBySeller<DhukutiListingRow>("dhukuti_listings", wallet),
    ]);

  if (reputationError) throw reputationError;

  const circleAddresses = Array.from(
    new Set([
      ...memberships.map((membership) => membership.circle),
      ...contributions.map((contribution) => contribution.circle),
      ...listings.map((listing) => listing.circle),
    ]),
  );
  const allCircles = await getCircleSummaries();
  const circles = allCircles.filter((circle) => circleAddresses.includes(circle.address));
  const activeCircles = circles.filter((circle) => circle.status !== "Completed");
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
  const marketListings = listings.map((listing) =>
    mapMarketListing({
      circle: circles.find((circle) => circle.address === listing.circle),
      listing,
      reputation: reputation ? (reputation as DhukutiReputationRow) : undefined,
    }),
  );

  return {
    activeCircles,
    contributionHistory: contributions.map((row) => ({
      amount: formatSolValue(row.contribution_amount),
      circle: circles.find((circle) => circle.address === row.circle)?.name ?? row.circle,
      date: formatDate(row.created_at),
      signature: row.signature,
      status: "Paid",
    })),
    listings: marketListings,
    stats: {
      activeCircles: String(activeCircles.length),
      collateralLocked: formatSolValue(collateralLocked.toString()),
      completedCircles: String((reputation as DhukutiReputationRow | null)?.circles_completed ?? 0),
      contributionVolume: formatSolValue(contributionVolume.toString()),
      hostCompletions: String((reputation as DhukutiReputationRow | null)?.circles_hosted ?? 0),
      memberReputation: String((reputation as DhukutiReputationRow | null)?.score ?? 0),
      vouchedStake: formatSolValue(
        toBigIntString((reputation as DhukutiReputationRow | null)?.vouch_stake_slashed),
      ),
    },
    wallet,
  };
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
