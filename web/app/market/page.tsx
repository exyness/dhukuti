"use client";

import { useConnection } from "@solana/wallet-adapter-react";
import { PublicKey } from "@solana/web3.js";
import { useQueryClient } from "@tanstack/react-query";
import { Check, Filter, ListPlus, ShieldAlert, ShieldCheck, ShoppingCart, X } from "lucide-react";
import { type ReactNode, type SubmitEvent, useEffect, useMemo, useRef, useState } from "react";
import { AppPageHeader, AppShell, Panel } from "@/components/app/app-shell";
import { TransactionReviewModal } from "@/components/circles/TransactionReviewModal";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";
import { queryKeys, useMarketListingsQuery, useProfileQuery } from "@/lib/data/queries";
import type { CircleSummary, MarketListing, ProfilePosition } from "@/lib/data/types";
import {
  buildBuyPositionInstruction,
  buildCancelListingInstruction,
  buildListPositionInstruction,
  findPositionTokenAccount,
  type ProgramInstructionBundle,
  solToLamports,
} from "@/lib/program";
import { useProgramTransaction } from "@/lib/use-program-transaction";
import { useWalletIdentity } from "@/lib/use-wallet-identity";

type MarketTab = "active" | "history" | "mine";
type EligiblePosition = {
  circle: CircleSummary;
  position: ProfilePosition;
  payoutRound: number;
  remainingContributions: number;
};

const EMPTY_CIRCLES: CircleSummary[] = [];
const EMPTY_LISTINGS: MarketListing[] = [];
const EMPTY_POSITIONS: ProfilePosition[] = [];

