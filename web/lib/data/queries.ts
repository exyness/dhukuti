"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchCircleDetail, fetchCircles, fetchMarketListings, fetchProfile } from "./api";

export const queryKeys = {
  circle: (circleId: string) => ["circle", circleId] as const,
  circles: ["circles"] as const,
  market: ["market"] as const,
  profile: (wallet: string | null | undefined) => ["profile", wallet ?? "guest"] as const,
};

export function useCirclesQuery() {
  return useQuery({
    queryFn: fetchCircles,
    queryKey: queryKeys.circles,
  });
}

export function useCircleDetailQuery(circleId: string) {
  return useQuery({
    enabled: Boolean(circleId),
    queryFn: () => fetchCircleDetail(circleId),
    queryKey: queryKeys.circle(circleId),
  });
}

export function useMarketListingsQuery() {
  return useQuery({
    queryFn: fetchMarketListings,
    queryKey: queryKeys.market,
  });
}

export function useProfileQuery(wallet: string | null | undefined) {
  return useQuery({
    queryFn: () => fetchProfile(wallet),
    queryKey: queryKeys.profile(wallet),
  });
}
