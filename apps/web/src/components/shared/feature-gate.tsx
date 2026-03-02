"use client";

import { ReactNode } from "react";
import { Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSubscription, UserTier } from "@/hooks/use-subscription";

interface FeatureGateProps {
  feature: "ai" | "portfolios" | "integrations" | "api" | "strategy" | "import";
  children: ReactNode;
  currentCount?: number;
  fallback?: ReactNode;
}

const FEATURE_INFO = {
  ai: {
    title: "AI Analysis",
    description: "Get AI-powered strategy analysis with actionable insights.",
    requiredTier: "PRO" as UserTier,
  },
  portfolios: {
    title: "Portfolio Manager",
    description: "Manage multiple strategies with correlation analysis.",
    requiredTier: "PRO" as UserTier,
  },
  integrations: {
    title: "Integrations",
    description: "Connect TradingView webhooks and Amibroker bridge.",
    requiredTier: "PRO" as UserTier,
  },
  api: {
    title: "API Access",
    description: "Full API access for custom integrations.",
    requiredTier: "AGENCY" as UserTier,
  },
  strategy: {
    title: "More Strategies",
    description: "Free plan allows up to 2 strategies.",
    requiredTier: "PRO" as UserTier,
  },
  import: {
    title: "More Imports",
    description: "Free plan allows 5 CSV imports per month.",
    requiredTier: "PRO" as UserTier,
  },
};

export function FeatureGate({ feature, children, currentCount = 0, fallback }: FeatureGateProps) {
  const sub = useSubscription();
  const info = FEATURE_INFO[feature];

  let hasAccess = true;

  switch (feature) {
    case "ai":
      hasAccess = sub.canUseAI;
      break;
    case "portfolios":
      hasAccess = sub.canUsePortfolios;
      break;
    case "integrations":
      hasAccess = sub.canUseIntegrations;
      break;
    case "api":
      hasAccess = sub.canUseAPI;
      break;
    case "strategy":
      hasAccess = sub.canCreateStrategy(currentCount);
      break;
    case "import":
      hasAccess = sub.canImportBacktest(currentCount);
      break;
  }

  if (hasAccess) {
    return <>{children}</>;
  }

  if (fallback) {
    return <>{fallback}</>;
  }

  return (
    <div className="relative">
      <div className="blur-sm pointer-events-none select-none opacity-40">{children}</div>
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl p-6 text-center max-w-sm shadow-lg">
          <div className="w-12 h-12 bg-[#3B82F6]/20 rounded-full flex items-center justify-center mx-auto mb-3">
            <Lock className="h-6 w-6 text-[#3B82F6]" />
          </div>
          <h3 className="text-lg font-semibold text-[#F1F5F9] mb-1">{info.title}</h3>
          <p className="text-sm text-[#94A3B8] mb-4">{info.description}</p>
          <Button
            className="bg-[#3B82F6] hover:bg-[#2563EB]"
            onClick={() => window.location.href = "/settings"}
          >
            Upgrade to {info.requiredTier}
          </Button>
        </div>
      </div>
    </div>
  );
}