export default function MarketPage() {
  const { connection } = useConnection();
  const { address } = useWalletIdentity();
  const queryClient = useQueryClient();
  const transaction = useProgramTransaction();
  const marketQuery = useMarketListingsQuery();
  const profileQuery = useProfileQuery(address);
  const [activeTab, setActiveTab] = useState<MarketTab>("active");
  const [listPrice, setListPrice] = useState("");
  const [listingFormOpen, setListingFormOpen] = useState(false);
  const [localError, setLocalError] = useState("");
  const [selectedPositionMint, setSelectedPositionMint] = useState("");
  const processedMarketReview = useRef("");
  const marketListings = marketQuery.data ?? EMPTY_LISTINGS;
  const profileListings = profileQuery.data?.listings ?? EMPTY_LISTINGS;
  const activeCircles = profileQuery.data?.activeCircles ?? EMPTY_CIRCLES;
  const positions = profileQuery.data?.positions ?? EMPTY_POSITIONS;
  const activeListingMints = new Set(
    profileListings
      .filter((listing) => listing.active && !listing.cancelled && !listing.sold)
      .map((listing) => listing.positionNftMint),
  );
  const eligiblePositions: EligiblePosition[] = positions.flatMap((position) => {
    const circle = activeCircles.find(
      (candidate) => candidate.address === position.circle && candidate.status === "Active",
    );

    if (
      !position.active ||
      position.defaulted ||
      !circle ||
      activeListingMints.has(position.positionNftMint)
    ) {
      return [];
    }

    return [
      {
        circle,
        position,
        payoutRound: position.joinOrder + 1,
        remainingContributions: Math.max(circle.memberCap - circle.currentRoundIndex, 0),
      },
    ];
  });
  const selectedPosition =
    eligiblePositions.find(
      (candidate) => candidate.position.positionNftMint === selectedPositionMint,
    ) ??
    eligiblePositions[0] ??
    null;

  const visibleListings = useMemo(() => {
    if (activeTab === "active") return marketListings;
    if (activeTab === "mine") return profileListings.filter((listing) => listing.active);
    return profileListings.filter((listing) => listing.cancelled || listing.sold);
  }, [activeTab, marketListings, profileListings]);

  useEffect(() => {
    const review = transaction.review;
    if (review?.status !== "confirmed" || !isMarketTransactionTitle(review.title)) return;

    const reviewKey = `${review.title}:${review.signature ?? "confirmed"}`;
    if (processedMarketReview.current === reviewKey) return;
    processedMarketReview.current = reviewKey;

    const cleanupTimer = window.setTimeout(() => {
      setLocalError("");

      if (review.title === "List position") {
        setListingFormOpen(false);
        setListPrice("");
        setSelectedPositionMint("");
        setActiveTab("mine");
      } else if (review.title === "Cancel listing") {
        setActiveTab("history");
      }
    }, 0);

    void queryClient.invalidateQueries({ queryKey: queryKeys.market });
    if (address) {
      void queryClient.invalidateQueries({ queryKey: queryKeys.profile(address) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.activity(address) });
    }

    const refreshTimer = window.setTimeout(() => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.market });
      if (address) {
        void queryClient.invalidateQueries({ queryKey: queryKeys.profile(address) });
      }
    }, 1500);

    return () => {
      window.clearTimeout(cleanupTimer);
      window.clearTimeout(refreshTimer);
    };
  }, [address, queryClient, transaction.review]);

  function requestReview(
    title: string,
    description: string,
    details: { label: string; value: string }[],
    bundle: ProgramInstructionBundle,
  ) {
    setLocalError("");
    void transaction.preview({ bundle, description, details, title }).catch(() => undefined);
  }

  async function reviewListing(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!address) {
      setLocalError("Connect a wallet before listing a payout position.");
      return;
    }
    if (!selectedPosition) {
      setLocalError("Choose one of your eligible payout positions before listing.");
      return;
    }

    try {
      const askPrice = solToLamports(listPrice);
      if (askPrice <= 0n) throw new Error("Enter a listing price greater than zero.");

      const {
        circle: selectedCircle,
        position,
        payoutRound,
        remainingContributions,
      } = selectedPosition;
      const circle = new PublicKey(selectedCircle.address);
      const seller = new PublicKey(address);
      const positionMint = new PublicKey(position.positionNftMint);
      const sellerPositionTokenAccount = await findPositionTokenAccount(
        connection,
        seller,
        positionMint,
      );
      const bundle = buildListPositionInstruction({
        askPrice,
        circle,
        positionNftMint: positionMint,
        seller,
        sellerPositionTokenAccount,
      });

      requestReview(
        "List position",
        "Move this payout-position NFT into program escrow. A buyer receives its payout right and remaining contribution obligations.",
        [
          { label: "Circle", value: selectedCircle.name },
          { label: "Payout position", value: `Round ${payoutRound}` },
          {
            label: "Remaining contributions",
            value: formatContributionObligation(
              remainingContributions,
              selectedCircle.contribution,
            ),
          },
          { label: "Asking price", value: `${listPrice} SOL` },
          { label: "Settlement", value: "Native SOL" },
        ],
        bundle,
      );
    } catch (error) {
      setLocalError(error instanceof Error ? error.message : "Unable to prepare this listing.");
    }
  }

  function reviewPurchase(listing: MarketListing) {
    if (!address) return;
    try {
      const bundle = buildBuyPositionInstruction({
        buyer: new PublicKey(address),
        circle: new PublicKey(listing.circleAddress),
        listing: new PublicKey(listing.listing),
        positionNftMint: new PublicKey(listing.positionNftMint),
        seller: new PublicKey(listing.seller),
      });
      requestReview(
        "Buy position",
        "Pay the seller in SOL, receive the escrowed payout NFT, and assume this position's remaining obligations.",
        [
          { label: "Circle", value: listing.circle },
          { label: "Payout round", value: listing.round },
          { label: "Asking price", value: listing.ask },
          { label: "Seller", value: `${listing.seller.slice(0, 4)}…${listing.seller.slice(-4)}` },
        ],
        bundle,
      );
    } catch (error) {
      setLocalError(error instanceof Error ? error.message : "Unable to prepare this purchase.");
    }
  }

  async function reviewCancellation(listing: MarketListing) {
    if (!address) return;
    try {
      const seller = new PublicKey(address);
      const circle = new PublicKey(listing.circleAddress);
      const sellerPositionTokenAccount = await findPositionTokenAccount(
        connection,
        seller,
        new PublicKey(listing.positionNftMint),
      );
      requestReview(
        "Cancel listing",
        "Return the escrowed payout position to your wallet and close the active listing.",
        [
          { label: "Circle", value: listing.circle },
          { label: "Position", value: listing.round },
          { label: "Asking price", value: listing.ask },
        ],
        buildCancelListingInstruction({
          circle,
          listing: new PublicKey(listing.listing),
          positionNftMint: new PublicKey(listing.positionNftMint),
          seller,
          sellerPositionTokenAccount,
        }),
      );
    } catch (error) {
      setLocalError(
        error instanceof Error ? error.message : "Unable to prepare this cancellation.",
      );
    }
  }

  return (
    <AppShell title="Secondary Market" contentClassName="!max-w-none px-6 py-10 md:px-12">
      <div className="space-y-10">
        <AppPageHeader
          eyebrow="Payout positions"
          title="Trade a future payout, with the obligation attached."
          copy="Positions remain escrowed until purchase. A buyer receives the payout right and inherits the position’s remaining contribution obligations."
          actions={
            <Button
              type="button"
              variant="primary"
              onClick={() => setListingFormOpen((open) => !open)}
            >
              {listingFormOpen ? (
                <X className="h-3.5 w-3.5" aria-hidden="true" />
              ) : (
                <ListPlus className="h-3.5 w-3.5" aria-hidden="true" />
              )}
              {listingFormOpen ? "Close listing" : "List position"}
            </Button>
          }
        />

        <TransactionReviewModal
          error={transaction.error}
          onDismiss={transaction.dismiss}
          onSign={() => void transaction.sign()}
          review={transaction.review}
        />
        {localError ? (
          <Panel className="border-warning/25 bg-warning/8 p-4" role="alert">
            <p className="text-sm leading-6 text-foreground">{localError}</p>
          </Panel>
        ) : null}

        {listingFormOpen ? (
          <ListingForm
            onClose={() => setListingFormOpen(false)}
            onSubmit={reviewListing}
            price={listPrice}
            positions={eligiblePositions}
            selectedPosition={selectedPosition}
            selectedPositionMint={selectedPositionMint}
            setPrice={setListPrice}
            setSelectedPositionMint={setSelectedPositionMint}
            walletConnected={Boolean(address)}
          />
        ) : null}

        <Panel className="flex flex-col gap-6 border-accent/20 bg-accent/8 p-6 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-[1.1rem] font-semibold">Program escrow protects each listing</h2>
            <p className="mt-1 max-w-2xl text-[0.85rem] leading-6 text-muted">
              The position NFT moves into a program-owned escrow account before buyers can discover
              it.
            </p>
          </div>
          <span className="font-mono text-[0.7rem] tabular-nums text-accent">SOL only</span>
        </Panel>

        <section>
          <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex gap-4 overflow-x-auto" role="tablist" aria-label="Market listings">
              <MarketTab active={activeTab === "active"} onClick={() => setActiveTab("active")}>
                Active Listings
              </MarketTab>
              <MarketTab active={activeTab === "mine"} onClick={() => setActiveTab("mine")}>
                Your Listings
              </MarketTab>
              <MarketTab active={activeTab === "history"} onClick={() => setActiveTab("history")}>
                History
              </MarketTab>
            </div>
            <div className="flex items-center gap-2">
              <Filter className="h-3.5 w-3.5 text-muted" aria-hidden="true" />
              <span className="font-mono text-[0.65rem] uppercase text-muted">
                Indexed newest first
              </span>
            </div>
          </div>

          {marketQuery.error ? (
            <StatePanel message={marketQuery.error.message} title="Unable to load listings" />
          ) : null}
          {marketQuery.isLoading || profileQuery.isLoading ? <MarketSkeleton /> : null}
          {!marketQuery.isLoading &&
          !profileQuery.isLoading &&
          !marketQuery.error &&
          visibleListings.length === 0 ? (
            <StatePanel
              message={
                activeTab === "active"
                  ? "No active payout positions have been indexed yet."
                  : "No indexed listings in this view yet."
              }
              title={activeTab === "active" ? "No active listings" : "Nothing to show"}
            />
          ) : null}
          {visibleListings.length > 0 ? (
            <Panel className="overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[820px] border-separate border-spacing-0 text-left">
                  <thead>
                    <tr>
                      <TableHead>Circle / Position</TableHead>
                      <TableHead>Value</TableHead>
                      <TableHead>Discount</TableHead>
                      <TableHead>Seller Rep</TableHead>
                      <TableHead>Asking Price</TableHead>
                      <TableHead>Action</TableHead>
                    </tr>
                  </thead>
                  <tbody>
                    {visibleListings.map((listing) => (
                      <MarketRow
                        key={listing.listing}
                        listing={listing}
                        onBuy={() => reviewPurchase(listing)}
                        onCancel={() => void reviewCancellation(listing)}
                        wallet={address}
                      />
                    ))}
                  </tbody>
                </table>
              </div>
            </Panel>
          ) : null}
        </section>
      </div>
    </AppShell>
  );
}

