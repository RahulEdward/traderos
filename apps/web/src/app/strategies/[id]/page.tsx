"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { format } from "date-fns";
import {
  ArrowLeft,
  Upload,
  FileDown,
  TrendingUp,
  TrendingDown,
  BarChart3,
  Target,
  Activity,
  Zap,
  Shield,
  Award,
  Clock,
  Hash,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { EquityCurveChart } from "@/components/charts/equity-curve-chart";
import { DrawdownChart } from "@/components/charts/drawdown-chart";
import { MonthlyHeatmap } from "@/components/charts/monthly-heatmap";
import { CsvImportWizard } from "@/components/forms/csv-import-wizard";
import { AiAnalysisTab } from "@/components/strategy/ai-analysis-tab";
import { TaskBoard } from "@/components/strategy/task-board";
import { cn } from "@/lib/utils";
import { STRATEGY_STATUS_CONFIG, formatINR, formatPercentage } from "@tradeos/shared";

interface MetricItem {
  label: string;
  value: string;
  color?: string;
  icon: any;
}

export default function StrategyDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [strategy, setStrategy] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showImport, setShowImport] = useState(false);

  const fetchStrategy = async () => {
    try {
      const res = await fetch(`/api/strategies/${params.id}`);
      if (res.ok) {
        setStrategy(await res.json());
      }
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStrategy();
  }, [params.id]);

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-12 w-[300px]" />
        <Skeleton className="h-8 w-[200px]" />
        <div className="grid grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <Skeleton className="h-[300px]" />
      </div>
    );
  }

  if (!strategy) {
    return (
      <div className="text-center py-16">
        <p className="text-[#94A3B8]">Strategy not found</p>
        <Button variant="ghost" onClick={() => router.push("/strategies")} className="mt-4">
          <ArrowLeft className="h-4 w-4 mr-2" /> Back to Strategies
        </Button>
      </div>
    );
  }

  const latestBacktest = strategy.backtestResults?.[0];
  const statusConfig = STRATEGY_STATUS_CONFIG[strategy.status as keyof typeof STRATEGY_STATUS_CONFIG];

  // Prepare chart data from trades
  const equityData: { date: string; value: number }[] = [];
  const drawdownData: { date: string; drawdown: number }[] = [];
  if (latestBacktest?.trades) {
    let cumPnl = 0;
    let peak = 0;
    for (const trade of latestBacktest.trades) {
      cumPnl += trade.profitLoss;
      if (cumPnl > peak) peak = cumPnl;
      const dd = peak > 0 ? ((peak - cumPnl) / peak) * 100 : 0;
      const dateStr = format(new Date(trade.exitDate || trade.entryDate), "dd MMM yy");
      equityData.push({ date: dateStr, value: cumPnl });
      drawdownData.push({ date: dateStr, drawdown: -dd });
    }
  }

  // Monthly data
  const monthlyData: { month: string; year: number; pnl: number; tradeCount: number }[] = [];
  if (latestBacktest?.trades) {
    const monthMap = new Map<string, { pnl: number; count: number; month: string; year: number }>();
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    for (const trade of latestBacktest.trades) {
      const d = new Date(trade.exitDate || trade.entryDate);
      const key = `${d.getFullYear()}-${monthNames[d.getMonth()]}`;
      const existing = monthMap.get(key) || { pnl: 0, count: 0, month: monthNames[d.getMonth()], year: d.getFullYear() };
      existing.pnl += trade.profitLoss;
      existing.count += 1;
      monthMap.set(key, existing);
    }
    monthMap.forEach((v) => monthlyData.push({ month: v.month, year: v.year, pnl: v.pnl, tradeCount: v.count }));
  }

  const metricsGrid: MetricItem[] = latestBacktest
    ? [
        { label: "Total Trades", value: String(latestBacktest.totalTrades), icon: Hash, color: "#3B82F6" },
        { label: "Win Rate", value: formatPercentage(latestBacktest.winRate), icon: Target, color: latestBacktest.winRate > 55 ? "#10B981" : latestBacktest.winRate < 45 ? "#EF4444" : "#F59E0B" },
        { label: "Profit Factor", value: latestBacktest.profitFactor.toFixed(2), icon: TrendingUp, color: latestBacktest.profitFactor > 1.5 ? "#10B981" : "#F59E0B" },
        { label: "Net Profit", value: formatINR(latestBacktest.netProfit), icon: BarChart3, color: latestBacktest.netProfit >= 0 ? "#10B981" : "#EF4444" },
        { label: "Max Drawdown", value: `${formatINR(latestBacktest.maxDrawdown)} (${formatPercentage(latestBacktest.maxDrawdownPct)})`, icon: TrendingDown, color: "#EF4444" },
        { label: "Avg Win", value: formatINR(latestBacktest.avgWin), icon: TrendingUp, color: "#10B981" },
        { label: "Avg Loss", value: formatINR(latestBacktest.avgLoss), icon: TrendingDown, color: "#EF4444" },
        { label: "Best Trade", value: formatINR(latestBacktest.bestTrade), icon: Award, color: "#10B981" },
        { label: "Worst Trade", value: formatINR(latestBacktest.worstTrade), icon: Shield, color: "#EF4444" },
        { label: "Sharpe Ratio", value: latestBacktest.sharpeRatio.toFixed(2), icon: Activity, color: "#06B6D4" },
        { label: "Expectancy", value: formatINR(latestBacktest.expectancy), icon: Zap, color: "#F59E0B" },
        { label: "Recovery Factor", value: latestBacktest.recoveryFactor.toFixed(2), icon: Clock, color: "#A855F7" },
      ]
    : [];

  return (
    <div>
      {/* Header */}
      <div className="flex items-center gap-3 mb-2">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.push("/strategies")}
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold text-[#F1F5F9]">
              {strategy.name}
            </h1>
            <Badge
              style={{ backgroundColor: statusConfig?.bgColor, color: statusConfig?.color }}
            >
              {statusConfig?.label}
            </Badge>
          </div>
          <div className="flex items-center gap-3 mt-1 text-xs text-[#475569]">
            {strategy.market && <span>{strategy.market}</span>}
            {strategy.instrument && (
              <>
                <span>&middot;</span>
                <span>{strategy.instrument}</span>
              </>
            )}
            {strategy.timeframe && (
              <>
                <span>&middot;</span>
                <span>{strategy.timeframe}</span>
              </>
            )}
            <span>&middot;</span>
            <span>Created {format(new Date(strategy.createdAt), "dd MMM yyyy")}</span>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-2 mb-6 ml-11">
        <Button
          variant="outline"
          onClick={() => setShowImport(true)}
        >
          <Upload className="h-4 w-4 mr-2" /> Import Backtest
        </Button>
        <Button variant="ghost">
          <FileDown className="h-4 w-4 mr-2" /> Export PDF
        </Button>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="backtest" className="space-y-6">
        <TabsList className="bg-[#050505] border border-[#1A1A1A]">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="backtest">Backtest Results</TabsTrigger>
          <TabsTrigger value="ai">AI Analysis</TabsTrigger>
          <TabsTrigger value="tasks">Tasks ({strategy.tasks?.length || 0})</TabsTrigger>
          <TabsTrigger value="live">Live Trading</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview">
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
            <div className="lg:col-span-3 bg-[#0A0A0A] border border-[#1A1A1A] rounded-xl p-6">
              <h3 className="text-lg font-semibold text-[#F1F5F9] mb-4">Strategy Details</h3>
              <div className="space-y-4">
                {strategy.description && (
                  <div>
                    <p className="text-xs text-[#475569] mb-1">Description</p>
                    <p className="text-sm text-[#F1F5F9]">{strategy.description}</p>
                  </div>
                )}
                {strategy.entryLogic && (
                  <div>
                    <p className="text-xs text-[#475569] mb-1">Entry Logic</p>
                    <p className="text-sm text-[#F1F5F9] whitespace-pre-wrap">{strategy.entryLogic}</p>
                  </div>
                )}
                {strategy.exitLogic && (
                  <div>
                    <p className="text-xs text-[#475569] mb-1">Exit Logic</p>
                    <p className="text-sm text-[#F1F5F9] whitespace-pre-wrap">{strategy.exitLogic}</p>
                  </div>
                )}
                {strategy.tags?.length > 0 && (
                  <div>
                    <p className="text-xs text-[#475569] mb-1">Tags</p>
                    <div className="flex flex-wrap gap-1">
                      {strategy.tags.map((tag: string) => (
                        <Badge key={tag} variant="secondary">{tag}</Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
            <div className="lg:col-span-2 space-y-4">
              {latestBacktest ? (
                <>
                  {[
                    { label: "Win Rate", value: formatPercentage(latestBacktest.winRate), color: latestBacktest.winRate > 55 ? "#10B981" : "#F59E0B" },
                    { label: "Profit Factor", value: latestBacktest.profitFactor.toFixed(2), color: "#3B82F6" },
                    { label: "Max Drawdown", value: formatPercentage(latestBacktest.maxDrawdownPct), color: "#EF4444" },
                    { label: "Net Profit", value: formatINR(latestBacktest.netProfit), color: latestBacktest.netProfit >= 0 ? "#10B981" : "#EF4444" },
                  ].map((m) => (
                    <div key={m.label} className="bg-[#0A0A0A] border border-[#1A1A1A] rounded-xl p-4">
                      <p className="text-xs text-[#475569]">{m.label}</p>
                      <p className="text-xl font-mono font-semibold mt-1" style={{ color: m.color }}>
                        {m.value}
                      </p>
                    </div>
                  ))}
                </>
              ) : (
                <div className="bg-[#0A0A0A] border border-[#1A1A1A] rounded-xl p-6 text-center">
                  <p className="text-sm text-[#475569]">No backtest data yet</p>
                  <Button variant="outline" onClick={() => setShowImport(true)} className="mt-3" size="sm">
                    <Upload className="h-4 w-4 mr-2" /> Import Backtest
                  </Button>
                </div>
              )}
            </div>
          </div>
        </TabsContent>

        {/* Backtest Results Tab */}
        <TabsContent value="backtest">
          {!latestBacktest ? (
            <div className="text-center py-16 bg-[#0A0A0A] border border-[#1A1A1A] rounded-xl">
              <Upload className="h-10 w-10 text-[#475569] mx-auto mb-3" />
              <h3 className="text-lg font-medium text-[#F1F5F9] mb-2">No backtest data</h3>
              <p className="text-sm text-[#94A3B8] mb-4">Import your first backtest to see results</p>
              <Button onClick={() => setShowImport(true)} className="bg-[#3B82F6] hover:bg-[#2563EB]">
                <Upload className="h-4 w-4 mr-2" /> Import Backtest
              </Button>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Metrics Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                {metricsGrid.map((m) => {
                  const Icon = m.icon;
                  return (
                    <div key={m.label} className="bg-[#0A0A0A] border border-[#1A1A1A] rounded-xl p-4 card-hover">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="p-1.5 rounded-lg" style={{ backgroundColor: `${m.color}15` }}>
                          <Icon className="h-3.5 w-3.5" style={{ color: m.color }} />
                        </div>
                        <span className="text-xs text-[#475569]">{m.label}</span>
                      </div>
                      <p className="text-lg font-mono font-semibold" style={{ color: m.color }}>
                        {m.value}
                      </p>
                    </div>
                  );
                })}
              </div>

              {/* Equity Curve */}
              <div className="bg-[#0A0A0A] border border-[#1A1A1A] rounded-xl p-6">
                <h3 className="text-lg font-semibold text-[#F1F5F9] mb-4">Equity Curve</h3>
                {equityData.length > 0 ? (
                  <EquityCurveChart data={equityData} height={300} />
                ) : (
                  <p className="text-sm text-[#475569] text-center py-8">No trade data</p>
                )}
              </div>

              {/* Drawdown Chart */}
              <div className="bg-[#0A0A0A] border border-[#1A1A1A] rounded-xl p-6">
                <h3 className="text-lg font-semibold text-[#F1F5F9] mb-4">Drawdown</h3>
                {drawdownData.length > 0 ? (
                  <DrawdownChart data={drawdownData} />
                ) : (
                  <p className="text-sm text-[#475569] text-center py-8">No drawdown data</p>
                )}
              </div>

              {/* Monthly Heatmap */}
              <div className="bg-[#0A0A0A] border border-[#1A1A1A] rounded-xl p-6">
                <h3 className="text-lg font-semibold text-[#F1F5F9] mb-4">Monthly P&L</h3>
                <MonthlyHeatmap data={monthlyData} />
              </div>

              {/* Trade List */}
              <div className="bg-[#0A0A0A] border border-[#1A1A1A] rounded-xl p-6">
                <h3 className="text-lg font-semibold text-[#F1F5F9] mb-4">
                  Trade List ({latestBacktest.trades?.length || 0} trades)
                </h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-[#050505] border-b border-[#1A1A1A]">
                        <th className="text-left px-3 py-2 text-xs text-[#94A3B8]">#</th>
                        <th className="text-left px-3 py-2 text-xs text-[#94A3B8]">Entry Date</th>
                        <th className="text-left px-3 py-2 text-xs text-[#94A3B8]">Exit Date</th>
                        <th className="text-left px-3 py-2 text-xs text-[#94A3B8]">Direction</th>
                        <th className="text-left px-3 py-2 text-xs text-[#94A3B8]">Symbol</th>
                        <th className="text-right px-3 py-2 text-xs text-[#94A3B8]">P&L</th>
                        <th className="text-right px-3 py-2 text-xs text-[#94A3B8]">P&L %</th>
                        <th className="text-right px-3 py-2 text-xs text-[#94A3B8]">Days</th>
                      </tr>
                    </thead>
                    <tbody>
                      {latestBacktest.trades?.slice(0, 50).map((trade: any) => (
                        <tr key={trade.id} className="border-b border-[#1A1A1A] last:border-0 hover:bg-[#000000]">
                          <td className="px-3 py-2 font-mono text-[#475569]">{trade.tradeNumber}</td>
                          <td className="px-3 py-2 text-[#F1F5F9]">
                            {format(new Date(trade.entryDate), "dd MMM yy")}
                          </td>
                          <td className="px-3 py-2 text-[#F1F5F9]">
                            {trade.exitDate ? format(new Date(trade.exitDate), "dd MMM yy") : "—"}
                          </td>
                          <td className="px-3 py-2">
                            <Badge variant={trade.direction === "LONG" ? "success" : "destructive"}>
                              {trade.direction}
                            </Badge>
                          </td>
                          <td className="px-3 py-2 text-[#94A3B8]">{trade.symbol}</td>
                          <td className={cn("px-3 py-2 text-right font-mono", trade.profitLoss >= 0 ? "text-[#10B981]" : "text-[#EF4444]")}>
                            {formatINR(trade.profitLoss)}
                          </td>
                          <td className={cn("px-3 py-2 text-right font-mono", trade.profitLossPct >= 0 ? "text-[#10B981]" : "text-[#EF4444]")}>
                            {formatPercentage(trade.profitLossPct)}
                          </td>
                          <td className="px-3 py-2 text-right font-mono text-[#94A3B8]">
                            {trade.holdingPeriod}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {latestBacktest.trades?.length > 50 && (
                    <p className="text-xs text-[#475569] text-center py-3">
                      Showing 50 of {latestBacktest.trades.length} trades
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}
        </TabsContent>

        {/* AI Analysis Tab */}
        <TabsContent value="ai">
          <AiAnalysisTab
            strategyId={strategy.id}
            hasBacktest={!!latestBacktest}
            analyses={strategy.aiAnalyses || []}
            onAnalysisComplete={fetchStrategy}
          />
        </TabsContent>

        {/* Tasks Tab */}
        <TabsContent value="tasks">
          <TaskBoard
            strategyId={strategy.id}
            tasks={strategy.tasks || []}
            onRefresh={fetchStrategy}
          />
        </TabsContent>

        {/* Live Trading Tab */}
        <TabsContent value="live">
          <div className="text-center py-16 bg-[#0A0A0A] border border-[#1A1A1A] rounded-xl">
            <p className="text-sm text-[#475569]">Live trading tracker coming in Phase 4</p>
          </div>
        </TabsContent>

        {/* History Tab */}
        <TabsContent value="history">
          <div className="text-center py-16 bg-[#0A0A0A] border border-[#1A1A1A] rounded-xl">
            <p className="text-sm text-[#475569]">Version history coming soon</p>
          </div>
        </TabsContent>
      </Tabs>

      {/* CSV Import Wizard */}
      <CsvImportWizard
        open={showImport}
        onClose={() => setShowImport(false)}
        strategyId={strategy.id}
        onImported={fetchStrategy}
      />
    </div>
  );
}
