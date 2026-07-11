"use client";

import {
  ArrowRight,
  ChevronRight,
  Code2,
  Globe,
  Layers,
  ShieldCheck,
  UserCheck,
  Verified,
  Wallet,
} from "lucide-react";
import Link from "next/link";
import { type ReactNode, useState } from "react";
import { cn } from "@/lib/cn";
import { DHUKUTI_PROGRAM, explorerAddressUrl } from "@/lib/constants";
import { useWalletIdentity } from "@/lib/use-wallet-identity";
import { OPEN_WALLET_EVENT } from "@/lib/wallet";
import { LandingSidebar } from "./landing-sidebar";

const PROGRAM_ID_LABEL = `${DHUKUTI_PROGRAM.programId.slice(0, 4)}...${DHUKUTI_PROGRAM.programId.slice(-4)}`;

export function LandingPage() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const { connecting, isConnected } = useWalletIdentity();

  const openWalletFlow = () => {
    setSidebarCollapsed(false);
    window.dispatchEvent(new Event(OPEN_WALLET_EVENT));
  };

  return (
    <div className="flex min-h-screen bg-[var(--bg)] text-[var(--ink)]">
      <LandingSidebar
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed((collapsed) => !collapsed)}
      />
      <main
        id="mainContent"
        className={cn(
          "dhukuti-scrollbar relative h-screen overflow-y-auto bg-[var(--bg)] transition-[margin-left,width] duration-[400ms] ease-in-out",
          sidebarCollapsed ? "ml-0 w-full" : "ml-[420px] w-[calc(100%_-_420px)]",
        )}
      >
        <MainNav
          walletConnected={isConnected}
          walletConnecting={connecting}
          onConnectWallet={openWalletFlow}
        />
        <ContentWrap />
      </main>
    </div>
  );
}

function MainNav({
  walletConnected,
  walletConnecting,
  onConnectWallet,
}: {
  walletConnected: boolean;
  walletConnecting: boolean;
  onConnectWallet: () => void;
}) {
  return (
    <nav className="sticky top-0 z-40 flex items-center justify-end border-b border-[rgba(245,245,245,0.05)] bg-[rgba(10,10,10,0.9)] px-8 py-5 backdrop-blur-[12px]">
      <div className="mr-8 flex items-center gap-8 font-mono text-[0.72rem] tracking-wide text-[var(--ink-dim)]">
        <Link
          href="/circles"
          className="cursor-pointer transition-colors duration-100 ease-out hover:text-[var(--ink)]"
        >
          Circles
        </Link>
        <Link
          href="/profile"
          className="cursor-pointer transition-colors duration-100 ease-out hover:text-[var(--ink)]"
        >
          Reputation
        </Link>
        <Link
          href="/market"
          className="cursor-pointer transition-colors duration-100 ease-out hover:text-[var(--ink)]"
        >
          Market
        </Link>
      </div>

      {walletConnected ? (
        <Link
          href="/circles"
          className="group flex cursor-pointer items-center gap-2 rounded-md bg-[var(--ink)] px-4 py-2 font-mono text-[0.7rem] uppercase tracking-wide text-[var(--bg)] transition-opacity duration-100 ease-out hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(255,210,196,0.85)]"
        >
          Launch App
          <ArrowRight
            className="h-3 w-3 transition-transform duration-200 ease-[cubic-bezier(0.34,1.56,0.64,1)] group-hover:translate-x-1"
            aria-hidden="true"
          />
        </Link>
      ) : (
        <button
          type="button"
          className="group flex min-h-[34px] cursor-pointer items-center gap-2 rounded-md bg-[var(--ink)] px-4 py-2 font-mono text-[0.7rem] uppercase tracking-wide text-[var(--bg)] transition-opacity duration-100 ease-out hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(255,210,196,0.85)] disabled:cursor-not-allowed disabled:opacity-70"
          aria-busy={walletConnecting}
          disabled={walletConnecting}
          onClick={onConnectWallet}
        >
          {walletConnecting ? "Connecting" : "Connect Wallet"}
          <Wallet className="h-3.5 w-3.5" aria-hidden="true" />
        </button>
      )}
    </nav>
  );
}

function ContentWrap() {
  return (
    <div className="mx-auto flex max-w-[920px] flex-col gap-[5.5rem] px-16 py-20">
      <IntroductionSection />
      <LifecycleSection />
      <LiveCirclesSection />
      <ProtocolHealthSection />
      <GovernanceSection />
      <LandingFooter />
    </div>
  );
}

function IntroductionSection() {
  return (
    <section className="max-w-3xl">
      <span className="mb-4 block font-mono text-[0.68rem] uppercase tracking-widest text-[var(--accent)]">
        Introduction
      </span>
      <div className="font-geist space-y-6 text-[1.1rem] leading-[1.65] text-[rgba(245,245,245,0.75)]">
        <p>
          A ROSCA is a simple, centuries-old way for people to save money together. In plain
          English:{" "}
          <strong className="font-medium text-[var(--ink)]">
            a group of friends pools their money every month, and one person takes home the whole
            pot each time.
          </strong>
        </p>
        <p>
          Dhukuti Protocol brings that model to Solana with an Anchor program that tracks
          collateral, SOL contributions, payouts, defaults, vouches, position NFTs, and wallet
          reputation without a bank in the middle.
        </p>
      </div>

      <AudienceSplit />
      <TrustedStrip />
    </section>
  );
}

