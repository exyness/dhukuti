import {
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  CircleDollarSign,
  ExternalLink,
  Layers,
  ShieldCheck,
  UserCheck,
} from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { BrandMark } from "@/components/brand/brand-mark";
import { DHUKUTI_PROGRAM, explorerAddressUrl } from "@/lib/constants";

export const metadata: Metadata = {
  title: "Dhukuti Whitepaper - Community Savings on Solana",
  description:
    "A concise protocol paper for Dhukuti, a Solana-native savings circle protocol with collateral, insurance, reputation, and tradeable payout positions.",
};

const toc = [
  { href: "#abstract", label: "Abstract" },
  { href: "#problem", label: "Problem" },
  { href: "#protocol", label: "Protocol model" },
  { href: "#lifecycle", label: "Lifecycle" },
  { href: "#risk", label: "Risk controls" },
  { href: "#market", label: "Position market" },
  { href: "#roadmap", label: "Roadmap" },
];

const protocolPillars = [
  {
    copy: "Program-owned vaults hold SOL contributions and collateral until payout or completion conditions are met.",
    icon: CircleDollarSign,
    title: "Escrowed savings",
  },
  {
    copy: "Every active member has an on-chain membership record and a unique payout position.",
    icon: Layers,
    title: "Position accounting",
  },
  {
    copy: "Defaults route through proposals, grace windows, insurance, collateral, and social vouches.",
    icon: ShieldCheck,
    title: "Default backstops",
  },
  {
    copy: "Completed circles and handled defaults can write into portable wallet reputation.",
    icon: UserCheck,
    title: "Reputation history",
  },
];

const lifecycle = [
  {
    copy: "A host creates a circle with member cap, contribution amount, cycle duration, collateral ratio, payout curve, insurance fee, and reputation gate.",
    label: "Create",
  },
  {
    copy: "Members join by locking collateral and receiving a 1-of-1 payout position NFT that represents their place in the circle.",
    label: "Join",
  },
  {
    copy: "The host starts the circle. Members contribute SOL each round; the protocol routes the contribution and insurance fee into program-controlled accounts.",
    label: "Contribute",
  },
  {
    copy: "Fixed-order circles pay the scheduled recipient. Dutch-auction circles pay the accepted bidder after all active members fund the round.",
    label: "Settle",
  },
  {
    copy: "When every payout round is settled, the host completes the circle, returning verified collateral and closing the active lifecycle.",
    label: "Complete",
  },
];

const riskControls = [
  "Native SOL settlement in V1 keeps accounting simple and auditable.",
  "Round resolution checks active-member contribution bitmaps before any payout.",
  "Default proposals create a governance path for missed contributions.",
  "Insurance fees provide a protocol-level reserve before social or collateral loss is applied.",
  "Vouches let members stake social collateral behind other members.",
  "Mainnet readiness requires devnet soak time, fuzzing, and independent review.",
];

const roadmap = [
  "Complete devnet circle lifecycle: create, join, start, contribute, settle, complete.",
  "Indexer reliability for circle state, activity history, and market listings.",
  "Dutch-auction payout positions and secondary position liquidity.",
  "Reputation claims for clean completion, hosting, vouches, and defaults.",
  "External program review before any mainnet deployment.",
];

