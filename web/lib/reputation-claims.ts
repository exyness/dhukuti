import type { CircleSummary, ProfileData } from "@/lib/data/types";

export type ReputationClaimTask = {
  count: number;
  detail: string;
  href: string;
  id: "host" | "member";
  label: string;
};

export function getReputationClaimTasks(profile: ProfileData | undefined): ReputationClaimTask[] {
  if (!profile) return [];

  const eligibleMemberCircleAddresses = new Set(
    profile.positions
      .filter((position) => position.active && !position.defaulted)
      .map((position) => position.circle),
  );
  const completedMemberCircles = profile.circleHistory.filter(
    (circle) => isCompletedCircle(circle) && eligibleMemberCircleAddresses.has(circle.address),
  );
  const completedHostedCircles = profile.hostedCircles.filter(isCompletedCircle);
  const claimedMemberCompletions = toInteger(profile.stats.completedCircles);
  const claimedHostCompletions = toInteger(profile.stats.hostCompletions);
  const pendingMemberClaims = Math.max(completedMemberCircles.length - claimedMemberCompletions, 0);
  const pendingHostClaims = Math.max(completedHostedCircles.length - claimedHostCompletions, 0);
  const nextMemberClaimCircle =
    completedMemberCircles[claimedMemberCompletions] ?? completedMemberCircles[0];
  const nextHostClaimCircle =
    completedHostedCircles[claimedHostCompletions] ?? completedHostedCircles[0];
  const tasks: ReputationClaimTask[] = [];

  if (pendingHostClaims > 0 && nextHostClaimCircle) {
    tasks.push({
      count: pendingHostClaims,
      detail: "Record host completion credit from closed circles.",
      href: `/circles/${nextHostClaimCircle.address}`,
      id: "host",
      label: `${pendingHostClaims} host ${pendingHostClaims === 1 ? "claim" : "claims"}`,
    });
  }

  if (pendingMemberClaims > 0 && nextMemberClaimCircle) {
    tasks.push({
      count: pendingMemberClaims,
      detail: "Record member completion reputation from settled positions.",
      href: `/circles/${nextMemberClaimCircle.address}`,
      id: "member",
      label: `${pendingMemberClaims} member ${pendingMemberClaims === 1 ? "claim" : "claims"}`,
    });
  }

  return tasks;
}

export function getReputationClaimCount(profile: ProfileData | undefined) {
  return getReputationClaimTasks(profile).reduce((total, task) => total + task.count, 0);
}

function isCompletedCircle(circle: CircleSummary) {
  return circle.status === "Completed";
}

function toInteger(value: string) {
  return Number.parseInt(value, 10) || 0;
}
