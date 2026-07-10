import { ListPlus, ShoppingCart } from "lucide-react";
import { AppPageHeader, AppShell, Panel, StatTile } from "@/components/app/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { marketListings } from "@/lib/app-data";

export default function MarketPage() {
  return (
    <AppShell title="Secondary Market">
      <AppPageHeader
        eyebrow="Position Market"
        title="Trade future payout positions"
        copy="Each membership receives a 1-of-1 SPL position NFT. Members can list active obligations through escrowed listings, and buyers can take over the position."
        actions={
          <Button variant="primary">
            List New Position
            <ListPlus className="h-3.5 w-3.5" aria-hidden="true" />
          </Button>
        }
      />

      <Panel className="mb-6 grid grid-cols-1 overflow-hidden md:grid-cols-4">
        <StatTile label="Active listings" value={String(marketListings.length)} />
        <StatTile label="Settlement" value="SOL escrow" />
        <StatTile label="Position asset" value="1-of-1 NFT" />
        <StatTile label="Program flow" value="list / buy" />
      </Panel>

      <Panel className="mb-8 p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-lg font-semibold">Liquidate your position</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">
              Need immediate capital before your payout round? List the position NFT with an ask
              price. Cancel any time before purchase.
            </p>
          </div>
          <div className="flex gap-3">
            <Button variant="secondary">Your Listings</Button>
            <Button variant="secondary">History</Button>
          </div>
        </div>
      </Panel>

      <Panel className="overflow-hidden">
        <div className="border-b border-border px-6 py-4">
          <span className="font-mono text-[0.68rem] uppercase tracking-widest text-muted">
            Active Listings
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left">
            <thead className="border-b border-border bg-white/[0.03]">
              <tr>
                <TableHead>Circle / Round</TableHead>
                <TableHead>Value</TableHead>
                <TableHead>Discount</TableHead>
                <TableHead>Seller Rep</TableHead>
                <TableHead>Ask</TableHead>
                <TableHead>Action</TableHead>
              </tr>
            </thead>
            <tbody>
              {marketListings.map((listing) => (
                <tr key={listing.id} className="border-b border-border last:border-b-0">
                  <td className="px-6 py-5">
                    <div className="font-medium">{listing.circle}</div>
                    <div className="mt-1 font-mono text-[0.64rem] text-muted">{listing.round}</div>
                  </td>
                  <td className="px-6 py-5 font-mono text-[0.8rem]">{listing.value}</td>
                  <td className="px-6 py-5">
                    <Badge tone="success">{listing.discount}</Badge>
                  </td>
                  <td className="px-6 py-5 font-mono text-[0.8rem]">{listing.sellerRep}</td>
                  <td className="px-6 py-5">
                    <div className="font-mono text-[0.88rem]">{listing.ask}</div>
                    <div className="mt-1 font-mono text-[0.58rem] uppercase tracking-[0.08em] text-muted">
                      Listing {listing.id}
                    </div>
                  </td>
                  <td className="px-6 py-5">
                    <Button variant="primary" size="sm">
                      Buy
                      <ShoppingCart className="h-3.5 w-3.5" aria-hidden="true" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <Panel className="p-6">
          <span className="font-mono text-[0.62rem] uppercase tracking-[0.12em] text-muted">
            list_position / cancel_listing
          </span>
          <p className="mt-3 text-sm leading-6 text-muted">
            Listing escrows the member position NFT and sets an ask price. Cancel returns the NFT if
            no buyer has purchased the obligation.
          </p>
        </Panel>
        <Panel className="p-6">
          <span className="font-mono text-[0.62rem] uppercase tracking-[0.12em] text-muted">
            buy_position
          </span>
          <p className="mt-3 text-sm leading-6 text-muted">
            Buying transfers the position and future obligations. The UI must simulate and explain
            collateral, unpaid rounds, and deadline risk before signing.
          </p>
        </Panel>
      </div>
    </AppShell>
  );
}

function TableHead({ children }: { children: React.ReactNode }) {
  return (
    <th className="px-6 py-3 font-mono text-[0.6rem] uppercase tracking-[0.1em] text-muted">
      {children}
    </th>
  );
}