function ListingForm({
  onClose,
  onSubmit,
  price,
  positions,
  selectedPosition,
  selectedPositionMint,
  setPrice,
  setSelectedPositionMint,
  walletConnected,
}: {
  onClose: () => void;
  onSubmit: (event: SubmitEvent<HTMLFormElement>) => void;
  price: string;
  positions: EligiblePosition[];
  selectedPosition: EligiblePosition | null;
  selectedPositionMint: string;
  setPrice: (value: string) => void;
  setSelectedPositionMint: (value: string) => void;
  walletConnected: boolean;
}) {
  return (
    <Panel className="p-5 sm:p-6">
      <form onSubmit={onSubmit}>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <span className="font-mono text-[0.62rem] uppercase tracking-[0.1em] text-accent">
              Create a listing
            </span>
            <h2 className="mt-2 text-xl font-semibold tracking-tight">Choose a payout position</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">
              You are listing a specific payout right, not the whole circle. The buyer receives the
              position NFT and its remaining contribution obligations.
            </p>
          </div>
          <Button type="button" variant="secondary" size="sm" onClick={onClose}>
            <X className="h-3.5 w-3.5" aria-hidden="true" />
            Close
          </Button>
        </div>

        {!walletConnected ? (
          <ListingState
            copy="Connect your wallet to load the active payout positions available to list."
            title="Connect a wallet to list a position"
          />
        ) : positions.length === 0 ? (
          <ListingState
            copy="Eligible positions must be active, non-defaulted, and not already listed. Join or complete a circle action to see a transferable payout position here."
            title="No eligible payout positions"
          />
        ) : (
          <div className="mt-7 grid gap-6 xl:grid-cols-[minmax(0,1.3fr)_minmax(18rem,0.7fr)]">
            <fieldset>
              <legend className="mb-3 font-mono text-[0.62rem] uppercase tracking-[0.1em] text-muted">
                Your eligible positions ({positions.length})
              </legend>
              <div className="grid gap-3" role="radiogroup" aria-label="Eligible payout positions">
                {positions.map((candidate) => (
                  <PositionSelectionCard
                    key={candidate.position.positionNftMint}
                    position={candidate}
                    selected={
                      candidate.position.positionNftMint ===
                      (selectedPositionMint || selectedPosition?.position.positionNftMint)
                    }
                    onSelect={() => setSelectedPositionMint(candidate.position.positionNftMint)}
                  />
                ))}
              </div>
            </fieldset>

            {selectedPosition ? (
              <ListingSummary
                position={selectedPosition}
                price={price}
                setPrice={setPrice}
                onClose={onClose}
              />
            ) : null}
          </div>
        )}
      </form>
    </Panel>
  );
}

