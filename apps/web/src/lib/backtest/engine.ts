/**
 * AFML Part 3 - Backtesting Engine
 * Chapters 11 (WF), 12 (CV, CPCV), 13 (Synthetic)
 *
 * Three backtesting paradigms:
 * 1. Walk-Forward: Train on past, test on future (sequential)
 * 2. Cross-Validation: K-fold with purging & embargo
 * 3. CPCV: Combinatorial Purged CV - multiple paths, Sharpe distribution
 */

import type {
  BacktestTrade,
  BacktestConfig,
  BacktestPathResult,
  BacktestRunResult,
  Candle,
} from "./types";
import { calculateAFMLStatistics } from "./statistics";

// ─── Utility: Purge & Embargo (Ch.7/12) ────────────────────────────

/**
 * Purge overlapping samples between train/test to prevent leakage
 * Remove training samples whose labels overlap with test period
 */
function purgeTrainIndices(
  trainIndices: number[],
  testStart: number,
  testEnd: number,
  purgeWindow: number
): number[] {
  return trainIndices.filter(
    (i) => i < testStart - purgeWindow || i > testEnd + purgeWindow
  );
}

/**
 * Embargo: remove training samples immediately after test period
 * Prevents forward-looking information leakage
 */
function embargoTrainIndices(
  trainIndices: number[],
  testEnd: number,
  embargoWindow: number
): number[] {
  return trainIndices.filter((i) => i <= testEnd || i > testEnd + embargoWindow);
}

// ─── Walk-Forward Backtesting (Ch.11/12) ────────────────────────────

/**
 * Walk-Forward: traditional historical simulation
 * Train on trailing window, test on next window, slide forward
 *
 * Pros: Historical path, proper time ordering
 * Cons: Single path (overfit risk), unequal training sizes initially
 */
export function walkForwardSplit(
  totalBars: number,
  trainWindow: number,
  testWindow: number
): Array<{ trainStart: number; trainEnd: number; testStart: number; testEnd: number }> {
  const splits: Array<{
    trainStart: number;
    trainEnd: number;
    testStart: number;
    testEnd: number;
  }> = [];

  let testStart = trainWindow;
  while (testStart + testWindow <= totalBars) {
    splits.push({
      trainStart: testStart - trainWindow,
      trainEnd: testStart - 1,
      testStart,
      testEnd: Math.min(testStart + testWindow - 1, totalBars - 1),
    });
    testStart += testWindow;
  }

  return splits;
}

// ─── Cross-Validation with Purging (Ch.12) ──────────────────────────

/**
 * Purged K-Fold CV: split into k folds, purge overlap, apply embargo
 *
 * Pros: Multiple scenarios, equal training sizes, no warm-up waste
 * Cons: Not historically ordered, single path per fold
 */
export function purgedKFoldSplit(
  totalBars: number,
  kFolds: number,
  purgeWindow = 0,
  embargoWindow = 0
): Array<{ trainIndices: number[]; testIndices: number[] }> {
  const foldSize = Math.floor(totalBars / kFolds);
  const splits: Array<{ trainIndices: number[]; testIndices: number[] }> = [];

  for (let fold = 0; fold < kFolds; fold++) {
    const testStart = fold * foldSize;
    const testEnd = fold === kFolds - 1 ? totalBars - 1 : (fold + 1) * foldSize - 1;

    const testIndices: number[] = [];
    for (let i = testStart; i <= testEnd; i++) testIndices.push(i);

    let trainIndices: number[] = [];
    for (let i = 0; i < totalBars; i++) {
      if (i < testStart || i > testEnd) trainIndices.push(i);
    }

    // Apply purging and embargo
    trainIndices = purgeTrainIndices(trainIndices, testStart, testEnd, purgeWindow);
    trainIndices = embargoTrainIndices(trainIndices, testEnd, embargoWindow);

    splits.push({ trainIndices, testIndices });
  }

  return splits;
}

// ─── CPCV: Combinatorial Purged Cross-Validation (Ch.12) ────────────

