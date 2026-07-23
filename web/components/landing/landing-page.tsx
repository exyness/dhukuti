"use client";

import {
  ArrowRight,
  ChevronRight,
  Code2,
  Globe,
  ShieldCheck,
  UserCheck,
  Verified,
} from "lucide-react";
import Link from "next/link";
import { type ReactNode, useState } from "react";
import { BrandMark } from "@/components/brand/brand-mark";
import { cn } from "@/lib/cn";
import { DHUKUTI_PROGRAM, explorerAddressUrl } from "@/lib/constants";
import { LandingSidebar } from "./landing-sidebar";

const PROGRAM_ID_LABEL = `${DHUKUTI_PROGRAM.programId.slice(0, 4)}...${DHUKUTI_PROGRAM.programId.slice(-4)}`;

export function LandingPage() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  return (
    <div className="flex min-h-screen bg-[var(--bg)] text-[var(--ink)]">
      <a
        href="#mainContent"
        className="fixed left-4 top-4 z-[100] -translate-y-16 rounded-md bg-[var(--ink)] px-4 py-2 font-mono text-xs font-medium text-[var(--bg)] transition-transform duration-150 ease-out focus:translate-y-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg)]"
      >
        Skip to content
      </a>
      <LandingSidebar
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed((collapsed) => !collapsed)}
      />
      <main
        id="mainContent"
        className={cn(
          "dhukuti-scrollbar relative h-screen w-full overflow-y-auto bg-[var(--bg)] transition-[margin-left,width] duration-200 ease-out lg:duration-[400ms]",
          sidebarCollapsed ? "lg:ml-0 lg:w-full" : "lg:ml-[420px] lg:w-[calc(100%_-_420px)]",
        )}
      >
        <MainNav />
        <ContentWrap />
      </main>
    </div>
  );
}

function MainNav() {
  const navLinkClass =
    "cursor-pointer transition-colors duration-100 ease-out hover:text-[var(--ink)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(255,210,196,0.85)]";

  return (
    <nav className="sticky top-0 z-40 flex items-center justify-between border-b border-[rgba(245,245,245,0.05)] bg-[rgba(10,10,10,0.9)] px-5 py-4 backdrop-blur-[12px] sm:px-8 sm:py-5">
      <Link href="/" className="flex items-center gap-2 lg:hidden">
        <BrandMark className="h-6 w-6" priority />
        <span className="font-geist text-[0.95rem] font-semibold tracking-tight">Dhukuti</span>
      </Link>
      <div className="ml-auto flex items-center gap-4 sm:gap-8">
        <div className="hidden items-center gap-8 font-mono text-[0.72rem] tracking-wide text-[var(--ink-dim)] lg:flex">
          <Link href="/circles" className={navLinkClass}>
            Circles
          </Link>
          <Link href="/profile" className={navLinkClass}>
            Reputation
          </Link>
          <Link href="/market" className={navLinkClass}>
            Market
          </Link>
          <Link href="/whitepaper" className={navLinkClass}>
            Whitepaper
          </Link>
        </div>
        <Link
          href="/circles"
          className="group flex min-h-10 items-center gap-2 rounded-md bg-[var(--ink)] px-4 py-2 font-mono text-[0.7rem] uppercase tracking-wide text-[var(--bg)] transition-[opacity,transform] duration-150 ease-out hover:opacity-90 active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(255,210,196,0.85)]"
        >
          Explore Circles
          <ArrowRight
            className="h-3 w-3 transition-transform duration-200 ease-[cubic-bezier(0.34,1.56,0.64,1)] group-hover:translate-x-1"
            aria-hidden="true"
          />
        </Link>
      </div>
    </nav>
  );
}

function ContentWrap() {
  return (
    <div className="mx-auto flex max-w-[920px] flex-col gap-16 px-5 py-12 sm:px-8 sm:py-16 lg:gap-[5.5rem] lg:px-16 lg:py-20">
      <MobileHero />
      <IntroductionSection />
      <LiveCirclesSection />
      <LifecycleSection />
      <ProtocolHealthSection />
      <GovernanceSection />
      <LandingFooter />
    </div>
  );
}

