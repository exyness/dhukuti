import type {
  ActivityLogEntry,
  CircleDetail,
  CircleSummary,
  MarketListing,
  ProfileData,
} from "@/lib/data/types";

export async function fetchCircles() {
  const response = await fetchJson<{ circles: CircleSummary[] }>("/api/circles");
  return response.circles;
}

export async function fetchCircleDetail(circleId: string) {
  const response = await fetchJson<{ detail: CircleDetail }>(
    `/api/circles/${encodeURIComponent(circleId)}`,
  );
  return response.detail;
}

export async function fetchMarketListings() {
  const response = await fetchJson<{ listings: MarketListing[] }>("/api/market");
  return response.listings;
}

export async function fetchProfile(wallet: string | null | undefined) {
  const searchParams = new URLSearchParams();
  if (wallet) searchParams.set("wallet", wallet);
  const response = await fetchJson<{ profile: ProfileData }>(`/api/profile?${searchParams}`);
  return response.profile;
}

export async function fetchActivity(wallet: string | null | undefined) {
  const searchParams = new URLSearchParams();
  if (wallet) searchParams.set("wallet", wallet);
  const response = await fetchJson<{ activity: ActivityLogEntry[] }>(
    `/api/activity?${searchParams}`,
  );
  return response.activity;
}

async function fetchJson<T>(url: string) {
  const response = await fetch(url, {
    headers: {
      accept: "application/json",
    },
  });

  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new Error(body?.error ?? `Request failed with ${response.status}.`);
  }

  return (await response.json()) as T;
}
