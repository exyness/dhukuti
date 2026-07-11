"use client";

import { useConnection } from "@solana/wallet-adapter-react";
import { PublicKey } from "@solana/web3.js";
import { Filter, ListPlus, ShieldAlert, ShieldCheck, ShoppingCart, X } from "lucide-react";
import { type FormEvent, type ReactNode, useMemo, useState } from "react";
import { AppPageHeader, AppShell, Panel } from "@/components/app/app-shell";
import { TransactionReviewPanel } from "@/components/program/transaction-review";
import { Button } from "@/components/ui/button";
import { useMarketListingsQuery, useProfileQuery } from "@/lib/data/queries";
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

const EMPTY_CIRCLES: CircleSummary[] = [];
const EMPTY_LISTINGS: MarketListing[] = [];
const EMPTY_POSITIONS: ProfilePosition[] = [];

export default function MarketPage() {
  const { connection } = useConnection();
  const { address } = useWalletIdentity();
  const transaction = useProgramTransaction();
  const marketQuery = useMarketListingsQuery();
  const profileQuery = useProfileQuery(address);
  const [activeTab, setActiveTab] = useState<MarketTab>("active");
  const [circleAddress, setCircleAddress] = useState("");
  const [listPrice, setListPrice] = useState("");
  const [listingFormOpen, setListingFormOpen] = useState(false);
  const [localError, setLocalError] = useState("");
  const marketListings = marketQuery.data ?? EMPTY_LISTINGS;
  const profileListings = profileQuery.data?.listings ?? EMPTY_LISTINGS;
  const activeCircles = profileQuery.data?.activeCircles ?? EMPTY_CIRCLES;
  const positions = profileQuery.data?.positions ?? EMPTY_POSITIONS;
  const listablePositions = positions.filter(
    (position) =>
      position.active &&
      !position.defaulted &&
      activeCircles.some(
        (circle) => circle.address === position.circle && circle.status === "Active",
      ),
  );

  const selectedCircleAddress = listablePositions.some(
    (position) => position.circle === circleAddress,
  )
    ? circleAddress
    : (listablePositions[0]?.circle ?? "");

  const visibleListings = useMemo(() => {
    if (activeTab === "active") return marketListings;
    if (activeTab === "mine") return profileListings.filter((listing) => listing.active);
    return profileListings.filter((listing) => listing.cancelled || listing.sold);
  }, [activeTab, marketListings, profileListings]);

  function requestReview(
    title: string,
    description: string,
    details: { label: string; value: string }[],
    bundle: ProgramInstructionBundle,
  ) {
    setLocalError("");
    void transaction.preview({ bundle, description, details, title }).catch(() => undefined);
  }

  async function reviewListing(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!address || !selectedCircleAddress) {
      setLocalError(
        "Connect a wallet and choose one of your active circles before listing a position.",
      );
      return;
    }

    try {
      const askPrice = solToLamports(listPrice);
      if (askPrice <= 0n) throw new Error("Enter a listing price greater than zero.");
      const circle = new PublicKey(selectedCircleAddress);
      const seller = new PublicKey(address);
      const selectedCircle = activeCircles.find((item) => item.address === selectedCircleAddress);
      const selectedPosition = listablePositions.find(
        (position) => position.circle === selectedCircleAddress,
      );
      if (!selectedPosition) {
        throw new Error("No active payout position is available for this circle.");
      }
      const positionMint = new PublicKey(selectedPosition.positionNftMint);
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
        "Move your payout-position NFT into program escrow and set a SOL asking price.",
        [
          { label: "Circle", value: selectedCircle?.name ?? "Selected circle" },
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
              {listingFormOpen ? "Close listing form" : "List position"}
            </Button>
          }
        />

        <TransactionReviewPanel
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
            circles={activeCircles}
            onClose={() => setListingFormOpen(false)}
            onSubmit={reviewListing}
            price={listPrice}
            positions={listablePositions}
            selectedCircle={selectedCircleAddress}
            setPrice={setListPrice}
            setSelectedCircle={setCircleAddress}
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
                      <TableHead>Circle / Round</TableHead>
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
  circles,
  onClose,
  onSubmit,
  price,
  positions,
  selectedCircle,
  setPrice,
  setSelectedCircle,
}: {
  circles: CircleSummary[];
  onClose: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  price: string;
  positions: { circle: string; joinOrder: number }[];
  selectedCircle: string;
  setPrice: (value: string) => void;
  setSelectedCircle: (value: string) => void;
}) {
  return (
    <Panel className="p-6">
      <form
        onSubmit={onSubmit}
        className="grid gap-5 md:grid-cols-[minmax(0,1fr)_12rem_auto] md:items-end"
      >
        <label className="block">
          <span className="mb-2 block font-mono text-[0.6rem] uppercase tracking-[0.08em] text-muted">
            Payout position
          </span>
          <select
            className="input-control font-mono text-[0.75rem]"
            value={selectedCircle}
            disabled={positions.length === 0}
            onChange={(event) => setSelectedCircle(event.target.value)}
          >
            {positions.length === 0 ? <option value="">No active positions</option> : null}
            {positions.map((position) => {
              const circle = circles.find((item) => item.address === position.circle);
              return (
                <option key={position.circle} value={position.circle}>
                  {circle?.name ?? position.circle.slice(0, 8)} · Round {position.joinOrder + 1}
                </option>
              );
            })}
          </select>
        </label>
        <label className="block">
          <span className="mb-2 block font-mono text-[0.6rem] uppercase tracking-[0.08em] text-muted">
            Asking price (SOL)
          </span>
          <input
            className="input-control font-mono tabular-nums"
            type="text"
            inputMode="decimal"
            value={price}
            placeholder="0.00"
            onChange={(event) => setPrice(event.target.value)}
          />
        </label>
        <div className="flex gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" disabled={!selectedCircle || !price}>
            Review listing
          </Button>
        </div>
      </form>
      <p className="mt-4 text-sm leading-6 text-muted">
        Listing moves your 1-of-1 payout NFT into program escrow. The buyer receives the position
        and remaining obligations when the sale confirms.
      </p>
    </Panel>
  );
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
          <p className="mt-1 font-mono text-[0.62rem] text-muted">{listing.round}</p>
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