function PositionSelectionCard({
  onSelect,
  position,
  selected,
}: {
  onSelect: () => void;
  position: EligiblePosition;
  selected: boolean;
}) {
  const { circle, payoutRound, remainingContributions } = position;

  return (
    <label
      className={cn(
        "block w-full cursor-pointer rounded-lg border p-4 text-left transition-[border-color,background,transform] duration-150 ease-out focus-within:ring-2 focus-within:ring-ring",
        selected
          ? "border-accent/60 bg-accent/10 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]"
          : "border-border bg-white/[0.02] hover:border-white/20 hover:bg-white/[0.04] active:scale-[0.995]",
      )}
    >
      <input
        className="sr-only"
        type="radio"
        name="listing-position"
        value={position.position.positionNftMint}
        checked={selected}
        onChange={onSelect}
      />
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="truncate text-[0.95rem] font-semibold text-foreground">{circle.name}</p>
          <p className="mt-1 font-mono text-[0.65rem] uppercase tracking-wide text-muted">
            Your payout · Round {payoutRound}
          </p>
        </div>
        <span
          className={cn(
            "inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full border",
            selected ? "border-accent bg-accent text-background" : "border-white/20 bg-transparent",
          )}
          aria-hidden="true"
        >
          {selected ? <Check className="h-3 w-3" strokeWidth={3} /> : null}
        </span>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 border-t border-border pt-4 sm:grid-cols-4">
        <PositionMetric label="Current round" value={circle.round} />
        <PositionMetric label="Contribution" value={circle.contribution} />
        <PositionMetric label="Current pot" value={circle.pot} />
        <PositionMetric label="Mode" value={circle.mode} />
      </div>
      <p className="mt-4 text-[0.75rem] leading-5 text-muted">
        Buyer takes on {formatContributionObligation(remainingContributions, circle.contribution)}.
      </p>
    </label>
  );
}

