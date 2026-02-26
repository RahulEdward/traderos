"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import confetti from "canvas-confetti";
import {
  Monitor,
  BarChart2,
  Layers,
  Shield,
  Scale,
  Flame,
  ArrowRight,
  ArrowLeft,
  Check,
  Rocket,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

const MARKETS = [
  "NSE Equity",
  "BSE Equity",
  "NSE Futures",
  "NSE Options",
  "MCX Commodities",
  "Currency Derivatives",
];

const PLATFORMS = [
  { id: "TRADINGVIEW", label: "TradingView", icon: Monitor },
  { id: "AMIBROKER", label: "Amibroker", icon: BarChart2 },
  { id: "BOTH", label: "Both", icon: Layers },
];

const RISK_PROFILES = [
  {
    id: "CONSERVATIVE",
    label: "Conservative",
    description: "Capital preservation focused. Lower risk, steady returns.",
    icon: Shield,
  },
  {
    id: "MODERATE",
    label: "Moderate",
    description: "Balanced approach. Mix of growth and safety.",
    icon: Scale,
  },
  {
    id: "AGGRESSIVE",
    label: "Aggressive",
    description: "Maximum growth oriented. Higher risk tolerance.",
    icon: Flame,
  },
];

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [platform, setPlatform] = useState("");
  const [markets, setMarkets] = useState<string[]>([]);
  const [riskProfile, setRiskProfile] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const totalSteps = 5;
  const progress = (step / totalSteps) * 100;

  const toggleMarket = (market: string) => {
    setMarkets((prev) =>
      prev.includes(market)
        ? prev.filter((m) => m !== market)
        : [...prev, market]
    );
  };

  const canProceed = () => {
    switch (step) {
      case 1:
        return true;
      case 2:
        return platform !== "";
      case 3:
        return markets.length > 0;
      case 4:
        return riskProfile !== "";
      case 5:
        return true;
      default:
        return false;
    }
  };

  const handleNext = () => {
    if (step < totalSteps) {
      setStep(step + 1);
      if (step + 1 === 5) {
        setTimeout(() => {
          confetti({
            particleCount: 100,
            spread: 70,
            origin: { y: 0.6 },
            colors: ["#3B82F6", "#06B6D4", "#10B981", "#F59E0B"],
          });
        }, 300);
      }
    }
  };

  const handleBack = () => {
    if (step > 1) setStep(step - 1);
  };

  const handleComplete = async () => {
    setIsSubmitting(true);
    try {
      await fetch("/api/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tradingPlatform: platform,
          marketFocus: markets,
          riskProfile,
        }),
      });
      router.push("/dashboard");
      router.refresh();
    } catch (error) {
      console.error("Onboarding error:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const slideVariants = {
    enter: (direction: number) => ({
      x: direction > 0 ? 300 : -300,
      opacity: 0,
    }),
    center: { x: 0, opacity: 1 },
    exit: (direction: number) => ({
      x: direction < 0 ? 300 : -300,
      opacity: 0,
    }),
  };

  return (
    <div className="w-full max-w-2xl mx-auto p-4">
      {/* Progress */}
      <div className="mb-8">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm text-[#94A3B8]">
            Step {step} of {totalSteps}
          </span>
        </div>
        <Progress value={progress} className="h-1" />
      </div>

      {/* Steps */}
      <div className="bg-[#0A0A0A] border border-[#1A1A1A] rounded-2xl p-8 min-h-[400px] flex flex-col">
        <AnimatePresence mode="wait" custom={1}>
          <motion.div
            key={step}
            custom={1}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.3 }}
            className="flex-1"
          >
            {/* Step 1: Welcome */}
            {step === 1 && (
              <div className="text-center py-8">
                <div className="w-16 h-16 bg-[#3B82F6]/10 rounded-2xl flex items-center justify-center mx-auto mb-6">
                  <Rocket className="h-8 w-8 text-[#3B82F6]" />
                </div>
                <h2 className="text-3xl font-bold text-[#F1F5F9] mb-4">
                  Welcome to TradeOS India
                </h2>
                <p className="text-[#94A3B8] text-lg max-w-md mx-auto">
                  The operating system for Indian breakout traders. Let&apos;s
                  set up your workspace in just a few steps.
                </p>
              </div>
            )}

            {/* Step 2: Trading Platform */}
            {step === 2 && (
              <div>
                <h2 className="text-2xl font-bold text-[#F1F5F9] mb-2">
                  Which platform do you use?
                </h2>
                <p className="text-[#94A3B8] mb-6">
                  Select your primary trading/charting platform
                </p>
                <div className="grid grid-cols-3 gap-4">
                  {PLATFORMS.map((p) => {
                    const Icon = p.icon;
                    return (
                      <button
                        key={p.id}
                        onClick={() => setPlatform(p.id)}
                        className={cn(
                          "flex flex-col items-center gap-3 p-6 rounded-xl border transition-all",
                          platform === p.id
                            ? "border-[#3B82F6] bg-[#3B82F6]/5"
                            : "border-[#1A1A1A] hover:border-[#3B82F6]/50"
                        )}
                      >
                        <Icon
                          className={cn(
                            "h-8 w-8",
                            platform === p.id
                              ? "text-[#3B82F6]"
                              : "text-[#94A3B8]"
                          )}
                        />
                        <span
                          className={cn(
                            "text-sm font-medium",
                            platform === p.id
                              ? "text-[#F1F5F9]"
                              : "text-[#94A3B8]"
                          )}
                        >
                          {p.label}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Step 3: Market Focus */}
            {step === 3 && (
              <div>
                <h2 className="text-2xl font-bold text-[#F1F5F9] mb-2">
                  What markets do you trade?
                </h2>
                <p className="text-[#94A3B8] mb-6">
                  Select all that apply
                </p>
                <div className="grid grid-cols-2 gap-3">
                  {MARKETS.map((market) => (
                    <button
                      key={market}
                      onClick={() => toggleMarket(market)}
                      className={cn(
                        "flex items-center gap-3 p-4 rounded-xl border transition-all text-left",
                        markets.includes(market)
                          ? "border-[#3B82F6] bg-[#3B82F6]/5"
                          : "border-[#1A1A1A] hover:border-[#3B82F6]/50"
                      )}
                    >
                      <div
                        className={cn(
                          "h-5 w-5 rounded border flex items-center justify-center shrink-0",
                          markets.includes(market)
                            ? "bg-[#3B82F6] border-[#3B82F6]"
                            : "border-[#1A1A1A]"
                        )}
                      >
                        {markets.includes(market) && (
                          <Check className="h-3 w-3 text-white" />
                        )}
                      </div>
                      <span
                        className={cn(
                          "text-sm font-medium",
                          markets.includes(market)
                            ? "text-[#F1F5F9]"
                            : "text-[#94A3B8]"
                        )}
                      >
                        {market}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Step 4: Risk Profile */}
            {step === 4 && (
              <div>
                <h2 className="text-2xl font-bold text-[#F1F5F9] mb-2">
                  What&apos;s your risk profile?
                </h2>
                <p className="text-[#94A3B8] mb-6">
                  This helps us tailor recommendations
                </p>
                <div className="space-y-3">
                  {RISK_PROFILES.map((rp) => {
                    const Icon = rp.icon;
                    return (
                      <button
                        key={rp.id}
                        onClick={() => setRiskProfile(rp.id)}
                        className={cn(
                          "flex items-start gap-4 w-full p-5 rounded-xl border transition-all text-left",
                          riskProfile === rp.id
                            ? "border-[#3B82F6] bg-[#3B82F6]/5"
                            : "border-[#1A1A1A] hover:border-[#3B82F6]/50"
                        )}
                      >
                        <div
                          className={cn(
                            "w-10 h-10 rounded-lg flex items-center justify-center shrink-0",
                            riskProfile === rp.id
                              ? "bg-[#3B82F6]/20"
                              : "bg-[#1A1A1A]"
                          )}
                        >
                          <Icon
                            className={cn(
                              "h-5 w-5",
                              riskProfile === rp.id
                                ? "text-[#3B82F6]"
                                : "text-[#94A3B8]"
                            )}
                          />
                        </div>
                        <div>
                          <h3
                            className={cn(
                              "font-medium",
                              riskProfile === rp.id
                                ? "text-[#F1F5F9]"
                                : "text-[#94A3B8]"
                            )}
                          >
                            {rp.label}
                          </h3>
                          <p className="text-sm text-[#475569] mt-1">
                            {rp.description}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Step 5: Done */}
            {step === 5 && (
              <div className="text-center py-8">
                <div className="w-16 h-16 bg-[#10B981]/10 rounded-2xl flex items-center justify-center mx-auto mb-6">
                  <Check className="h-8 w-8 text-[#10B981]" />
                </div>
                <h2 className="text-3xl font-bold text-[#F1F5F9] mb-4">
                  You&apos;re all set!
                </h2>
                <p className="text-[#94A3B8] mb-6">
                  Your workspace is configured. Here&apos;s a summary:
                </p>
                <div className="bg-[#000000] rounded-xl p-4 text-left space-y-3 max-w-sm mx-auto">
                  <div className="flex justify-between">
                    <span className="text-sm text-[#94A3B8]">Platform</span>
                    <span className="text-sm text-[#F1F5F9] font-medium">
                      {platform}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-[#94A3B8]">Markets</span>
                    <span className="text-sm text-[#F1F5F9] font-medium">
                      {markets.length} selected
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-[#94A3B8]">Risk</span>
                    <span className="text-sm text-[#F1F5F9] font-medium">
                      {riskProfile}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>

        {/* Navigation */}
        <div className="flex justify-between items-center mt-8 pt-6 border-t border-[#1A1A1A]">
          {step > 1 ? (
            <Button variant="ghost" onClick={handleBack}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
          ) : (
            <div />
          )}

          {step < 5 ? (
            <Button
              onClick={handleNext}
              disabled={!canProceed()}
              className="bg-[#3B82F6] hover:bg-[#2563EB]"
            >
              {step === 1 ? "Get Started" : "Continue"}
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          ) : (
            <Button
              onClick={handleComplete}
              disabled={isSubmitting}
              className="bg-[#3B82F6] hover:bg-[#2563EB]"
            >
              {isSubmitting ? "Setting up..." : "Go to Dashboard"}
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
