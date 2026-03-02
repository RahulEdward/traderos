"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { motion } from "framer-motion";
import {
  Layers,
  Briefcase,
  TrendingUp,
  Rocket,
  Calendar,
  Search,
  LineChart,
  Activity,
  Share2,
  Target,
  Plug,
  HelpCircle,
  ArrowRight,
} from "lucide-react";
import { MetricCard } from "@/components/shared/metric-card";
import { ActivityFeed } from "@/components/shared/activity-feed";
import { BrokerStatusBanner } from "@/components/shared/broker-status-banner";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { formatPercentage } from "@tradeos/shared";

const priorityVariant: Record<string, "destructive" | "warning" | "default" | "secondary"> = {
  CRITICAL: "destructive",
  HIGH: "warning",
  MEDIUM: "default",
  LOW: "secondary",
};

// ─── TradeOS Feature Cards ──────────────────────────────────────────
const featureCards = [
  {
    label: "PICK",
    description: "Find & create winning strategies",
    icon: Search,
    href: "/strategies",
    color: "#06B6D4",
  },
  {
    label: "BUILD",
    description: "Import backtests & refine logic",
    icon: LineChart,
    href: "/strategies",
    color: "#3B82F6",
  },
  {
    label: "LAUNCH",
    description: "Go live with paper or real trades",
    icon: Rocket,
    href: "/live-trading",
    color: "#10B981",
  },
  {
    label: "THRIVE",
    description: "Track P&L, win rate & analytics",
    icon: Activity,
    href: "/analytics",
    color: "#8B5CF6",
  },
  {
    label: "SHARE",
    description: "Export reports & share insights",
    icon: Share2,
    href: "/reports",
    color: "#F59E0B",
  },
  {
    label: "IMPROVE",
    description: "Tasks, AI analysis & optimize",
    icon: Target,
    href: "/tasks",
    color: "#EF4444",
  },
  {
    label: "CONNECT",
    description: "Link brokers, webhooks & APIs",
    icon: Plug,
    href: "/integrations",
    color: "#EC4899",
  },
  {
    label: "PORTFOLIO",
    description: "Manage multi-strategy portfolios",
    icon: Briefcase,
    href: "/portfolios",
    color: "#14B8A6",
  },
  {
    label: "HELP",
    description: "Guides, FAQs & support",
    icon: HelpCircle,
    href: "/help",
    color: "#6B7280",
  },
];

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