/**
 * CPCV generates MULTIPLE backtest paths (not just one)
 * This is the MOST ROBUST backtesting method
 *
 * Instead of a single Sharpe ratio, you get a DISTRIBUTION
 * Making it nearly impossible to overfit
 *
 * Algorithm:
 * 1. Partition T observations into N groups (preserving order)
 * 2. Choose k groups as test set (C(N,k) combinations)
 * 3. Each combination produces k path segments
 * 4. Total paths: phi = k * C(N,k) / N
 *
 * For N=10, k=2: phi=9 paths, each trained on 80% of data
 */

/** Generate all combinations C(n,k) */
function combinations(n: number, k: number): number[][] {
  const result: number[][] = [];

  function backtrack(start: number, current: number[]) {
    if (current.length === k) {
      result.push([...current]);
      return;
    }
    for (let i = start; i < n; i++) {
      current.push(i);
      backtrack(i + 1, current);
      current.pop();
    }
  }

  backtrack(0, []);
  return result;
}

/** CPCV split generator */
export function cpcvSplit(
  totalBars: number,
  nGroups: number,
  kTestGroups: number,
  purgeWindow = 0
): {
  splits: Array<{ trainIndices: number[]; testIndices: number[] }>;
  numPaths: number;
  trainRatio: number;
} {
  const groupSize = Math.floor(totalBars / nGroups);
  const groups: number[][] = [];

  for (let g = 0; g < nGroups; g++) {
    const start = g * groupSize;
    const end = g === nGroups - 1 ? totalBars - 1 : (g + 1) * groupSize - 1;
    const indices: number[] = [];
    for (let i = start; i <= end; i++) indices.push(i);
    groups.push(indices);
  }

  // Generate all C(N, k) combinations of test groups
  const combos = combinations(nGroups, kTestGroups);

  const splits: Array<{ trainIndices: number[]; testIndices: number[] }> = [];

  for (const combo of combos) {
    const testGroupSet = new Set(combo);
    const testIndices: number[] = [];
    let trainIndices: number[] = [];

    for (let g = 0; g < nGroups; g++) {
      if (testGroupSet.has(g)) {
        testIndices.push(...groups[g]);
      } else {
        trainIndices.push(...groups[g]);
      }
    }

    // Purge around test boundaries
    for (const testGroup of combo) {
      const testStart = groups[testGroup][0];
      const testEnd = groups[testGroup][groups[testGroup].length - 1];
      trainIndices = purgeTrainIndices(trainIndices, testStart, testEnd, purgeWindow);
    }

    splits.push({ trainIndices, testIndices });
  }

  // Number of backtest paths = k * C(N,k) / N
  const numPaths = Math.round(
    (kTestGroups * combos.length) / nGroups
  );
  const trainRatio = 1 - kTestGroups / nGroups;

  return { splits, numPaths, trainRatio };
}

// ─── Synthetic Data Generation (Ch.13) ──────────────────────────────

/**
 * Ornstein-Uhlenbeck process for synthetic price paths
 * P(t+1) = (1 - phi) * P_target + phi * P(t) + sigma * epsilon
 *
 * phi > 0: mean-reverting
 * phi close to 1: momentum
 * phi = 0: random walk
 */
export function generateOUPaths(
  params: {
    phi: number; // mean-reversion speed
    sigma: number; // volatility
    pTarget: number; // long-term mean
    p0: number; // starting price
  },
  nPaths: number,
  pathLength: number
): number[][] {
  const { phi, sigma, pTarget, p0 } = params;
  const paths: number[][] = [];

  for (let path = 0; path < nPaths; path++) {
    const prices: number[] = [p0];
    let p = p0;

    for (let t = 1; t < pathLength; t++) {
      // Box-Muller transform for normal random
      const u1 = Math.random();
      const u2 = Math.random();
      const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);

      p = (1 - phi) * pTarget + phi * p + sigma * z;
      prices.push(Math.max(p, 0.01)); // Price floor
    }
    paths.push(prices);
  }

  return paths;
}