function MobileHero() {
  return (
    <section className="border-b border-[var(--ink-faint)] pb-12 lg:hidden">
      <span className="mb-4 block font-mono text-[0.68rem] uppercase tracking-[0.16em] text-[var(--accent)]">
        Community savings on Solana
      </span>
      <h1 className="font-geist max-w-[14ch] text-[clamp(2.4rem,11vw,3.5rem)] font-bold leading-[1.02] tracking-tight [text-wrap:balance]">
        Save together. Get your turn.
      </h1>
      <p className="mt-5 max-w-[36rem] text-base leading-relaxed text-white/65 sm:text-lg">
        Form a trusted savings circle with people you know. Everyone contributes on a schedule, and
        every member receives the collective pot once.
      </p>
      <div className="mt-7 flex flex-wrap items-center gap-4">
        <Link
          href="/circles"
          className="group inline-flex min-h-11 items-center gap-2 rounded-md border border-[rgba(255,196,178,0.42)] bg-[#bf4934] px-5 font-mono text-[0.7rem] font-medium uppercase tracking-[0.08em] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.24),inset_0_-1px_0_rgba(92,20,8,0.3),0_1px_1px_rgba(0,0,0,0.34),0_5px_10px_rgba(0,0,0,0.2)] transition-[box-shadow,border-color,filter,transform] duration-150 ease-out hover:border-[rgba(255,225,216,0.5)] hover:brightness-[1.01] active:scale-[0.97] active:brightness-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(255,210,196,0.92)] focus-visible:ring-offset-[3px] focus-visible:ring-offset-[#0a0a0a]"
        >
          Explore Circles
          <ArrowRight
            className="h-3.5 w-3.5 transition-transform duration-150 ease-out group-hover:translate-x-1"
            aria-hidden="true"
          />
        </Link>
        <a
          href="#how-it-works"
          className="border-b border-white/20 pb-0.5 font-mono text-[0.7rem] font-medium uppercase tracking-wide text-white transition-[border-color,color] duration-150 ease-out hover:border-white/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(255,210,196,0.85)]"
        >
          How it works
        </a>
      </div>
    </section>
  );
}

function IntroductionSection() {
  return (
    <section id="how-it-works" className="max-w-3xl scroll-mt-24">
      <span className="mb-4 block font-mono text-[0.68rem] uppercase tracking-widest text-[var(--accent)]">
        A familiar model, made transparent
      </span>
      <h2 className="font-geist max-w-[20ch] text-3xl font-semibold leading-[1.1] tracking-tight [text-wrap:balance] sm:text-4xl">
        A simple way to save, together.
      </h2>
      <div className="font-geist mt-6 space-y-5 text-[1.05rem] leading-[1.65] text-[rgba(245,245,245,0.75)] sm:text-[1.1rem]">
        <p>
          A dhukuti, or ROSCA, is a centuries-old savings circle: a group agrees on a contribution
          and schedule, then takes turns receiving the shared pot.
        </p>
        <p>
          Dhukuti brings that familiar rhythm on-chain. The program records contributions,
          collateral, payouts, and reputation so every member can see what happens next.
        </p>
      </div>

      <AudienceSplit />
      <TrustedStrip />
    </section>
  );
}

function AudienceSplit() {
  return (
    <div className="mt-12 grid grid-cols-1 overflow-hidden rounded-lg border border-[var(--ink-faint)] bg-white/[0.02] md:grid-cols-[1fr_auto_1fr]">
      <div className="flex flex-col items-start px-6 py-6 sm:px-7">
        <div className="mb-[0.85rem] font-mono text-[0.62rem] uppercase tracking-[0.1em] text-[var(--ink-dim)]">
          For Savers
        </div>
        <AudienceList
          items={[
            "Join a circle with a clear contribution schedule",
            "Receive your agreed payout turn",
            "Build wallet reputation across circles",
          ]}
        />
        <Link
          href="/circles"
          className="mt-6 border-b border-[var(--ink-faint)] pb-px font-mono text-[0.65rem] tracking-wide text-[var(--ink-dim)] transition-colors duration-100 ease-out hover:border-[var(--ink)] hover:text-[var(--ink)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(255,210,196,0.85)]"
        >
          Browse circles →
        </Link>
      </div>
      <div className="hidden w-px self-stretch bg-[var(--ink-faint)] md:block" />
      <div className="flex flex-col items-start border-t border-[var(--ink-faint)] px-6 py-6 md:border-t-0 sm:px-7">
        <div className="mb-[0.85rem] font-mono text-[0.62rem] uppercase tracking-[0.1em] text-[var(--ink-dim)]">
          For Hosts
        </div>
        <AudienceList
          items={[
            "Create a circle for 2–64 members",
            "Set contribution timing and payout order",
            "Use collateral, grace windows, and insurance safeguards",
          ]}
        />
        <Link
          href="/circles/new"
          className="mt-6 border-b border-[var(--ink-faint)] pb-px font-mono text-[0.65rem] tracking-wide text-[var(--ink-dim)] transition-colors duration-100 ease-out hover:border-[var(--ink)] hover:text-[var(--ink)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(255,210,196,0.85)]"
        >
          Create a circle →
        </Link>
      </div>
    </div>
  );
}

