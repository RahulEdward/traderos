"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import {
  AlertTriangle,
  XCircle,
  CheckCircle2,
  TrendingUp,
  ArrowLeft,
  Download,
} from "lucide-react";
import type {
  BacktestInterpretation,
  Verdict,
  MetricStatus,
  ReportSection,
} from "@/lib/backtest/interpretations";
import type { AFMLStatistics } from "@/lib/backtest/types";

// ─── Types ────────────────────────────────────────────────────────────────

interface BacktestReportData {
  strategyName: string;
  strategyId: string;
  method: string;
  numPaths?: number;
  stats: AFMLStatistics;
  interpretation: BacktestInterpretation;
  generatedAt: string;
}

// ─── Verdict helpers ──────────────────────────────────────────────────────

const VERDICT_CONFIG: Record<
  Verdict,
  { label: string; color: string; bg: string; border: string; icon: any }
> = {
  STRONG: {
    label: "STRONG ✅",
    color: "#10B981",
    bg: "#10B98115",
    border: "#10B98140",
    icon: CheckCircle2,
  },
  GOOD: {
    label: "GOOD 👍",
    color: "#3B82F6",
    bg: "#3B82F615",
    border: "#3B82F640",
    icon: TrendingUp,
  },
  WEAK: {
    label: "WEAK ⚠️",
    color: "#F59E0B",
    bg: "#F59E0B15",
    border: "#F59E0B40",
    icon: AlertTriangle,
  },
  FAILED: {
    label: "FAILED ❌",
    color: "#EF4444",
    bg: "#EF444415",
    border: "#EF444440",
    icon: XCircle,
  },
};

const STATUS_COLORS: Record<MetricStatus, string> = {
  green: "#10B981",
  yellow: "#F59E0B",
  red: "#EF4444",
};

const STATUS_LABELS: Record<MetricStatus, string> = {
  green: "✓ PASS",
  yellow: "~ BORDERLINE",
  red: "✗ FAIL",
};

// ─── Main Report Page ─────────────────────────────────────────────────────

