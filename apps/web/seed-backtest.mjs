import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Generate realistic NIFTY ORB-15 trades over 6 months
function generateTrades() {
  const trades = [];
  let tradeNum = 0;
  const startDate = new Date('2025-07-01');
  const endDate = new Date('2025-12-31');

  // NIFTY price range during this period
  let niftyBase = 24500;

  for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
    // Skip weekends
    if (d.getDay() === 0 || d.getDay() === 6) continue;

    // ~60% of trading days produce a valid signal
    if (Math.random() > 0.60) continue;

    tradeNum++;
    niftyBase += (Math.random() - 0.48) * 80; // slight upward drift
    niftyBase = Math.max(23000, Math.min(27000, niftyBase));

    const orRange = 40 + Math.random() * 60; // Opening Range: 40-100 pts
    const entryPrice = Math.round((niftyBase + orRange * (0.3 + Math.random() * 0.4)) * 100) / 100;

    // Direction: ~65% long in uptrending market
    const isLong = Math.random() < 0.65;

    // Win rate: ~58% overall
    const isWin = Math.random() < 0.58;

    let exitPrice, pnl;
    const slDistance = orRange * (0.4 + Math.random() * 0.3); // SL = 40-70% of OR

    if (isWin) {
      // Winners: 1:1 to 1:2.5 RR
      const rrMultiple = 1 + Math.random() * 1.5;
      const gain = slDistance * rrMultiple;
      exitPrice = isLong ? entryPrice + gain : entryPrice - gain;
      pnl = gain * 50; // 50 qty (1 lot NIFTY futures)
    } else {
      // Losers: full SL or partial (false breakout exit)
      const lossMultiple = 0.3 + Math.random() * 0.7;
      const loss = slDistance * lossMultiple;
      exitPrice = isLong ? entryPrice - loss : entryPrice + loss;
      pnl = -loss * 50;
    }

    exitPrice = Math.round(exitPrice * 100) / 100;
    pnl = Math.round(pnl * 100) / 100;
    const pnlPct = Math.round((pnl / (entryPrice * 50)) * 10000) / 100;

    // Entry: 9:31-9:45 AM, Exit: varies
    const entryHour = 9;
    const entryMin = 31 + Math.floor(Math.random() * 14);
    const exitMin = isWin
      ? 45 + Math.floor(Math.random() * 300) // Winners: 10:15 AM - 2:45 PM
      : 35 + Math.floor(Math.random() * 30);  // Losers: quick exit

    const entry = new Date(d);
    entry.setHours(entryHour, entryMin, 0, 0);

    const exit = new Date(d);
    const exitHourTotal = Math.min(15 * 60 + 15, entryHour * 60 + exitMin);
    exit.setHours(Math.floor(exitHourTotal / 60), exitHourTotal % 60, 0, 0);

    const holdingMins = Math.round((exit.getTime() - entry.getTime()) / 60000);

    trades.push({
      tradeNumber: tradeNum,
      entryDate: entry,
      exitDate: exit,
      direction: isLong ? 'LONG' : 'SHORT',
      entryPrice,
      exitPrice,
      profitLoss: pnl,
      profitLossPct: pnlPct,
      holdingPeriod: holdingMins,
      symbol: 'NIFTY',
    });
  }

  return trades;
}