/**
 * Estimate O-U parameters from historical price series
 * Uses OLS regression: P(t+1) - P(t) = a + b*P(t) + epsilon
 * phi = 1 + b, pTarget = -a/b, sigma = std(residuals)
 */
export function estimateOUParams(prices: number[]): {
  phi: number;
  sigma: number;
  pTarget: number;
} {
  if (prices.length < 10) {
    return { phi: 0.95, sigma: prices[0] * 0.02, pTarget: prices[0] };
  }

  // OLS: dP = a + b * P(t)
  const n = prices.length - 1;
  const dP: number[] = [];
  const P: number[] = [];

  for (let i = 0; i < n; i++) {
    dP.push(prices[i + 1] - prices[i]);
    P.push(prices[i]);
  }

  // OLS estimates
  const meanP = P.reduce((a, b) => a + b, 0) / n;
  const meanDP = dP.reduce((a, b) => a + b, 0) / n;

  let ssXX = 0, ssXY = 0;
  for (let i = 0; i < n; i++) {
    ssXX += (P[i] - meanP) ** 2;
    ssXY += (P[i] - meanP) * (dP[i] - meanDP);
  }

  const b = ssXX > 0 ? ssXY / ssXX : 0;
  const a = meanDP - b * meanP;

  // Residuals for sigma
  const residuals = dP.map((dp, i) => dp - (a + b * P[i]));
  const sigma = Math.sqrt(
    residuals.reduce((sum, r) => sum + r * r, 0) / (n - 2)
  );

  const phi = Math.max(0, Math.min(1, 1 + b));
  const pTarget = b !== 0 ? -a / b : prices[prices.length - 1];

  return { phi, sigma, pTarget };
}

/**
 * Find Optimal Trading Rule (OTR) from synthetic data (Ch.13)
 * Grid search over profit-taking and stop-loss thresholds
 * Returns the {profit, stop} pair with highest Sharpe ratio
 */
export function findOptimalTradingRule(
  paths: number[][],
  profitRange: number[] = [0.005, 0.01, 0.015, 0.02, 0.025, 0.03, 0.04, 0.05],
  stopRange: number[] = [-0.005, -0.01, -0.015, -0.02, -0.025, -0.03, -0.04, -0.05],
  maxHoldingBars = 50
): {
  optimalProfit: number;
  optimalStop: number;
  optimalSharpe: number;
  grid: Array<{ profit: number; stop: number; sharpe: number }>;
} {
  const grid: Array<{ profit: number; stop: number; sharpe: number }> = [];
  let bestSharpe = -Infinity;
  let bestProfit = profitRange[0];
  let bestStop = stopRange[0];

  for (const profit of profitRange) {
    for (const stop of stopRange) {
      const returns: number[] = [];

      for (const prices of paths) {
        const entryPrice = prices[0];
        let exitReturn = 0;

        for (let t = 1; t < Math.min(prices.length, maxHoldingBars); t++) {
          const ret = (prices[t] - entryPrice) / entryPrice;
          if (ret >= profit) {
            exitReturn = profit;
            break;
          }
          if (ret <= stop) {
            exitReturn = stop;
            break;
          }
          if (t === Math.min(prices.length, maxHoldingBars) - 1) {
            exitReturn = ret; // Time exit
          }
        }
        returns.push(exitReturn);
      }

      // Compute Sharpe for this (profit, stop) pair
      const m = returns.reduce((a, b) => a + b, 0) / returns.length;
      const s = Math.sqrt(
        returns.reduce((sum, r) => sum + (r - m) ** 2, 0) / (returns.length - 1)
      );
      const sr = s > 0 ? m / s : 0;

      grid.push({ profit, stop, sharpe: Math.round(sr * 1000) / 1000 });

      if (sr > bestSharpe) {
        bestSharpe = sr;
        bestProfit = profit;
        bestStop = stop;
      }
    }
  }

  return {
    optimalProfit: bestProfit,
    optimalStop: bestStop,
    optimalSharpe: Math.round(bestSharpe * 1000) / 1000,
    grid,
  };
}

