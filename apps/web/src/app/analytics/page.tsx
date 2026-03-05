"use client";

import { useState, useEffect } from "react";
import {
  BarChart3,
  TrendingUp,
  DollarSign,
  Target,
  ShieldAlert,
  PieChart,
  Activity,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  LineChart,
  Line,
  AreaChart,
  Area,
  PieChart as RePieChart,
  Pie,
  Cell,
} from "recharts";
import { MetricCard } from "@/components/shared/metric-card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { formatINR, formatPercentage, STRATEGY_STATUS_CONFIG } from "@tradeos/shared";

const COLORS = ["#3B82F6", "#06B6D4", "#10B981", "#F59E0B", "#EF4444", "#8B5CF6"];

const STATUS_COLORS: Record<string, string> = {
  IDEA: "#8B5CF6",
  IN_DEVELOPMENT: "#3B82F6",
  BACKTESTING: "#F59E0B",
  REVIEW: "#06B6D4",
  PAPER_TRADING: "#6366F1",
  LIVE: "#10B981",
  PAUSED: "#F59E0B",
  RETIRED: "#6B7280",
};

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload) return null;
  return (
    <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-lg p-3 shadow-lg">
      <p className="text-sm text-[var(--text-primary)] font-medium mb-1">{label}</p>
      {payload.map((entry: any, i: number) => (
        <p key={i} className="text-xs" style={{ color: entry.color }}>
          {entry.name}: {typeof entry.value === "number" && entry.value > 1000
            ? formatINR(entry.value)
            : entry.value}
        </p>
      ))}
    </div>
  );
}

