import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { DHUKUTI_PROGRAM } from "@/lib/constants";
import type { DecodedDhukutiEvent } from "@/lib/program/types";
import { createSupabaseServerClient, isSupabaseConfigured } from "@/lib/supabase/server";
import type { DhukutiEventLogInsert, Json } from "@/lib/supabase/types";

type ProjectionContext = {
  blockTime: string | null;
  signature: string;
  slot: number;
  supabase: SupabaseClient;
};

const PRIMARY_CONFLICT_COLUMNS: Record<string, string[]> = {
  dhukuti_circles: ["circle"],
  dhukuti_default_proposals: ["proposal"],
  dhukuti_listings: ["listing"],
  dhukuti_reputations: ["wallet"],
  dhukuti_vouches: ["vouch"],
};

export async function storeAndProjectEvents({
  blockTime,
  events,
  signature,
  slot,
}: {
  blockTime: string | null;
  events: DecodedDhukutiEvent[];
  signature: string;
  slot: number;
}) {
  if (events.length === 0) {
    return { eventCount: 0 };
  }

  if (!isSupabaseConfigured({ secret: true })) {
    throw new Error("Supabase secret key is not configured for indexer writes.");
  }

  const supabase = createSupabaseServerClient({ secret: true });
  const rows: DhukutiEventLogInsert[] = events.map((event) => ({
    block_time: blockTime,
    circle: getString(event.data.circle),
    event_index: event.eventIndex,
    event_name: event.name,
    payload: toJson(event.data),
    program_id: DHUKUTI_PROGRAM.programId,
    signature,
    slot,
    wallet: getPrimaryWallet(event.data),
  }));

  const { error } = await supabase
    .from("dhukuti_event_log")
    .upsert(rows, { ignoreDuplicates: true, onConflict: "signature,event_index" });

  if (error) throw error;

  const context = { blockTime, signature, slot, supabase };
  for (const event of events) {
    await projectEvent(context, event);
  }

  return { eventCount: events.length };
}

