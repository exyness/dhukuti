"use client";

import { useQuery } from "@tanstack/react-query";
import { useWalletIdentity } from "@/lib/use-wallet-identity";
import {
  fetchActivity,
  fetchCircleDetail,
  fetchCircles,
  fetchMarketListings,
  fetchProfile,
} from "./api";

type WalletQueryOptions = {
  enabled?: boolean;
};

export const queryKeys = {
  activity: (wallet: string | null | undefined) => ["activity", wallet ?? "guest"] as const,
  circle: (circleId: string) => ["circle", circleId] as const,
  circles: (wallet: string | null | undefined) => ["circles", wallet ?? "guest"] as const,
  market: ["market"] as const,
  profile: (wallet: string | null | undefined) => ["profile", wallet ?? "guest"] as const,
};

export function useActivityQuery(
  wallet: string | null | undefined,
  options: WalletQueryOptions = {},
) {
  const { isConnected } = useWalletIdentity();

  return useQuery({
    enabled: isConnected && Boolean(wallet) && (options.enabled ?? true),
    queryFn: () => fetchActivity(wallet),
    queryKey: queryKeys.activity(wallet),
  });
}

export function useCirclesQuery(wallet?: string | null, options: WalletQueryOptions = {}) {
  return useQuery({
    enabled: options.enabled ?? true,
    queryFn: () => fetchCircles(wallet),
    queryKey: queryKeys.circles(wallet),
    staleTime: 30_000,
  });
}

export function useCircleDetailQuery(
  circleId: string,
  wallet?: string | null,
  options: WalletQueryOptions = {},
) {
  return useQuery({
    enabled: Boolean(circleId) && (options.enabled ?? true),
    queryFn: () => fetchCircleDetail(circleId, wallet),
    queryKey: [...queryKeys.circle(circleId), wallet ?? "guest"],
    staleTime: 30_000,
  });
}

export function useMarketListingsQuery(options: WalletQueryOptions = {}) {
  return useQuery({
    enabled: options.enabled ?? true,
    queryFn: fetchMarketListings,
    queryKey: queryKeys.market,
    staleTime: 30_000,
  });
}

export function useProfileQuery(
  wallet: string | null | undefined,
  options: WalletQueryOptions = {},
) {
  const { isConnected } = useWalletIdentity();

  return useQuery({
    enabled: isConnected && Boolean(wallet) && (options.enabled ?? true),
    queryFn: () => fetchProfile(wallet),
    queryKey: queryKeys.profile(wallet),
  });
}