export default function AnalyticsPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const res = await fetch("/api/analytics");
        if (res.ok) {
          setData(await res.json());
        }
      } catch (error) {
        console.error("Error fetching analytics:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchAnalytics();
  }, []);

  if (loading) {
    return (
      <div>
        <h1 className="text-2xl font-semibold text-[var(--text-primary)] mb-6">Analytics</h1>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-[120px]" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-[350px]" />
          ))}
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <BarChart3 className="h-16 w-16 text-[var(--text-muted)] mb-4" />
        <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-2">No Analytics Data</h2>
        <p className="text-sm text-[var(--text-secondary)]">
          Import backtests to see analytics across your strategies.
        </p>
      </div>
    );
  }

  const { aggregateStats, strategyComparison, riskMetrics, monthlyPnL, equityCurve, statusDistribution, marketDistribution, strategyNames } = data;

  // Prepare pie chart data
  const statusPieData = Object.entries(statusDistribution).map(([key, value]) => ({
    name: STRATEGY_STATUS_CONFIG[key as keyof typeof STRATEGY_STATUS_CONFIG]?.label || key,
    value: value as number,
    color: STATUS_COLORS[key] || "#6B7280",
  }));

  const marketPieData = Object.entries(marketDistribution).map(([key, value], i) => ({
    name: key,
    value: value as number,
    color: COLORS[i % COLORS.length],
  }));

  // Normalize risk metrics for radar chart
  const radarData = riskMetrics?.length
    ? [
      { metric: "Sharpe", ...Object.fromEntries(riskMetrics.map((r: any) => [r.name, r.sharpeRatio])) },
      { metric: "Sortino", ...Object.fromEntries(riskMetrics.map((r: any) => [r.name, r.sortinoRatio])) },
      { metric: "Calmar", ...Object.fromEntries(riskMetrics.map((r: any) => [r.name, r.calmarRatio])) },
      { metric: "Recovery", ...Object.fromEntries(riskMetrics.map((r: any) => [r.name, Math.min(r.recoveryFactor, 10)])) },
    ]
    : [];

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-[var(--text-primary)]">Analytics</h1>
        <p className="text-sm text-[var(--text-secondary)] mt-1">
          Cross-strategy performance analytics and insights
        </p>
      </div>

      {/* Aggregate Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <MetricCard
          title="Total Net Profit"
          value={formatINR(aggregateStats.totalNetProfit)}
          icon={DollarSign}
          color="#10B981"
          tooltip="Combined profit/loss across all your strategies after subtracting losses"
        />
        <MetricCard
          title="Avg Win Rate"
          value={formatPercentage(aggregateStats.avgWinRate)}
          icon={Target}
          color={aggregateStats.avgWinRate > 55 ? "#10B981" : aggregateStats.avgWinRate > 45 ? "#F59E0B" : "#EF4444"}
          tooltip="Average percentage of winning trades across all strategies"
        />
        <MetricCard
          title="Avg Profit Factor"
          value={aggregateStats.avgProfitFactor.toFixed(2)}
          icon={TrendingUp}
          color="#3B82F6"
          tooltip="Average ratio of gross profits to gross losses across strategies. Above 1.5 is good"
        />
        <MetricCard
          title="Worst Drawdown"
          value={formatPercentage(aggregateStats.worstDrawdown)}
          icon={ShieldAlert}
          color="#EF4444"
          tooltip="The largest peak-to-trough equity decline among all strategies. Shows your worst-case scenario"
        />
      </div>

      {/* Strategy Comparison Bar Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl p-6">
          <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-4 flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-[var(--color-primary)]" />
            Net Profit Comparison
          </h2>
          {strategyComparison?.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={strategyComparison}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
                <XAxis
                  dataKey="name"
                  tick={{ fill: "var(--text-secondary)", fontSize: 11 }}
                  angle={-20}
                  textAnchor="end"
                  height={60}
                />
                <YAxis
                  tick={{ fill: "var(--text-secondary)", fontSize: 11 }}
                  tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}K`}
                />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="netProfit" name="Net Profit" fill="#3B82F6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-sm text-[var(--text-muted)] text-center py-10">No backtest data</p>
          )}
        </div>

        {/* Win Rate Comparison */}
        <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl p-6">
          <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-4 flex items-center gap-2">
            <Target className="h-5 w-5 text-[#10B981]" />
            Win Rate & Profit Factor
          </h2>
          {strategyComparison?.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={strategyComparison}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
                <XAxis
                  dataKey="name"
                  tick={{ fill: "var(--text-secondary)", fontSize: 11 }}
                  angle={-20}
                  textAnchor="end"
                  height={60}
                />
                <YAxis tick={{ fill: "var(--text-secondary)", fontSize: 11 }} />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ color: "var(--text-secondary)", fontSize: 12 }} />
                <Bar dataKey="winRate" name="Win Rate %" fill="#10B981" radius={[4, 4, 0, 0]} />
                <Bar dataKey="profitFactor" name="Profit Factor" fill="#06B6D4" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-sm text-[var(--text-muted)] text-center py-10">No backtest data</p>
          )}
        </div>
      </div>

      {/* Equity Curve & Monthly P&L */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Cumulative Equity Curve */}
        <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl p-6">
          <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-4 flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-[#00FF44]" />
            Cumulative Equity Curve
          </h2>
          {equityCurve?.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={equityCurve}>
                <defs>
                  <linearGradient id="analyticsEquityGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#00FF44" stopOpacity={0.4} />
                    <stop offset="50%" stopColor="#00FF44" stopOpacity={0.1} />
                    <stop offset="95%" stopColor="#00FF44" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
                <XAxis
                  dataKey="month"
                  tick={{ fill: "#94A3B8", fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                  minTickGap={30}
                />
                <YAxis
                  tick={{ fill: "#94A3B8", fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}K`}
                />
                <Tooltip content={<CustomTooltip />} />
                <Area
                  type="stepAfter"
                  dataKey="Total"
                  stroke="#00FF44"
                  fill="url(#analyticsEquityGrad)"
                  fillOpacity={1}
                  strokeWidth={2}
                  name="Total"
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-sm text-[var(--text-muted)] text-center py-10">No data available</p>
          )}
        </div>

        {/* Monthly P&L */}
        <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl p-6">
          <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-4 flex items-center gap-2">
            <Activity className="h-5 w-5 text-[#F59E0B]" />
            Monthly P&L
          </h2>
          {monthlyPnL?.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={monthlyPnL}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
                <XAxis dataKey="month" tick={{ fill: "var(--text-secondary)", fontSize: 11 }} />
                <YAxis
                  tick={{ fill: "var(--text-secondary)", fontSize: 11 }}
                  tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}K`}
                />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="total" name="Total P&L" fill="#3B82F6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-sm text-[var(--text-muted)] text-center py-10">No data available</p>
          )}
        </div>
      </div>

      {/* Risk Radar & Distribution Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* Risk Metrics Radar */}
        <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl p-6">
          <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-4 flex items-center gap-2">
            <ShieldAlert className="h-5 w-5 text-[#EF4444]" />
            Risk Metrics
          </h2>
          {radarData.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <RadarChart data={radarData}>
                <PolarGrid stroke="var(--border-color)" />
                <PolarAngleAxis dataKey="metric" tick={{ fill: "var(--text-secondary)", fontSize: 11 }} />
                <PolarRadiusAxis tick={{ fill: "var(--text-muted)", fontSize: 10 }} />
                {strategyNames?.map((name: string, i: number) => (
                  <Radar
                    key={name}
                    name={name}
                    dataKey={name}
                    stroke={COLORS[i % COLORS.length]}
                    fill={COLORS[i % COLORS.length]}
                    fillOpacity={0.15}
                  />
                ))}
                <Legend wrapperStyle={{ color: "var(--text-secondary)", fontSize: 11 }} />
              </RadarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-sm text-[var(--text-muted)] text-center py-10">No risk data</p>
          )}
        </div>

        {/* Status Distribution */}
        <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl p-6">
          <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-4 flex items-center gap-2">
            <PieChart className="h-5 w-5 text-[#06B6D4]" />
            Strategy Status
          </h2>
          {statusPieData.length > 0 ? (
            <div>
              <ResponsiveContainer width="100%" height={200}>
                <RePieChart>
                  <Pie
                    data={statusPieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {statusPieData.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </RePieChart>
              </ResponsiveContainer>
              <div className="space-y-1 mt-2">
                {statusPieData.map((entry, i) => (
                  <div key={i} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: entry.color }} />
                      <span className="text-[var(--text-secondary)]">{entry.name}</span>
                    </div>
                    <span className="text-[var(--text-primary)] font-mono">{entry.value}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <p className="text-sm text-[var(--text-muted)] text-center py-10">No strategies</p>
          )}
        </div>

        {/* Market Distribution */}
        <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl p-6">
          <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-4 flex items-center gap-2">
            <PieChart className="h-5 w-5 text-[#F59E0B]" />
            Market Distribution
          </h2>
          {marketPieData.length > 0 ? (
            <div>
              <ResponsiveContainer width="100%" height={200}>
                <RePieChart>
                  <Pie
                    data={marketPieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {marketPieData.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </RePieChart>
              </ResponsiveContainer>
              <div className="space-y-1 mt-2">
                {marketPieData.map((entry, i) => (
                  <div key={i} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: entry.color }} />
                      <span className="text-[var(--text-secondary)]">{entry.name}</span>
                    </div>
                    <span className="text-[var(--text-primary)] font-mono">{entry.value}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <p className="text-sm text-[var(--text-muted)] text-center py-10">No market data</p>
          )}
        </div>
      </div>

      {/* Strategy Comparison Table */}
      <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl p-6">
        <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-4">
          Strategy Performance Table
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--border-color)] text-[var(--text-secondary)] text-xs">
                <th className="text-left py-3 px-2">Strategy</th>
                <th className="text-left py-3 px-2">Status</th>
                <th className="text-right py-3 px-2">Win Rate</th>
                <th className="text-right py-3 px-2">Profit Factor</th>
                <th className="text-right py-3 px-2">Net Profit</th>
                <th className="text-right py-3 px-2">Max DD</th>
                <th className="text-right py-3 px-2">Sharpe</th>
                <th className="text-right py-3 px-2">Trades</th>
              </tr>
            </thead>
            <tbody>
              {strategyComparison?.map((s: any, i: number) => (
                <tr key={i} className="border-b border-[var(--border-color)]/50 hover:bg-[var(--bg-sidebar)] transition-colors">
                  <td className="py-3 px-2 text-[var(--text-primary)] font-medium">{s.name}</td>
                  <td className="py-3 px-2">
                    <Badge
                      className="text-xs"
                      style={{
                        backgroundColor: `${STATUS_COLORS[s.status]}20`,
                        color: STATUS_COLORS[s.status],
                        borderColor: STATUS_COLORS[s.status],
                      }}
                    >
                      {STRATEGY_STATUS_CONFIG[s.status as keyof typeof STRATEGY_STATUS_CONFIG]?.label || s.status}
                    </Badge>
                  </td>
                  <td className={`py-3 px-2 text-right font-mono ${s.winRate > 55 ? "text-[#10B981]" : s.winRate < 45 ? "text-[#EF4444]" : "text-[#F59E0B]"}`}>
                    {formatPercentage(s.winRate)}
                  </td>
                  <td className={`py-3 px-2 text-right font-mono ${s.profitFactor > 1.5 ? "text-[#10B981]" : "text-[#F59E0B]"}`}>
                    {s.profitFactor.toFixed(2)}
                  </td>
                  <td className={`py-3 px-2 text-right font-mono ${s.netProfit > 0 ? "text-[#10B981]" : "text-[#EF4444]"}`}>
                    {formatINR(s.netProfit)}
                  </td>
                  <td className="py-3 px-2 text-right font-mono text-[#EF4444]">
                    {formatPercentage(s.maxDrawdownPct)}
                  </td>
                  <td className={`py-3 px-2 text-right font-mono ${s.sharpeRatio > 1.5 ? "text-[#10B981]" : "text-[#F59E0B]"}`}>
                    {s.sharpeRatio.toFixed(2)}
                  </td>
                  <td className="py-3 px-2 text-right font-mono text-[var(--text-secondary)]">
                    {s.totalTrades}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
