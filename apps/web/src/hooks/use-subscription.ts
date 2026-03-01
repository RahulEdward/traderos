"use client";

import { useSession } from "next-auth/react";
import { TIER_LIMITS } from "@tradeos/shared";

export type UserTier = "FREE" | "PRO" | "AGENCY";

interface TierLimits {
  maxStrategies: number;
  maxImportsPerMonth: number;
  aiAnalysesPerMonth: number;
  maxPortfolios: number;
  webhookAccess: boolean;
  dataRetentionDays: number;
  maxSubAccounts?: number;
}

interface SubscriptionInfo {
  tier: UserTier;
  limits: TierLimits;
  canCreateStrategy: (currentCount: number) => boolean;
  canImportBacktest: (currentMonthlyCount: number) => boolean;
  canUseAI: boolean;
  canUsePortfolios: boolean;
  canUseIntegrations: boolean;
  canUseAPI: boolean;
  isFreeTier: boolean;
  isProTier: boolean;
  isAgencyTier: boolean;
}

export function useSubscription(): SubscriptionInfo {
  const { data: session } = useSession();
  const tier = ((session?.user as any)?.tier as UserTier) || "FREE";

  const limits = TIER_LIMITS[tier] || TIER_LIMITS.FREE;

  return {
    tier,
    limits,
    canCreateStrategy: (currentCount: number) =>
      !isFinite(limits.maxStrategies) || currentCount < limits.maxStrategies,
    canImportBacktest: (currentMonthlyCount: number) =>
      !isFinite(limits.maxImportsPerMonth) || currentMonthlyCount < limits.maxImportsPerMonth,
    canUseAI: tier !== "FREE",
    canUsePortfolios: tier !== "FREE",
    canUseIntegrations: tier !== "FREE",
    canUseAPI: tier === "AGENCY",
    isFreeTier: tier === "FREE",
    isProTier: tier === "PRO",
    isAgencyTier: tier === "AGENCY",
  };
}