function ListingSummary({
  onClose,
  position,
  price,
  setPrice,
}: {
  onClose: () => void;
  position: EligiblePosition;
  price: string;
  setPrice: (value: string) => void;
}) {
  const { circle, payoutRound, remainingContributions } = position;

  return (
    <div className="rounded-lg border border-accent/25 bg-accent/[0.06] p-5">
      <span className="font-mono text-[0.62rem] uppercase tracking-[0.1em] text-accent">
        Selected position
      </span>
      <h3 className="mt-2 text-lg font-semibold">{circle.name}</h3>
      <p className="mt-1 font-mono text-[0.7rem] text-muted">Your payout · Round {payoutRound}</p>

      <dl className="mt-5 grid grid-cols-2 gap-x-4 gap-y-5 border-y border-accent/15 py-5">
        <SummaryMetric label="Current round" value={circle.round} />
        <SummaryMetric label="Payout context" value={circle.pot} />
        <SummaryMetric label="Contribution" value={circle.contribution} />
        <SummaryMetric label="Next deadline" value={circle.deadline} />
      </dl>

      <div className="mt-5 rounded-md border border-accent/20 bg-background/35 p-3">
        <p className="font-mono text-[0.6rem] uppercase tracking-[0.08em] text-muted">
          Buyer assumes
        </p>
        <p className="mt-1 text-sm leading-6 text-foreground">
          {formatContributionObligation(remainingContributions, circle.contribution)}
        </p>
      </div>

      <label className="mt-5 block" htmlFor="listing-price">
        <span className="mb-2 block font-mono text-[0.62rem] uppercase tracking-[0.08em] text-muted">
          Asking price (SOL)
        </span>
        <div className="relative">
          <input
            id="listing-price"
            name="askPrice"
            autoComplete="off"
            spellCheck={false}
            className="input-control pr-14 font-mono tabular-nums"
            type="text"
            inputMode="decimal"
            value={price}
            placeholder="e.g. 4.50…"
            onChange={(event) => setPrice(event.target.value)}
          />
          <span className="pointer-events-none absolute inset-y-0 right-4 flex items-center font-mono text-[0.7rem] text-muted">
            SOL
          </span>
        </div>
      </label>

      <p className="mt-3 text-[0.75rem] leading-5 text-muted">
        Your position NFT moves to program escrow when the listing is confirmed. It returns to your
        wallet if you cancel before a sale.
      </p>

      <div className="mt-5 flex flex-wrap gap-2">
        <Button type="button" variant="secondary" onClick={onClose}>
          Cancel
        </Button>
        <Button type="submit" variant="primary" disabled={!price}>
          Review listing
        </Button>
      </div>
    </div>
  );
}

function ListingState({ copy, title }: { copy: string; title: string }) {
  return (
    <div className="mt-7 rounded-lg border border-border bg-white/[0.02] p-6">
      <h3 className="text-[0.95rem] font-medium">{title}</h3>
      <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">{copy}</p>
    </div>
  );
}

function PositionMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <span className="block font-mono text-[0.55rem] uppercase tracking-wide text-muted">
        {label}
      </span>
      <span className="mt-1 block truncate font-mono text-[0.72rem] text-foreground">{value}</span>
    </div>
  );
}

function SummaryMetric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="font-mono text-[0.55rem] uppercase tracking-wide text-muted">{label}</dt>
      <dd className="mt-1 font-mono text-[0.75rem] text-foreground">{value}</dd>
    </div>
  );
}

function formatContributionObligation(count: number, contribution: string) {
  const rounds = count === 1 ? "contribution" : "contributions";
  return `${count} scheduled ${rounds} of ${contribution}`;
}