async function projectEvent(context: ProjectionContext, event: DecodedDhukutiEvent) {
  const { data } = event;

  switch (event.name) {
    case "CircleCreatedEvent":
      await upsert(context, "dhukuti_circles", {
        circle: getRequiredString(data.circle),
        circle_id: getRequiredNumeric(data.circle_id),
        collateral_bps: getRequiredNumber(data.collateral_bps),
        contribution_amount: getRequiredNumeric(data.contribution_amount),
        creator: getRequiredString(data.creator),
        cycle_duration_seconds: getRequiredNumeric(data.cycle_duration),
        insurance_fee_bps: getRequiredNumber(data.insurance_fee_bps),
        last_signature: context.signature,
        last_slot: context.slot,
        max_members: getRequiredNumber(data.max_members),
        min_reputation: getRequiredNumeric(data.min_reputation),
        payout_curve: normalizePayoutCurve(data.payout_curve),
        reserve_ratio_bps: getRequiredNumber(data.reserve_ratio_bps),
        status: "Open",
        updated_at: nowIso(),
      });
      break;

    case "MemberJoinedEvent":
      await upsert(
        context,
        "dhukuti_memberships",
        {
          active: true,
          circle: getRequiredString(data.circle),
          collateral_deposited: getRequiredNumeric(data.collateral_deposited),
          defaulted: false,
          join_order: getRequiredNumber(data.join_order),
          last_signature: context.signature,
          last_slot: context.slot,
          member: getRequiredString(data.member),
          position_nft_mint: getRequiredString(data.position_nft_mint),
          updated_at: nowIso(),
        },
        "circle,member",
      );
      break;

    case "CircleStartedEvent":
      await updateByPrimary(context, "dhukuti_circles", "circle", getRequiredString(data.circle), {
        last_signature: context.signature,
        last_slot: context.slot,
        started_at: context.blockTime,
        status: "Active",
        updated_at: nowIso(),
      });
      await upsert(
        context,
        "dhukuti_rounds",
        {
          circle: getRequiredString(data.circle),
          deadline_ts: unixToIso(data.deadline_ts),
          last_signature: context.signature,
          last_slot: context.slot,
          round: getRequiredString(data.first_round),
          round_index: 0,
          updated_at: nowIso(),
        },
        "circle,round_index",
      );
      break;

    case "ContributionMadeEvent":
      await upsert(
        context,
        "dhukuti_contributions",
        {
          circle: getRequiredString(data.circle),
          contribution_amount: getRequiredNumeric(data.contribution_amount),
          insurance_fee: getRequiredNumeric(data.insurance_fee),
          member: getRequiredString(data.member),
          net_to_pot: getRequiredNumeric(data.net_to_pot),
          round: getRequiredString(data.round),
          round_index: getRequiredNumber(data.round_index),
          signature: context.signature,
          slot: context.slot,
        },
        "circle,round_index,member",
      );
      break;

    case "RoundResolvedEvent":
      await upsert(
        context,
        "dhukuti_rounds",
        {
          circle: getRequiredString(data.circle),
          insurance_share: getRequiredNumeric(data.insurance_share),
          last_signature: context.signature,
          last_slot: context.slot,
          member_discount_share: getRequiredNumeric(data.member_discount_share),
          payout: getRequiredNumeric(data.payout),
          recipient: getRequiredString(data.recipient),
          resolved: true,
          round: getRequiredString(data.round),
          round_index: getRequiredNumber(data.round_index),
          updated_at: nowIso(),
        },
        "circle,round_index",
      );
      break;

    case "CircleCompletedEvent":
      await updateByPrimary(context, "dhukuti_circles", "circle", getRequiredString(data.circle), {
        completed_at: context.blockTime,
        last_signature: context.signature,
        last_slot: context.slot,
        status: "Complete",
        updated_at: nowIso(),
      });
      break;

    case "DefaultProposalOpenedEvent":
      await upsert(context, "dhukuti_default_proposals", {
        circle: getRequiredString(data.circle),
        grace_deadline_ts: unixToIso(data.grace_deadline_ts),
        last_signature: context.signature,
        last_slot: context.slot,
        member: getRequiredString(data.member),
        proposal: getRequiredString(data.proposal),
        proposer: getRequiredString(data.proposer),
        round: getRequiredString(data.round),
        round_index: getRequiredNumber(data.round_index),
        updated_at: nowIso(),
      });
      await updateByPrimary(context, "dhukuti_circles", "circle", getRequiredString(data.circle), {
        last_signature: context.signature,
        last_slot: context.slot,
        status: "Default vote",
        updated_at: nowIso(),
      });
      break;

    case "DefaultVoteCastEvent":
      await upsert(
        context,
        "dhukuti_default_votes",
        {
          approve: Boolean(data.approve),
          proposal: getRequiredString(data.proposal),
          signature: context.signature,
          slot: context.slot,
          updated_at: nowIso(),
          voter: getRequiredString(data.voter),
        },
        "proposal,voter",
      );
      await updateByPrimary(
        context,
        "dhukuti_default_proposals",
        "proposal",
        getRequiredString(data.proposal),
        {
          approvals_bitmap: getRequiredNumeric(data.approvals_bitmap),
          last_signature: context.signature,
          last_slot: context.slot,
          rejections_bitmap: getRequiredNumeric(data.rejections_bitmap),
          updated_at: nowIso(),
        },
      );
      break;

    case "DefaultHandledEvent":
      await upsert(
        context,
        "dhukuti_defaults",
        {
          circle: getRequiredString(data.circle),
          collateral_slashed: getRequiredNumeric(data.collateral_slashed),
          haircut: getRequiredNumeric(data.haircut),
          insurance_backstop: getRequiredNumeric(data.insurance_backstop),
          member: getRequiredString(data.member),
          round: getRequiredString(data.round),
          round_index: getRequiredNumber(data.round_index),
          signature: context.signature,
          slot: context.slot,
        },
        "circle,round_index,member",
      );
      await updateMembership(
        context,
        getRequiredString(data.circle),
        getRequiredString(data.member),
        {
          active: false,
          defaulted: true,
          last_signature: context.signature,
          last_slot: context.slot,
          updated_at: nowIso(),
        },
      );
      break;

    case "ReputationUpdatedEvent":
      await upsert(context, "dhukuti_reputations", {
        circles_completed: getRequiredNumber(data.circles_completed),
        circles_defaulted: getRequiredNumber(data.circles_defaulted),
        circles_hosted: getRequiredNumber(data.circles_hosted),
        discount_tier: getRequiredNumber(data.discount_tier),
        hosted_default_events: getRequiredNumber(data.hosted_default_events),
        last_signature: context.signature,
        last_slot: context.slot,
        score: getRequiredNumeric(data.score),
        updated_at: nowIso(),
        vouch_stake_slashed: getRequiredNumeric(data.vouch_stake_slashed),
        vouches_honored: getRequiredNumber(data.vouches_honored),
        vouches_made: getRequiredNumber(data.vouches_made),
        vouches_slashed: getRequiredNumber(data.vouches_slashed),
        wallet: getRequiredString(data.wallet),
      });
      break;

    case "VouchCreatedEvent":
      await upsert(context, "dhukuti_vouches", {
        active: true,
        candidate: getRequiredString(data.candidate),
        circle: getRequiredString(data.circle),
        last_signature: context.signature,
        last_slot: context.slot,
        released: false,
        slashed: false,
        stake_lamports: getRequiredNumeric(data.stake_lamports),
        updated_at: nowIso(),
        vouch: getRequiredString(data.vouch),
        voucher: getRequiredString(data.voucher),
      });
      break;

    case "VouchReleasedEvent":
      await updateByPrimary(context, "dhukuti_vouches", "vouch", getRequiredString(data.vouch), {
        active: false,
        last_signature: context.signature,
        last_slot: context.slot,
        released: true,
        updated_at: nowIso(),
      });
      break;

    case "VouchSlashedEvent":
      await updateByPrimary(context, "dhukuti_vouches", "vouch", getRequiredString(data.vouch), {
        active: false,
        last_signature: context.signature,
        last_slot: context.slot,
        slashed: true,
        updated_at: nowIso(),
      });
      break;

    case "PositionListedEvent":
      await upsert(context, "dhukuti_listings", {
        active: true,
        ask_price: getRequiredNumeric(data.ask_price),
        cancelled: false,
        circle: getRequiredString(data.circle),
        last_signature: context.signature,
        last_slot: context.slot,
        listing: getRequiredString(data.listing),
        position_nft_mint: getRequiredString(data.position_nft_mint),
        seller: getRequiredString(data.seller),
        sold: false,
        updated_at: nowIso(),
      });
      break;

    case "ListingCancelledEvent":
      await updateByPrimary(
        context,
        "dhukuti_listings",
        "listing",
        getRequiredString(data.listing),
        {
          active: false,
          cancelled: true,
          last_signature: context.signature,
          last_slot: context.slot,
          updated_at: nowIso(),
        },
      );
      break;

    case "PositionBoughtEvent":
      await updateByPrimary(
        context,
        "dhukuti_listings",
        "listing",
        getRequiredString(data.listing),
        {
          active: false,
          buyer: getRequiredString(data.buyer),
          join_order: getRequiredNumber(data.join_order),
          last_signature: context.signature,
          last_slot: context.slot,
          sold: true,
          updated_at: nowIso(),
        },
      );
      break;
  }
}