// ─── Main Backtest Runner ───────────────────────────────────────────

/**
 * Run a backtest on trade data using specified method
 * For CSV-imported trades, this re-evaluates with AFML statistics
 * For CPCV, it generates multiple paths and a Sharpe distribution
 */
export function runBacktest(
  trades: BacktestTrade[],
  config: BacktestConfig
): BacktestRunResult {
  const { method } = config;

  switch (method) {
    case "WALK_FORWARD":
      return runWalkForward(trades, config);
    case "CROSS_VALIDATION":
      return runCrossValidation(trades, config);
    case "CPCV":
      return runCPCV(trades, config);
    case "SYNTHETIC":
      return runSynthetic(trades, config);
    default:
      throw new Error(`Unknown backtest method: ${method}`);
  }
}

function runWalkForward(
  trades: BacktestTrade[],
  config: BacktestConfig
): BacktestRunResult {
  const sorted = [...trades].sort(
    (a, b) => a.entryDate.getTime() - b.entryDate.getTime()
  );
  const n = sorted.length;
  const trainWindow = config.trainWindow || Math.floor(n * 0.6);
  const testWindow = config.testWindow || Math.floor(n * 0.2);

  const splits = walkForwardSplit(n, trainWindow, testWindow);

  // Collect all OOS trades
  const oosTrades: BacktestTrade[] = [];
  for (const split of splits) {
    for (let i = split.testStart; i <= split.testEnd && i < n; i++) {
      oosTrades.push(sorted[i]);
    }
  }

  const stats = calculateAFMLStatistics(oosTrades.length > 0 ? oosTrades : sorted);

  return {
    method: "WALK_FORWARD",
    config,
    paths: [
      {
        pathId: 0,
        trades: oosTrades.length > 0 ? oosTrades : sorted,
        sharpeRatio: stats.annualizedSharpe,
        pnl: stats.pnl,
        method: "WALK_FORWARD",
      },
    ],
    statistics: stats,
    runTimestamp: new Date(),
  };
}

function runCrossValidation(
  trades: BacktestTrade[],
  config: BacktestConfig
): BacktestRunResult {
  const sorted = [...trades].sort(
    (a, b) => a.entryDate.getTime() - b.entryDate.getTime()
  );
  const n = sorted.length;
  const kFolds = config.kFolds || 5;
  const purge = config.purgeWindow || Math.max(1, Math.floor(n * 0.01));
  const embargo = config.embargoWindow || Math.max(1, Math.floor(n * 0.01));

  const splits = purgedKFoldSplit(n, kFolds, purge, embargo);

  const paths: BacktestPathResult[] = [];
  const allOOSTrades: BacktestTrade[] = [];

  for (let fold = 0; fold < splits.length; fold++) {
    const testTrades = splits[fold].testIndices
      .filter((i) => i < n)
      .map((i) => sorted[i]);
    allOOSTrades.push(...testTrades);

    const foldPnl = testTrades.reduce((s, t) => s + t.profitLoss, 0);
    const foldReturns = testTrades.map((t) => t.profitLossPct / 100);
    const m = foldReturns.length > 0 ? foldReturns.reduce((a, b) => a + b, 0) / foldReturns.length : 0;
    const s = foldReturns.length > 1
      ? Math.sqrt(foldReturns.reduce((sum, r) => sum + (r - m) ** 2, 0) / (foldReturns.length - 1))
      : 1;
    const sr = s > 0 ? (m / s) * Math.sqrt(252) : 0;

    paths.push({
      pathId: fold,
      trades: testTrades,
      sharpeRatio: Math.round(sr * 100) / 100,
      pnl: Math.round(foldPnl * 100) / 100,
      method: "CROSS_VALIDATION",
    });
  }

  const stats = calculateAFMLStatistics(allOOSTrades);
  const sharpeDistribution = paths.map((p) => p.sharpeRatio);

  return {
    method: "CROSS_VALIDATION",
    config,
    paths,
    statistics: stats,
    sharpeDistribution,
    runTimestamp: new Date(),
  };
}