function isMarketTransactionTitle(title: string) {
  return title === "List position" || title === "Buy position" || title === "Cancel listing";
}

function MarketRow({
  listing,
  onBuy,
  onCancel,
  wallet,
}: {
  listing: MarketListing;
  onBuy: () => void;
  onCancel: () => void;
  wallet: string | null;
}) {
  const isSeller = wallet === listing.seller;
  const isHistorical = !listing.active;

  return (
    <tr className="group transition-colors hover:bg-white/[0.02]">
      <td className="border-b border-border px-4 py-5">
        <div>
          <p className="text-[0.88rem] font-medium">{listing.circle}</p>
          <p className="mt-1 font-mono text-[0.62rem] text-muted">Payout {listing.round}</p>
        </div>
      </td>
      <td className="border-b border-border px-4 py-5 font-mono text-[0.88rem] tabular-nums">
        {listing.value}
      </td>
      <td className="border-b border-border px-4 py-5">
        <span className="font-mono text-[0.88rem] tabular-nums text-success">
          -{listing.discount}
        </span>
      </td>
      <td className="border-b border-border px-4 py-5">
        <RepPill value={listing.sellerRep} />
      </td>
      <td className="border-b border-border px-4 py-5">
        <div>
          <p className="font-mono text-[0.88rem] tabular-nums">{listing.ask}</p>
          <p className="mt-1 text-[0.62rem] text-muted">Escrowed position {listing.id}</p>
        </div>
      </td>
      <td className="border-b border-border px-4 py-5">
        {isHistorical ? (
          <span className="font-mono text-[0.62rem] uppercase text-muted">
            {listing.sold ? "Sold" : "Cancelled"}
          </span>
        ) : isSeller ? (
          <Button type="button" variant="secondary" size="sm" onClick={onCancel}>
            Cancel listing
          </Button>
        ) : (
          <Button type="button" variant="primary" size="sm" disabled={!wallet} onClick={onBuy}>
            Buy position
            <ShoppingCart className="h-3.5 w-3.5" aria-hidden="true" />
          </Button>
        )}
      </td>
    </tr>
  );
}

function MarketSkeleton() {
  return (
    <Panel className="overflow-hidden" aria-label="Loading market listings">
      {["one", "two", "three", "four"].map((key) => (
        <div
          key={key}
          className="flex items-center justify-between gap-4 border-b border-border p-5 last:border-b-0"
        >
          <div className="space-y-2">
            <div className="h-4 w-32 animate-pulse rounded bg-white/[0.06]" />
            <div className="h-3 w-20 animate-pulse rounded bg-white/[0.04]" />
          </div>
          <div className="h-8 w-24 animate-pulse rounded bg-white/[0.06]" />
        </div>
      ))}
    </Panel>
  );
}

function RepPill({ value }: { value: number }) {
  const trusted = value >= 600;
  const Icon = trusted ? ShieldCheck : ShieldAlert;
  return (
    <div className="inline-flex min-h-8 items-center gap-1.5 rounded-full border border-border bg-white/[0.04] px-3 font-mono text-[0.7rem] tabular-nums">
      <Icon
        className={trusted ? "h-3 w-3 text-success" : "h-3 w-3 text-accent"}
        aria-hidden="true"
      />
      <span>{value}</span>
    </div>
  );
}

function MarketTab({
  active,
  children,
  onClick,
}: {
  active: boolean;
  children: ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      className={
        active
          ? "min-h-10 border-accent border-b-2 px-3 py-1.5 font-mono text-[0.62rem] uppercase tracking-widest text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          : "min-h-10 px-3 py-1.5 font-mono text-[0.62rem] uppercase tracking-widest text-muted transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      }
      onClick={onClick}
    >
      {children}
    </button>
  );
}

function StatePanel({ message, title }: { message: string; title: string }) {
  return (
    <Panel className="mt-6 p-6">
      <h3 className="font-medium text-foreground">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-muted">{message}</p>
    </Panel>
  );
}

function TableHead({ children }: { children: ReactNode }) {
  return (
    <th className="border-b border-border px-4 py-3 font-mono text-[0.62rem] uppercase tracking-[0.1em] text-muted">
      {children}
    </th>
  );
}