async function upsert(
  context: ProjectionContext,
  table: string,
  values: Record<string, unknown>,
  onConflict?: string,
) {
  if (await isStaleProjection(context, table, values, onConflict)) {
    return;
  }

  const { error } = await context.supabase
    .from(table)
    .upsert(values, onConflict ? { onConflict } : undefined);
  if (error) throw error;
}

async function updateByPrimary(
  context: ProjectionContext,
  table: string,
  column: string,
  value: string,
  values: Record<string, unknown>,
) {
  let query = context.supabase.from(table).update(values).eq(column, value);
  const incomingSlot = getProjectionSlot(values);
  if (incomingSlot !== null) {
    query = query.lte("last_slot", incomingSlot);
  }

  const { error } = await query;
  if (error) throw error;
}

async function updateMembership(
  context: ProjectionContext,
  circle: string,
  member: string,
  values: Record<string, unknown>,
) {
  let query = context.supabase
    .from("dhukuti_memberships")
    .update(values)
    .eq("circle", circle)
    .eq("member", member);
  const incomingSlot = getProjectionSlot(values);
  if (incomingSlot !== null) {
    query = query.lte("last_slot", incomingSlot);
  }

  const { error } = await query;
  if (error) throw error;
}

async function isStaleProjection(
  context: ProjectionContext,
  table: string,
  values: Record<string, unknown>,
  onConflict?: string,
) {
  const incomingSlot = getProjectionSlot(values);
  if (incomingSlot === null) return false;

  const conflictColumns = getConflictColumns(table, onConflict);
  if (conflictColumns.length === 0) return false;

  let query = context.supabase.from(table).select("last_slot");
  for (const column of conflictColumns) {
    const value = values[column];
    if (value === null || value === undefined) return false;
    query = query.eq(column, value as string | number | boolean);
  }

  const { data, error } = await query.maybeSingle();
  if (error) throw error;

  const existing = data as { last_slot?: number | string } | null;
  const currentSlot = toSlotNumber(existing?.last_slot);
  return currentSlot !== null && currentSlot > incomingSlot;
}