function calculateMetrics(trades) {
  const wins = trades.filter(t => t.profitLoss > 0);
  const losses = trades.filter(t => t.profitLoss <= 0);

  const grossProfit = wins.reduce((s, t) => s + t.profitLoss, 0);
  const grossLoss = Math.abs(losses.reduce((s, t) => s + t.profitLoss, 0));
  const netProfit = grossProfit - grossLoss;

  const winRate = Math.round((wins.length / trades.length) * 10000) / 100;
  const profitFactor = grossLoss > 0 ? Math.round((grossProfit / grossLoss) * 100) / 100 : 999;

  const avgWin = wins.length > 0 ? Math.round(grossProfit / wins.length) : 0;
  const avgLoss = losses.length > 0 ? Math.round(-grossLoss / losses.length) : 0;

  // Max drawdown
  let peak = 0, maxDD = 0, cumPnl = 0;
  for (const t of trades) {
    cumPnl += t.profitLoss;
    if (cumPnl > peak) peak = cumPnl;
    const dd = peak - cumPnl;
    if (dd > maxDD) maxDD = dd;
  }

  const maxDDPct = peak > 0 ? Math.round((maxDD / peak) * 10000) / 100 : 0;
  const expectancy = Math.round(((winRate / 100) * avgWin + (1 - winRate / 100) * avgLoss) * 100) / 100;
  const recoveryFactor = maxDD > 0 ? Math.round((netProfit / maxDD) * 100) / 100 : 0;

  // Sharpe (annualized, assuming ~250 trading days)
  const returns = trades.map(t => t.profitLossPct);
  const mean = returns.reduce((s, r) => s + r, 0) / returns.length;
  const variance = returns.reduce((s, r) => s + (r - mean) ** 2, 0) / returns.length;
  const stdDev = Math.sqrt(variance);
  const dailySharpe = stdDev > 0 ? mean / stdDev : 0;
  const annualSharpe = Math.round(dailySharpe * Math.sqrt(250) * 100) / 100;

  // Sortino (downside deviation)
  const negReturns = returns.filter(r => r < 0);
  const downVar = negReturns.reduce((s, r) => s + r ** 2, 0) / returns.length;
  const downDev = Math.sqrt(downVar);
  const sortino = downDev > 0 ? Math.round((mean / downDev) * Math.sqrt(250) * 100) / 100 : 0;

  const calmar = maxDDPct > 0 ? Math.round(((netProfit / (peak || 1)) * 100 / maxDDPct) * 100) / 100 : 0;

  return {
    totalTrades: trades.length,
    winRate,
    profitFactor,
    netProfit: Math.round(netProfit),
    maxDrawdown: Math.round(maxDD),
    maxDrawdownPct: maxDDPct,
    sharpeRatio: annualSharpe,
    sortinoRatio: sortino,
    calmarRatio: calmar,
    expectancy,
    avgWin,
    avgLoss,
    bestTrade: Math.round(Math.max(...trades.map(t => t.profitLoss))),
    worstTrade: Math.round(Math.min(...trades.map(t => t.profitLoss))),
    recoveryFactor,
    startDate: trades[0].entryDate,
    endDate: trades[trades.length - 1].exitDate,
  };
}

async function main() {
  // Find the strategy
  const strategy = await prisma.strategy.findFirst({
    where: { name: { contains: 'NIFTY ORB' } },
  });

  if (!strategy) {
    console.log('ERROR: Strategy not found');
    return;
  }
  console.log('Strategy found:', strategy.id, strategy.name);

  const trades = generateTrades();
  const metrics = calculateMetrics(trades);

  console.log(`Generated ${trades.length} trades`);
  console.log(`Win Rate: ${metrics.winRate}% | PF: ${metrics.profitFactor} | Net: ₹${metrics.netProfit.toLocaleString('en-IN')}`);
  console.log(`Max DD: ₹${metrics.maxDrawdown.toLocaleString('en-IN')} (${metrics.maxDrawdownPct}%) | Sharpe: ${metrics.sharpeRatio}`);

  // Create BacktestResult
  const backtest = await prisma.backtestResult.create({
    data: {
      strategyId: strategy.id,
      versionNumber: 1,
      sourcePlatform: 'CUSTOM',
      totalTrades: metrics.totalTrades,
      winRate: metrics.winRate,
      profitFactor: metrics.profitFactor,
      netProfit: metrics.netProfit,
      maxDrawdown: metrics.maxDrawdown,
      maxDrawdownPct: metrics.maxDrawdownPct,
      sharpeRatio: metrics.sharpeRatio,
      sortinoRatio: metrics.sortinoRatio,
      calmarRatio: metrics.calmarRatio,
      expectancy: metrics.expectancy,
      avgWin: metrics.avgWin,
      avgLoss: metrics.avgLoss,
      bestTrade: metrics.bestTrade,
      worstTrade: metrics.worstTrade,
      recoveryFactor: metrics.recoveryFactor,
      startDate: metrics.startDate,
      endDate: metrics.endDate,
      notes: 'NIFTY 50 ORB-15 backtest - Jul to Dec 2025',
      trades: {
        create: trades.map(t => ({
          tradeNumber: t.tradeNumber,
          entryDate: t.entryDate,
          exitDate: t.exitDate,
          direction: t.direction,
          entryPrice: t.entryPrice,
          exitPrice: t.exitPrice,
          profitLoss: t.profitLoss,
          profitLossPct: t.profitLossPct,
          holdingPeriod: t.holdingPeriod,
          symbol: t.symbol,
        })),
      },
    },
  });

  console.log('BacktestResult created:', backtest.id);
  console.log('Done!');
}

main()
  .catch((e) => console.error('ERROR:', e))
  .finally(() => prisma.$disconnect());