function AudienceList({ items }: { items: string[] }) {
  return (
    <ul className="flex flex-col gap-[0.55rem]">
      {items.map((item) => (
        <li
          key={item}
          className="font-geist flex items-start gap-[0.55rem] text-[0.82rem] leading-[1.5] text-[var(--ink)]"
        >
          <span
            className="mt-[0.45rem] h-1 w-1 shrink-0 rounded-full bg-[var(--accent)]"
            aria-hidden="true"
          />
          {item}
        </li>
      ))}
    </ul>
  );
}

function TrustedStrip() {
  const itemClass =
    "flex items-center gap-1.5 transition-colors duration-100 ease-out hover:text-[var(--ink)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(255,210,196,0.85)]";

  return (
    <div className="mt-10 flex flex-col gap-4 border-y border-[var(--ink-faint)] py-5 sm:flex-row sm:items-center sm:gap-8">
      <span className="shrink-0 font-mono text-[0.6rem] uppercase tracking-[0.1em] text-[var(--ink-dim)] sm:border-r sm:border-[var(--ink-faint)] sm:pr-8">
        Verifiable by design
      </span>
      <div className="flex flex-wrap items-center gap-x-6 gap-y-3 font-mono text-[0.68rem] font-medium text-white/70">
        <a
          href={explorerAddressUrl(DHUKUTI_PROGRAM.programId)}
          target="_blank"
          rel="noreferrer"
          className={itemClass}
        >
          <ShieldCheck className="h-3.5 w-3.5 text-[var(--accent)]" aria-hidden="true" />
          Devnet program
        </a>
        <Link href="/whitepaper" className={itemClass}>
          <Code2 className="h-3.5 w-3.5 text-[var(--accent)]" aria-hidden="true" />
          Native SOL V1
        </Link>
        <Link href="/#program-surface" className={itemClass}>
          <UserCheck className="h-3.5 w-3.5 text-[var(--accent)]" aria-hidden="true" />
          Readiness status
        </Link>
      </div>
    </div>
  );
}