function AudienceSplit() {
  return (
    <div className="mt-12 mb-6 grid grid-cols-1 overflow-hidden rounded-lg border border-[var(--ink-faint)] bg-white/[0.02] md:grid-cols-[1fr_auto_1fr]">
      <div className="px-7 py-6">
        <div className="mb-[0.85rem] font-mono text-[0.62rem] uppercase tracking-[0.1em] text-[var(--ink-dim)]">
          For Individual Savers
        </div>
        <AudienceList
          items={[
            "Join SOL-only circles with collateral",
            "Receive fixed-order or auctioned payouts",
            "Carry wallet reputation across circles",
          ]}
        />
      </div>
      <div className="hidden w-px self-stretch bg-[var(--ink-faint)] md:block" />
      <div className="px-7 py-6">
        <div className="mb-[0.85rem] font-mono text-[0.62rem] uppercase tracking-[0.1em] text-[var(--ink-dim)]">
          For Community Hosts
        </div>
        <AudienceList
          items={[
            "Create 2-64 member community circles",
            "Use default proposals, grace windows, and insurance",
            "Mint position NFTs for transferability",
          ]}
        />
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
          className="font-geist flex items-center gap-[0.55rem] text-[0.82rem] text-[var(--ink)]"
        >
          <span className="h-1 w-1 shrink-0 rounded-full bg-[var(--accent)]" aria-hidden="true" />
          {item}
        </li>
      ))}
    </ul>
  );
}

function TrustedStrip() {
  return (
    <div className="mt-10 flex items-center border-y border-[var(--ink-faint)] py-5">
      <span className="mr-8 shrink-0 border-r border-[var(--ink-faint)] pr-8 font-mono text-[0.6rem] uppercase tracking-[0.1em] text-[var(--ink-dim)]">
        Security &amp; Trust
      </span>
      <div className="flex items-center gap-8 font-mono text-[0.72rem] font-medium text-[var(--ink)] opacity-45">
        <span className="flex items-center gap-1.5">
          <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
          Native SOL V1
        </span>
        <span className="flex items-center gap-1.5">
          <UserCheck className="h-3.5 w-3.5" aria-hidden="true" />
          Wallet Reputation PDAs
        </span>
        <span className="flex items-center gap-1.5">
          <Code2 className="h-3.5 w-3.5" aria-hidden="true" />
          LiteSVM Tested
        </span>
      </div>
    </div>
  );
}

