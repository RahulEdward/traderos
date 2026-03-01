/**
 * AFML Chapter 10 - Bet Sizing
 * Position sizing based on ML confidence and signal strength
 */

import { normalCDF } from "./statistics";

/**
 * Convert prediction probability to bet size [-1, 1]
 * Higher probability = larger position
 * Snippet 10.1: size from predicted probability
 */
export function betSizeFromProbability(
  probability: number,
  numClasses = 2
): number {
  if (numClasses === 2) {
    // Binary: z-score approach
    const p = Math.max(0.001, Math.min(0.999, probability));
    const z = (p - 1 / numClasses) / Math.sqrt(p * (1 - p));
    return 2 * normalCDF(z) - 1; // maps to [-1, 1]
  }
  // Multi-class: one-vs-rest approach
  return (probability - 1 / numClasses) / (probability * (1 - probability) + 1e-10);
}

/**
 * Average active bets to determine current position
 * Instead of replacing old signals, average all concurrent active signals
 * This reduces turnover and smooths position changes
 */
export function averageActiveBets(
  signals: Array<{ timestamp: number; size: number; exitTimestamp: number }>
): Array<{ timestamp: number; position: number }> {
  if (signals.length === 0) return [];

  // Collect all unique timestamps
  const allTimestamps = new Set<number>();
  for (const s of signals) {
    allTimestamps.add(s.timestamp);
    allTimestamps.add(s.exitTimestamp);
  }
  const sortedTimestamps = [...allTimestamps].sort((a, b) => a - b);

  const result: Array<{ timestamp: number; position: number }> = [];

  for (const ts of sortedTimestamps) {
    // Find all active signals at this timestamp
    const active = signals.filter(
      (s) => s.timestamp <= ts && s.exitTimestamp > ts
    );
    if (active.length === 0) {
      result.push({ timestamp: ts, position: 0 });
    } else {
      const avgSize = active.reduce((sum, s) => sum + s.size, 0) / active.length;
      result.push({ timestamp: ts, position: avgSize });
    }
  }

  return result;
}

/**
 * Discretize bet size to reduce overtrading
 * Rounds position to nearest step to avoid tiny adjustments
 * Example: stepSize=0.1 → positions are 0, 0.1, 0.2, ..., 1.0
 */
export function discretizeBetSize(size: number, stepSize = 0.1): number {
  if (stepSize <= 0) return size;
  return Math.round(size / stepSize) * stepSize;
}

/**
 * Dynamic position sizing with limit price derivation
 * Uses sigmoid function: m(w, x) = x * (w + x^2)^(-0.5)
 *
 * When current price diverges from forecast, position adjusts
 * When price approaches forecast → position reduces (take profits)
 * Returns both target position and breakeven limit price
 */
export function dynamicBetSize(
  forecastPrice: number,
  currentPrice: number,
  maxPosition: number,
  omega = 1 // curvature parameter
): { targetPosition: number; limitPrice: number } {
  if (forecastPrice === 0 || currentPrice === 0) {
    return { targetPosition: 0, limitPrice: currentPrice };
  }

  // Divergence between current and forecast
  const divergence = (forecastPrice - currentPrice) / currentPrice;

  // Sigmoid-like function for smooth sizing
  const x = divergence;
  const w = omega;
  const m = x * Math.pow(w + x * x, -0.5);

  // Scale to max position
  const targetPosition = m * maxPosition;

  // Breakeven limit price: where m=0, i.e., currentPrice = forecastPrice
  const limitPrice = forecastPrice;

  return {
    targetPosition: Math.round(targetPosition * 10000) / 10000,
    limitPrice: Math.round(limitPrice * 100) / 100,
  };
}

/**
 * Meta-labeling bet size (Ch.3 + Ch.10)
 * Primary model gives direction, secondary gives confidence → bet size
 */
export function metaLabelBetSize(
  primarySignal: "LONG" | "SHORT" | "FLAT",
  secondaryProbability: number, // P(primary is correct)
  maxPosition = 1.0,
  stepSize = 0.1
): number {
  if (primarySignal === "FLAT") return 0;

  const rawSize = betSizeFromProbability(secondaryProbability);
  const direction = primarySignal === "LONG" ? 1 : -1;
  const sized = direction * Math.abs(rawSize) * maxPosition;
  return discretizeBetSize(sized, stepSize);
}
