"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { format } from "date-fns";
import {
  ArrowLeft,
  Layers,
  TrendingDown,
  Target,
  BarChart3,
  Shield,
  Activity,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { EquityCurveChart } from "@/components/charts/equity-curve-chart";
import { InfoTooltip } from "@/components/shared/info-tooltip";
import { cn } from "@/lib/utils";
import { formatINR, formatPercentage, STRATEGY_STATUS_CONFIG } from "@tradeos/shared";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Legend,
  Tooltip as RechartsTooltip,
} from "recharts";

const COLORS = ["#3B82F6", "#10B981", "#F59E0B", "#EF4444", "#A855F7", "#06B6D4", "#F97316", "#6366F1"];

export default function PortfolioDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [portfolio, setPortfolio] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchPortfolio = async () => {
    try {
      const res = await fetch(`/api/portfolios/${params.id}`);
      if (res.ok) {
        setPortfolio(await res.json());
      }
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPortfolio();
  }, [params.id]);

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-12 w-[300px]" />
        <div className="grid grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <Skeleton className="h-[300px]" />
      </div>
    );
  }

  if (!portfolio) {
    return (
      <div className="text-center py-16">
        <p className="text-[#94A3B8]">Portfolio not found</p>
        <Button variant="ghost" onClick={() => router.push("/portfolios")} className="mt-4">
          <ArrowLeft className="h-4 w-4 mr-2" /> Back to Portfolios
        </Button>
      </div>
    );
  }

  // Calculate combined metrics
  const strategies = portfolio.portfolioStrategies || [];
  let totalNetProfit = 0;
  let totalMaxDD = 0;
  let totalWinRate = 0;
  let totalSharpe = 0;
  let strategiesWithData = 0;

  const allocationData: { name: string; value: number; color: string }[] = [];
  const equityCurves: Record<string, { date: string; value: number }[]> = {};
  const monthlyReturns: Record<string, number[]> = {};

  strategies.forEach((ps: any, index: number) => {
    const bt = ps.strategy.backtestResults?.[0];
    const alloc = ps.capitalAllocationPct;

    allocationData.push({
      name: ps.strategy.name,
      value: alloc,
      color: COLORS[index % COLORS.length],
    });

    if (bt) {
      totalNetProfit += bt.netProfit * (alloc / 100);
      totalWinRate += bt.winRate;
      totalSharpe += bt.sharpeRatio;
      strategiesWithData++;

      if (bt.trades) {
        let cumPnl = 0;
        const monthlyMap = new Map<string, number>();
        equityCurves[ps.strategy.name] = [];

        for (const trade of bt.trades) {
          cumPnl += trade.profitLoss * (alloc / 100);
          const dateStr = format(
            new Date(trade.exitDate || trade.entryDate),
            "dd MMM yy"
          );
          equityCurves[ps.strategy.name].push({ date: dateStr, value: cumPnl });

          // Monthly
          const d = new Date(trade.exitDate || trade.entryDate);
          const monthKey = `${d.getFullYear()}-${d.getMonth()}`;
          monthlyMap.set(monthKey, (monthlyMap.get(monthKey) || 0) + trade.profitLoss);
        }

        monthlyReturns[ps.strategy.name] = Array.from(monthlyMap.values());
      }
    }
  });

  const avgWinRate = strategiesWithData > 0 ? totalWinRate / strategiesWithData : 0;
  const avgSharpe = strategiesWithData > 0 ? totalSharpe / strategiesWithData : 0;

  // Build combined equity curve
  const combinedEquity: { date: string; value: number }[] = [];
  const allDates = new Set<string>();
  Object.values(equityCurves).forEach((curve) => {
    curve.forEach((point) => allDates.add(point.date));
  });

  const sortedDates = Array.from(allDates);
  for (const date of sortedDates) {
    let total = 0;
    for (const curve of Object.values(equityCurves)) {
      const point = curve.findLast((p) => p.date <= date || p.date === date);
      if (point) total += point.value;
    }
    combinedEquity.push({ date, value: total });
  }

  // Compute correlation matrix
  const strategyNames = Object.keys(monthlyReturns);
  const correlationMatrix: number[][] = [];
  for (let i = 0; i < strategyNames.length; i++) {
    correlationMatrix[i] = [];
    for (let j = 0; j < strategyNames.length; j++) {
      const a = monthlyReturns[strategyNames[i]];
      const b = monthlyReturns[strategyNames[j]];
      if (a && b && a.length > 1 && b.length > 1) {
        const minLen = Math.min(a.length, b.length);
        const sliceA = a.slice(0, minLen);
        const sliceB = b.slice(0, minLen);
        const meanA = sliceA.reduce((s, v) => s + v, 0) / minLen;
        const meanB = sliceB.reduce((s, v) => s + v, 0) / minLen;
        let cov = 0, varA = 0, varB = 0;
        for (let k = 0; k < minLen; k++) {
          cov += (sliceA[k] - meanA) * (sliceB[k] - meanB);
          varA += (sliceA[k] - meanA) ** 2;
          varB += (sliceB[k] - meanB) ** 2;
        }
        const denom = Math.sqrt(varA * varB);
        correlationMatrix[i][j] = denom > 0 ? cov / denom : 0;
      } else {
        correlationMatrix[i][j] = i === j ? 1 : 0;
      }
    }
  }

  const statusColors: Record<string, string> = {
    ACTIVE: "#10B981",
    PAUSED: "#F59E0B",
    ARCHIVED: "#6B7280",
  };

  return (
    <div>
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Button variant="ghost" size="icon" onClick={() => router.push("/portfolios")}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold text-[#F1F5F9]">{portfolio.name}</h1>
            <Badge
              style={{
                backgroundColor: `${statusColors[portfolio.status]}15`,
                color: statusColors[portfolio.status],
              }}
            >
              {portfolio.status}
            </Badge>
            <Badge variant="secondary">
              <Layers className="h-3 w-3 mr-1" />
              {strategies.length} strategies
            </Badge>
          </div>
          {portfolio.description && (
            <p className="text-sm text-[#475569] mt-1">{portfolio.description}</p>
          )}
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
        {[
          { label: "Total Net Profit", value: formatINR(totalNetProfit), color: totalNetProfit >= 0 ? "#10B981" : "#EF4444", icon: BarChart3, tooltip: "Combined profit/loss across all strategies in this portfolio" },
          { label: "Combined Win Rate", value: formatPercentage(avgWinRate), color: avgWinRate > 55 ? "#10B981" : "#F59E0B", icon: Target, tooltip: "Weighted average win rate of all strategies in this portfolio" },
          { label: "Portfolio Sharpe", value: avgSharpe.toFixed(2), color: "#06B6D4", icon: Activity, tooltip: "Risk-adjusted return of the combined portfolio. Above 1.0 is acceptable, above 2.0 is very good" },
          { label: "Strategies", value: String(strategies.length), color: "#3B82F6", icon: Layers, tooltip: "Number of trading strategies included in this portfolio" },
          { label: "Capital at Risk", value: `${strategies.reduce((s: number, ps: any) => s + ps.capitalAllocationPct, 0)}%`, color: "#F59E0B", icon: Shield, tooltip: "Maximum capital exposure across all active positions" },
          { label: "With Data", value: `${strategiesWithData}/${strategies.length}`, color: "#A855F7", icon: TrendingDown, tooltip: "Number of strategies that have backtest data imported" },
        ].map((m) => {
          const Icon = m.icon;
          return (
            <div key={m.label} className="bg-[#0A0A0A] border border-[#1A1A1A] rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <Icon className="h-3.5 w-3.5" style={{ color: m.color }} />
                <span className="text-[10px] text-[#475569]">{m.label}</span>
                <InfoTooltip text={m.tooltip} />
              </div>
              <p className="text-lg font-mono font-semibold" style={{ color: m.color }}>
                {m.value}
              </p>
            </div>
          );
        })}
      </div>

      {/* Combined Equity Curve */}
      {combinedEquity.length > 0 && (
        <div className="bg-[#0A0A0A] border border-[#1A1A1A] rounded-xl p-6 mb-6">
          <h3 className="text-lg font-semibold text-[#F1F5F9] mb-4">Combined Equity Curve</h3>
          <EquityCurveChart data={combinedEquity} height={300} />
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Allocation Pie Chart */}
        {allocationData.length > 0 && (
          <div className="bg-[#0A0A0A] border border-[#1A1A1A] rounded-xl p-6">
            <h3 className="text-lg font-semibold text-[#F1F5F9] mb-4">Capital Allocation</h3>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={allocationData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={2}
                  dataKey="value"
                  nameKey="name"
                >
                  {allocationData.map((entry, index) => (
                    <Cell key={index} fill={entry.color} />
                  ))}
                </Pie>
                <RechartsTooltip
                  contentStyle={{
                    backgroundColor: "#0A0A0A",
                    border: "1px solid #1A1A1A",
                    borderRadius: "8px",
                  }}
                  formatter={(value: number) => [`${value}%`, "Allocation"]}
                />
                <Legend
                  formatter={(value) => (
                    <span className="text-xs text-[#94A3B8]">{value}</span>
                  )}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Correlation Matrix */}
        {strategyNames.length > 1 && (
          <div className="bg-[#0A0A0A] border border-[#1A1A1A] rounded-xl p-6">
            <h3 className="text-lg font-semibold text-[#F1F5F9] mb-4">Correlation Matrix</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr>
                    <th className="text-left px-2 py-1 text-[#475569]" />
                    {strategyNames.map((name) => (
                      <th key={name} className="text-center px-2 py-1 text-[#475569] max-w-[80px] truncate">
                        {name.length > 10 ? name.slice(0, 10) + "..." : name}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {strategyNames.map((name, i) => (
                    <tr key={name}>
                      <td className="px-2 py-1 text-[#94A3B8] max-w-[80px] truncate">
                        {name.length > 10 ? name.slice(0, 10) + "..." : name}
                      </td>
                      {correlationMatrix[i]?.map((corr, j) => {
                        const color =
                          i === j
                            ? "#1A1A1A"
                            : corr > 0.3
                            ? `rgba(16, 185, 129, ${Math.abs(corr)})`
                            : corr < -0.3
                            ? `rgba(239, 68, 68, ${Math.abs(corr)})`
                            : "transparent";
                        return (
                          <td
                            key={j}
                            className="text-center px-2 py-2 font-mono"
                            style={{ backgroundColor: color, color: "#F1F5F9" }}
                          >
                            {corr.toFixed(2)}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex items-center gap-4 mt-3 text-[10px] text-[#475569]">
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded" style={{ backgroundColor: "rgba(16, 185, 129, 0.7)" }} />
                Positive (correlated)
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded" style={{ backgroundColor: "rgba(239, 68, 68, 0.7)" }} />
                Negative (diversified)
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Strategy Table */}
      <div className="bg-[#0A0A0A] border border-[#1A1A1A] rounded-xl p-6">
        <h3 className="text-lg font-semibold text-[#F1F5F9] mb-4">Strategies</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[#050505] border-b border-[#1A1A1A]">
                <th className="text-left px-3 py-2 text-xs text-[#94A3B8]">Strategy</th>
                <th className="text-left px-3 py-2 text-xs text-[#94A3B8]">Status</th>
                <th className="text-right px-3 py-2 text-xs text-[#94A3B8]">Allocation</th>
                <th className="text-right px-3 py-2 text-xs text-[#94A3B8]">Net Profit</th>
                <th className="text-right px-3 py-2 text-xs text-[#94A3B8]">Win Rate</th>
                <th className="text-right px-3 py-2 text-xs text-[#94A3B8]">Sharpe</th>
                <th className="text-center px-3 py-2 text-xs text-[#94A3B8]">AI Score</th>
              </tr>
            </thead>
            <tbody>
              {strategies.map((ps: any, index: number) => {
                const bt = ps.strategy.backtestResults?.[0];
                const ai = ps.strategy.aiAnalyses?.[0];
                const statusCfg = STRATEGY_STATUS_CONFIG[ps.strategy.status as keyof typeof STRATEGY_STATUS_CONFIG];
                return (
                  <tr
                    key={ps.id}
                    className="border-b border-[#1A1A1A] last:border-0 hover:bg-[#000000] cursor-pointer"
                    onClick={() => router.push(`/strategies/${ps.strategy.id}`)}
                  >
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-2 h-2 rounded-full"
                          style={{ backgroundColor: COLORS[index % COLORS.length] }}
                        />
                        <span className="text-[#F1F5F9] font-medium">{ps.strategy.name}</span>
                      </div>
                    </td>
                    <td className="px-3 py-3">
                      <Badge
                        className="text-[10px]"
                        style={{
                          backgroundColor: statusCfg?.bgColor,
                          color: statusCfg?.color,
                        }}
                      >
                        {statusCfg?.label}
                      </Badge>
                    </td>
                    <td className="px-3 py-3 text-right font-mono text-[#F1F5F9]">
                      {ps.capitalAllocationPct}%
                    </td>
                    <td className={cn("px-3 py-3 text-right font-mono", bt ? (bt.netProfit >= 0 ? "text-[#10B981]" : "text-[#EF4444]") : "text-[#475569]")}>
                      {bt ? formatINR(bt.netProfit) : "—"}
                    </td>
                    <td className="px-3 py-3 text-right font-mono text-[#94A3B8]">
                      {bt ? formatPercentage(bt.winRate) : "—"}
                    </td>
                    <td className="px-3 py-3 text-right font-mono text-[#94A3B8]">
                      {bt ? bt.sharpeRatio.toFixed(2) : "—"}
                    </td>
                    <td className="px-3 py-3 text-center">
                      {ai ? (
                        <span
                          className="font-mono text-sm font-semibold"
                          style={{
                            color: ai.overallScore > 70 ? "#10B981" : ai.overallScore >= 50 ? "#F59E0B" : "#EF4444",
                          }}
                        >
                          {ai.overallScore}
                        </span>
                      ) : (
                        <span className="text-[#475569]">—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
