"use client";

import { useQuery } from "@tanstack/react-query";
import { useWalletIdentity } from "@/lib/use-wallet-identity";
import { fetchCircleDetail, fetchCircles, fetchMarketListings, fetchProfile } from "./api";

type WalletQueryOptions = {
  enabled?: boolean;
};

export const queryKeys = {
  circle: (circleId: string) => ["circle", circleId] as const,
  circles: ["circles"] as const,
  market: ["market"] as const,
  profile: (wallet: string | null | undefined) => ["profile", wallet ?? "guest"] as const,
};

export function useCirclesQuery(options: WalletQueryOptions = {}) {
  const { isConnected } = useWalletIdentity();

  return useQuery({
    enabled: isConnected && (options.enabled ?? true),
    queryFn: fetchCircles,
    queryKey: queryKeys.circles,
  });
}

export function useCircleDetailQuery(circleId: string, options: WalletQueryOptions = {}) {
  const { isConnected } = useWalletIdentity();

  return useQuery({
    enabled: isConnected && Boolean(circleId) && (options.enabled ?? true),
    queryFn: () => fetchCircleDetail(circleId),
    queryKey: queryKeys.circle(circleId),
  });
}

export function useMarketListingsQuery(options: WalletQueryOptions = {}) {
  const { isConnected } = useWalletIdentity();

  return useQuery({
    enabled: isConnected && (options.enabled ?? true),
    queryFn: fetchMarketListings,
    queryKey: queryKeys.market,
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