export default function BacktestReportPage() {
  const params = useParams();
  const id = typeof params.id === "string" ? params.id : Array.isArray(params.id) ? params.id[0] : "";
  const [data, setData] = useState<BacktestReportData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) {
      setLoading(false);
      return;
    }
    const key = `tradeos_backtest_report_${id}`;
    const raw = localStorage.getItem(key);
    if (raw) {
      try {
        setData(JSON.parse(raw));
      } catch (e) {
        console.error("Failed to parse report data:", e);
      }
    }
    setLoading(false);
  }, [id]);

  if (loading) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: "#0A0E1A",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div
          style={{
            width: 32,
            height: 32,
            border: "2px solid #3B82F6",
            borderTopColor: "transparent",
            borderRadius: "50%",
            animation: "spin 0.8s linear infinite",
          }}
        />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (!data) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: "#0A0E1A",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 16,
          color: "#F1F5F9",
          fontFamily: "Inter, system-ui, sans-serif",
        }}
      >
        <AlertTriangle size={48} color="#F59E0B" />
        <p style={{ fontSize: 18, fontWeight: 600 }}>Report data not found.</p>
        <p style={{ fontSize: 14, color: "#64748B" }}>
          Please generate the report from the backtest runner first.
        </p>
        <button
          onClick={() => window.close()}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            color: "#3B82F6",
            background: "none",
            border: "none",
            cursor: "pointer",
            fontSize: 14,
          }}
        >
          <ArrowLeft size={16} />
          Close tab
        </button>
      </div>
    );
  }

  const {
    interpretation: interp,
    stats: rawStats,
    strategyName,
    method,
    generatedAt,
  } = data;

  // Safe number coercion — handles null values from JSON serialization of Infinity/NaN
  const safeNum = (v: any, fallback = 0): number => {
    if (v === null || v === undefined || !isFinite(v)) return fallback;
    return Number(v);
  };

  // Create a safe stats proxy
  const stats = new Proxy(rawStats, {
    get(target: any, prop: string) {
      const val = target[prop];
      if (typeof val === "number" || val === null || val === undefined) {
        return safeNum(val);
      }
      return val;
    },
  }) as typeof rawStats;

  const verdict = VERDICT_CONFIG[interp.overallVerdict];

  const methodLabel =
    method === "WALK_FORWARD"
      ? "Walk-Forward"
      : method === "CROSS_VALIDATION"
        ? "Purged K-Fold CV"
        : method === "CPCV"
          ? "CPCV (Combinatorial Purged CV)"
          : "Synthetic Data";

  const generatedDate = new Date(generatedAt).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const inrFmt = (n: number) =>
    new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(n);

  return (
    <>
      {/* Print + base styles */}
      <style>{`
        * { box-sizing: border-box; }
        body {
          margin: 0;
          padding: 0;
          background: #0A0E1A;
          font-family: Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
          color: #F1F5F9;
        }
        .no-print { }
        @media print {
          .no-print { display: none !important; }
          body { background: #0A0E1A !important; }
          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          @page {
            margin: 12mm 10mm;
            size: A4;
          }
          .avoid-break { page-break-inside: avoid; }
          .page-break { page-break-before: always; }
        }
      `}</style>

      {/* Sticky top action bar */}
      <div
        className="no-print"
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          zIndex: 100,
          background: "#080C18",
          borderBottom: "1px solid #1E2A45",
          padding: "10px 20px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <button
          onClick={() => window.close()}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            color: "#94A3B8",
            background: "none",
            border: "none",
            cursor: "pointer",
            fontSize: 13,
          }}
        >
          <ArrowLeft size={14} />
          Close
        </button>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ fontSize: 11, color: "#64748B" }}>
            Ctrl+P → Save as PDF
          </span>
          <button
            onClick={() => window.print()}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              background: "linear-gradient(135deg, #06B6D4, #3B82F6)",
              color: "#fff",
              border: "none",
              borderRadius: 8,
              padding: "8px 16px",
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            <Download size={14} />
            Download PDF
          </button>
        </div>
      </div>

      {/* Report container */}
      <div
        style={{
          maxWidth: 860,
          margin: "0 auto",
          padding: "76px 16px 60px",
        }}
      >
        {/* ── HEADER ──────────────────────────────────────────────── */}
        <div
          className="avoid-break"
          style={{
            background: "linear-gradient(135deg, #0F172A 0%, #0F1629 100%)",
            border: "1px solid #1E2A45",
            borderRadius: 12,
            padding: "22px 26px",
            marginBottom: 16,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
          }}
        >
          <div>
            {/* Logo */}
            <div
              style={{
                display: "flex",
                alignItems: "baseline",
                gap: 2,
                marginBottom: 6,
              }}
            >
              <span
                style={{ fontSize: 22, fontWeight: 800, color: "#3B82F6" }}
              >
                TradeOS
              </span>
              <span
                style={{ fontSize: 14, fontWeight: 600, color: "#06B6D4" }}
              >
                India
              </span>
            </div>
            <div
              style={{
                fontSize: 10,
                color: "#64748B",
                textTransform: "uppercase",
                letterSpacing: 2,
                marginBottom: 14,
              }}
            >
              Backtest Analysis Report
            </div>
            <div
              style={{
                fontSize: 20,
                fontWeight: 700,
                color: "#F1F5F9",
                marginBottom: 4,
              }}
            >
              {strategyName}
            </div>
            <div style={{ fontSize: 13, color: "#94A3B8" }}>
              Method:{" "}
              <span style={{ color: "#3B82F6", fontWeight: 600 }}>
                {methodLabel}
              </span>
              {data.numPaths ? (
                <span style={{ color: "#64748B" }}>
                  {" "}
                  · {data.numPaths.toLocaleString()} paths analyzed
                </span>
              ) : null}
            </div>
            <div style={{ fontSize: 11, color: "#64748B", marginTop: 4 }}>
              Generated: {generatedDate} · {stats.totalTrades} trades ·{" "}
              {(stats.totalDays / 365.25).toFixed(1)} years of historical data
            </div>
          </div>

          {/* Verdict box */}
          <div
            style={{
              textAlign: "center",
              background: verdict.bg,
              border: `1px solid ${verdict.border}`,
              borderRadius: 12,
              padding: "14px 22px",
              minWidth: 152,
              flexShrink: 0,
            }}
          >
            <div
              style={{
                fontSize: 10,
                color: "#94A3B8",
                textTransform: "uppercase",
                letterSpacing: 1.5,
                marginBottom: 6,
              }}
            >
              Overall Verdict
            </div>
            <div
              style={{
                fontSize: 20,
                fontWeight: 800,
                color: verdict.color,
                marginBottom: 2,
              }}
            >
              {interp.overallVerdict}
            </div>
            <div
              style={{ fontSize: 30, fontWeight: 800, color: verdict.color }}
            >
              {interp.overallScore}
              <span
                style={{
                  fontSize: 14,
                  fontWeight: 500,
                  color: "#64748B",
                }}
              >
                /100
              </span>
            </div>
          </div>
        </div>

        {/* ── EXECUTIVE SUMMARY ──────────────────────────────────── */}
        <div
          className="avoid-break"
          style={{
            background: verdict.bg,
            border: `1px solid ${verdict.border}`,
            borderRadius: 12,
            padding: "16px 20px",
            marginBottom: 16,
          }}
        >
          <div
            style={{
              fontSize: 10,
              fontWeight: 700,
              color: verdict.color,
              textTransform: "uppercase",
              letterSpacing: 1.5,
              marginBottom: 8,
            }}
          >
            📋 Executive Summary
          </div>
          <p
            style={{
              fontSize: 13,
              color: "#CBD5E1",
              lineHeight: 1.7,
              margin: "0 0 10px",
            }}
          >
            {interp.overallSummary}
          </p>
          <div
            style={{
              background: "#0A0E1A",
              borderRadius: 8,
              padding: "10px 14px",
              fontSize: 13,
              color: verdict.color,
              fontWeight: 600,
              lineHeight: 1.6,
            }}
          >
            {interp.deploymentRecommendation}
          </div>
        </div>

        {/* ── KEY METRICS GRID ──────────────────────────────────── */}
        <div className="avoid-break" style={{ marginBottom: 16 }}>
          <SectionLabel text="Key Metrics at a Glance" />
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(4, 1fr)",
              gap: 8,
            }}
          >
            <KCard
              label="Annualized Sharpe"
              value={stats.annualizedSharpe?.toFixed(2)}
              status={
                stats.annualizedSharpe >= 1.5
                  ? "green"
                  : stats.annualizedSharpe >= 0.5
                    ? "yellow"
                    : "red"
              }
            />
            <KCard
              label="PSR"
              value={`${(stats.psr * 100).toFixed(1)}%`}
              status={
                stats.psr >= 0.95
                  ? "green"
                  : stats.psr >= 0.5
                    ? "yellow"
                    : "red"
              }
            />
            <KCard
              label="Win Rate"
              value={`${(stats.hitRatio * 100).toFixed(1)}%`}
              status={
                stats.hitRatio >= 0.55
                  ? "green"
                  : stats.hitRatio >= 0.45
                    ? "yellow"
                    : "red"
              }
            />
            <KCard
              label="Profit Factor"
              value={stats.profitFactor?.toFixed(2)}
              status={
                stats.profitFactor >= 1.5
                  ? "green"
                  : stats.profitFactor >= 1.0
                    ? "yellow"
                    : "red"
              }
            />
            <KCard
              label="Net P&L"
              value={inrFmt(stats.pnl)}
              status={stats.pnl > 0 ? "green" : "red"}
            />
            <KCard
              label="Max Drawdown"
              value={`${stats.maxDrawdownPct?.toFixed(1)}%`}
              status={
                stats.maxDrawdownPct <= 15
                  ? "green"
                  : stats.maxDrawdownPct <= 30
                    ? "yellow"
                    : "red"
              }
            />
            <KCard
              label="Strategy Risk"
              value={`${(stats.strategyRisk * 100).toFixed(1)}%`}
              status={
                stats.strategyRisk <= 0.2
                  ? "green"
                  : stats.strategyRisk <= 0.4
                    ? "yellow"
                    : "red"
              }
            />
            <KCard
              label="Calmar Ratio"
              value={stats.calmarRatio?.toFixed(2)}
              status={
                stats.calmarRatio >= 1.0
                  ? "green"
                  : stats.calmarRatio >= 0.3
                    ? "yellow"
                    : "red"
              }
            />
          </div>
        </div>

        {/* ── ANALYSIS SECTIONS ──────────────────────────────────── */}
        {interp.sections.map((section, i) => (
          <SectionCard key={i} section={section} />
        ))}

        {/* ── STRENGTHS & WEAKNESSES ──────────────────────────── */}
        {(interp.strengths.length > 0 || interp.weaknesses.length > 0) && (
          <div
            className="avoid-break"
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 12,
              marginBottom: 16,
            }}
          >
            {interp.strengths.length > 0 && (
              <ListBox
                title="💪 Strengths"
                color="#10B981"
                items={interp.strengths}
                bullet="✓"
              />
            )}
            {interp.weaknesses.length > 0 && (
              <ListBox
                title="⚠️ Weaknesses"
                color="#EF4444"
                items={interp.weaknesses}
                bullet="✗"
              />
            )}
          </div>
        )}

        {/* ── NEXT STEPS ──────────────────────────────────────── */}
        {interp.nextSteps.length > 0 && (
          <div
            className="avoid-break"
            style={{
              background: "#3B82F612",
              border: "1px solid #3B82F630",
              borderRadius: 12,
              padding: "14px 16px",
              marginBottom: 16,
            }}
          >
            <div
              style={{
                fontSize: 10,
                fontWeight: 700,
                color: "#3B82F6",
                textTransform: "uppercase",
                letterSpacing: 1.5,
                marginBottom: 10,
              }}
            >
              🚀 Recommended Next Steps
            </div>
            {interp.nextSteps.map((step, i) => (
              <div
                key={i}
                style={{
                  display: "flex",
                  gap: 10,
                  marginBottom: 8,
                  alignItems: "flex-start",
                }}
              >
                <div
                  style={{
                    flexShrink: 0,
                    width: 20,
                    height: 20,
                    background: "#3B82F620",
                    border: "1px solid #3B82F640",
                    borderRadius: "50%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 10,
                    fontWeight: 700,
                    color: "#3B82F6",
                  }}
                >
                  {i + 1}
                </div>
                <span
                  style={{ fontSize: 12, color: "#CBD5E1", lineHeight: 1.6 }}
                >
                  {step}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* ── DISCLAIMER ──────────────────────────────────────── */}
        <div
          className="avoid-break"
          style={{
            background: "#0F172A",
            border: "1px solid #1E2A45",
            borderRadius: 12,
            padding: "12px 16px",
            marginBottom: 16,
          }}
        >
          <div
            style={{
              fontSize: 9,
              fontWeight: 700,
              color: "#64748B",
              textTransform: "uppercase",
              letterSpacing: 1.5,
              marginBottom: 6,
            }}
          >
            ⚠️ Important Disclaimer
          </div>
          <p
            style={{
              fontSize: 10,
              color: "#475569",
              lineHeight: 1.7,
              margin: 0,
            }}
          >
            This report is generated by TradeOS India for educational and
            analytical purposes only and does not constitute financial advice,
            investment advice, or a recommendation to buy, sell, or hold any
            security or financial instrument. Past performance is not indicative
            of future results. Backtesting results are based on historical data
            and may not accurately reflect future market conditions. All trading
            involves significant risk of loss. The statistical methods used
            (AFML by Marcos Lopez de Prado) are advanced quantitative tools and
            should be interpreted by qualified professionals. Always consult a
            SEBI-registered investment advisor before making investment
            decisions. TradeOS India, its founders, and employees accept no
            liability for trading losses incurred based on information in this
            report.
          </p>
          <p
            style={{
              fontSize: 9,
              color: "#334155",
              lineHeight: 1.5,
              margin: "6px 0 0",
            }}
          >
            Report by TradeOS India · tradeos.in · Powered by AFML (Advances in
            Financial Machine Learning) by Marcos Lopez de Prado · Risk-free
            rate: 6.5% (India 10Y G-Sec) · Generated:{" "}
            {new Date(generatedAt).toLocaleString("en-IN")}
          </p>
        </div>

        {/* ── FOOTER ──────────────────────────────────────────── */}
        <div style={{ textAlign: "center", paddingBottom: 8 }}>
          <span style={{ fontSize: 13, fontWeight: 800, color: "#3B82F6" }}>
            TradeOS
          </span>
          <span style={{ fontSize: 11, fontWeight: 600, color: "#06B6D4" }}>
            India
          </span>
          <span style={{ fontSize: 11, color: "#334155", marginLeft: 8 }}>
            · Systematic Strategies, Validated by Science
          </span>
        </div>
      </div>
    </>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────

function SectionLabel({ text }: { text: string }) {
  return (
    <div
      style={{
        fontSize: 10,
        fontWeight: 700,
        color: "#64748B",
        textTransform: "uppercase",
        letterSpacing: 1.5,
        marginBottom: 8,
        borderBottom: "1px solid #1E2A45",
        paddingBottom: 5,
      }}
    >
      {text}
    </div>
  );
}

function KCard({
  label,
  value,
  status,
}: {
  label: string;
  value: string | number;
  status: MetricStatus;
}) {
  const color = STATUS_COLORS[status];
  return (
    <div
      style={{
        background: `${color}12`,
        border: `1px solid ${color}30`,
        borderRadius: 8,
        padding: "8px 10px",
        textAlign: "center",
      }}
    >
      <div
        style={{
          fontSize: 8,
          color: "#64748B",
          textTransform: "uppercase",
          letterSpacing: 0.8,
          marginBottom: 3,
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontSize: 16,
          fontWeight: 700,
          color,
          fontVariantNumeric: "tabular-nums",
        }}
      >
        {value}
      </div>
      <div
        style={{
          fontSize: 8,
          color,
          fontWeight: 700,
          marginTop: 2,
          textTransform: "uppercase",
        }}
      >
        {STATUS_LABELS[status]}
      </div>
    </div>
  );
}

function SectionCard({ section }: { section: ReportSection }) {
  const verdict = VERDICT_CONFIG[section.verdict];
  return (
    <div
      className="avoid-break"
      style={{
        background: "#0F1629",
        border: "1px solid #1E2A45",
        borderRadius: 12,
        padding: "14px 16px",
        marginBottom: 12,
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 8,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 15 }}>{section.icon}</span>
          <span style={{ fontSize: 14, fontWeight: 700, color: "#F1F5F9" }}>
            {section.title}
          </span>
        </div>
        <div
          style={{
            background: verdict.bg,
            border: `1px solid ${verdict.border}`,
            borderRadius: 6,
            padding: "2px 10px",
            fontSize: 10,
            fontWeight: 700,
            color: verdict.color,
          }}
        >
          {section.verdict}
        </div>
      </div>

      {/* Narrative */}
      <p
        style={{
          fontSize: 12,
          color: "#94A3B8",
          lineHeight: 1.65,
          margin: "0 0 12px",
          paddingBottom: 10,
          borderBottom: "1px solid #1E2A45",
        }}
      >
        {section.narrative}
      </p>

      {/* Metrics rows */}
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {section.metrics.map((m, i) => {
          const color = STATUS_COLORS[m.status];
          return (
            <div
              key={i}
              style={{
                display: "grid",
                gridTemplateColumns: "190px 88px 1fr",
                gap: 10,
                alignItems: "start",
              }}
            >
              <div>
                <div style={{ fontSize: 10, color: "#64748B", marginBottom: 2 }}>
                  {m.metric}
                </div>
                <div
                  style={{
                    fontSize: 15,
                    fontWeight: 700,
                    color,
                    fontVariantNumeric: "tabular-nums",
                  }}
                >
                  {m.value}
                </div>
              </div>
              <div
                style={{
                  background: `${color}15`,
                  border: `1px solid ${color}30`,
                  borderRadius: 6,
                  padding: "3px 6px",
                  fontSize: 9,
                  fontWeight: 700,
                  color,
                  textAlign: "center",
                  marginTop: 14,
                }}
              >
                {STATUS_LABELS[m.status]}
              </div>
              <div
                style={{
                  fontSize: 11,
                  color: "#CBD5E1",
                  lineHeight: 1.6,
                  borderLeft: `2px solid ${color}30`,
                  paddingLeft: 9,
                }}
              >
                {m.plain}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ListBox({
  title,
  color,
  items,
  bullet,
}: {
  title: string;
  color: string;
  items: string[];
  bullet: string;
}) {
  return (
    <div
      style={{
        background: `${color}10`,
        border: `1px solid ${color}25`,
        borderRadius: 12,
        padding: "14px 16px",
      }}
    >
      <div
        style={{
          fontSize: 10,
          fontWeight: 700,
          color,
          textTransform: "uppercase",
          letterSpacing: 1.5,
          marginBottom: 10,
        }}
      >
        {title}
      </div>
      {items.map((item, i) => (
        <div
          key={i}
          style={{
            display: "flex",
            gap: 8,
            marginBottom: 7,
            alignItems: "flex-start",
          }}
        >
          <span
            style={{
              color,
              fontWeight: 700,
              fontSize: 11,
              flexShrink: 0,
              marginTop: 1,
            }}
          >
            {bullet}
          </span>
          <span style={{ fontSize: 12, color: "#CBD5E1", lineHeight: 1.55 }}>
            {item}
          </span>
        </div>
      ))}
    </div>
  );
}