function LifecycleSection() {
  const steps = [
    {
      index: "01",
      title: "Create a circle",
      copy: "Choose the members, contribution amount, cadence, and payout order your group agrees on.",
    },
    {
      index: "02",
      title: "Contribute each round",
      copy: "Members make their scheduled contribution. The shared pot is visible and its next payout is clear.",
    },
    {
      index: "03",
      title: "Take your turn",
      copy: "Each member receives the collective pot once. Collateral, reputation, and safeguards support the agreement.",
    },
  ];

  return (
    <section>
      <div className="mb-10">
        <span className="font-mono text-[0.68rem] uppercase tracking-widest text-[var(--ink-dim)]">
          How a circle works
        </span>
        <h2 className="font-geist mt-3 text-2xl font-semibold tracking-tight sm:text-3xl">
          Clear from the first contribution to the final payout.
        </h2>
      </div>

      <div className="grid grid-cols-1 gap-10 md:grid-cols-3 md:gap-12">
        {steps.map((step) => (
          <div key={step.index} className="flex flex-col gap-5">
            <div className="flex h-8 w-8 items-center justify-center rounded bg-[var(--ink-faint)] font-mono text-[0.65rem] font-semibold text-[var(--accent)]">
              {step.index}
            </div>
            <h3 className="font-geist text-[1.2rem] font-semibold">{step.title}</h3>
            <p className="text-[0.9rem] leading-[1.6] text-[var(--ink-dim)]">{step.copy}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function LiveCirclesSection() {
  return (
    <section id="circles" className="scroll-mt-24">
      <div className="mb-8 flex flex-wrap items-baseline justify-between gap-4">
        <div>
          <span className="font-mono text-[0.68rem] uppercase tracking-widest text-[var(--ink-dim)]">
            Circle examples
          </span>
          <h2 className="font-geist mt-3 text-2xl font-semibold tracking-tight sm:text-3xl">
            See the choices before you commit.
          </h2>
        </div>
        <Link
          href="/circles"
          className="cursor-pointer border-b border-[var(--ink-faint)] pb-px font-mono text-[0.65rem] tracking-wide text-[var(--ink-dim)] transition-colors duration-100 ease-out hover:border-[var(--ink)] hover:text-[var(--ink)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(255,210,196,0.85)]"
        >
          Browse all circles →
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <CircleCard
          icon={<Verified className="h-3.5 w-3.5 text-blue-400" aria-hidden="true" />}
          title="Kathmandu Builder Circle"
          host="dhukuti_host"
          badge={<CategoryBadge tone="main">Fixed Order</CategoryBadge>}
          leftLabel="Contribution"
          leftValue="2 SOL"
          rightLabel="Members"
          rightValue="5 / 8"
          footerLabel="Position NFT minted when you join"
          action="View Circle"
          href="/circles"
        />
        <CircleCard
          icon={<Globe className="h-3.5 w-3.5 text-green-400" aria-hidden="true" />}
          title="Early Payout Auction"
          host="circle_operator"
          badge={<CategoryBadge tone="dim">Dutch Bid</CategoryBadge>}
          leftLabel="Contribution"
          leftValue="1.5 SOL"
          rightLabel="Members"
          rightValue="6 / 10"
          footerLabel="Payout discount is shown before you bid"
          action="Explore Auctions"
          href="/market"
        />
      </div>
    </section>
  );
}

function CircleCard({
  action,
  badge,
  footerLabel,
  host,
  href,
  icon,
  leftLabel,
  leftValue,
  rightLabel,
  rightValue,
  title,
}: {
  action: string;
  badge: ReactNode;
  footerLabel: string;
  host: string;
  href: string;
  icon: ReactNode;
  leftLabel: string;
  leftValue: string;
  rightLabel: string;
  rightValue: string;
  title: string;
}) {
  return (
    <article className="overflow-hidden rounded-[10px] border border-[var(--ink-faint)] bg-white/[0.02] p-6 transition-[border-color,background] duration-200 ease-out hover:border-white/20 hover:bg-white/[0.04]">
      <div className="mb-4 flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="mb-1 flex items-center gap-2">
            <h3 className="font-geist text-[1rem] font-semibold text-[var(--ink)]">{title}</h3>
            {icon}
          </div>
          <p className="font-mono text-[0.65rem] text-[var(--ink-dim)]">Host: {host}</p>
        </div>
        {badge}
      </div>
      <div className="mt-6 grid grid-cols-2 gap-6">
        <CircleStat label={leftLabel} value={leftValue} />
        <CircleStat label={rightLabel} value={rightValue} />
      </div>
      <div className="mt-8 flex flex-wrap items-center justify-between gap-4 border-t border-[var(--ink-faint)] pt-5">
        <span className="font-mono text-[0.65rem] text-[var(--ink-dim)]">{footerLabel}</span>
        <Link
          href={href}
          className="group flex min-h-10 items-center gap-1.5 text-[0.8rem] font-medium text-[var(--ink)] transition-[color,transform] duration-150 ease-out hover:text-[var(--accent)] active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(255,210,196,0.85)]"
        >
          {action}
          <ChevronRight
            className="h-3 w-3 transition-transform duration-150 ease-out group-hover:translate-x-0.5"
            aria-hidden="true"
          />
        </Link>
      </div>
    </article>
  );
}

function CircleStat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span className="mb-1 block font-mono text-[0.55rem] uppercase text-[var(--ink-dim)]">
        {label}
      </span>
      <span className="font-geist text-[1.25rem] font-medium">{value}</span>
    </div>
  );
}

function ProtocolHealthSection() {
  return (
    <section id="program-surface" className="scroll-mt-24">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <span className="mb-1 block font-mono text-[0.68rem] uppercase tracking-widest text-[var(--ink-dim)]">
            Building in public
          </span>
          <h2 className="font-geist text-2xl font-semibold tracking-tight sm:text-3xl">
            Live on Devnet
          </h2>
        </div>
        <a
          href={explorerAddressUrl(DHUKUTI_PROGRAM.programId)}
          target="_blank"
          rel="noreferrer"
          className="border-b border-[var(--ink-faint)] pb-px font-mono text-[0.65rem] tracking-wide text-[var(--ink-dim)] transition-colors duration-100 ease-out hover:border-[var(--ink)] hover:text-[var(--ink)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(255,210,196,0.85)]"
        >
          View program on Explorer ↗
        </a>
      </div>
      <p className="mb-5 max-w-[46rem] text-[0.9rem] leading-[1.6] text-[var(--ink-dim)]">
        Dhukuti is currently a devnet program. Mainnet use remains gated on fuzzing, soak testing,
        and independent review.
      </p>
      <div className="grid w-full grid-cols-2 overflow-hidden rounded-lg border border-[var(--ink-faint)] bg-white/[0.02] md:grid-cols-4">
        <ProtocolStat label="Cluster" value="Devnet" success />
        <ProtocolStat label="Program ID" value={PROGRAM_ID_LABEL} />
        <ProtocolStat label="Settlement" value="Native SOL" />
        <ProtocolStat label="Verification" value="LiteSVM" success />
      </div>
    </section>
  );
}

function ProtocolStat({
  label,
  success,
  value,
}: {
  label: string;
  success?: boolean;
  value: string;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-[0.35rem] border-b border-r border-[var(--ink-faint)] px-4 py-5 last:border-r-0 even:border-r-0 md:px-6 md:even:border-r md:[&:nth-child(4)]:border-r-0 md:[&:nth-child(-n+4)]:border-b-0">
      <span className="font-mono text-[0.6rem] uppercase tracking-[0.06em] text-[var(--ink-dim)]">
        {label}
      </span>
      <span
        className={cn(
          "truncate font-mono text-[0.9rem] font-medium text-[var(--ink)] sm:text-[1.1rem]",
          success && "text-green-500",
        )}
      >
        {value}
      </span>
    </div>
  );
}

function GovernanceSection() {
  return (
    <section>
      <div className="mb-6 flex items-baseline justify-between">
        <div>
          <span className="font-mono text-[0.68rem] uppercase tracking-widest text-[var(--ink-dim)]">
            Readiness &amp; updates
          </span>
          <h2 className="font-geist mt-3 text-2xl font-semibold tracking-tight sm:text-3xl">
            What is ready today.
          </h2>
        </div>
      </div>

      <div className="overflow-x-auto rounded-lg border border-[var(--ink-faint)]">
        <table className="min-w-[620px] w-full border-collapse">
          <thead className="border-b border-[var(--ink-faint)] bg-white/5">
            <tr>
              <TableHead>Track</TableHead>
              <TableHead>Subject</TableHead>
              <TableHead align="right">Status</TableHead>
            </tr>
          </thead>
          <tbody>
            <GovernanceRow
              track="Devnet"
              subject="Program deployment"
              detail="Dhukuti is deployed on Solana devnet with the program ID shown above."
              status={<CategoryBadge tone="main">Live</CategoryBadge>}
            />
            <GovernanceRow
              track="Activity"
              subject="Circle activity history"
              detail="Confirmed circle activity is prepared to appear across the app."
              status={<CategoryBadge tone="dim">Ready</CategoryBadge>}
            />
            <GovernanceRow
              track="Mainnet"
              subject="Fuzzing and independent review gate"
              detail="Mainnet use waits on fuzzing, devnet soak testing, and an external program review."
              status={<CategoryBadge tone="dim">Pending</CategoryBadge>}
              last
            />
          </tbody>
        </table>
      </div>
    </section>
  );
}

function TableHead({ align, children }: { align?: "left" | "right"; children: ReactNode }) {
  return (
    <th
      className={cn(
        "px-6 py-3 font-mono text-[0.6rem] uppercase tracking-widest text-[var(--ink-dim)]",
        align === "right" ? "text-right" : "text-left",
      )}
    >
      {children}
    </th>
  );
}

function GovernanceRow({
  detail,
  last,
  status,
  subject,
  track,
}: {
  detail: string;
  last?: boolean;
  status: ReactNode;
  subject: string;
  track: string;
}) {
  return (
    <tr
      className={cn(
        "transition-colors duration-100 ease-out hover:bg-white/[0.02]",
        !last && "border-b border-[var(--ink-faint)]",
      )}
    >
      <td className="px-6 py-5 font-mono text-[0.65rem] text-[var(--ink-dim)]">{track}</td>
      <td className="px-6 py-5">
        <div className="mb-1 text-[0.88rem] font-medium text-[var(--ink)]">{subject}</div>
        <div className="text-[0.75rem] text-[var(--ink-dim)]">{detail}</div>
      </td>
      <td className="px-6 py-5 text-right">{status}</td>
    </tr>
  );
}

function CategoryBadge({ children, tone }: { children: ReactNode; tone: "main" | "dim" }) {
  return (
    <span
      className={cn(
        "rounded-[2px] px-2 py-[0.2rem] font-mono text-[0.6rem] uppercase",
        tone === "main"
          ? "bg-[rgba(255,107,74,0.15)] text-[var(--accent)]"
          : "bg-white/[0.08] text-[var(--ink-dim)]",
      )}
    >
      {children}
    </span>
  );
}

function LandingFooter() {
  return (
    <footer className="border-t border-[var(--ink-faint)] pt-12 pb-16 sm:pt-14 sm:pb-24">
      <div className="grid grid-cols-1 items-start gap-12 lg:grid-cols-[minmax(220px,1.15fr)_minmax(360px,1.85fr)] lg:gap-20">
        <div>
          <div className="mb-4 flex items-center gap-2">
            <BrandMark className="h-6 w-6" />
            <span className="font-geist text-[1.1rem] font-semibold tracking-tight">Dhukuti</span>
          </div>
          <p className="max-w-[26rem] text-[0.86rem] leading-[1.7] text-[var(--ink-dim)]">
            Solana-native savings circles with transparent contributions, collateral, insurance,
            reputation, and tradeable position NFTs.
          </p>
        </div>
        <nav
          aria-label="Footer"
          className="grid grid-cols-1 gap-8 sm:grid-cols-3 sm:gap-6 lg:gap-11"
        >
          <FooterColumn
            title="Product"
            links={[
              { label: "Browse Circles", href: "/circles" },
              { label: "Create Circle", href: "/circles/new" },
              { label: "Position Market", href: "/market" },
            ]}
          />
          <FooterColumn
            title="Resources"
            links={[
              { label: "Whitepaper", href: "/whitepaper" },
              { label: "Readiness status", href: "/#program-surface" },
              {
                label: "Devnet Explorer",
                href: explorerAddressUrl(DHUKUTI_PROGRAM.programId),
                external: true,
              },
              { label: "Activity history", href: "/activity" },
            ]}
          />
          <FooterColumn
            title="Community"
            links={[
              { label: "Discord", note: "Coming soon" },
              { label: "X / Twitter", note: "Coming soon" },
              { label: "GitHub", note: "Coming soon" },
            ]}
          />
        </nav>
      </div>
    </footer>
  );
}

type FooterLink = {
  external?: boolean;
  href?: string;
  label: string;
  note?: string;
};

function FooterColumn({ links, title }: { links: FooterLink[]; title: string }) {
  return (
    <div className="flex flex-col gap-[0.85rem]">
      <span className="font-mono text-[0.62rem] uppercase tracking-[0.14em] text-[var(--ink-dim)]">
        {title}
      </span>
      {links.map((link) =>
        link.href ? (
          <Link
            key={link.label}
            href={link.href}
            target={link.external ? "_blank" : undefined}
            rel={link.external ? "noreferrer" : undefined}
            className="w-fit font-mono text-[0.72rem] text-[var(--ink)] transition-colors duration-100 ease-out hover:text-[var(--accent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(255,210,196,0.85)]"
          >
            {link.label}
            {link.external ? " ↗" : ""}
          </Link>
        ) : (
          <span key={link.label} className="font-mono text-[0.72rem] text-[var(--ink-dim)]">
            {link.label}
            <span className="ml-2 text-[0.58rem] uppercase tracking-wide text-white/35">
              {link.note}
            </span>
          </span>
        ),
      )}
    </div>
  );
}