export default function DashboardPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const userName = session?.user?.name || "Trader";

  const [dashData, setDashData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const res = await fetch("/api/dashboard");
        if (res.ok) {
          setDashData(await res.json());
        }
      } catch (error) {
        console.error("Error fetching dashboard:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchDashboard();
  }, []);

  const stats = dashData?.stats;
  const recentTasks = dashData?.recentTasks || [];
  const recentActivity = dashData?.recentActivity || [];

  return (
    <div className="max-w-6xl mx-auto">
      {/* Greeting */}
      <div className="text-center mb-10 mt-2">
        <h1 className="text-2xl md:text-3xl font-semibold text-[var(--text-primary)]">
          What do you want to achieve in{" "}
          <span className="text-[var(--color-primary)]">TradeOS</span> today,{" "}
          <span className="text-[#06B6D4]">{userName}</span>?
        </h1>
        <p className="text-sm text-[var(--text-muted)] mt-2">
          {format(new Date(), "EEEE, dd MMMM yyyy")} &middot;{" "}
          {getGreeting()}
        </p>
      </div>

      {/* Feature Cards Grid - BreakoutOS Style */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        {featureCards.map((card, index) => {
          const Icon = card.icon;
          return (
            <motion.button
              key={card.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05, duration: 0.3 }}
              onClick={() => router.push(card.href)}
              className={cn(
                "group relative flex items-center gap-4 p-5 rounded-xl border transition-all duration-300",
                "bg-[var(--bg-card)] border-[var(--border-color)]",
                "hover:border-opacity-60 hover:shadow-lg hover:shadow-black/20 hover:-translate-y-0.5"
              )}
            >
              {/* Icon */}
              <div
                className="flex items-center justify-center h-11 w-11 rounded-lg shrink-0 transition-transform group-hover:scale-110"
                style={{ backgroundColor: `${card.color}15` }}
              >
                <Icon className="h-5 w-5" style={{ color: card.color }} />
              </div>

              {/* Text */}
              <div className="flex-1 text-left min-w-0">
                <span
                  className="text-base font-bold tracking-wider block"
                  style={{ color: card.color }}
                >
                  {card.label}
                </span>
                <span className="text-xs text-[#64748B] block mt-0.5">
                  {card.description}
                </span>
              </div>

              {/* Arrow */}
              <ArrowRight className="h-4 w-4 text-[#1E293B] group-hover:text-[var(--text-muted)] transition-all group-hover:translate-x-1 shrink-0" />

              {/* Hover glow border */}
              <div
                className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
                style={{
                  boxShadow: `inset 0 0 0 1px ${card.color}40`,
                }}
              />
            </motion.button>
          );
        })}
      </div>

      {/* Go to Dashboard CTA */}
      <motion.button
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        onClick={() => {
          document.getElementById("dashboard-stats")?.scrollIntoView({
            behavior: "smooth",
          });
        }}
        className="w-full py-3.5 rounded-xl bg-gradient-to-r from-[#06B6D4] to-[#3B82F6] text-white font-semibold text-sm tracking-wide hover:opacity-90 transition-opacity mb-10"
      >
        View My Dashboard Stats
      </motion.button>

      {/* Broker Status */}
      <BrokerStatusBanner />

      {/* Stats Section */}
      <div id="dashboard-stats">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {loading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-[120px]" />
            ))
          ) : (
            <>
              <MetricCard
                title="Total Strategies"
                value={stats?.totalStrategies ?? 0}
                icon={Layers}
                color="#3B82F6"
                tooltip="Number of trading strategies you have created across all statuses"
              />
              <MetricCard
                title="Active Portfolios"
                value={stats?.activePortfolios ?? 0}
                icon={Briefcase}
                color="#06B6D4"
                tooltip="Portfolios currently being tracked with one or more strategies assigned"
              />
              <MetricCard
                title="Overall Win Rate"
                value={
                  stats?.overallWinRate
                    ? formatPercentage(stats.overallWinRate)
                    : "—"
                }
                icon={TrendingUp}
                color="#10B981"
                tooltip="Average win rate across all your backtested strategies. Above 50% means more winners than losers"
              />
              <MetricCard
                title="Ready to Go Live"
                value={stats?.strategiesReadyToLive ?? 0}
                icon={Rocket}
                color="#3B82F6"
                tooltip="Strategies that have passed backtesting and are ready for live deployment"
              />
            </>
          )}
        </div>

        {/* Two Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-6">
          {/* Recent Activity */}
          <div className="lg:col-span-7 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl p-6">
            <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-4">
              Recent Activity
            </h2>
            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-10" />
                ))}
              </div>
            ) : (
              <ActivityFeed
                items={recentActivity.map((a: any) => ({
                  ...a,
                  timestamp: new Date(a.timestamp),
                }))}
              />
            )}
          </div>

          {/* Upcoming Tasks */}
          <div className="lg:col-span-5 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-[var(--text-primary)]">
                Upcoming Tasks
              </h2>
              <button
                onClick={() => router.push("/tasks")}
                className="text-xs text-[var(--color-primary)] hover:text-[var(--color-primary-hover)]"
              >
                View all
              </button>
            </div>
            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-12" />
                ))}
              </div>
            ) : recentTasks.length === 0 ? (
              <p className="text-sm text-[var(--text-muted)] text-center py-4">
                No upcoming tasks
              </p>
            ) : (
              <div className="space-y-3">
                {recentTasks.map((task: any) => (
                  <div
                    key={task.id}
                    className="flex items-center justify-between p-3 rounded-lg hover:bg-[var(--bg-main)] transition-colors cursor-pointer"
                    onClick={() => {
                      if (task.strategyId) {
                        router.push(`/strategies/${task.strategyId}`);
                      } else {
                        router.push("/tasks");
                      }
                    }}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="text-sm truncate">
                        {task.strategy && (
                          <>
                            <span className="text-[var(--text-secondary)]">
                              {task.strategy.name}
                            </span>
                            <span className="text-[var(--text-muted)] mx-2">/</span>
                          </>
                        )}
                        <span className="text-[var(--text-primary)]">{task.title}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <Badge
                        variant={priorityVariant[task.priority] || "default"}
                      >
                        {task.priority}
                      </Badge>
                      {task.dueDate && (
                        <div className="flex items-center gap-1 text-xs text-[var(--text-muted)]">
                          <Calendar className="h-3 w-3" />
                          {format(new Date(task.dueDate), "dd MMM")}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
