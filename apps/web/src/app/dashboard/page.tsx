"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import {
  Layers,
  Briefcase,
  TrendingUp,
  Rocket,
  Calendar,
} from "lucide-react";
import { MetricCard } from "@/components/shared/metric-card";
import { ActivityFeed } from "@/components/shared/activity-feed";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { formatPercentage } from "@tradeos/shared";

const priorityVariant: Record<string, "destructive" | "warning" | "default" | "secondary"> = {
  CRITICAL: "destructive",
  HIGH: "warning",
  MEDIUM: "default",
  LOW: "secondary",
};

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
    <div>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-[#F1F5F9]">Dashboard</h1>
        <p className="text-sm text-[#94A3B8] mt-1">
          {format(new Date(), "EEEE, dd MMMM yyyy")} &middot;{" "}
          {getGreeting()}, {userName}
        </p>
      </div>

      {/* Stats Grid */}
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
            />
            <MetricCard
              title="Active Portfolios"
              value={stats?.activePortfolios ?? 0}
              icon={Briefcase}
              color="#06B6D4"
            />
            <MetricCard
              title="Overall Win Rate"
              value={stats?.overallWinRate ? formatPercentage(stats.overallWinRate) : "—"}
              icon={TrendingUp}
              color="#10B981"
            />
            <MetricCard
              title="Ready to Go Live"
              value={stats?.strategiesReadyToLive ?? 0}
              icon={Rocket}
              color="#3B82F6"
            />
          </>
        )}
      </div>

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-6">
        {/* Recent Activity */}
        <div className="lg:col-span-7 bg-[#0A0A0A] border border-[#1A1A1A] rounded-xl p-6">
          <h2 className="text-lg font-semibold text-[#F1F5F9] mb-4">
            Recent Activity
          </h2>
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => <Skeleton key={i} className="h-10" />)}
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
        <div className="lg:col-span-5 bg-[#0A0A0A] border border-[#1A1A1A] rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-[#F1F5F9]">
              Upcoming Tasks
            </h2>
            <button
              onClick={() => router.push("/tasks")}
              className="text-xs text-[#3B82F6] hover:text-[#2563EB]"
            >
              View all
            </button>
          </div>
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => <Skeleton key={i} className="h-12" />)}
            </div>
          ) : recentTasks.length === 0 ? (
            <p className="text-sm text-[#475569] text-center py-4">
              No upcoming tasks
            </p>
          ) : (
            <div className="space-y-3">
              {recentTasks.map((task: any) => (
                <div
                  key={task.id}
                  className="flex items-center justify-between p-3 rounded-lg hover:bg-[#000000] transition-colors cursor-pointer"
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
                          <span className="text-[#94A3B8]">{task.strategy.name}</span>
                          <span className="text-[#475569] mx-2">/</span>
                        </>
                      )}
                      <span className="text-[#F1F5F9]">{task.title}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <Badge variant={priorityVariant[task.priority] || "default"}>
                      {task.priority}
                    </Badge>
                    {task.dueDate && (
                      <div className="flex items-center gap-1 text-xs text-[#475569]">
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
  );
}
