"use client";

import { useState } from "react";
import {
  Play,
  BarChart3,
  Shuffle,
  GitBranch,
  Waves,
  Loader2,
  AlertTriangle,
  CheckCircle2,
  TrendingUp,
  TrendingDown,
  Target,
  Shield,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";

interface BacktestRunnerProps {
  strategyId: string;
  strategyName: string;
  hasTrades: boolean;
}

const METHODS = [
  {
    id: "WALK_FORWARD" as const,
    label: "Walk-Forward",
    icon: BarChart3,
    description: "Traditional historical simulation. Train on past, test forward.",
    pros: "Proper time ordering, clear interpretation",
    cons: "Single path, overfit risk",
    color: "#3B82F6",
  },
  {
    id: "CROSS_VALIDATION" as const,
    label: "Purged K-Fold CV",
    icon: Shuffle,
    description: "Split into K folds with purging & embargo to prevent leakage.",
    pros: "Multiple scenarios, equal training sizes",
    cons: "Not historically ordered",
    color: "#10B981",
  },
  {
    id: "CPCV" as const,
    label: "CPCV",
    icon: GitBranch,
    description: "Combinatorial Purged CV — multiple paths. Gives Sharpe DISTRIBUTION, not single number.",
    pros: "Most robust, nearly impossible to overfit",
    cons: "Computationally heavier",
    color: "#8B5CF6",
    recommended: true,
  },
  {
    id: "SYNTHETIC" as const,
    label: "Synthetic Data",
    icon: Waves,
    description: "Generate 10,000+ synthetic price paths from O-U process. Find optimal trading rules.",
    pros: "No historical overfitting possible",
    cons: "Assumes stationary process",
    color: "#F59E0B",
  },
];

export function BacktestRunner({ strategyId, strategyName, hasTrades }: BacktestRunnerProps) {
  const [selectedMethod, setSelectedMethod] = useState<string>("CPCV");
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const runBacktest = async () => {
    setRunning(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch("/api/backtest/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          strategyId,
          method: selectedMethod,
          config: {
            kFolds: 5,
            nGroups: 10,
            kTestGroups: 2,
            nPaths: 10000,
          },
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to run backtest");
        return;
      }

      setResult(data.result);
    } catch (err) {
      setError("Network error. Please try again.");
    } finally {
      setRunning(false);
    }
  };

  const stats = result?.statistics;

  return (
    <div className="space-y-6">
      {/* Method Selector */}
      <div>
        <h3 className="text-sm font-medium text-[#94A3B8] mb-3">
          Select Backtesting Method (AFML Ch.12)
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {METHODS.map((method) => {
            const Icon = method.icon;
            const isSelected = selectedMethod === method.id;
            return (
              <button
                key={method.id}
                onClick={() => setSelectedMethod(method.id)}
                className={`relative text-left p-4 rounded-xl border transition-all ${
                  isSelected
                    ? "border-[#3B82F6] bg-[#3B82F6]/5"
                    : "border-[#1E2A45] bg-[#0F1629] hover:border-[#3B82F6]/30"
                }`}
              >
                {method.recommended && (
                  <Badge className="absolute top-2 right-2 bg-[#8B5CF6]/20 text-[#8B5CF6] text-[10px] border-[#8B5CF6]/30">
                    Recommended
                  </Badge>
                )}
                <div className="flex items-center gap-3 mb-2">
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center"
                    style={{ backgroundColor: `${method.color}15` }}
                  >
                    <Icon className="h-4 w-4" style={{ color: method.color }} />
                  </div>
                  <span className="font-semibold text-[#F1F5F9]">{method.label}</span>
                </div>
                <p className="text-xs text-[#94A3B8] mb-2">{method.description}</p>
                <div className="flex gap-4 text-[10px]">
                  <span className="text-[#10B981]">+ {method.pros}</span>
                  <span className="text-[#EF4444]">- {method.cons}</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Run Button */}
      <Button
        onClick={runBacktest}
        disabled={running || !hasTrades}
        className="w-full bg-gradient-to-r from-[#3B82F6] to-[#8B5CF6] hover:opacity-90 h-12 text-base"
      >
        {running ? (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            Running {METHODS.find((m) => m.id === selectedMethod)?.label}...
          </>
        ) : (
          <>
            <Play className="h-4 w-4 mr-2" />
            Run {METHODS.find((m) => m.id === selectedMethod)?.label} Backtest
          </>
        )}
      </Button>

      {!hasTrades && (
        <p className="text-xs text-[#F59E0B] text-center">
          Import backtest trades first (CSV) before running analysis
        </p>
      )}

      {error && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-[#EF4444]/10 border border-[#EF4444]/20 text-[#EF4444] text-sm">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      {/* Results */}
      {stats && (
        <div className="space-y-4">
          {/* Header */}
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-[#10B981]" />
            <h3 className="text-lg font-semibold text-[#F1F5F9]">
              AFML Statistics
            </h3>
            {result.sharpeDistribution && (
              <Badge className="bg-[#8B5CF6]/10 text-[#8B5CF6] border-[#8B5CF6]/30">
                {result.numPaths} paths analyzed
              </Badge>
            )}
          </div>

          {/* Key Metrics Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <StatCard
              label="Annualized Sharpe"
              value={stats.annualizedSharpe?.toFixed(2)}
              icon={TrendingUp}
              color={stats.annualizedSharpe > 1 ? "#10B981" : stats.annualizedSharpe > 0 ? "#F59E0B" : "#EF4444"}
            />
            <StatCard
              label="PSR"
              value={`${(stats.psr * 100).toFixed(1)}%`}
              icon={Shield}
              color={stats.psr > 0.95 ? "#10B981" : stats.psr > 0.5 ? "#F59E0B" : "#EF4444"}
              tooltip="Probabilistic Sharpe Ratio — must be >95% to be statistically significant"
            />
            <StatCard
              label="DSR"
              value={`${(stats.dsr * 100).toFixed(1)}%`}
              icon={Shield}
              color={stats.dsr > 0.95 ? "#10B981" : stats.dsr > 0.5 ? "#F59E0B" : "#EF4444"}
              tooltip="Deflated Sharpe Ratio — accounts for multiple testing bias"
            />
            <StatCard
              label="Strategy Risk"
              value={`${(stats.strategyRisk * 100).toFixed(1)}%`}
              icon={AlertTriangle}
              color={stats.strategyRisk < 0.3 ? "#10B981" : stats.strategyRisk < 0.5 ? "#F59E0B" : "#EF4444"}
              tooltip="P[strategy failure] — probability strategy will underperform target"
            />
          </div>

          {/* Detailed Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Performance */}
            <Card className="bg-[#0F1629] border-[#1E2A45] p-4">
              <h4 className="text-xs font-medium text-[#3B82F6] uppercase tracking-wider mb-3">
                Performance
              </h4>
              <div className="space-y-2 text-sm">
                <StatRow label="Net P&L" value={`₹${stats.pnl?.toLocaleString("en-IN")}`} />
                <StatRow label="Hit Ratio" value={`${(stats.hitRatio * 100).toFixed(1)}%`} />
                <StatRow label="Profit Factor" value={stats.profitFactor?.toFixed(2)} />
                <StatRow label="Expectancy" value={`₹${stats.expectancy?.toLocaleString("en-IN")}`} />
                <StatRow label="Total Bets" value={stats.totalBets} />
                <StatRow label="Bets/Year" value={stats.frequencyOfBets?.toFixed(0)} />
              </div>
            </Card>

            {/* Risk & Drawdowns */}
            <Card className="bg-[#0F1629] border-[#1E2A45] p-4">
              <h4 className="text-xs font-medium text-[#EF4444] uppercase tracking-wider mb-3">
                Risk & Drawdowns
              </h4>
              <div className="space-y-2 text-sm">
                <StatRow label="Max Drawdown" value={`₹${stats.maxDrawdown?.toLocaleString("en-IN")}`} />
                <StatRow label="Max DD %" value={`${stats.maxDrawdownPct?.toFixed(1)}%`} />
                <StatRow label="95th pctl DD" value={`₹${stats.drawdown95?.toLocaleString("en-IN")}`} />
                <StatRow label="95th pctl TuW" value={`${stats.timeUnderWater95} days`} />
                <StatRow label="Recovery Factor" value={stats.recoveryFactor?.toFixed(2)} />
                <StatRow label="Calmar Ratio" value={stats.calmarRatio?.toFixed(2)} />
              </div>
            </Card>

            {/* Concentration (HHI) */}
            <Card className="bg-[#0F1629] border-[#1E2A45] p-4">
              <h4 className="text-xs font-medium text-[#F59E0B] uppercase tracking-wider mb-3">
                Concentration (HHI)
              </h4>
              <div className="space-y-2 text-sm">
                <HHIRow label="Positive Returns" value={stats.hhiPositive} />
                <HHIRow label="Negative Returns" value={stats.hhiNegative} />
                <HHIRow label="Bet Timing" value={stats.hhiTime} />
                <div className="border-t border-[#1E2A45] pt-2 mt-2">
                  <StatRow label="Sortino Ratio" value={stats.sortinoRatio?.toFixed(2)} />
                  <StatRow label="Ratio of Longs" value={`${(stats.ratioOfLongs * 100).toFixed(0)}%`} />
                  <StatRow label="Avg Holding" value={`${stats.avgHoldingPeriod?.toFixed(1)} days`} />
                </div>
              </div>
            </Card>
          </div>

          {/* CPCV Sharpe Distribution */}
          {result.sharpeDistribution && result.sharpeDistribution.length > 1 && (
            <Card className="bg-[#0F1629] border-[#1E2A45] p-4">
              <h4 className="text-xs font-medium text-[#8B5CF6] uppercase tracking-wider mb-3">
                Sharpe Ratio Distribution ({result.sharpeDistribution.length} paths)
              </h4>
              <div className="flex items-end gap-1 h-24">
                {buildHistogram(result.sharpeDistribution, 20).map((bar, i) => (
                  <div
                    key={i}
                    className="flex-1 rounded-t transition-all"
                    style={{
                      height: `${bar.pct}%`,
                      backgroundColor: bar.center > 0 ? "#10B981" : "#EF4444",
                      opacity: 0.3 + bar.pct / 150,
                    }}
                    title={`SR: ${bar.center.toFixed(2)}, Count: ${bar.count}`}
                  />
                ))}
              </div>
              <div className="flex justify-between text-[10px] text-[#475569] mt-1">
                <span>{Math.min(...result.sharpeDistribution).toFixed(1)}</span>
                <span>Sharpe Ratio</span>
                <span>{Math.max(...result.sharpeDistribution).toFixed(1)}</span>
              </div>
              <p className="text-xs text-[#94A3B8] mt-2">
                Mean SR: {(result.sharpeDistribution.reduce((a: number, b: number) => a + b, 0) / result.sharpeDistribution.length).toFixed(2)}
                {" | "}
                Std: {Math.sqrt(result.sharpeDistribution.reduce((s: number, v: number) => {
                  const m = result.sharpeDistribution.reduce((a: number, b: number) => a + b, 0) / result.sharpeDistribution.length;
                  return s + (v - m) ** 2;
                }, 0) / (result.sharpeDistribution.length - 1)).toFixed(2)}
                {" | "}
                Paths with SR {">"} 0: {result.sharpeDistribution.filter((s: number) => s > 0).length}/{result.sharpeDistribution.length}
              </p>
            </Card>
          )}

          {/* Interpretation */}
          <Card className="bg-[#0F1629] border-[#1E2A45] p-4">
            <h4 className="text-xs font-medium text-[#06B6D4] uppercase tracking-wider mb-3">
              Robustness Interpretation
            </h4>
            <div className="space-y-2 text-sm text-[#94A3B8]">
              {stats.psr > 0.95 ? (
                <InterpretRow icon={CheckCircle2} color="#10B981" text="PSR > 95%: Sharpe ratio is statistically significant" />
              ) : (
                <InterpretRow icon={AlertTriangle} color="#EF4444" text={`PSR = ${(stats.psr * 100).toFixed(0)}%: Sharpe ratio NOT statistically significant (need >95%)`} />
              )}
              {stats.dsr > 0.95 ? (
                <InterpretRow icon={CheckCircle2} color="#10B981" text="DSR > 95%: Holds even after accounting for multiple testing" />
              ) : (
                <InterpretRow icon={AlertTriangle} color="#F59E0B" text={`DSR = ${(stats.dsr * 100).toFixed(0)}%: May be a false discovery — test more rigorously`} />
              )}
              {stats.strategyRisk < 0.3 ? (
                <InterpretRow icon={CheckCircle2} color="#10B981" text={`Strategy Risk = ${(stats.strategyRisk * 100).toFixed(0)}%: Low probability of failure`} />
              ) : stats.strategyRisk < 0.5 ? (
                <InterpretRow icon={AlertTriangle} color="#F59E0B" text={`Strategy Risk = ${(stats.strategyRisk * 100).toFixed(0)}%: Moderate risk — precision barely above threshold`} />
              ) : (
                <InterpretRow icon={TrendingDown} color="#EF4444" text={`Strategy Risk = ${(stats.strategyRisk * 100).toFixed(0)}%: HIGH risk of failure — do not deploy`} />
              )}
              {stats.hhiPositive > 0.15 && (
                <InterpretRow icon={AlertTriangle} color="#F59E0B" text="Returns concentrated in few trades — may not be repeatable" />
              )}
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}

// ─── Sub-components ────────────────────────────────────────────────

function StatCard({
  label, value, icon: Icon, color, tooltip,
}: {
  label: string; value: string | number; icon: any; color: string; tooltip?: string;
}) {
  return (
    <div className="bg-[#0F1629] border border-[#1E2A45] rounded-xl p-3" title={tooltip}>
      <div className="flex items-center gap-2 mb-1">
        <Icon className="h-3.5 w-3.5" style={{ color }} />
        <span className="text-[10px] text-[#64748B] uppercase tracking-wider">{label}</span>
      </div>
      <span className="text-lg font-bold font-mono" style={{ color }}>
        {value}
      </span>
    </div>
  );
}

function StatRow({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex justify-between">
      <span className="text-[#64748B]">{label}</span>
      <span className="text-[#F1F5F9] font-mono text-xs">{value}</span>
    </div>
  );
}

function HHIRow({ label, value }: { label: string; value: number }) {
  const pct = Math.min(value * 100, 100);
  const color = value < 0.05 ? "#10B981" : value < 0.15 ? "#F59E0B" : "#EF4444";
  return (
    <div>
      <div className="flex justify-between text-xs mb-1">
        <span className="text-[#64748B]">{label}</span>
        <span className="font-mono" style={{ color }}>{(value * 100).toFixed(1)}%</span>
      </div>
      <div className="h-1.5 bg-[#1E2A45] rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: color }} />
      </div>
    </div>
  );
}

function InterpretRow({
  icon: Icon, color, text,
}: {
  icon: any; color: string; text: string;
}) {
  return (
    <div className="flex items-start gap-2">
      <Icon className="h-4 w-4 mt-0.5 shrink-0" style={{ color }} />
      <span>{text}</span>
    </div>
  );
}

function buildHistogram(values: number[], bins: number) {
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const binWidth = range / bins;

  const histogram = Array.from({ length: bins }, (_, i) => ({
    center: min + (i + 0.5) * binWidth,
    count: 0,
    pct: 0,
  }));

  for (const v of values) {
    const idx = Math.min(Math.floor((v - min) / binWidth), bins - 1);
    histogram[idx].count++;
  }

  const maxCount = Math.max(...histogram.map((h) => h.count));
  for (const h of histogram) {
    h.pct = maxCount > 0 ? (h.count / maxCount) * 100 : 0;
  }

  return histogram;
}