function getConflictColumns(table: string, onConflict?: string) {
  if (onConflict) return onConflict.split(",").map((column) => column.trim());
  return PRIMARY_CONFLICT_COLUMNS[table] ?? [];
}

function getProjectionSlot(values: Record<string, unknown>) {
  return toSlotNumber(values.last_slot);
}

function toSlotNumber(value: unknown) {
  if (typeof value === "number" && Number.isSafeInteger(value)) return value;
  if (typeof value === "string") {
    const parsed = Number.parseInt(value, 10);
    return Number.isSafeInteger(parsed) ? parsed : null;
  }
  return null;
}

function getRequiredString(value: unknown) {
  const resolved = getString(value);
  if (!resolved) throw new Error("Missing required string event field.");
  return resolved;
}

function getString(value: unknown) {
  return typeof value === "string" ? value : null;
}

function getRequiredNumber(value: unknown) {
  if (typeof value === "number") return value;
  if (typeof value === "string") return Number.parseInt(value, 10);
  throw new Error("Missing required numeric event field.");
}

function getRequiredNumeric(value: unknown) {
  if (typeof value === "number") return String(value);
  if (typeof value === "string") return value;
  throw new Error("Missing required numeric event field.");
}

function getPrimaryWallet(data: Record<string, unknown>) {
  return (
    getString(data.wallet) ??
    getString(data.member) ??
    getString(data.creator) ??
    getString(data.seller) ??
    getString(data.buyer) ??
    getString(data.bidder) ??
    getString(data.voucher) ??
    getString(data.candidate) ??
    getString(data.proposer) ??
    getString(data.voter)
  );
}

function normalizePayoutCurve(value: unknown) {
  if (typeof value === "string") return value;

  if (value && typeof value === "object") {
    const [variant] = Object.keys(value);
    if (/dutch/i.test(variant)) return "DutchAuction";
    if (/vrf|lottery/i.test(variant)) return "VrfLottery";
  }

  return "FixedOrder";
}

function unixToIso(value: unknown) {
  const seconds = getRequiredNumber(value);
  return new Date(seconds * 1000).toISOString();
}

function nowIso() {
  return new Date().toISOString();
}

function toJson(value: unknown): Json {
  return JSON.parse(JSON.stringify(value)) as Json;
}
