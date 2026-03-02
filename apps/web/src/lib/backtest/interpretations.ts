/**
 * AFML Backtest Plain-English Interpretation Engine
 * Converts raw AFML statistics into human-readable insights
 * Used for the PDF report download feature in TradeOS India
 */

import type { AFMLStatistics } from "./types";

export type Verdict = "STRONG" | "GOOD" | "WEAK" | "FAILED";
export type MetricStatus = "green" | "yellow" | "red";

export interface MetricInterpretation {
  metric: string;
  value: string;
  status: MetricStatus;
  plain: string;
}

export interface ReportSection {
  title: string;
  icon: string;
  verdict: Verdict;
  narrative: string;
  metrics: MetricInterpretation[];
}

export interface BacktestInterpretation {
  overallVerdict: Verdict;
  overallScore: number; // 0–100
  overallSummary: string;
  deploymentRecommendation: string;
  sections: ReportSection[];
  strengths: string[];
  weaknesses: string[];
  nextSteps: string[];
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const inrFmt = (n: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(n);

const pctFmt = (n: number) => `${n.toFixed(1)}%`;
const numFmt = (n: number, d = 2) => n.toFixed(d);

function statusScore(s: MetricStatus): number {
  return s === "green" ? 2 : s === "yellow" ? 1 : 0;
}

function sectionVerdict(metrics: MetricInterpretation[]): Verdict {
  const avg =
    metrics.reduce((s, m) => s + statusScore(m.status), 0) /
    (metrics.length * 2);
  if (avg >= 0.75) return "STRONG";
  if (avg >= 0.5) return "GOOD";
  if (avg >= 0.25) return "WEAK";
  return "FAILED";
}

// ─── Main Interpretation Function ────────────────────────────────────────────

export function interpretBacktestResults(
  stats: AFMLStatistics,
  method: string,
  strategyName: string
): BacktestInterpretation {
  const methodLabel =
    method === "WALK_FORWARD"
      ? "Walk-Forward"
      : method === "CROSS_VALIDATION"
        ? "Purged K-Fold CV"
        : method === "CPCV"
          ? "CPCV"
          : "Synthetic";

  // ── Section 1: Statistical Validity ──────────────────────────────────────

  const psrStatus: MetricStatus =
    stats.psr >= 0.95 ? "green" : stats.psr >= 0.5 ? "yellow" : "red";
  const dsrStatus: MetricStatus =
    stats.dsr >= 0.95 ? "green" : stats.dsr >= 0.5 ? "yellow" : "red";
  const riskStatus: MetricStatus =
    stats.strategyRisk <= 0.2
      ? "green"
      : stats.strategyRisk <= 0.4
        ? "yellow"
        : "red";

  const statMetrics: MetricInterpretation[] = [
    {
      metric: "PSR (Probabilistic Sharpe Ratio)",
      value: pctFmt(stats.psr * 100),
      status: psrStatus,
      plain:
        psrStatus === "green"
          ? `Your strategy's edge is statistically real. There is a ${pctFmt(stats.psr * 100)} probability that the Sharpe ratio is genuinely positive — not just lucky noise. This passes the 95% significance threshold required by AFML.`
          : psrStatus === "yellow"
            ? `PSR is ${pctFmt(stats.psr * 100)}, below the 95% threshold. The Sharpe ratio might be real, but there is still a ${pctFmt((1 - stats.psr) * 100)} chance it is luck. Collect more trade data to strengthen confidence.`
            : `PSR is only ${pctFmt(stats.psr * 100)}, which means the Sharpe ratio is likely not meaningful. With only ${pctFmt(stats.psr * 100)} confidence, the results could easily be explained by random chance. Do not rely on these results.`,
    },
    {
      metric: "DSR (Deflated Sharpe Ratio)",
      value: pctFmt(stats.dsr * 100),
      status: dsrStatus,
      plain:
        dsrStatus === "green"
          ? `Even after correcting for the fact that multiple strategy configurations may have been tested, the results hold up. DSR = ${pctFmt(stats.dsr * 100)} confirms this is not a false discovery due to over-optimization.`
          : dsrStatus === "yellow"
            ? `DSR = ${pctFmt(stats.dsr * 100)}. After adjusting for multiple testing, the edge is somewhat weakened. If you tested many parameter combinations, the strategy may be partially over-fitted.`
            : `DSR = ${pctFmt(stats.dsr * 100)}. After correcting for multiple testing bias, the strategy fails the significance test. This may be a false discovery — the result of finding a configuration that happened to work on historical data.`,
    },
    {
      metric: "Strategy Failure Risk (Ch.15)",
      value: pctFmt(stats.strategyRisk * 100),
      status: riskStatus,
      plain:
        riskStatus === "green"
          ? `Only ${pctFmt(stats.strategyRisk * 100)} probability the strategy fails to meet its performance target in live trading. The win rate is comfortably above the minimum required for this strategy to be profitable.`
          : riskStatus === "yellow"
            ? `${pctFmt(stats.strategyRisk * 100)} probability of strategy failure. The win rate is close to the breakeven threshold. Any increase in slippage or transaction costs in live trading could tip this to unprofitable.`
            : `${pctFmt(stats.strategyRisk * 100)} probability this strategy will FAIL in live trading. The win rate is dangerously close to (or below) the minimum needed for profitability. This strategy should NOT be deployed with real capital.`,
    },
    {
      metric: "Implied Minimum Precision (p*)",
      value: pctFmt(stats.impliedPrecision * 100),
      status:
        stats.hitRatio >= stats.impliedPrecision
          ? "green"
          : stats.hitRatio >= stats.impliedPrecision * 0.9
            ? "yellow"
            : "red",
      plain:
        stats.hitRatio >= stats.impliedPrecision
          ? `The strategy needs a minimum win rate of ${pctFmt(stats.impliedPrecision * 100)} to be profitable. Your actual win rate of ${pctFmt(stats.hitRatio * 100)} exceeds this threshold — the strategy has headroom.`
          : `The strategy needs a ${pctFmt(stats.impliedPrecision * 100)} win rate to be profitable, but currently achieves only ${pctFmt(stats.hitRatio * 100)}. Improve entry accuracy to bridge this gap before live deployment.`,
    },
  ];

  const statSection: ReportSection = {
    title: "Statistical Validity",
    icon: "🔬",
    verdict: sectionVerdict(statMetrics),
    narrative:
      psrStatus === "green" && dsrStatus === "green"
        ? `This strategy's performance is statistically real — not luck. Both the Probabilistic Sharpe Ratio (PSR = ${pctFmt(stats.psr * 100)}) and Deflated Sharpe Ratio (DSR = ${pctFmt(stats.dsr * 100)}) exceed the 95% confidence threshold. There is less than 5% probability that the observed results happened by random chance. The strategy has a proven statistical edge.`
        : psrStatus === "red" || dsrStatus === "red"
          ? `Critical statistical tests FAIL. PSR = ${pctFmt(stats.psr * 100)} and DSR = ${pctFmt(stats.dsr * 100)}. The strategy does not demonstrate a statistically significant edge. Results may be the product of data mining bias, overfitting, or insufficient trade count.`
          : `Statistical significance is borderline. PSR = ${pctFmt(stats.psr * 100)} suggests some evidence of an edge, but not at the required 95% confidence level. The strategy shows promise, but more trade data is needed to confirm the edge.`,
  };

  // ── Section 2: Performance Quality ───────────────────────────────────────

  const sharpeStatus: MetricStatus =
    stats.annualizedSharpe >= 1.5
      ? "green"
      : stats.annualizedSharpe >= 0.5
        ? "yellow"
        : "red";
  const hitStatus: MetricStatus =
    stats.hitRatio >= 0.55
      ? "green"
      : stats.hitRatio >= 0.45
        ? "yellow"
        : "red";
  const pfStatus: MetricStatus =
    stats.profitFactor >= 1.5
      ? "green"
      : stats.profitFactor >= 1.0
        ? "yellow"
        : "red";
  const expectStatus: MetricStatus = stats.expectancy > 0 ? "green" : "red";
  const rrStatus: MetricStatus =
    stats.avgReturnHits > Math.abs(stats.avgReturnMisses)
      ? "green"
      : "yellow";

  const perfMetrics: MetricInterpretation[] = [
    {
      metric: "Annualized Sharpe Ratio",
      value: numFmt(stats.annualizedSharpe),
      status: sharpeStatus,
      plain:
        sharpeStatus === "green"
          ? `Excellent risk-adjusted return of ${numFmt(stats.annualizedSharpe)}. For every unit of risk taken, the strategy delivers ${numFmt(stats.annualizedSharpe)} units of return above the risk-free rate. Industry benchmark is 1.0; hedge funds target 1.5+.`
          : sharpeStatus === "yellow"
            ? `Moderate Sharpe Ratio of ${numFmt(stats.annualizedSharpe)}. The strategy earns some return above the risk-free rate, but not enough to be clearly worth the risk on its own. Improve entry quality or reduce drawdowns.`
            : `Poor Sharpe Ratio of ${numFmt(stats.annualizedSharpe)}. The strategy is not generating adequate returns relative to the risk being taken. A Sharpe below 0.5 is generally not worth pursuing.`,
    },
    {
      metric: "Win Rate (Hit Ratio)",
      value: pctFmt(stats.hitRatio * 100),
      status: hitStatus,
      plain: `${pctFmt(stats.hitRatio * 100)} of trades are profitable. ${
        hitStatus === "green"
          ? "Above-average win rate. Strategy wins more often than it loses, making it psychologically easier to follow in live trading."
          : hitStatus === "yellow"
            ? "Borderline win rate. Needs a favorable risk/reward ratio (large winners vs small losers) to remain profitable long-term."
            : "Low win rate. Strategy needs large winners to overcome frequent small losses. Psychologically difficult to execute — many traders abandon such strategies during losing streaks."
      }`,
    },
    {
      metric: "Profit Factor",
      value: numFmt(stats.profitFactor),
      status: pfStatus,
      plain:
        pfStatus === "green"
          ? `For every ₹1 lost, the strategy earns ₹${numFmt(stats.profitFactor)}. A profit factor above 1.5 indicates a robust edge that can absorb real-world transaction costs and slippage.`
          : pfStatus === "yellow"
            ? `Profit factor of ${numFmt(stats.profitFactor)} means the strategy barely earns more than it loses. After accounting for brokerage, STT, and slippage in live trading, this may break even or become slightly negative.`
            : `Profit factor below 1.0 means the strategy loses more than it earns. Every ₹1 of profit comes at a cost of more than ₹1 in losses. This strategy is not profitable.`,
    },
    {
      metric: "Trade Expectancy",
      value: inrFmt(stats.expectancy),
      status: expectStatus,
      plain:
        expectStatus === "green"
          ? `On average, each trade generates ${inrFmt(stats.expectancy)} in profit. This is your mathematical edge per trade. Multiply by annual trade frequency (${numFmt(stats.frequencyOfBets, 0)}) to estimate annual profit potential.`
          : `Negative expectancy of ${inrFmt(stats.expectancy)} per trade. Every trade you take, on average, loses money. This is the most fundamental problem — fix this before anything else.`,
    },
    {
      metric: "Avg Win / Avg Loss",
      value: `${pctFmt(stats.avgReturnHits)} / ${pctFmt(Math.abs(stats.avgReturnMisses))}`,
      status: rrStatus,
      plain:
        rrStatus === "green"
          ? `Winners average ${pctFmt(stats.avgReturnHits)} while losers average only ${pctFmt(Math.abs(stats.avgReturnMisses))}. The risk/reward ratio (${numFmt(stats.avgReturnHits / Math.max(Math.abs(stats.avgReturnMisses), 0.01))}:1) is favorable — letting winners run while cutting losses short.`
          : `Losers (${pctFmt(Math.abs(stats.avgReturnMisses))}) are comparable to or larger than winners (${pctFmt(stats.avgReturnHits)}). A high win rate is required to compensate for unfavorable risk/reward. Consider using tighter stop losses to reduce average loss size.`,
    },
  ];

  const perfSection: ReportSection = {
    title: "Performance Quality",
    icon: "📈",
    verdict: sectionVerdict(perfMetrics),
    narrative: `The ${methodLabel} analysis shows a ${pctFmt(stats.hitRatio * 100)} win rate with a ${numFmt(stats.profitFactor)}x profit factor. For every ₹1 lost, the strategy earns ₹${numFmt(stats.profitFactor)}. The annualized Sharpe ratio of ${numFmt(stats.annualizedSharpe)} ${stats.annualizedSharpe >= 1 ? "meets" : "does not meet"} the minimum institutional benchmark of 1.0. Average trade expectancy is ${inrFmt(stats.expectancy)} per trade across ${stats.totalTrades} total trades.`,
  };

  // ── Section 3: Risk & Drawdown ────────────────────────────────────────────

  const ddPctStatus: MetricStatus =
    stats.maxDrawdownPct <= 15
      ? "green"
      : stats.maxDrawdownPct <= 30
        ? "yellow"
        : "red";
  const calmarStatus: MetricStatus =
    stats.calmarRatio >= 1.0
      ? "green"
      : stats.calmarRatio >= 0.3
        ? "yellow"
        : "red";
  const sortinoStatus: MetricStatus =
    stats.sortinoRatio >= 1.5
      ? "green"
      : stats.sortinoRatio >= 0.5
        ? "yellow"
        : "red";
  const rfStatus: MetricStatus =
    stats.recoveryFactor >= 3
      ? "green"
      : stats.recoveryFactor >= 1
        ? "yellow"
        : "red";
  const tuwStatus: MetricStatus =
    stats.timeUnderWater95 <= 30
      ? "green"
      : stats.timeUnderWater95 <= 90
        ? "yellow"
        : "red";

  const riskMetrics: MetricInterpretation[] = [
    {
      metric: "Max Drawdown",
      value: `${inrFmt(stats.maxDrawdown)} (${pctFmt(stats.maxDrawdownPct)})`,
      status: ddPctStatus,
      plain: `The deepest loss from peak to trough was ${inrFmt(stats.maxDrawdown)}, representing ${pctFmt(stats.maxDrawdownPct)} of peak capital. ${
        ddPctStatus === "green"
          ? "This is within acceptable limits. Most traders can psychologically sustain a drawdown of this size."
          : ddPctStatus === "yellow"
            ? "This is a significant loss. Mentally prepare for periods this bad — they are part of the strategy's normal behavior, not failures."
            : "This is a severe drawdown. Most retail traders blow their account or abandon the strategy before recovery at this level. Reduce position sizing significantly before live trading."
      }`,
    },
    {
      metric: "Calmar Ratio",
      value: numFmt(stats.calmarRatio),
      status: calmarStatus,
      plain:
        calmarStatus === "green"
          ? `Calmar ratio of ${numFmt(stats.calmarRatio)} means annual return is ${numFmt(stats.calmarRatio)}x the maximum drawdown — an excellent risk/return tradeoff. Professional funds typically require Calmar > 0.5.`
          : calmarStatus === "yellow"
            ? `Calmar ratio of ${numFmt(stats.calmarRatio)} means returns barely justify the drawdown risk. Annual return is only ${numFmt(stats.calmarRatio)}x the worst loss experienced.`
            : `Low Calmar ratio of ${numFmt(stats.calmarRatio)}. The drawdowns are too large relative to annual returns. The strategy recovers too slowly from losses.`,
    },
    {
      metric: "Sortino Ratio",
      value: numFmt(stats.sortinoRatio),
      status: sortinoStatus,
      plain: `Like the Sharpe ratio but only penalizes downside volatility. Sortino of ${numFmt(stats.sortinoRatio)} ${
        sortinoStatus === "green"
          ? "indicates excellent downside risk management — upside moves are large and downside moves are well-controlled."
          : sortinoStatus === "yellow"
            ? "shows moderate downside risk control. The strategy has noticeable downside moves relative to returns."
            : "reveals poor downside risk control. Losses are large relative to gains — the strategy needs better stop loss management."
      }`,
    },
    {
      metric: "Recovery Factor",
      value: numFmt(stats.recoveryFactor),
      status: rfStatus,
      plain:
        rfStatus === "green"
          ? `Total profit (${inrFmt(stats.pnl)}) is ${numFmt(stats.recoveryFactor)}x the maximum drawdown (${inrFmt(stats.maxDrawdown)}). The strategy earns back its worst historical loss quickly and generates significant excess profit.`
          : rfStatus === "yellow"
            ? `Recovery factor of ${numFmt(stats.recoveryFactor)} means total profit barely covers the maximum drawdown. After a worst-case drawdown, it would take a long time to return to high-water mark.`
            : `Recovery factor below 1 means total profit (${inrFmt(stats.pnl)}) did not cover the maximum drawdown (${inrFmt(stats.maxDrawdown)}). The strategy has not recovered from its worst loss. Not viable.`,
    },
    {
      metric: "95th Pctl Drawdown",
      value: inrFmt(stats.drawdown95),
      status:
        stats.drawdown95 <= stats.maxDrawdown * 0.7 ? "green" : "yellow",
      plain: `In the worst 5% of scenarios, expect a drawdown up to ${inrFmt(stats.drawdown95)}. This is the "stress test" drawdown level — plan your position sizing so you can survive this loss without being forced to stop trading.`,
    },
    {
      metric: "Time Under Water (95th pctl)",
      value: `${stats.timeUnderWater95} days`,
      status: tuwStatus,
      plain:
        tuwStatus === "green"
          ? `In most bad scenarios, drawdown periods last less than ${stats.timeUnderWater95} days. Short recovery periods make the strategy psychologically manageable in live trading.`
          : tuwStatus === "yellow"
            ? `Expect to be in a drawdown for up to ${stats.timeUnderWater95} days in bad scenarios. Mentally prepare for multi-month underwater periods — this is normal for this strategy, not a sign it is broken.`
            : `Drawdowns can persist for ${stats.timeUnderWater95} days or more. Being underwater for this long tests even the most disciplined traders. Few will continue executing the strategy consistently through such periods.`,
    },
  ];

  const riskSection: ReportSection = {
    title: "Risk & Drawdown",
    icon: "🛡️",
    verdict: sectionVerdict(riskMetrics),
    narrative: `Maximum historical drawdown was ${inrFmt(stats.maxDrawdown)} (${pctFmt(stats.maxDrawdownPct)}). In worst-case scenarios (top 5%), expect drawdowns up to ${inrFmt(stats.drawdown95)} lasting ${stats.timeUnderWater95} days. The Calmar ratio of ${numFmt(stats.calmarRatio)} and recovery factor of ${numFmt(stats.recoveryFactor)} indicate ${stats.calmarRatio >= 1 ? "strong" : stats.calmarRatio >= 0.5 ? "moderate" : "poor"} risk-adjusted efficiency. Total net P&L of ${inrFmt(stats.pnl)} ${stats.recoveryFactor >= 1 ? "exceeds" : "does not cover"} the maximum drawdown.`,
  };

  // ── Section 4: Return Concentration (HHI) ────────────────────────────────

  const hhiPosStatus: MetricStatus =
    stats.hhiPositive <= 0.05
      ? "green"
      : stats.hhiPositive <= 0.15
        ? "yellow"
        : "red";
  const hhiNegStatus: MetricStatus =
    stats.hhiNegative <= 0.05
      ? "green"
      : stats.hhiNegative <= 0.15
        ? "yellow"
        : "red";
  const hhiTimeStatus: MetricStatus =
    stats.hhiTime <= 0.05
      ? "green"
      : stats.hhiTime <= 0.15
        ? "yellow"
        : "red";

  const hhiMetrics: MetricInterpretation[] = [
    {
      metric: "Profit Concentration (HHI+)",
      value: pctFmt(stats.hhiPositive * 100),
      status: hhiPosStatus,
      plain:
        hhiPosStatus === "green"
          ? `Profits are evenly distributed across all ${stats.totalTrades} trades (HHI = ${pctFmt(stats.hhiPositive * 100)}). No single trade dominates results. The edge is consistent and repeatable — not dependent on a handful of lucky trades.`
          : hhiPosStatus === "yellow"
            ? `Moderate profit concentration (HHI = ${pctFmt(stats.hhiPositive * 100)}). A few trades generate a disproportionate share of profits. The strategy may work, but consistency is not fully proven. Investigate the top 3-5 winning trades.`
            : `High profit concentration (HHI = ${pctFmt(stats.hhiPositive * 100)}). Remove the top 2-3 winning trades and the strategy may become unprofitable. This is a serious red flag — the edge may not be repeatable in live trading.`,
    },
    {
      metric: "Loss Concentration (HHI-)",
      value: pctFmt(stats.hhiNegative * 100),
      status: hhiNegStatus,
      plain:
        hhiNegStatus === "green"
          ? `Losses are evenly spread (HHI = ${pctFmt(stats.hhiNegative * 100)}). No single trade causes disproportionate damage. Risk is well-diversified, which is ideal for live trading resilience.`
          : hhiNegStatus === "yellow"
            ? `Some loss concentration (HHI = ${pctFmt(stats.hhiNegative * 100)}). A few large losers affect performance significantly. Consider adding hard stop losses to cap maximum loss per trade.`
            : `High loss concentration (HHI = ${pctFmt(stats.hhiNegative * 100)}). A small number of trades cause most of the damage. Investigate the worst-performing trades — they may share a common pattern (time of day, day of week, news events) that can be filtered out.`,
    },
    {
      metric: "Time Concentration (HHI-t)",
      value: pctFmt(stats.hhiTime * 100),
      status: hhiTimeStatus,
      plain:
        hhiTimeStatus === "green"
          ? `Trading activity is consistent over time (HHI = ${pctFmt(stats.hhiTime * 100)}). Strategy generates signals steadily throughout the test period — not clustered in specific months or market regimes.`
          : hhiTimeStatus === "yellow"
            ? `Trading activity shows some time clustering (HHI = ${pctFmt(stats.hhiTime * 100)}). Strategy may be more active in certain market conditions. Verify performance is consistent across bull, bear, and sideways markets.`
            : `High time concentration (HHI = ${pctFmt(stats.hhiTime * 100)}). Strategy activity is heavily clustered in specific time periods. The strategy may only work in certain market regimes (e.g., trending markets). Test across different market conditions explicitly.`,
    },
  ];

  const hhiSection: ReportSection = {
    title: "Return Concentration (HHI)",
    icon: "📊",
    verdict: sectionVerdict(hhiMetrics),
    narrative:
      stats.hhiPositive < 0.1 && stats.hhiNegative < 0.1
        ? `Returns are well distributed across all trades. The Herfindahl-Hirschman Index (HHI) measures how concentrated profits and losses are. Low HHI on both sides confirms the strategy has a consistent, repeatable edge — not dependent on outlier trades.`
        : `Return concentration needs attention. ${stats.hhiPositive > 0.15 ? `Profits are concentrated (HHI+ = ${pctFmt(stats.hhiPositive * 100)}) — remove top trades and performance collapses. ` : ""}${stats.hhiNegative > 0.15 ? `Losses are also concentrated (HHI- = ${pctFmt(stats.hhiNegative * 100)}) — a few big losers dominate the loss side. ` : ""}${stats.hhiTime > 0.15 ? `Trading is time-clustered (HHI-t = ${pctFmt(stats.hhiTime * 100)}) — strategy may only work in certain market regimes.` : ""}`,
  };

  // ── Section 5: Activity & Efficiency ─────────────────────────────────────

  const freqStatus: MetricStatus =
    stats.frequencyOfBets >= 20
      ? "green"
      : stats.frequencyOfBets >= 8
        ? "yellow"
        : "red";

  const activityMetrics: MetricInterpretation[] = [
    {
      metric: "Annual Trade Frequency",
      value: `${numFmt(stats.frequencyOfBets, 0)} trades/year`,
      status: freqStatus,
      plain:
        freqStatus === "green"
          ? `${numFmt(stats.frequencyOfBets, 0)} trades per year provides strong statistical evidence for the strategy's edge. More trades means more data points and higher confidence in results.`
          : freqStatus === "yellow"
            ? `Only ${numFmt(stats.frequencyOfBets, 0)} trades per year. Marginal frequency for statistical validation. Results may not be fully reliable. Consider running the strategy on more symbols or timeframes to increase sample size.`
            : `Only ${numFmt(stats.frequencyOfBets, 0)} trades per year. Extremely low frequency makes statistical validation nearly impossible — a few lucky or unlucky trades can drastically change all metrics. Expand the universe of instruments.`,
    },
    {
      metric: "Average Holding Period",
      value: `${numFmt(stats.avgHoldingPeriod, 1)} days`,
      status:
        stats.avgHoldingPeriod <= 10
          ? "green"
          : stats.avgHoldingPeriod <= 30
            ? "yellow"
            : "yellow",
      plain: `Average trade is held for ${numFmt(stats.avgHoldingPeriod, 1)} days. ${
        stats.avgHoldingPeriod <= 5
          ? "Very short-term strategy — minimal overnight/weekend risk. High transaction costs due to frequency."
          : stats.avgHoldingPeriod <= 15
            ? "Short-term swing trading approach — reasonable overnight exposure. Good balance between frequency and costs."
            : stats.avgHoldingPeriod <= 30
              ? "Medium-term swing trades — meaningful overnight risk. Important to track market conditions between entries and exits."
              : "Long holding periods — high exposure to overnight gaps, earnings surprises, and market regime changes. Ensure stop losses are in place."
      }`,
    },
    {
      metric: "Long/Short Ratio",
      value: `${pctFmt(stats.ratioOfLongs * 100)} Long`,
      status: "green",
      plain: `${pctFmt(stats.ratioOfLongs * 100)} of trades are LONG (buy) positions. ${
        stats.ratioOfLongs > 0.7
          ? "Primarily a long-biased strategy. Performance will correlate strongly with bull market trends. Expect underperformance during bear markets."
          : stats.ratioOfLongs < 0.3
            ? "Primarily a short-biased strategy. Works best in declining or sideways markets. Challenging to run in India's long-term bull market."
            : "Balanced long-short exposure. Less sensitive to overall market direction. More resilient across different market cycles."
      }`,
    },
    {
      metric: "Total Bets (Trades Analyzed)",
      value: `${stats.totalTrades} trades`,
      status: stats.totalTrades >= 30 ? "green" : stats.totalTrades >= 15 ? "yellow" : "red",
      plain:
        stats.totalTrades >= 30
          ? `${stats.totalTrades} trades provide a solid foundation for statistical analysis. Results are statistically meaningful.`
          : stats.totalTrades >= 15
            ? `${stats.totalTrades} trades is borderline. Minimum recommended is 30 trades for reliable statistics. Add more historical data if possible.`
            : `Only ${stats.totalTrades} trades analyzed. This is insufficient for reliable statistical inference. PSR, DSR, and all other metrics should be treated as preliminary estimates only.`,
    },
  ];

  const activitySection: ReportSection = {
    title: "Activity & Efficiency",
    icon: "⚡",
    verdict: sectionVerdict(activityMetrics),
    narrative: `The strategy analyzed ${stats.totalTrades} trades over ${stats.totalDays} days (${numFmt(stats.totalDays / 365.25, 1)} years), generating ${numFmt(stats.frequencyOfBets, 0)} trades per year with an average holding period of ${numFmt(stats.avgHoldingPeriod, 1)} days. ${stats.ratioOfLongs > 0.6 ? "Primarily long-biased" : stats.ratioOfLongs < 0.4 ? "Primarily short-biased" : "Balanced long-short"} strategy (${pctFmt(stats.ratioOfLongs * 100)} long).`,
  };

  // ── Overall Score ─────────────────────────────────────────────────────────

  const allMetrics = [
    ...statMetrics,
    ...perfMetrics,
    ...riskMetrics,
    ...hhiMetrics,
    ...activityMetrics,
  ];
  const totalScore = allMetrics.reduce(
    (s, m) => s + statusScore(m.status),
    0
  );
  const maxScore = allMetrics.length * 2;
  const overallScore = Math.round((totalScore / maxScore) * 100);

  const overallVerdict: Verdict =
    overallScore >= 75
      ? "STRONG"
      : overallScore >= 55
        ? "GOOD"
        : overallScore >= 35
          ? "WEAK"
          : "FAILED";

  // ── Strengths ─────────────────────────────────────────────────────────────

  const strengths: string[] = [];
  if (stats.psr >= 0.95)
    strengths.push(
      `Statistically significant edge confirmed (PSR = ${pctFmt(stats.psr * 100)} > 95% threshold)`
    );
  if (stats.dsr >= 0.95)
    strengths.push(
      `Holds up against multiple testing bias (DSR = ${pctFmt(stats.dsr * 100)})`
    );
  if (stats.annualizedSharpe >= 1.5)
    strengths.push(
      `Excellent risk-adjusted return (Sharpe = ${numFmt(stats.annualizedSharpe)})`
    );
  if (stats.hitRatio >= 0.55)
    strengths.push(
      `Above-average win rate of ${pctFmt(stats.hitRatio * 100)}`
    );
  if (stats.profitFactor >= 1.5)
    strengths.push(
      `Strong profit factor of ${numFmt(stats.profitFactor)}x (earns ₹${numFmt(stats.profitFactor)} per ₹1 lost)`
    );
  if (stats.hhiPositive <= 0.05)
    strengths.push(
      "Profits evenly distributed across all trades — edge is consistent and repeatable"
    );
  if (stats.strategyRisk <= 0.2)
    strengths.push(
      `Low strategy failure probability (${pctFmt(stats.strategyRisk * 100)})`
    );
  if (stats.calmarRatio >= 1.0)
    strengths.push(
      `Strong Calmar ratio of ${numFmt(stats.calmarRatio)} — annual return exceeds max drawdown`
    );
  if (stats.recoveryFactor >= 3)
    strengths.push(
      `Strong recovery factor of ${numFmt(stats.recoveryFactor)} — total profit is ${numFmt(stats.recoveryFactor)}x max drawdown`
    );
  if (stats.maxDrawdownPct <= 15)
    strengths.push(
      `Manageable max drawdown of ${pctFmt(stats.maxDrawdownPct)}`
    );

  // ── Weaknesses ────────────────────────────────────────────────────────────

  const weaknesses: string[] = [];
  if (stats.psr < 0.95)
    weaknesses.push(
      `PSR = ${pctFmt(stats.psr * 100)} — Sharpe ratio may not be statistically real (need 95%+)`
    );
  if (stats.dsr < 0.95)
    weaknesses.push(
      `DSR = ${pctFmt(stats.dsr * 100)} — possible false discovery from over-optimizing parameters`
    );
  if (stats.strategyRisk > 0.4)
    weaknesses.push(
      `High strategy failure probability of ${pctFmt(stats.strategyRisk * 100)}`
    );
  if (stats.hhiPositive > 0.15)
    weaknesses.push(
      `Profits concentrated in few trades (HHI+ = ${pctFmt(stats.hhiPositive * 100)}) — not repeatable`
    );
  if (stats.maxDrawdownPct > 30)
    weaknesses.push(
      `Severe max drawdown of ${pctFmt(stats.maxDrawdownPct)} — most traders will not survive this`
    );
  if (stats.timeUnderWater95 > 90)
    weaknesses.push(
      `Long drawdown recovery periods (up to ${stats.timeUnderWater95} days in bad scenarios)`
    );
  if (stats.frequencyOfBets < 10)
    weaknesses.push(
      `Only ${numFmt(stats.frequencyOfBets, 0)} trades/year — insufficient for reliable statistics`
    );
  if (stats.profitFactor < 1.0)
    weaknesses.push(
      `Profit factor of ${numFmt(stats.profitFactor)} means strategy is losing money overall`
    );
  if (stats.totalTrades < 20)
    weaknesses.push(
      `Only ${stats.totalTrades} trades analyzed — results are not statistically reliable`
    );

  // ── Deployment Recommendation ─────────────────────────────────────────────

  const deploymentRecommendation =
    overallVerdict === "STRONG"
      ? `✅ READY FOR LIVE TRADING — ${strategyName} passes all key statistical tests across the ${methodLabel} backtest. Deploy with standard position sizing (1-2% risk per trade). Monitor live performance monthly against backtest benchmarks. Paper trade for 30 days first to verify execution.`
      : overallVerdict === "GOOD"
        ? `⚠️ PROCEED WITH CAUTION — ${strategyName} shows genuine promise but has areas for improvement. Recommended: paper trade for 60-90 days to validate live performance before deploying real capital. Start with minimal position size (0.5% risk per trade) if live trading.`
        : overallVerdict === "WEAK"
          ? `🔄 NOT READY — ${strategyName} has significant weaknesses that must be addressed. Revisit the entry/exit logic, add market regime filters, or collect substantially more trade data. Re-run analysis after improvements.`
          : `❌ DO NOT DEPLOY — ${strategyName} fails critical statistical tests. Deploying this strategy risks unnecessary capital loss. The strategy must be fundamentally redesigned before any live consideration.`;

  // ── Next Steps ────────────────────────────────────────────────────────────

  const nextSteps: string[] = [];
  if (stats.psr < 0.95)
    nextSteps.push(
      "Collect more trade data — PSR improves significantly with 50+ trades"
    );
  if (stats.hhiPositive > 0.15)
    nextSteps.push(
      "Investigate top 5 winning trades — check if they are outliers or systematic"
    );
  if (stats.dsr < 0.95)
    nextSteps.push(
      "Document all configurations tested to quantify selection bias and overfitting risk"
    );
  if (stats.strategyRisk > 0.4)
    nextSteps.push(
      "Add entry filters (trend confirmation, volume, momentum) to improve win rate"
    );
  if (stats.maxDrawdownPct > 20)
    nextSteps.push(
      "Implement position sizing rules — limit maximum risk to 1-2% of capital per trade"
    );
  if (stats.frequencyOfBets < 12)
    nextSteps.push(
      "Apply strategy to additional symbols or timeframes to increase annual trade count"
    );
  if (stats.calmarRatio < 0.5)
    nextSteps.push(
      "Add trailing stop-loss or time-based exits to reduce max drawdown"
    );
  if (stats.hhiNegative > 0.15)
    nextSteps.push(
      "Review the worst 5 losing trades — they may share a pattern that can be avoided"
    );
  if (overallVerdict === "STRONG" || overallVerdict === "GOOD") {
    nextSteps.push(
      "Paper trade for 30-60 days to verify live execution matches backtest assumptions"
    );
    nextSteps.push(
      "Calculate position sizing using Kelly Criterion or fixed fractional (1-2% risk per trade)"
    );
  }
  if (method !== "CPCV")
    nextSteps.push(
      "Run CPCV (Combinatorial Purged CV) for the most rigorous robustness test — it produces a Sharpe distribution instead of a single number"
    );

  // ── Overall Summary ───────────────────────────────────────────────────────

  const overallSummary =
    overallVerdict === "STRONG"
      ? `${strategyName} is a STRONG strategy. The ${methodLabel} analysis (${stats.totalTrades} trades, ${numFmt(stats.totalDays / 365.25, 1)} years) confirms a genuine, statistically significant edge. PSR = ${pctFmt(stats.psr * 100)}, Win Rate = ${pctFmt(stats.hitRatio * 100)}, Profit Factor = ${numFmt(stats.profitFactor)}x. Both statistical validity tests pass at high confidence. Returns are distributed consistently, drawdowns are manageable, and the strategy demonstrates repeatable, systematic performance.`
      : overallVerdict === "GOOD"
        ? `${strategyName} shows GOOD potential with an overall score of ${overallScore}/100. The ${methodLabel} analysis reveals a likely real edge with ${pctFmt(stats.hitRatio * 100)} win rate and ${numFmt(stats.profitFactor)}x profit factor, but with areas needing attention. ${weaknesses[0] ? weaknesses[0] + "." : ""} With targeted improvements, this strategy could qualify for live deployment.`
        : overallVerdict === "WEAK"
          ? `${strategyName} shows WEAK performance (score: ${overallScore}/100) in ${methodLabel} analysis. While there may be some edge present, several key metrics fall below acceptable thresholds. ${weaknesses[0] ? weaknesses[0] + ". " : ""}${weaknesses[1] ? weaknesses[1] + "." : ""} Significant improvements are required before live trading consideration.`
          : `${strategyName} FAILED ${methodLabel} analysis with a score of ${overallScore}/100. Critical statistical tests indicate no reliable edge exists. ${weaknesses.slice(0, 2).join(". ")}. Live deployment is strongly discouraged.`;

  return {
    overallVerdict,
    overallScore,
    overallSummary,
    deploymentRecommendation,
    sections: [
      statSection,
      perfSection,
      riskSection,
      hhiSection,
      activitySection,
    ],
    strengths,
    weaknesses,
    nextSteps,
  };
}
