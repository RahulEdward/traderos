"use client";

import { useRef } from "react";
import Link from "next/link";
import { motion, useInView } from "framer-motion";
import {
  Layers,
  Brain,
  Briefcase,
  BarChart3,
  Activity,
  Link2,
  CheckCircle,
  ArrowRight,
  ChevronRight,
  Sparkles,
  ShieldCheck,
  TrendingUp,
  Target,
  Zap,
  Clock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

function AnimatedSection({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 30 }}
      animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

const FEATURES = [
  {
    icon: BarChart3,
    title: "Robust Backtesting Engine",
    description: "Walk-Forward, Cross-Validation, and CPCV methods. Deflated Sharpe Ratio, strategy risk analysis — overfitting protection built-in.",
    color: "#10B981",
  },
  {
    icon: Layers,
    title: "Strategy Lifecycle Manager",
    description: "Track every strategy from idea to live trading. Kanban board, status tracking, version history, and 20+ performance metrics.",
    color: "#3B82F6",
  },
  {
    icon: Brain,
    title: "AI Analysis Engine",
    description: "Claude-powered analysis of your backtests. Readiness scoring, strengths, weaknesses, and actionable improvement suggestions.",
    color: "#8B5CF6",
  },
  {
    icon: Briefcase,
    title: "HRP Portfolio Allocation",
    description: "Hierarchical Risk Parity — ML-based allocation that outperforms Markowitz. Dendrogram visualization and Monte Carlo validation.",
    color: "#06B6D4",
  },
  {
    icon: Activity,
    title: "Live Trading + Fyers Broker",
    description: "Connect Fyers broker for live trading. Fetch historical data, place orders, track positions, and compare live vs backtest.",
    color: "#F59E0B",
  },
  {
    icon: Link2,
    title: "Market Data & Integrations",
    description: "Fetch NSE/BSE OHLCV data from Fyers. TradingView webhooks, Amibroker import, and real-time market streaming.",
    color: "#EF4444",
  },
];

const PROBLEMS = [
  {
    icon: Target,
    title: "No system to evaluate strategies",
    description: "You run backtests but have no structured way to compare, score, or decide which strategies are worth pursuing.",
  },
  {
    icon: Clock,
    title: "Don't know when to go live",
    description: "The gap between 'good backtest' and 'ready for real money' is filled with guesswork and second-guessing.",
  },
  {
    icon: Zap,
    title: "Managing multiple strategies is chaotic",
    description: "Spreadsheets, screenshots, and scattered notes. No single place to see your complete trading operation.",
  },
];

const PRICING = [
  {
    name: "Free",
    price: "₹0",
    period: "forever",
    description: "Get started with the basics",
    features: ["2 strategies", "5 CSV imports/month", "Basic dashboard", "Task tracker"],
    cta: "Start Free",
    highlighted: false,
    color: "#94A3B8",
  },
  {
    name: "Pro",
    price: "₹2,999",
    period: "/month",
    description: "Everything you need to trade professionally",
    features: [
      "Unlimited strategies",
      "Unlimited imports",
      "50 AI analyses/month",
      "Unlimited portfolios",
      "TradingView webhooks",
      "Amibroker bridge",
      "PDF reports",
      "2-year data retention",
    ],
    cta: "Start 14-Day Trial",
    highlighted: true,
    color: "#3B82F6",
  },
  {
    name: "Agency",
    price: "₹9,999",
    period: "/month",
    description: "For trading desks and mentors",
    features: [
      "Everything in Pro",
      "10 sub-accounts",
      "Unlimited AI analyses",
      "API access",
      "Priority support",
      "Custom branding",
    ],
    cta: "Contact Sales",
    highlighted: false,
    color: "#8B5CF6",
  },
];

export function LandingPage() {
  return (
    <div className="min-h-screen bg-[var(--bg-main)] text-[#F1F5F9]">
      {/* Navigation */}
      <nav className="fixed top-0 w-full z-50 bg-[var(--bg-main)]/80 backdrop-blur-md border-b border-[var(--border-color)]">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xl font-bold text-[#3B82F6]">TradeOS</span>
            <span className="text-sm text-[#06B6D4]">India</span>
          </div>
          <div className="hidden md:flex items-center gap-8 text-sm text-[#94A3B8]">
            <a href="#features" className="hover:text-[#F1F5F9] transition-colors">Features</a>
            <a href="#pricing" className="hover:text-[#F1F5F9] transition-colors">Pricing</a>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/auth/login">
              <Button variant="ghost" className="text-[#94A3B8] hover:text-[#F1F5F9]">
                Sign In
              </Button>
            </Link>
            <Link href="/auth/register">
              <Button className="bg-[#3B82F6] hover:bg-[#2563EB]">
                Start Free
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-6">
        <div className="max-w-5xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <Badge className="bg-[#3B82F6]/10 text-[#3B82F6] border-[#3B82F6]/30 mb-6 px-4 py-1.5">
              <Sparkles className="h-3.5 w-3.5 mr-1.5" />
              Built for Indian Markets (NSE/BSE)
            </Badge>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-4xl md:text-6xl font-bold leading-tight mb-6"
          >
            The Operating System for
            <br />
            <span className="text-[#3B82F6]">Systematic Indian Traders</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-lg md:text-xl text-[#94A3B8] max-w-3xl mx-auto mb-10"
          >
            Build, backtest, analyze, and deploy your trading strategies —
            with robust statistics that prevent overfitting.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="flex items-center justify-center gap-4"
          >
            <Link href="/auth/register">
              <Button size="lg" className="bg-[#3B82F6] hover:bg-[#2563EB] text-base px-8">
                Start Free
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </Link>
            <a href="#features">
              <Button size="lg" variant="outline" className="border-[var(--border-color)] text-[#94A3B8] hover:text-[#F1F5F9] text-base px-8">
                See How It Works
              </Button>
            </a>
          </motion.div>

          {/* Platform logos */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.5 }}
            className="mt-16 flex items-center justify-center gap-8 text-[#475569]"
          >
            <span className="text-xs uppercase tracking-wider">Works with</span>
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2 text-sm">
                <span className="font-bold text-[#2962FF]">TV</span>
                <span className="text-[#94A3B8]">TradingView</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <span className="font-bold text-[#F59E0B]">AB</span>
                <span className="text-[#94A3B8]">Amibroker</span>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Problem Section */}
      <section className="py-20 px-6 border-t border-[var(--border-color)]">
        <div className="max-w-6xl mx-auto">
          <AnimatedSection className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              3 problems every systematic trader faces
            </h2>
          </AnimatedSection>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {PROBLEMS.map((problem, i) => {
              const Icon = problem.icon;
              return (
                <AnimatedSection key={i}>
                  <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl p-6 h-full">
                    <Icon className="h-8 w-8 text-[#EF4444] mb-4" />
                    <h3 className="text-lg font-semibold text-[#F1F5F9] mb-2">{problem.title}</h3>
                    <p className="text-sm text-[#94A3B8]">{problem.description}</p>
                  </div>
                </AnimatedSection>
              );
            })}
          </div>
        </div>
      </section>

      {/* Solution Section */}
      <section className="py-20 px-6 border-t border-[var(--border-color)]">
        <div className="max-w-6xl mx-auto">
          <AnimatedSection className="text-center mb-4">
            <Badge className="bg-[#10B981]/10 text-[#10B981] border-[#10B981]/30 mb-4 px-3 py-1">
              <ShieldCheck className="h-3.5 w-3.5 mr-1.5" />
              The Solution
            </Badge>
          </AnimatedSection>
          <AnimatedSection className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              TradeOS India solves all three
            </h2>
            <p className="text-lg text-[#94A3B8] max-w-2xl mx-auto">
              A decision-layer platform that sits on top of your existing trading tools. Import your backtests, let AI analyze them, and manage your entire strategy pipeline.
            </p>
          </AnimatedSection>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 px-6 border-t border-[var(--border-color)]">
        <div className="max-w-6xl mx-auto">
          <AnimatedSection className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Everything you need</h2>
            <p className="text-lg text-[#94A3B8]">Six powerful modules. One platform.</p>
          </AnimatedSection>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {FEATURES.map((feature, i) => {
              const Icon = feature.icon;
              return (
                <AnimatedSection key={i}>
                  <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl p-6 h-full hover:border-[#3B82F6]/30 transition-colors group">
                    <div
                      className="w-12 h-12 rounded-lg flex items-center justify-center mb-4"
                      style={{ backgroundColor: `${feature.color}20` }}
                    >
                      <Icon className="h-6 w-6" style={{ color: feature.color }} />
                    </div>
                    <h3 className="text-lg font-semibold text-[#F1F5F9] mb-2 group-hover:text-[#3B82F6] transition-colors">
                      {feature.title}
                    </h3>
                    <p className="text-sm text-[#94A3B8]">{feature.description}</p>
                  </div>
                </AnimatedSection>
              );
            })}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-20 px-6 border-t border-[var(--border-color)]">
        <div className="max-w-6xl mx-auto">
          <AnimatedSection className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Simple, transparent pricing</h2>
            <p className="text-lg text-[#94A3B8]">Start free. Upgrade when you need more.</p>
          </AnimatedSection>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
            {PRICING.map((plan, i) => (
              <AnimatedSection key={i}>
                <div
                  className={`bg-[var(--bg-card)] rounded-xl p-6 h-full flex flex-col ${
                    plan.highlighted
                      ? "border-2 border-[#3B82F6] relative"
                      : "border border-[var(--border-color)]"
                  }`}
                >
                  {plan.highlighted && (
                    <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#3B82F6] text-white px-3">
                      Most Popular
                    </Badge>
                  )}
                  <div className="mb-6">
                    <h3 className="text-lg font-semibold mb-2" style={{ color: plan.color }}>{plan.name}</h3>
                    <div className="flex items-baseline gap-1">
                      <span className="text-3xl font-bold font-mono text-[#F1F5F9]">{plan.price}</span>
                      <span className="text-sm text-[#475569]">{plan.period}</span>
                    </div>
                    {plan.price !== "₹0" && (
                      <p className="text-xs text-[#475569] mt-1">+ 18% GST</p>
                    )}
                    <p className="text-sm text-[#94A3B8] mt-2">{plan.description}</p>
                  </div>
                  <ul className="space-y-2 mb-6 flex-1">
                    {plan.features.map((feature, j) => (
                      <li key={j} className="flex items-center gap-2 text-sm text-[#94A3B8]">
                        <CheckCircle className="h-4 w-4 shrink-0" style={{ color: plan.color }} />
                        {feature}
                      </li>
                    ))}
                  </ul>
                  <Link href="/auth/register">
                    <Button
                      className={`w-full ${
                        plan.highlighted
                          ? "bg-[#3B82F6] hover:bg-[#2563EB]"
                          : "bg-transparent border border-[var(--border-color)] hover:bg-[var(--bg-card)]"
                      }`}
                    >
                      {plan.cta}
                      <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                  </Link>
                </div>
              </AnimatedSection>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-6 border-t border-[var(--border-color)]">
        <div className="max-w-3xl mx-auto text-center">
          <AnimatedSection>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Start building your trading system today
            </h2>
            <p className="text-lg text-[#94A3B8] mb-8">
              Join traders who build robust, overfitting-proof strategies with TradeOS India.
            </p>
            <Link href="/auth/register">
              <Button size="lg" className="bg-[#3B82F6] hover:bg-[#2563EB] text-base px-10">
                Get Started Free
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </Link>
          </AnimatedSection>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[var(--border-color)] py-12 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <span className="text-xl font-bold text-[#3B82F6]">TradeOS</span>
                <span className="text-sm text-[#06B6D4]">India</span>
              </div>
              <p className="text-sm text-[#475569]">
                The Operating System for Systematic Indian Traders
              </p>
            </div>
            <div>
              <h4 className="text-sm font-semibold text-[#F1F5F9] mb-3">Product</h4>
              <ul className="space-y-2 text-sm text-[#94A3B8]">
                <li><a href="#features" className="hover:text-[#F1F5F9]">Features</a></li>
                <li><a href="#pricing" className="hover:text-[#F1F5F9]">Pricing</a></li>
                <li><Link href="/auth/login" className="hover:text-[#F1F5F9]">Sign In</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="text-sm font-semibold text-[#F1F5F9] mb-3">Integrations</h4>
              <ul className="space-y-2 text-sm text-[#94A3B8]">
                <li>TradingView</li>
                <li>Amibroker</li>
                <li>Zerodha (Coming Soon)</li>
                <li>Angel One (Coming Soon)</li>
              </ul>
            </div>
            <div>
              <h4 className="text-sm font-semibold text-[#F1F5F9] mb-3">Legal</h4>
              <ul className="space-y-2 text-sm text-[#94A3B8]">
                <li>Privacy Policy</li>
                <li>Terms of Service</li>
                <li>Refund Policy</li>
              </ul>
            </div>
          </div>

          {/* SEBI Disclaimer */}
          <div className="border-t border-[var(--border-color)] pt-6 mt-6">
            <p className="text-xs text-[#475569] mb-4">
              <strong>SEBI Disclaimer:</strong> TradeOS India is a strategy management and analysis tool. It does not provide investment advice, execute trades, or guarantee returns. Trading in securities markets is subject to market risks. Past performance of strategies in backtests does not guarantee future results. Users should consult with a SEBI-registered financial advisor before making investment decisions. TradeOS India is not a SEBI-registered intermediary.
            </p>
            <div className="flex items-center justify-between text-xs text-[#475569]">
              <span>&copy; {new Date().getFullYear()} TradeOS India. All rights reserved.</span>
              <span>Built for Indian Markets</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