function LifecycleSection() {
  const steps = [
    {
      index: "01",
      title: "Create & Join",
      copy: "A host creates a SOL circle. Members join with collateral, and the program mints each active member a 1-of-1 position NFT.",
    },
    {
      index: "02",
      title: "Contribute & Resolve",
      copy: "Members contribute each round. Insurance fees route to the pool, then fixed order or an accepted Dutch bid decides the payout.",
    },
    {
      index: "03",
      title: "Default & Reputation",
      copy: "Missed rounds can trigger proposals, votes, and a grace window. Collateral and vouches can be slashed, then reputation is recorded.",
    },
  ];

  return (
    <section>
      <div className="mb-10 flex items-baseline justify-between">
        <span className="font-mono text-[0.68rem] uppercase tracking-widest text-[var(--ink-dim)]">
          The Lifecycle
        </span>
      </div>

      <div className="grid grid-cols-1 gap-12 md:grid-cols-3">
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
    <section id="circles">
      <div className="mb-8 flex items-baseline justify-between">
        <span className="font-mono text-[0.68rem] uppercase tracking-widest text-[var(--ink-dim)]">
          Circle Flow Preview
        </span>
        <Link
          href="/circles"
          className="cursor-pointer border-b border-[var(--ink-faint)] pb-px font-mono text-[0.65rem] tracking-wide text-[var(--ink-dim)] transition-colors duration-100 ease-out hover:border-[var(--ink)] hover:text-[var(--ink)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(255,210,196,0.85)]"
        >
          View Program Surface →
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
          footerLabel="Position NFT minted on join"
          action="View Flow"
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
          footerLabel="Accepted bid applies payout discount"
          action="Review Bid"
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
  icon: ReactNode;
  leftLabel: string;
  leftValue: string;
  rightLabel: string;
  rightValue: string;
  title: string;
}) {
  return (
    <div className="overflow-hidden rounded-[10px] border border-[var(--ink-faint)] bg-white/[0.02] p-6 transition-[border-color,background] duration-200 ease-out hover:border-white/20 hover:bg-white/[0.04]">
      <div className="mb-4 flex items-start justify-between">
        <div>
          <div className="mb-1 flex items-center gap-2">
            <h4 className="font-geist text-[1rem] font-semibold text-[var(--ink)]">{title}</h4>
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
      <div className="mt-8 flex items-center justify-between border-t border-[var(--ink-faint)] pt-6">
        <span className="font-mono text-[0.65rem] text-[var(--ink-dim)]">{footerLabel}</span>
        <button
          type="button"
          className="flex min-h-10 cursor-pointer items-center gap-1.5 text-[0.8rem] font-medium text-[var(--ink)] transition-colors duration-100 ease-out hover:text-[var(--accent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(255,210,196,0.85)]"
        >
          {action}
          <ChevronRight className="h-3 w-3" aria-hidden="true" />
        </button>
      </div>
    </div>
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
    <section id="reputation">
      <div className="mb-6">
        <span className="mb-1 block font-mono text-[0.68rem] uppercase tracking-widest text-[var(--ink-dim)]">
          Protocol Health
        </span>
        <h2 className="font-geist text-2xl font-semibold">Devnet Program Status</h2>
        <p className="mt-3 max-w-[42rem] text-[0.9rem] leading-[1.6] text-[var(--ink-dim)]">
          The current app targets the deployed V1 Anchor program: native SOL settlement, event
          indexing support, and explicit review gates before value-bearing mainnet use.
        </p>
      </div>

      <div className="grid w-full grid-cols-1 overflow-hidden rounded-lg border border-[var(--ink-faint)] bg-white/[0.02] md:grid-cols-4">
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
    <div className="flex flex-col gap-[0.35rem] border-b border-[var(--ink-faint)] px-6 py-5 last:border-b-0 md:border-r md:border-b-0 md:last:border-r-0">
      <span className="font-mono text-[0.65rem] uppercase tracking-[0.06em] text-[var(--ink-dim)]">
        {label}
      </span>
      <span
        className={cn(
          "font-mono text-[1.1rem] font-medium text-[var(--ink)]",
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
    <section id="program-surface">
      <div className="mb-6 flex items-baseline justify-between">
        <span className="font-mono text-[0.68rem] uppercase tracking-widest text-[var(--ink-dim)]">
          Program Surface &amp; Updates
        </span>
      </div>

      <div className="overflow-hidden rounded-lg border border-[var(--ink-faint)]">
        <table className="w-full border-collapse">
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
              track="Indexer"
              subject="Supabase event schema"
              detail="Anchor event logs have read-model tables ready for a trusted server-side indexer."
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
        "group transition-colors duration-100 ease-out hover:bg-white/[0.02]",
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
    <footer className="border-t border-[var(--ink-faint)] pt-14 pb-24">
      <div className="grid grid-cols-[minmax(220px,1.15fr)_minmax(360px,1.85fr)] items-start gap-20">
        <div>
          <div className="mb-4 flex items-center gap-2">
            <Layers className="h-4 w-4 text-[var(--accent)]" aria-hidden="true" />
            <span className="font-geist text-[1.1rem] font-semibold tracking-tight">Dhukuti</span>
          </div>
          <p className="max-w-[26rem] text-[0.86rem] leading-[1.7] text-[var(--ink-dim)]">
            Solana-native Dhukuti circles with collateral, insurance, vouches, reputation, and
            tradeable position NFTs.
          </p>
        </div>
        <nav aria-label="Footer" className="grid grid-cols-[1.08fr_0.98fr_0.82fr] gap-11">
          <FooterColumn
            title="Product"
            links={[
              { label: "Create Circle", href: "/circles/new" },
              { label: "Position Market", href: "/market" },
              { label: "Reputation", href: "/profile" },
            ]}
          />
          <FooterColumn
            title="Resources"
            links={[
              { label: "Program README", href: "#program-surface" },
              {
                label: "Devnet Explorer",
                href: explorerAddressUrl(DHUKUTI_PROGRAM.programId),
              },
              { label: "Supabase Schema", href: "#program-surface" },
            ]}
          />
          <FooterColumn
            title="Social"
            links={[
              { label: "Discord", href: "#mainContent" },
              { label: "X / Twitter", href: "#mainContent" },
              { label: "GitHub", href: "#mainContent" },
            ]}
          />
        </nav>
      </div>
    </footer>
  );
}

type FooterLink = {
  href: string;
  label: string;
};

function FooterColumn({ links, title }: { links: FooterLink[]; title: string }) {
  return (
    <div className="flex flex-col gap-[0.85rem]">
      <span className="font-mono text-[0.62rem] uppercase tracking-[0.14em] text-[var(--ink-dim)]">
        {title}
      </span>
      {links.map((link) => (
        <a
          key={link.label}
          href={link.href}
          className="w-fit cursor-pointer whitespace-nowrap font-mono text-[0.72rem] text-[var(--ink)] transition-colors duration-100 ease-out hover:text-[var(--accent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(255,210,196,0.85)]"
        >
          {link.label}
        </a>
      ))}
    </div>
  );
}
