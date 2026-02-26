import { INDIA_RISK_FREE_RATE } from "@tradeos/shared";

interface TradeData {
  profitLoss: number;
  profitLossPct: number;
  entryDate: Date;
  exitDate: Date | null;
  direction: "LONG" | "SHORT";
}

export interface CalculatedMetrics {
  totalTrades: number;
  winRate: number;
  profitFactor: number;
  netProfit: number;
  maxDrawdown: number;
  maxDrawdownPct: number;
  sharpeRatio: number;
  sortinoRatio: number;
  calmarRatio: number;
  expectancy: number;
  avgWin: number;
  avgLoss: number;
  bestTrade: number;
  worstTrade: number;
  recoveryFactor: number;
}

export function calculateMetrics(trades: TradeData[]): CalculatedMetrics {
  if (trades.length === 0) {
    return {
      totalTrades: 0,
      winRate: 0,
      profitFactor: 0,
      netProfit: 0,
      maxDrawdown: 0,
      maxDrawdownPct: 0,
      sharpeRatio: 0,
      sortinoRatio: 0,
      calmarRatio: 0,
      expectancy: 0,
      avgWin: 0,
      avgLoss: 0,
      bestTrade: 0,
      worstTrade: 0,
      recoveryFactor: 0,
    };
  }

  const totalTrades = trades.length;
  const winningTrades = trades.filter((t) => t.profitLoss > 0);
  const losingTrades = trades.filter((t) => t.profitLoss <= 0);

  // Win Rate
  const winRate =
    totalTrades > 0 ? (winningTrades.length / totalTrades) * 100 : 0;

  // Profit Factor
  const grossProfit = winningTrades.reduce((sum, t) => sum + t.profitLoss, 0);
  const grossLoss = Math.abs(
    losingTrades.reduce((sum, t) => sum + t.profitLoss, 0)
  );
  const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? Infinity : 0;

  // Net Profit
  const netProfit = trades.reduce((sum, t) => sum + t.profitLoss, 0);

  // Average Win / Loss
  const avgWin =
    winningTrades.length > 0
      ? winningTrades.reduce((sum, t) => sum + t.profitLoss, 0) /
        winningTrades.length
      : 0;
  const avgLoss =
    losingTrades.length > 0
      ? losingTrades.reduce((sum, t) => sum + t.profitLoss, 0) /
        losingTrades.length
      : 0;

  // Best / Worst Trade
  const bestTrade = Math.max(...trades.map((t) => t.profitLoss));
  const worstTrade = Math.min(...trades.map((t) => t.profitLoss));

  // Expectancy
  const winRateDecimal = winRate / 100;
  const lossRateDecimal = 1 - winRateDecimal;
  const expectancy = winRateDecimal * avgWin + lossRateDecimal * avgLoss;

  // Max Drawdown
  let peak = 0;
  let equity = 0;
  let maxDD = 0;
  let maxDDPct = 0;

  for (const trade of trades) {
    equity += trade.profitLoss;
    if (equity > peak) peak = equity;
    const dd = peak - equity;
    if (dd > maxDD) {
      maxDD = dd;
      maxDDPct = peak > 0 ? (dd / peak) * 100 : 0;
    }
  }

  // Recovery Factor
  const recoveryFactor = maxDD > 0 ? netProfit / maxDD : 0;

  // Returns for Sharpe/Sortino
  const returns = trades.map((t) => t.profitLossPct / 100);
  const meanReturn = returns.reduce((a, b) => a + b, 0) / returns.length;

  // Standard Deviation
  const variance =
    returns.reduce((sum, r) => sum + Math.pow(r - meanReturn, 2), 0) /
    returns.length;
  const stdDev = Math.sqrt(variance);

  // Downside Deviation (for Sortino)
  const downsideReturns = returns.filter((r) => r < 0);
  const downsideVariance =
    downsideReturns.length > 0
      ? downsideReturns.reduce((sum, r) => sum + Math.pow(r, 2), 0) /
        returns.length
      : 0;
  const downsideDev = Math.sqrt(downsideVariance);

  // Annualization factor (assume ~252 trading days)
  const tradingDays = 252;
  const riskFreeDaily = INDIA_RISK_FREE_RATE / tradingDays;

  // Sharpe Ratio (annualized)
  const sharpeRatio =
    stdDev > 0
      ? ((meanReturn - riskFreeDaily) / stdDev) * Math.sqrt(tradingDays)
      : 0;

  // Sortino Ratio (annualized)
  const sortinoRatio =
    downsideDev > 0
      ? ((meanReturn - riskFreeDaily) / downsideDev) * Math.sqrt(tradingDays)
      : 0;

  // Calmar Ratio (annualized return / max drawdown)
  const annualizedReturn = meanReturn * tradingDays * 100;
  const calmarRatio = maxDDPct > 0 ? annualizedReturn / maxDDPct : 0;

  return {
    totalTrades,
    winRate: Math.round(winRate * 100) / 100,
    profitFactor: Math.round(profitFactor * 100) / 100,
    netProfit: Math.round(netProfit * 100) / 100,
    maxDrawdown: Math.round(maxDD * 100) / 100,
    maxDrawdownPct: Math.round(maxDDPct * 100) / 100,
    sharpeRatio: Math.round(sharpeRatio * 100) / 100,
    sortinoRatio: Math.round(sortinoRatio * 100) / 100,
    calmarRatio: Math.round(calmarRatio * 100) / 100,
    expectancy: Math.round(expectancy * 100) / 100,
    avgWin: Math.round(avgWin * 100) / 100,
    avgLoss: Math.round(avgLoss * 100) / 100,
    bestTrade: Math.round(bestTrade * 100) / 100,
    worstTrade: Math.round(worstTrade * 100) / 100,
    recoveryFactor: Math.round(recoveryFactor * 100) / 100,
  };
}

export function calculateMonthlyPnL(
  trades: TradeData[]
): { month: string; year: number; pnl: number; tradeCount: number }[] {
  const monthly: Record<
    string,
    { pnl: number; tradeCount: number; month: string; year: number }
  > = {};

  for (const trade of trades) {
    const date = new Date(trade.exitDate || trade.entryDate);
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    const monthNames = [
      "Jan", "Feb", "Mar", "Apr", "May", "Jun",
      "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
    ];

    if (!monthly[key]) {
      monthly[key] = {
        pnl: 0,
        tradeCount: 0,
        month: monthNames[date.getMonth()],
        year: date.getFullYear(),
      };
    }

    monthly[key].pnl += trade.profitLoss;
    monthly[key].tradeCount += 1;
  }

  return Object.values(monthly).sort(
    (a, b) => a.year - b.year || a.month.localeCompare(b.month)
  );
}
