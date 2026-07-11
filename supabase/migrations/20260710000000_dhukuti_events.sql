create extension if not exists pgcrypto;

create table if not exists public.dhukuti_event_log (
  id uuid primary key default gen_random_uuid(),
  signature text not null,
  event_index integer not null,
  slot bigint not null,
  block_time timestamptz,
  program_id text not null,
  event_name text not null,
  circle text,
  wallet text,
  payload jsonb not null,
  inserted_at timestamptz not null default now(),
  unique (signature, event_index)
);

create index if not exists dhukuti_event_log_circle_idx
  on public.dhukuti_event_log (circle, slot desc);

create index if not exists dhukuti_event_log_wallet_idx
  on public.dhukuti_event_log (wallet, slot desc);

create index if not exists dhukuti_event_log_event_name_idx
  on public.dhukuti_event_log (event_name, slot desc);

create table if not exists public.dhukuti_circles (
  circle text primary key,
  creator text not null,
  circle_id bigint not null,
  contribution_amount numeric(20,0) not null,
  cycle_duration_seconds bigint not null default 0,
  max_members integer not null,
  payout_curve text not null,
  collateral_bps integer not null default 0,
  insurance_fee_bps integer not null,
  reserve_ratio_bps integer not null default 0,
  min_reputation numeric(20,0) not null default 0,
  status text not null default 'Open',
  started_at timestamptz,
  completed_at timestamptz,
  last_signature text not null,
  last_slot bigint not null,
  updated_at timestamptz not null default now()
);

create index if not exists dhukuti_circles_creator_idx
  on public.dhukuti_circles (creator, updated_at desc);

create table if not exists public.dhukuti_memberships (
  circle text not null references public.dhukuti_circles(circle) on delete cascade,
  member text not null,
  join_order integer not null,
  collateral_deposited numeric(20,0) not null,
  position_nft_mint text not null,
  active boolean not null default true,
  defaulted boolean not null default false,
  last_signature text not null,
  last_slot bigint not null,
  updated_at timestamptz not null default now(),
  primary key (circle, member)
);

create index if not exists dhukuti_memberships_member_idx
  on public.dhukuti_memberships (member, updated_at desc);

create table if not exists public.dhukuti_rounds (
  circle text not null references public.dhukuti_circles(circle) on delete cascade,
  round_index integer not null,
  round text not null,
  recipient text,
  payout numeric(20,0),
  deadline_ts timestamptz,
  insurance_share numeric(20,0) not null default 0,
  member_discount_share numeric(20,0) not null default 0,
  resolved boolean not null default false,
  last_signature text not null,
  last_slot bigint not null,
  updated_at timestamptz not null default now(),
  primary key (circle, round_index)
);

create table if not exists public.dhukuti_contributions (
  circle text not null references public.dhukuti_circles(circle) on delete cascade,
  round text not null,
  round_index integer not null,
  member text not null,
  contribution_amount numeric(20,0) not null,
  insurance_fee numeric(20,0) not null,
  net_to_pot numeric(20,0) not null,
  signature text not null,
  slot bigint not null,
  created_at timestamptz not null default now(),
  primary key (circle, round_index, member)
);

create index if not exists dhukuti_contributions_member_idx
  on public.dhukuti_contributions (member, slot desc);

create table if not exists public.dhukuti_default_proposals (
  proposal text primary key,
  circle text not null references public.dhukuti_circles(circle) on delete cascade,
  round text not null,
  member text not null,
  proposer text not null,
  round_index integer not null,
  grace_deadline_ts timestamptz,
  approvals_bitmap numeric(20,0) not null default 0,
  rejections_bitmap numeric(20,0) not null default 0,
  resolved boolean not null default false,
  last_signature text not null,
  last_slot bigint not null,
  updated_at timestamptz not null default now()
);

create index if not exists dhukuti_default_proposals_circle_idx
  on public.dhukuti_default_proposals (circle, round_index);

create table if not exists public.dhukuti_default_votes (
  proposal text not null references public.dhukuti_default_proposals(proposal) on delete cascade,
  voter text not null,
  approve boolean not null,
  signature text not null,
  slot bigint not null,
  updated_at timestamptz not null default now(),
  primary key (proposal, voter)
);