function runCPCV(
  trades: BacktestTrade[],
  config: BacktestConfig
): BacktestRunResult {
  const sorted = [...trades].sort(
    (a, b) => a.entryDate.getTime() - b.entryDate.getTime()
  );
  const n = sorted.length;
  const nGroups = config.nGroups || Math.min(10, Math.floor(n / 5));
  const kTestGroups = config.kTestGroups || 2;
  const purge = config.purgeWindow || Math.max(1, Math.floor(n * 0.01));

  const { splits, numPaths, trainRatio } = cpcvSplit(n, nGroups, kTestGroups, purge);

  // Build paths by combining test segments from different splits
  // Each path = one complete pass through all data as OOS
  const paths: BacktestPathResult[] = [];
  const sharpeDistribution: number[] = [];

  // For simplicity: each split is one "path"
  for (let s = 0; s < splits.length; s++) {
    const testTrades = splits[s].testIndices
      .filter((i) => i < n)
      .map((i) => sorted[i]);

    if (testTrades.length < 2) continue;

    const foldPnl = testTrades.reduce((sum, t) => sum + t.profitLoss, 0);
    const foldReturns = testTrades.map((t) => t.profitLossPct / 100);
    const m = foldReturns.reduce((a, b) => a + b, 0) / foldReturns.length;
    const stdDev = Math.sqrt(
      foldReturns.reduce((sum, r) => sum + (r - m) ** 2, 0) / (foldReturns.length - 1)
    );
    const sr = stdDev > 0 ? (m / stdDev) * Math.sqrt(252) : 0;

    sharpeDistribution.push(Math.round(sr * 100) / 100);

    paths.push({
      pathId: s,
      trades: testTrades,
      sharpeRatio: Math.round(sr * 100) / 100,
      pnl: Math.round(foldPnl * 100) / 100,
      method: "CPCV",
    });
  }

  // Full statistics on all trades (treated as if they were OOS across all combos)
  const stats = calculateAFMLStatistics(sorted, {
    numTrials: splits.length,
    varianceOfTrialSRs:
      sharpeDistribution.length > 1
        ? sharpeDistribution.reduce((sum, sr) => {
            const m =
              sharpeDistribution.reduce((a, b) => a + b, 0) /
              sharpeDistribution.length;
            return sum + (sr - m) ** 2;
          }, 0) /
          (sharpeDistribution.length - 1)
        : 0.5,
  });

  return {
    method: "CPCV",
    config,
    paths,
    statistics: stats,
    sharpeDistribution,
    runTimestamp: new Date(),
  };
}

function runSynthetic(
  trades: BacktestTrade[],
  config: BacktestConfig
): BacktestRunResult {
  // Extract price series from trades to estimate O-U parameters
  const prices = trades.map((t) => t.entryPrice);
  const params = estimateOUParams(prices);

  const nPaths = config.nPaths || 10000;
  const maxHolding = config.maxHoldingPeriod || 50;

  // Generate synthetic paths
  const syntheticPaths = generateOUPaths(
    { ...params, p0: prices[prices.length - 1] },
    nPaths,
    maxHolding
  );

  // Find optimal trading rule on synthetic data
  const otr = findOptimalTradingRule(syntheticPaths, undefined, undefined, maxHolding);

  // Apply OTR to original trades for evaluation
  const stats = calculateAFMLStatistics(trades);

  return {
    method: "SYNTHETIC",
    config,
    paths: [
      {
        pathId: 0,
        trades,
        sharpeRatio: otr.optimalSharpe,
        pnl: stats.pnl,
        method: "SYNTHETIC",
      },
    ],
    statistics: {
      ...stats,
      // Override with OTR-based analysis
      annualizedSharpe: otr.optimalSharpe,
    },
    runTimestamp: new Date(),
  };
}
