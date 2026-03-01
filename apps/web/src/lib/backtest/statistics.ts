/**
 * AFML Part 3 - Backtest Statistics Calculator
 * Based on: "Advances in Financial Machine Learning" by Marcos Lopez de Prado
 * Chapters 14 (Statistics), 15 (Strategy Risk)
 */

import type { BacktestTrade, Bet, AFMLStatistics } from "./types";
import { INDIA_RISK_FREE_RATE } from "@tradeos/shared";

// ─── Math Helpers ───────────────────────────────────────────────────

/** Standard Normal CDF (Abramowitz & Stegun approximation) */
export function normalCDF(x: number): number {
  const a1 = 0.254829592;
  const a2 = -0.284496736;
  const a3 = 1.421413741;
  const a4 = -1.453152027;
  const a5 = 1.061405429;
  const p = 0.3275911;
  const sign = x < 0 ? -1 : 1;
  const absX = Math.abs(x);
  const t = 1.0 / (1.0 + p * absX);
  const y = 1.0 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-absX * absX / 2);
  return 0.5 * (1.0 + sign * y);
}

/** Mean of array */
export function mean(arr: number[]): number {
  if (arr.length === 0) return 0;
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

/** Standard deviation (sample) */
export function std(arr: number[], ddof = 1): number {
  if (arr.length <= ddof) return 0;
  const m = mean(arr);
  const variance = arr.reduce((sum, x) => sum + (x - m) ** 2, 0) / (arr.length - ddof);
  return Math.sqrt(variance);
}

/** Skewness */
export function skewness(arr: number[]): number {
  if (arr.length < 3) return 0;
  const n = arr.length;
  const m = mean(arr);
  const s = std(arr, 1);
  if (s === 0) return 0;
  const m3 = arr.reduce((sum, x) => sum + ((x - m) / s) ** 3, 0) / n;
  return m3;
}

/** Kurtosis (excess, Fisher's definition: normal = 0) */
export function kurtosis(arr: number[]): number {
  if (arr.length < 4) return 0;
  const n = arr.length;
  const m = mean(arr);
  const s = std(arr, 1);
  if (s === 0) return 0;
  const m4 = arr.reduce((sum, x) => sum + ((x - m) / s) ** 4, 0) / n;
  return m4 - 3; // excess kurtosis
}

/** Percentile (linear interpolation) */
export function percentile(arr: number[], p: number): number {
  if (arr.length === 0) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const idx = (p / 100) * (sorted.length - 1);
  const lower = Math.floor(idx);
  const upper = Math.ceil(idx);
  if (lower === upper) return sorted[lower];
  return sorted[lower] + (sorted[upper] - sorted[lower]) * (idx - lower);
}

// ─── Ch.14: Bet Derivation ──────────────────────────────────────────

/** Convert trades into bets (continuous positions on same side) - Snippet 14.1 */
export function deriveBets(trades: BacktestTrade[]): Bet[] {
  if (trades.length === 0) return [];

  const sorted = [...trades].sort(
    (a, b) => a.entryDate.getTime() - b.entryDate.getTime()
  );

  const bets: Bet[] = [];
  let currentBet: {
    startDate: Date;
    direction: "LONG" | "SHORT";
    pnl: number;
    pnlPct: number;
    tradeCount: number;
    lastExitDate: Date;
  } | null = null;

  for (const trade of sorted) {
    if (!currentBet || trade.direction !== currentBet.direction) {
      // Flatten/flip: close previous bet, start new one
      if (currentBet) {
        const holdingDays = Math.max(
          1,
          Math.ceil(
            (currentBet.lastExitDate.getTime() - currentBet.startDate.getTime()) /
              (1000 * 60 * 60 * 24)
          )
        );
        bets.push({
          startDate: currentBet.startDate,
          endDate: currentBet.lastExitDate,
          direction: currentBet.direction,
          pnl: currentBet.pnl,
          pnlPct: currentBet.pnlPct / currentBet.tradeCount,
          holdingDays,
          tradeCount: currentBet.tradeCount,
        });
      }
      currentBet = {
        startDate: trade.entryDate,
        direction: trade.direction,
        pnl: trade.profitLoss,
        pnlPct: trade.profitLossPct,
        tradeCount: 1,
        lastExitDate: trade.exitDate,
      };
    } else {
      // Same direction: extend current bet
      currentBet.pnl += trade.profitLoss;
      currentBet.pnlPct += trade.profitLossPct;
      currentBet.tradeCount++;
      if (trade.exitDate > currentBet.lastExitDate) {
        currentBet.lastExitDate = trade.exitDate;
      }
    }
  }

  // Close last bet
  if (currentBet) {
    const holdingDays = Math.max(
      1,
      Math.ceil(
        (currentBet.lastExitDate.getTime() - currentBet.startDate.getTime()) /
          (1000 * 60 * 60 * 24)
      )
    );
    bets.push({
      startDate: currentBet.startDate,
      endDate: currentBet.lastExitDate,
      direction: currentBet.direction,
      pnl: currentBet.pnl,
      pnlPct: currentBet.pnlPct / currentBet.tradeCount,
      holdingDays,
      tradeCount: currentBet.tradeCount,
    });
  }

  return bets;
}

// ─── Ch.14: HHI Concentration Index ─────────────────────────────────

/** HHI concentration (Snippet 14.3) - 0=uniform, 1=concentrated */
export function getHHI(values: number[]): number {
  if (values.length <= 1) return 1;
  const total = values.reduce((a, b) => a + Math.abs(b), 0);
  if (total === 0) return 0;
  const weights = values.map((v) => Math.abs(v) / total);
  const hhi = weights.reduce((sum, w) => sum + w * w, 0);
  // Normalize: (hhi - 1/N) / (1 - 1/N)
  const n = values.length;
  return (hhi - 1 / n) / (1 - 1 / n);
}

// ─── Ch.14: Drawdown & Time Under Water ─────────────────────────────

export interface DrawdownResult {
  drawdownSeries: number[]; // DD at each point
  tuwSeries: number[]; // TuW at each point (days)
  maxDD: number;
  maxDDPct: number;
  dd95: number;
  tuw95: number; // days
  longestDD: number; // days
}

/** Calculate drawdown series from PnL series (Snippet 14.4) */
export function calculateDrawdowns(
  pnlSeries: number[],
  dates?: Date[]
): DrawdownResult {
  if (pnlSeries.length === 0) {
    return {
      drawdownSeries: [],
      tuwSeries: [],
      maxDD: 0,
      maxDDPct: 0,
      dd95: 0,
      tuw95: 0,
      longestDD: 0,
    };
  }

  // Cumulative PnL
  const cumPnl: number[] = [];
  let running = 0;
  for (const p of pnlSeries) {
    running += p;
    cumPnl.push(running);
  }

  // High watermark
  const hwm: number[] = [];
  let currentHWM = cumPnl[0];
  for (const cp of cumPnl) {
    currentHWM = Math.max(currentHWM, cp);
    hwm.push(currentHWM);
  }

  // Drawdown series
  const ddSeries = cumPnl.map((cp, i) => hwm[i] - cp);

  // Time under water
  const tuwSeries: number[] = [];
  let daysUnderWater = 0;
  for (let i = 0; i < cumPnl.length; i++) {
    if (cumPnl[i] < hwm[i]) {
      daysUnderWater++;
    } else {
      daysUnderWater = 0;
    }
    tuwSeries.push(daysUnderWater);
  }

  const maxDD = Math.max(...ddSeries);
  const maxCum = Math.max(...cumPnl.map(Math.abs), 1);
  const maxDDPct = (maxDD / maxCum) * 100;
  const dd95 = percentile(ddSeries.filter((d) => d > 0), 95);
  const tuw95 = percentile(tuwSeries.filter((t) => t > 0), 95);
  const longestDD = Math.max(...tuwSeries);

  return { drawdownSeries: ddSeries, tuwSeries, maxDD, maxDDPct, dd95, tuw95, longestDD };
}

// ─── Ch.14: Sharpe Ratio ────────────────────────────────────────────

/** Sharpe Ratio from returns array */
export function sharpeRatio(
  returns: number[],
  riskFreeRate = INDIA_RISK_FREE_RATE,
  periodsPerYear = 252
): number {
  if (returns.length < 2) return 0;
  const periodicRf = riskFreeRate / periodsPerYear;
  const excessReturns = returns.map((r) => r - periodicRf);
  const m = mean(excessReturns);
  const s = std(excessReturns);
  if (s === 0) return 0;
  return m / s;
}

/** Annualized Sharpe Ratio */
export function annualizedSharpe(
  returns: number[],
  riskFreeRate = INDIA_RISK_FREE_RATE,
  periodsPerYear = 252
): number {
  return sharpeRatio(returns, riskFreeRate, periodsPerYear) * Math.sqrt(periodsPerYear);
}

// ─── Ch.14: Probabilistic Sharpe Ratio (PSR) ────────────────────────

/**
 * PSR - Adjusts SR for non-normality and short track records
 * Formula: PSR = Z[ (SR_hat - SR*) / sqrt( (1 - skew*SR_hat + (kurt-1)/4 * SR_hat^2) / (T-1) ) ]
 * Must exceed 0.95 for 5% significance level
 */
export function probabilisticSharpeRatio(
  observedSR: number,
  benchmarkSR: number,
  T: number,
  skew: number,
  kurt: number // excess kurtosis (normal = 0)
): number {
  if (T <= 1) return 0;
  const denom = Math.sqrt(
    (1 - skew * observedSR + ((kurt) / 4) * observedSR * observedSR) / (T - 1)
  );
  if (denom === 0) return observedSR > benchmarkSR ? 1 : 0;
  const z = (observedSR - benchmarkSR) / denom;
  return normalCDF(z);
}

// ─── Ch.14: Deflated Sharpe Ratio (DSR) ─────────────────────────────

/**
 * DSR - Adjusts SR for multiple testing (selection bias)
 * SR* = sqrt(V_SR) * ((1 - euler) * Z^{-1}[1 - 1/N] + euler * Z^{-1}[1 - 1/(N*e)])
 * Then PSR is computed with this SR* as benchmark
 *
 * "Every backtest must be reported with all trials involved" - Marcos' 3rd Law
 */
export function deflatedSharpeRatio(
  observedSR: number,
  T: number,
  skew: number,
  kurt: number,
  numTrials: number,
  varianceOfTrialSRs: number
): number {
  if (numTrials <= 1) return probabilisticSharpeRatio(observedSR, 0, T, skew, kurt);

  // Euler-Mascheroni constant
  const euler = 0.5772156649;

  // Expected maximum SR under null hypothesis (SR=0)
  // Approximation: SR* ≈ sqrt(V_SR) * ( (1-euler)*invNorm(1-1/N) + euler*invNorm(1-1/(N*e)) )
  const sqrtV = Math.sqrt(varianceOfTrialSRs);

  // Inverse normal approximation (Beasley-Springer-Moro)
  const invNorm = (p: number): number => {
    if (p <= 0) return -8;
    if (p >= 1) return 8;
    // Rational approximation
    const a = [-3.969683028665376e1, 2.209460984245205e2, -2.759285104469687e2,
      1.383577518672690e2, -3.066479806614716e1, 2.506628277459239e0];
    const b = [-5.447609879822406e1, 1.615858368580409e2, -1.556989798598866e2,
      6.680131188771972e1, -1.328068155288572e1];
    const c = [-7.784894002430293e-3, -3.223964580411365e-1, -2.400758277161838e0,
      -2.549732539343734e0, 4.374664141464968e0, 2.938163982698783e0];
    const d = [7.784695709041462e-3, 3.224671290700398e-1, 2.445134137142996e0, 3.754408661907416e0];

    const pLow = 0.02425;
    const pHigh = 1 - pLow;

    let q: number, r: number;
    if (p < pLow) {
      q = Math.sqrt(-2 * Math.log(p));
      return (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) /
        ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1);
    } else if (p <= pHigh) {
      q = p - 0.5;
      r = q * q;
      return (((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) * q /
        (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1);
    } else {
      q = Math.sqrt(-2 * Math.log(1 - p));
      return -(((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) /
        ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1);
    }
  };

  const N = numTrials;
  const srStar = sqrtV * (
    (1 - euler) * invNorm(1 - 1 / N) +
    euler * invNorm(1 - 1 / (N * Math.E))
  );

  return probabilisticSharpeRatio(observedSR, srStar, T, skew, kurt);
}

// ─── Ch.14: Sortino Ratio ───────────────────────────────────────────

export function sortinoRatio(
  returns: number[],
  riskFreeRate = INDIA_RISK_FREE_RATE,
  periodsPerYear = 252
): number {
  if (returns.length < 2) return 0;
  const periodicRf = riskFreeRate / periodsPerYear;
  const excessReturns = returns.map((r) => r - periodicRf);
  const m = mean(excessReturns);
  const downside = excessReturns.filter((r) => r < 0);
  if (downside.length === 0) return m > 0 ? Infinity : 0;
  const downsideDev = Math.sqrt(
    downside.reduce((sum, r) => sum + r * r, 0) / returns.length
  );
  if (downsideDev === 0) return 0;
  return (m / downsideDev) * Math.sqrt(periodsPerYear);
}

// ─── Ch.15: Strategy Risk ───────────────────────────────────────────

/**
 * Compute Sharpe Ratio for symmetric payouts
 * theta = (2p - 1) * sqrt(n) / (2 * sqrt(p * (1-p)))
 */
export function symmetricSharpe(p: number, n: number): number {
  if (p <= 0 || p >= 1 || n <= 0) return 0;
  return ((2 * p - 1) * Math.sqrt(n)) / (2 * Math.sqrt(p * (1 - p)));
}

/**
 * Implied precision for a target Sharpe ratio (symmetric payouts)
 * p = 0.5 * (1 + sqrt(theta^2 / (theta^2 + 4n)))
 */
export function impliedPrecision(targetSR: number, n: number): number {
  if (n <= 0) return 0.5;
  return 0.5 * (1 + Math.sqrt((targetSR * targetSR) / (targetSR * targetSR + 4 * n)));
}

/**
 * Strategy Risk: P[strategy failure] = P[p < p*]
 * Bootstrap the distribution of precision from trade outcomes
 *
 * Algorithm (Ch.15, Section 15.4.1):
 * 1. Estimate pi-, pi+ from outcomes
 * 2. Compute annual frequency n
 * 3. Bootstrap precision distribution
 * 4. Derive p* from target SR
 * 5. Strategy risk = P[p < p*]
 */
export function calculateStrategyRisk(
  trades: BacktestTrade[],
  targetSR = 1.0,
  numBootstrap = 1000,
  evaluationYears = 2
): { risk: number; impliedP: number; avgPrecision: number; piPlus: number; piMinus: number } {
  if (trades.length < 10) {
    return { risk: 1, impliedP: 0.5, avgPrecision: 0.5, piPlus: 0, piMinus: 0 };
  }

  // Step 1: Estimate pi+ and pi-
  const wins = trades.filter((t) => t.profitLoss > 0).map((t) => t.profitLoss);
  const losses = trades.filter((t) => t.profitLoss <= 0).map((t) => t.profitLoss);
  const piPlus = wins.length > 0 ? mean(wins) : 0;
  const piMinus = losses.length > 0 ? mean(losses) : 0;

  // Step 2: Annual frequency
  const firstDate = new Date(
    Math.min(...trades.map((t) => t.entryDate.getTime()))
  );
  const lastDate = new Date(
    Math.max(...trades.map((t) => t.exitDate.getTime()))
  );
  const years = Math.max(
    (lastDate.getTime() - firstDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000),
    0.1
  );
  const n = trades.length / years;

  // Step 3: Bootstrap precision
  const samplesPerIter = Math.floor(n * evaluationYears);
  const precisions: number[] = [];

  for (let i = 0; i < numBootstrap; i++) {
    let hits = 0;
    for (let j = 0; j < samplesPerIter; j++) {
      const idx = Math.floor(Math.random() * trades.length);
      if (trades[idx].profitLoss > 0) hits++;
    }
    precisions.push(hits / samplesPerIter);
  }

  // Step 4: Compute p* for target SR
  const pStar = impliedPrecision(targetSR, n);

  // Step 5: P[p < p*]
  const failures = precisions.filter((p) => p < pStar).length;
  const risk = failures / numBootstrap;

  return {
    risk,
    impliedP: pStar,
    avgPrecision: mean(precisions),
    piPlus,
    piMinus,
  };
}

// ─── Full Statistics Calculator ─────────────────────────────────────

/**
 * Calculate ALL AFML statistics from a list of trades
 * This is the main function - call this with your trade array
 */
export function calculateAFMLStatistics(
  trades: BacktestTrade[],
  options: {
    riskFreeRate?: number;
    numTrials?: number; // for DSR
    varianceOfTrialSRs?: number; // for DSR
    targetSR?: number; // for strategy risk
  } = {}
): AFMLStatistics {
  const {
    riskFreeRate = INDIA_RISK_FREE_RATE,
    numTrials = 1,
    varianceOfTrialSRs = 0.5,
    targetSR = 1.0,
  } = options;

  if (trades.length === 0) {
    return getEmptyStatistics();
  }

  const sorted = [...trades].sort(
    (a, b) => a.entryDate.getTime() - b.entryDate.getTime()
  );

  // ── General Characteristics ───
  const startDate = sorted[0].entryDate;
  const endDate = sorted[sorted.length - 1].exitDate;
  const totalDays = Math.max(
    1,
    Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))
  );
  const totalYears = Math.max(totalDays / 365.25, 0.01);

  const bets = deriveBets(sorted);
  const totalBets = bets.length;
  const frequencyOfBets = totalBets / totalYears;
  const avgHoldingPeriod =
    bets.length > 0 ? mean(bets.map((b) => b.holdingDays)) : 0;
  const longBets = bets.filter((b) => b.direction === "LONG");
  const ratioOfLongs = bets.length > 0 ? longBets.length / bets.length : 0.5;

  // ── Performance ───
  const totalPnl = sorted.reduce((sum, t) => sum + t.profitLoss, 0);
  const longTrades = sorted.filter((t) => t.direction === "LONG");
  const pnlFromLongs = longTrades.reduce((sum, t) => sum + t.profitLoss, 0);

  const returns = sorted.map((t) => t.profitLossPct / 100);
  const annReturn = returns.length > 0
    ? (Math.pow(1 + mean(returns), 252) - 1) * 100
    : 0;

  const wins = sorted.filter((t) => t.profitLoss > 0);
  const losses = sorted.filter((t) => t.profitLoss <= 0);
  const hitRatio = sorted.length > 0 ? wins.length / sorted.length : 0;
  const avgReturnHits = wins.length > 0
    ? mean(wins.map((t) => t.profitLossPct))
    : 0;
  const avgReturnMisses = losses.length > 0
    ? mean(losses.map((t) => t.profitLossPct))
    : 0;

  // ── HHI Concentration ───
  const positiveReturns = returns.filter((r) => r > 0);
  const negativeReturns = returns.filter((r) => r < 0);
  const hhiPositive = positiveReturns.length > 1 ? getHHI(positiveReturns) : 0;
  const hhiNegative = negativeReturns.length > 1 ? getHHI(negativeReturns) : 0;

  // HHI on monthly bet counts
  const monthlyBetCounts: Record<string, number> = {};
  for (const bet of bets) {
    const key = `${bet.startDate.getFullYear()}-${bet.startDate.getMonth()}`;
    monthlyBetCounts[key] = (monthlyBetCounts[key] || 0) + 1;
  }
  const monthCounts = Object.values(monthlyBetCounts);
  const hhiTime = monthCounts.length > 1 ? getHHI(monthCounts) : 0;

  // ── Drawdowns ───
  const pnlSeries = sorted.map((t) => t.profitLoss);
  const dd = calculateDrawdowns(pnlSeries);

  // ── Efficiency Metrics ───
  const sr = sharpeRatio(returns, riskFreeRate);
  const annSR = annualizedSharpe(returns, riskFreeRate);
  const sortino = sortinoRatio(returns, riskFreeRate);

  const annualReturn = totalPnl / totalYears;
  const calmar = dd.maxDD > 0 ? annualReturn / dd.maxDD : 0;

  // PSR: probability that observed SR > 0 (benchmark = 0)
  const T = returns.length;
  const sk = skewness(returns);
  const kt = kurtosis(returns);
  const psr = probabilisticSharpeRatio(sr, 0, T, sk, kt);

  // DSR: accounting for multiple testing
  const dsr = deflatedSharpeRatio(sr, T, sk, kt, numTrials, varianceOfTrialSRs);

  // ── Strategy Risk (Ch.15) ───
  const stratRisk = calculateStrategyRisk(sorted, targetSR);

  // ── Classic Metrics ───
  const totalWins = wins.reduce((s, t) => s + t.profitLoss, 0);
  const totalLosses = Math.abs(losses.reduce((s, t) => s + t.profitLoss, 0));
  const profitFactor = totalLosses > 0 ? totalWins / totalLosses : totalWins > 0 ? Infinity : 0;
  const expectancy = sorted.length > 0 ? totalPnl / sorted.length : 0;
  const recoveryFactor = dd.maxDD > 0 ? totalPnl / dd.maxDD : 0;

  return {
    timeRange: { start: startDate, end: endDate },
    totalDays,
    totalBets,
    totalTrades: sorted.length,
    frequencyOfBets: Math.round(frequencyOfBets * 10) / 10,
    avgHoldingPeriod: Math.round(avgHoldingPeriod * 10) / 10,
    ratioOfLongs: Math.round(ratioOfLongs * 1000) / 1000,

    pnl: Math.round(totalPnl * 100) / 100,
    pnlFromLongs: Math.round(pnlFromLongs * 100) / 100,
    annualizedReturn: Math.round(annReturn * 100) / 100,
    hitRatio: Math.round(hitRatio * 10000) / 10000,
    avgReturnHits: Math.round(avgReturnHits * 100) / 100,
    avgReturnMisses: Math.round(avgReturnMisses * 100) / 100,

    hhiPositive: Math.round(hhiPositive * 10000) / 10000,
    hhiNegative: Math.round(hhiNegative * 10000) / 10000,
    hhiTime: Math.round(hhiTime * 10000) / 10000,
    maxDrawdown: Math.round(dd.maxDD * 100) / 100,
    maxDrawdownPct: Math.round(dd.maxDDPct * 100) / 100,
    drawdown95: Math.round(dd.dd95 * 100) / 100,
    timeUnderWater95: Math.round(dd.tuw95),
    longestDrawdown: dd.longestDD,

    avgSlippagePct: 0, // need live data to compute

    sharpeRatio: Math.round(sr * 10000) / 10000,
    annualizedSharpe: Math.round(annSR * 100) / 100,
    sortinoRatio: Math.round(sortino * 100) / 100,
    calmarRatio: Math.round(calmar * 100) / 100,
    informationRatio: Math.round(annSR * 100) / 100, // same as SR if benchmark = Rf
    psr: Math.round(psr * 10000) / 10000,
    dsr: Math.round(dsr * 10000) / 10000,

    strategyRisk: Math.round(stratRisk.risk * 10000) / 10000,
    impliedPrecision: Math.round(stratRisk.impliedP * 10000) / 10000,
    profitFactor: Math.round(profitFactor * 100) / 100,
    expectancy: Math.round(expectancy * 100) / 100,
    recoveryFactor: Math.round(recoveryFactor * 100) / 100,
  };
}

function getEmptyStatistics(): AFMLStatistics {
  return {
    timeRange: { start: new Date(), end: new Date() },
    totalDays: 0, totalBets: 0, totalTrades: 0, frequencyOfBets: 0,
    avgHoldingPeriod: 0, ratioOfLongs: 0.5,
    pnl: 0, pnlFromLongs: 0, annualizedReturn: 0, hitRatio: 0,
    avgReturnHits: 0, avgReturnMisses: 0,
    hhiPositive: 0, hhiNegative: 0, hhiTime: 0,
    maxDrawdown: 0, maxDrawdownPct: 0, drawdown95: 0,
    timeUnderWater95: 0, longestDrawdown: 0,
    avgSlippagePct: 0,
    sharpeRatio: 0, annualizedSharpe: 0, sortinoRatio: 0, calmarRatio: 0,
    informationRatio: 0, psr: 0, dsr: 0,
    strategyRisk: 1, impliedPrecision: 0.5,
    profitFactor: 0, expectancy: 0, recoveryFactor: 0,
  };
}