create table if not exists public.dhukuti_defaults (
  circle text not null references public.dhukuti_circles(circle) on delete cascade,
  round text not null,
  round_index integer not null,
  member text not null,
  collateral_slashed numeric(20,0) not null,
  insurance_backstop numeric(20,0) not null,
  haircut numeric(20,0) not null,
  signature text not null,
  slot bigint not null,
  created_at timestamptz not null default now(),
  primary key (circle, round_index, member)
);

create table if not exists public.dhukuti_reputations (
  wallet text primary key,
  score numeric(20,0) not null,
  discount_tier integer not null,
  circles_completed integer not null,
  circles_defaulted integer not null,
  circles_hosted integer not null,
  hosted_default_events integer not null,
  vouches_made integer not null,
  vouches_honored integer not null,
  vouches_slashed integer not null,
  vouch_stake_slashed numeric(20,0) not null,
  last_signature text not null,
  last_slot bigint not null,
  updated_at timestamptz not null default now()
);

create table if not exists public.dhukuti_vouches (
  vouch text primary key,
  circle text not null references public.dhukuti_circles(circle) on delete cascade,
  voucher text not null,
  candidate text not null,
  stake_lamports numeric(20,0) not null,
  active boolean not null default true,
  slashed boolean not null default false,
  released boolean not null default false,
  last_signature text not null,
  last_slot bigint not null,
  updated_at timestamptz not null default now(),
  unique (circle, voucher, candidate)
);

create index if not exists dhukuti_vouches_voucher_idx
  on public.dhukuti_vouches (voucher, updated_at desc);

create index if not exists dhukuti_vouches_candidate_idx
  on public.dhukuti_vouches (candidate, updated_at desc);

create table if not exists public.dhukuti_listings (
  listing text primary key,
  circle text not null references public.dhukuti_circles(circle) on delete cascade,
  seller text not null,
  buyer text,
  position_nft_mint text not null,
  ask_price numeric(20,0) not null,
  join_order integer,
  active boolean not null default true,
  cancelled boolean not null default false,
  sold boolean not null default false,
  last_signature text not null,
  last_slot bigint not null,
  updated_at timestamptz not null default now()
);

create index if not exists dhukuti_listings_circle_active_idx
  on public.dhukuti_listings (circle, active, updated_at desc);

alter table public.dhukuti_event_log enable row level security;
alter table public.dhukuti_circles enable row level security;
alter table public.dhukuti_memberships enable row level security;
alter table public.dhukuti_rounds enable row level security;
alter table public.dhukuti_contributions enable row level security;
alter table public.dhukuti_default_proposals enable row level security;
alter table public.dhukuti_default_votes enable row level security;
alter table public.dhukuti_defaults enable row level security;
alter table public.dhukuti_reputations enable row level security;
alter table public.dhukuti_vouches enable row level security;
alter table public.dhukuti_listings enable row level security;

do $$
declare
  rel_name text;
begin
  foreach rel_name in array array[
    'dhukuti_event_log',
    'dhukuti_circles',
    'dhukuti_memberships',
    'dhukuti_rounds',
    'dhukuti_contributions',
    'dhukuti_default_proposals',
    'dhukuti_default_votes',
    'dhukuti_defaults',
    'dhukuti_reputations',
    'dhukuti_vouches',
    'dhukuti_listings'
  ]
  loop
    execute format('grant select on public.%I to anon, authenticated', rel_name);
    if not exists (
      select 1
      from pg_policies
      where schemaname = 'public'
        and tablename = rel_name
        and policyname = 'public_read'
    ) then
      execute format(
        'create policy public_read on public.%I for select to anon, authenticated using (true)',
        rel_name
      );
    end if;
  end loop;
end $$;

comment on table public.dhukuti_event_log is
  'Raw decoded Anchor events emitted by the Dhukuti Solana program.';

comment on table public.dhukuti_circles is
  'Current read model for Dhukuti circles, projected from CircleCreatedEvent, CircleStartedEvent, and CircleCompletedEvent.';

comment on table public.dhukuti_default_proposals is
  'Member-governed default proposals projected from DefaultProposalOpenedEvent and DefaultVoteCastEvent.';