export default function WhitepaperPage() {
  return (
    <main className="dhukuti-scrollbar h-screen overflow-y-auto bg-background text-foreground">
      <header className="sticky top-0 z-30 border-b border-border bg-background/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-6 py-4 md:px-10">
          <Link
            href="/"
            className="inline-flex min-h-10 items-center gap-2 rounded-md font-mono text-[0.68rem] uppercase tracking-[0.08em] text-muted transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
            Back home
          </Link>
          <Link
            href="/circles"
            className="inline-flex min-h-10 items-center gap-2 rounded-md border border-accent/35 bg-accent/12 px-4 font-mono text-[0.68rem] uppercase tracking-[0.08em] text-accent transition-colors hover:border-accent/50 hover:bg-accent/18 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            Launch app
            <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
          </Link>
        </div>
      </header>

      <div className="mx-auto grid max-w-7xl gap-12 px-6 py-12 md:px-10 lg:grid-cols-[18rem_minmax(0,1fr)] lg:py-16">
        <aside className="lg:sticky lg:top-24 lg:h-fit">
          <div className="mb-7 flex items-center gap-2">
            <BrandMark className="h-6 w-6" priority />
            <span className="font-mono text-[0.7rem] uppercase tracking-[0.14em] text-muted">
              Dhukuti Protocol
            </span>
          </div>
          <nav
            aria-label="Whitepaper sections"
            className="hidden border-l border-border pl-4 lg:block"
          >
            {toc.map((item) => (
              <a
                key={item.href}
                href={item.href}
                className="block min-h-9 rounded-sm py-2 font-mono text-[0.68rem] uppercase tracking-[0.08em] text-muted transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {item.label}
              </a>
            ))}
          </nav>
        </aside>

        <article className="min-w-0">
          <section id="abstract" className="scroll-mt-28 border-b border-border pb-12 md:pb-16">
            <p className="mb-4 font-mono text-[0.68rem] uppercase tracking-[0.14em] text-accent">
              Whitepaper v0.1
            </p>
            <h1 className="max-w-4xl text-4xl font-semibold tracking-tight md:text-6xl">
              A protocol for collateralized community savings circles.
            </h1>
            <p className="mt-6 max-w-3xl text-base leading-8 text-muted md:text-lg">
              Dhukuti brings rotating savings and credit associations to Solana with program-owned
              vaults, enforced contribution rounds, default backstops, reputation history, and
              transferable payout positions.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <PaperBadge>Native SOL V1</PaperBadge>
              <PaperBadge>Anchor program</PaperBadge>
              <PaperBadge>Devnet deployed</PaperBadge>
              <PaperBadge>{shortProgramId(DHUKUTI_PROGRAM.programId)}</PaperBadge>
            </div>
          </section>

          <PaperSection id="problem" kicker="01" title="Problem">
            <p>
              Savings circles work because members combine discipline, social trust, and predictable
              payout order. The weak point is enforcement: missed contributions are hard to verify,
              default handling is informal, and reputation rarely travels beyond the original group.
            </p>
            <p>
              Crypto rails can improve settlement and portability, but most on-chain savings
              products either remove the community layer or overfit to trading. Dhukuti keeps the
              savings-circle primitive intact and makes the obligations explicit.
            </p>
          </PaperSection>

          <PaperSection id="protocol" kicker="02" title="Protocol model">
            <p>
              A Dhukuti circle is a program-governed savings pool. The creator fixes the economic
              terms, members join with collateral, and every round requires active members to fund
              before any payout can resolve.
            </p>
            <div className="mt-8 grid gap-4 md:grid-cols-2">
              {protocolPillars.map((pillar) => (
                <div
                  key={pillar.title}
                  className="rounded-lg border border-border bg-foreground/[0.025] p-5"
                >
                  <pillar.icon className="mb-4 h-5 w-5 text-accent" aria-hidden="true" />
                  <h3 className="text-sm font-medium text-foreground">{pillar.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-muted">{pillar.copy}</p>
                </div>
              ))}
            </div>
          </PaperSection>

          <PaperSection id="lifecycle" kicker="03" title="Circle lifecycle">
            <div className="space-y-4">
              {lifecycle.map((item, index) => (
                <div
                  key={item.label}
                  className="grid gap-4 border-b border-border pb-4 last:border-b-0 last:pb-0 md:grid-cols-[5rem_minmax(0,1fr)]"
                >
                  <div className="font-mono text-[0.62rem] uppercase tracking-[0.12em] text-accent">
                    {String(index + 1).padStart(2, "0")} {item.label}
                  </div>
                  <p className="text-sm leading-7 text-muted">{item.copy}</p>
                </div>
              ))}
            </div>
          </PaperSection>

          <PaperSection id="risk" kicker="04" title="Risk controls">
            <p>
              The protocol does not make social credit risk disappear. It makes contribution state,
              payout state, and failure paths inspectable before value moves.
            </p>
            <ul className="mt-7 grid gap-3">
              {riskControls.map((control) => (
                <li key={control} className="flex gap-3 text-sm leading-7 text-muted">
                  <BadgeCheck className="mt-1 h-4 w-4 shrink-0 text-success" aria-hidden="true" />
                  <span>{control}</span>
                </li>
              ))}
            </ul>
          </PaperSection>

          <PaperSection id="market" kicker="05" title="Position market">
            <p>
              Each member receives a payout position when joining. This creates a path for secondary
              liquidity: a member can list the position before its payout round, and another wallet
              can buy that future payout exposure.
            </p>
            <div className="mt-8 grid gap-4 md:grid-cols-3">
              <MarketStep label="Seller" value="Lists position NFT" />
              <MarketStep label="Buyer" value="Pays ask price" />
              <MarketStep label="Protocol" value="Transfers payout claim" />
            </div>
          </PaperSection>

          <PaperSection id="roadmap" kicker="06" title="Roadmap">
            <div className="space-y-3">
              {roadmap.map((item, index) => (
                <div
                  key={item}
                  className="flex items-start gap-4 rounded-md border border-border bg-foreground/[0.02] p-4"
                >
                  <span className="font-mono text-[0.62rem] text-accent">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <p className="text-sm leading-6 text-muted">{item}</p>
                </div>
              ))}
            </div>
          </PaperSection>

          <section className="mb-20 mt-14 rounded-lg border border-accent/25 bg-accent/8 p-6 md:p-8">
            <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="font-mono text-[0.66rem] uppercase tracking-[0.12em] text-accent">
                  Current deployment
                </p>
                <p className="mt-2 max-w-2xl text-sm leading-7 text-muted">
                  Dhukuti is currently a devnet protocol surface. Mainnet deployment should wait for
                  additional fuzzing, longer devnet usage, and independent program review.
                </p>
              </div>
              <a
                href={explorerAddressUrl(DHUKUTI_PROGRAM.programId)}
                target="_blank"
                rel="noreferrer"
                className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-md border border-accent/35 bg-background px-4 font-mono text-[0.68rem] uppercase tracking-[0.08em] text-accent transition-colors hover:border-accent/55 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                View program
                <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
              </a>
            </div>
          </section>
        </article>
      </div>
    </main>
  );
}

function PaperSection({
  children,
  id,
  kicker,
  title,
}: {
  children: React.ReactNode;
  id: string;
  kicker: string;
  title: string;
}) {
  return (
    <section id={id} className="scroll-mt-28 border-b border-border py-12 md:py-16">
      <div className="mb-7 flex items-baseline gap-4">
        <span className="font-mono text-[0.62rem] uppercase tracking-[0.12em] text-accent">
          {kicker}
        </span>
        <h2 className="text-2xl font-semibold tracking-tight md:text-3xl">{title}</h2>
      </div>
      <div className="max-w-3xl space-y-5 text-sm leading-7 text-muted md:text-base md:leading-8">
        {children}
      </div>
    </section>
  );
}

function PaperBadge({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex min-h-7 items-center rounded-[2px] border border-border bg-foreground/[0.035] px-2.5 font-mono text-[0.6rem] uppercase tracking-[0.08em] text-muted">
      {children}
    </span>
  );
}

function MarketStep({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-foreground/[0.025] p-4">
      <p className="font-mono text-[0.58rem] uppercase tracking-[0.1em] text-muted">{label}</p>
      <p className="mt-2 text-sm font-medium text-foreground">{value}</p>
    </div>
  );
}

function shortProgramId(programId: string) {
  return `${programId.slice(0, 4)}...${programId.slice(-4)}`;
}
