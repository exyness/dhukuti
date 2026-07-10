import { DHUKUTI_PROGRAM } from "@/lib/constants";

export const audienceColumns = [
  {
    label: "For individual savers",
    items: [
      "Commit SOL on a clear cycle",
      "Access rotating lump-sum capital",
      "Build wallet-scoped credit history",
    ],
  },
  {
    label: "For community hosts",
    items: [
      "Create circles for trusted groups",
      "Automate contribution and payout rules",
      "Earn host reputation after completion",
    ],
  },
];

export const trustItems = [
  "Devnet program deployed",
  "Reputation scoring",
  "Open-source Anchor contracts",
];

export const lifecycleSteps = [
  {
    index: "01",
    title: "Formation",
    body: "A host sets contribution size, cycle duration, member cap, payout curve, and collateral rules. Members join by locking collateral into program-owned accounts.",
  },
  {
    index: "02",
    title: "Rotation",
    body: "Each round tracks who paid with deterministic account state. The current recipient receives the pot only after contributions and default rules are satisfied.",
  },
  {
    index: "03",
    title: "Recovery",
    body: "Missed contributions trigger default proposals, insurance coverage, vouch slashing, and reputation updates so one failed member does not collapse the circle.",
  },
];

export const circlePreviews = [
  {
    name: "Kathmandu Builder Circle",
    host: "superteam_nepal",
    badge: "High Rep",
    badgeTone: "accent" as const,
    icon: "verified",
    stats: [
      ["Pool value", "60 SOL"],
      ["Participants", "11 / 12"],
    ],
    footer: "Fixed-order payout",
    action: "Join Circle",
  },
  {
    name: "Diaspora Remit Pool",
    host: "janakpur_finance",
    badge: "Auction",
    badgeTone: "info" as const,
    icon: "market",
    stats: [
      ["Round pot", "24 SOL"],
      ["Discount bid", "3.2%"],
    ],
    footer: "Early payout market",
    action: "View Details",
  },
];

export const protocolStats = [
  ["Cluster", DHUKUTI_PROGRAM.cluster],
  ["Program", `${DHUKUTI_PROGRAM.programId.slice(0, 4)}...${DHUKUTI_PROGRAM.programId.slice(-4)}`],
  ["Slot", DHUKUTI_PROGRAM.deployedSlot],
];

export const governanceRows = [
  {
    date: "Jul 10, 2026",
    subject: "Devnet MVP deployment",
    detail:
      "Anchor program live with default handling, vouching, reputation, and position market flows.",
    status: "Live",
  },
  {
    date: "Jul 10, 2026",
    subject: "Event indexer schema",
    detail:
      "Supabase read models prepared for circle, membership, round, listing, and reputation projections.",
    status: "Indexed",
  },
  {
    date: "Next",
    subject: "Frontend app screens",
    detail:
      "Browse, create, detail, secondary market, and profile screens build on this landing shell.",
    status: "Planned",
  },
];
