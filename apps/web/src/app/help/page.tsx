"use client";

import { useState } from "react";
import {
  HelpCircle,
  BookOpen,
  MessageCircle,
  Mail,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Layers,
  BarChart3,
  Activity,
  Plug,
  Briefcase,
  CheckSquare,
  Zap,
  Shield,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const FAQ_ITEMS = [
  {
    category: "Getting Started",
    questions: [
      {
        q: "How do I create my first strategy?",
        a: "Go to Strategies from the sidebar, click 'New Strategy', fill in the name, instrument (e.g., NIFTY, BANKNIFTY), timeframe, and entry/exit rules. You can then import backtest data to track performance.",
      },
      {
        q: "What is Demo Mode?",
        a: "Demo Mode lets you explore all features with sample data without needing a database connection. It's enabled by default and uses mock data for strategies, backtests, and portfolio metrics.",
      },
      {
        q: "How do I import backtest results?",
        a: "Navigate to any strategy, click 'Import Backtest', and upload a CSV file. The CSV should include columns like date, entry price, exit price, P&L, and quantity. The system auto-maps common column formats.",
      },
    ],
  },
  {
    category: "Strategies & Backtests",
    questions: [
      {
        q: "What metrics are calculated from backtests?",
        a: "TradeOS calculates win rate, profit factor, max drawdown, average R-multiple, Sharpe ratio, expectancy, and streak analysis. All values are displayed in INR with proper Indian number formatting.",
      },
      {
        q: "Can I compare multiple strategies?",
        a: "Yes! Use the Portfolio Manager to group strategies together. The Analytics page also provides side-by-side comparisons of strategy performance over time.",
      },
      {
        q: "What is AI Analysis?",
        a: "AI Analysis uses Claude to review your backtest data and provide insights on patterns, risk management suggestions, and optimization ideas. Available on Pro and Agency plans.",
      },
    ],
  },
  {
    category: "Integrations & Live Trading",
    questions: [
      {
        q: "How do I connect TradingView alerts?",
        a: "Go to Integrations, create a new webhook. Copy the generated webhook URL and paste it into your TradingView alert's webhook URL field. Alerts will appear in real-time in the Live Trading section.",
      },
      {
        q: "Which brokers are supported?",
        a: "TradeOS India supports Zerodha (Kite Connect), Dhan, and Angel One APIs. Connect your broker in the Integrations page to enable live trade tracking and execution.",
      },
      {
        q: "Is my broker API key safe?",
        a: "Yes. API keys are encrypted at rest and never exposed in the UI after initial setup. We only use read-only permissions by default. You control which permissions to grant.",
      },
    ],
  },
  {
    category: "Billing & Plans",
    questions: [
      {
        q: "What are the plan limits?",
        a: "Free: 2 strategies, 5 imports/month, no AI. Pro (₹2,999/mo + GST): unlimited strategies, 50 AI analyses/month. Agency (₹9,999/mo + GST): everything in Pro plus 10 sub-accounts and unlimited AI.",
      },
      {
        q: "How does billing work?",
        a: "Billing is handled via Razorpay. Plans are billed monthly. You can upgrade, downgrade, or cancel anytime from Settings > Billing. GST (18%) is added to all plans.",
      },
      {
        q: "Can I get a refund?",
        a: "We offer a 7-day refund policy for first-time subscribers. Contact support at support@tradeos.in within 7 days of your first payment.",
      },
    ],
  },
];

const QUICK_LINKS = [
  { label: "Strategy Manager", href: "/strategies", icon: Layers, desc: "Create and manage trading strategies" },
  { label: "Analytics", href: "/analytics", icon: BarChart3, desc: "View performance analytics" },
  { label: "Live Trading", href: "/live-trading", icon: Activity, desc: "Monitor real-time trades" },
  { label: "Integrations", href: "/integrations", icon: Plug, desc: "Connect brokers & webhooks" },
  { label: "Portfolios", href: "/portfolios", icon: Briefcase, desc: "Manage strategy portfolios" },
  { label: "Tasks", href: "/tasks", icon: CheckSquare, desc: "Track trading tasks & todos" },
];

const KEYBOARD_SHORTCUTS = [
  { keys: ["Ctrl", "K"], action: "Open command palette" },
  { keys: ["Ctrl", "N"], action: "New strategy" },
  { keys: ["Ctrl", "I"], action: "Import backtest" },
  { keys: ["/"], action: "Focus search" },
  { keys: ["?"], action: "Show shortcuts" },
];

export default function HelpPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());

  const toggleItem = (key: string) => {
    setExpandedItems((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  const filteredFAQ = FAQ_ITEMS.map((category) => ({
    ...category,
    questions: category.questions.filter(
      (item) =>
        !searchQuery ||
        item.q.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.a.toLowerCase().includes(searchQuery.toLowerCase())
    ),
  })).filter((category) => category.questions.length > 0);

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-[#F1F5F9]">Help Center</h1>
        <p className="text-sm text-[#94A3B8] mt-1">
          Everything you need to know about TradeOS India
        </p>
      </div>

      {/* Search */}
      <div className="mb-8 max-w-xl">
        <div className="relative">
          <HelpCircle className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#475569]" />
          <Input
            placeholder="Search help articles..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-[#0F1629] border-[#1E2A45] h-11"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* FAQ Section - 2 columns */}
        <div className="lg:col-span-2 space-y-6">
          <h2 className="text-lg font-semibold text-[#F1F5F9] flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-[#3B82F6]" />
            Frequently Asked Questions
          </h2>

          {filteredFAQ.length === 0 && (
            <div className="bg-[#0F1629] border border-[#1E2A45] rounded-xl p-8 text-center">
              <HelpCircle className="h-10 w-10 text-[#475569] mx-auto mb-3" />
              <p className="text-[#94A3B8]">No results found for &quot;{searchQuery}&quot;</p>
              <p className="text-sm text-[#475569] mt-1">Try a different search term</p>
            </div>
          )}

          {filteredFAQ.map((category) => (
            <div key={category.category}>
              <h3 className="text-sm font-medium text-[#94A3B8] uppercase tracking-wider mb-3">
                {category.category}
              </h3>
              <div className="space-y-2">
                {category.questions.map((item) => {
                  const key = `${category.category}-${item.q}`;
                  const isExpanded = expandedItems.has(key);
                  return (
                    <div
                      key={key}
                      className="bg-[#0F1629] border border-[#1E2A45] rounded-lg overflow-hidden"
                    >
                      <button
                        onClick={() => toggleItem(key)}
                        className="w-full flex items-center justify-between p-4 text-left hover:bg-[#0F1629]/80 transition-colors"
                      >
                        <span className="text-sm font-medium text-[#F1F5F9] pr-4">
                          {item.q}
                        </span>
                        {isExpanded ? (
                          <ChevronUp className="h-4 w-4 text-[#475569] shrink-0" />
                        ) : (
                          <ChevronDown className="h-4 w-4 text-[#475569] shrink-0" />
                        )}
                      </button>
                      {isExpanded && (
                        <div className="px-4 pb-4 border-t border-[#1E2A45]">
                          <p className="text-sm text-[#94A3B8] mt-3 leading-relaxed">
                            {item.a}
                          </p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Right sidebar */}
        <div className="space-y-6">
          {/* Quick Links */}
          <div className="bg-[#0F1629] border border-[#1E2A45] rounded-xl p-5">
            <h3 className="text-sm font-semibold text-[#F1F5F9] mb-4 flex items-center gap-2">
              <Zap className="h-4 w-4 text-[#F59E0B]" />
              Quick Links
            </h3>
            <div className="space-y-2">
              {QUICK_LINKS.map((link) => {
                const Icon = link.icon;
                return (
                  <a
                    key={link.href}
                    href={link.href}
                    className="flex items-center gap-3 p-2 rounded-lg hover:bg-[#0A0E1A] transition-colors group"
                  >
                    <Icon className="h-4 w-4 text-[#475569] group-hover:text-[#3B82F6]" />
                    <div>
                      <p className="text-sm text-[#F1F5F9] group-hover:text-[#3B82F6]">
                        {link.label}
                      </p>
                      <p className="text-xs text-[#475569]">{link.desc}</p>
                    </div>
                  </a>
                );
              })}
            </div>
          </div>

          {/* Keyboard Shortcuts */}
          <div className="bg-[#0F1629] border border-[#1E2A45] rounded-xl p-5">
            <h3 className="text-sm font-semibold text-[#F1F5F9] mb-4 flex items-center gap-2">
              <Shield className="h-4 w-4 text-[#06B6D4]" />
              Keyboard Shortcuts
            </h3>
            <div className="space-y-3">
              {KEYBOARD_SHORTCUTS.map((shortcut) => (
                <div
                  key={shortcut.action}
                  className="flex items-center justify-between"
                >
                  <span className="text-xs text-[#94A3B8]">{shortcut.action}</span>
                  <div className="flex items-center gap-1">
                    {shortcut.keys.map((key) => (
                      <kbd
                        key={key}
                        className="px-1.5 py-0.5 bg-[#0A0E1A] border border-[#1E2A45] rounded text-[10px] font-mono text-[#94A3B8]"
                      >
                        {key}
                      </kbd>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Contact Support */}
          <div className="bg-[#0F1629] border border-[#1E2A45] rounded-xl p-5">
            <h3 className="text-sm font-semibold text-[#F1F5F9] mb-3 flex items-center gap-2">
              <MessageCircle className="h-4 w-4 text-[#10B981]" />
              Need More Help?
            </h3>
            <p className="text-xs text-[#94A3B8] mb-4">
              Can&apos;t find what you&apos;re looking for? Reach out to our support team.
            </p>
            <div className="space-y-2">
              <Button
                variant="outline"
                className="w-full justify-start text-sm"
                size="sm"
              >
                <Mail className="h-4 w-4 mr-2" />
                support@tradeos.in
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start text-sm"
                size="sm"
              >
                <MessageCircle className="h-4 w-4 mr-2" />
                Live Chat (Pro & Agency)
              </Button>
            </div>
            <div className="mt-4 pt-4 border-t border-[#1E2A45]">
              <p className="text-xs text-[#475569]">
                Response time: within 24 hours for Free plan, 4 hours for Pro, 1 hour for Agency.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
