import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;
    const { prisma } = await import("@tradeos/db");

    const strategies = await prisma.strategy.findMany({
      where: { userId },
      include: {
        backtestResults: {
          orderBy: { importedAt: "desc" },
          take: 1,
        },
      },
    });

    const withBacktest = strategies.filter((s) => s.backtestResults.length > 0);

    const strategyComparison = withBacktest.map((s) => {
      const bt = s.backtestResults[0];
      return {
        name: s.name,
        winRate: bt.winRate,
        profitFactor: bt.profitFactor,
        netProfit: bt.netProfit,
        maxDrawdownPct: bt.maxDrawdownPct,
        sharpeRatio: bt.sharpeRatio,
        totalTrades: bt.totalTrades,
        status: s.status,
      };
    });

    const totalNetProfit = withBacktest.reduce(
      (sum, s) => sum + (s.backtestResults[0]?.netProfit || 0),
      0
    );
    const avgWinRate = withBacktest.length
      ? withBacktest.reduce(
        (sum, s) => sum + (s.backtestResults[0]?.winRate || 0),
        0
      ) / withBacktest.length
      : 0;
    const avgProfitFactor = withBacktest.length
      ? withBacktest.reduce(
        (sum, s) => sum + (s.backtestResults[0]?.profitFactor || 0),
        0
      ) / withBacktest.length
      : 0;

    const statusDistribution = strategies.reduce(
      (acc, s) => {
        acc[s.status] = (acc[s.status] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    );

    const marketDistribution = strategies.reduce(
      (acc, s) => {
        if (s.market) {
          acc[s.market] = (acc[s.market] || 0) + 1;
        }
        return acc;
      },
      {} as Record<string, number>
    );

    const riskMetrics = withBacktest.map((s) => {
      const bt = s.backtestResults[0];
      return {
        name: s.name,
        sharpeRatio: bt.sharpeRatio,
        sortinoRatio: bt.sortinoRatio,
        calmarRatio: bt.calmarRatio,
        maxDrawdownPct: bt.maxDrawdownPct,
        recoveryFactor: bt.recoveryFactor,
      };
    });

    // Build equity curve and monthly P&L from trades
    const strategiesWithTrades = await prisma.strategy.findMany({
      where: { userId },
      include: {
        backtestResults: {
          orderBy: { importedAt: "desc" },
          take: 1,
          include: { trades: { orderBy: { tradeNumber: "asc" } } },
        },
      },
    });

    const monthlyMap = new Map<string, { month: string; total: number;[key: string]: any }>();
    const equityCurveMap = new Map<string, { month: string; Total: number;[key: string]: any }>();
    const activeStrategyNames: string[] = [];

    for (const strat of strategiesWithTrades) {
      const bt = strat.backtestResults[0];
      if (!bt?.trades?.length) continue;
      activeStrategyNames.push(strat.name);

      let cumPnl = 0;
      const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

      for (const trade of bt.trades) {
        cumPnl += trade.profitLoss;
        const d = new Date(trade.exitDate || trade.entryDate);
        const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
        const monthLabel = `${monthNames[d.getMonth()]} ${d.getFullYear()}`;

        // Monthly P&L
        if (!monthlyMap.has(monthKey)) {
          monthlyMap.set(monthKey, { month: monthLabel, total: 0 });
        }
        const mEntry = monthlyMap.get(monthKey)!;
        mEntry.total += trade.profitLoss;

        // Equity curve (per strategy + total)
        if (!equityCurveMap.has(monthKey)) {
          equityCurveMap.set(monthKey, { month: monthLabel, Total: 0 });
        }
        const eqEntry = equityCurveMap.get(monthKey)!;
        eqEntry[strat.name] = cumPnl;
      }
    }

    // Sort by month key and compute running total
    const sortedMonthlyKeys = Array.from(monthlyMap.keys()).sort();
    const monthlyPnL = sortedMonthlyKeys.map((k) => monthlyMap.get(k)!);

    const sortedEquityKeys = Array.from(equityCurveMap.keys()).sort();
    let runningTotal = 0;
    const equityCurve = sortedEquityKeys.map((k) => {
      const entry = equityCurveMap.get(k)!;
      // Sum all strategy values for the total
      let monthTotal = 0;
      for (const name of activeStrategyNames) {
        if (entry[name] !== undefined) {
          monthTotal = entry[name]; // Use the last cumPnl for this month
        }
      }
      entry.Total = monthTotal;
      return entry;
    });

    return NextResponse.json({
      strategyComparison,
      riskMetrics,
      statusDistribution,
      marketDistribution,
      aggregateStats: {
        totalNetProfit,
        avgWinRate: Math.round(avgWinRate * 100) / 100,
        avgProfitFactor: Math.round(avgProfitFactor * 100) / 100,
        totalStrategies: strategies.length,
        strategiesWithBacktest: withBacktest.length,
        bestStrategy:
          withBacktest.sort(
            (a, b) => b.backtestResults[0].netProfit - a.backtestResults[0].netProfit
          )[0]?.name || "—",
        worstDrawdown: Math.max(
          ...withBacktest.map((s) => s.backtestResults[0]?.maxDrawdownPct || 0),
          0
        ),
      },
      strategyNames: activeStrategyNames.length > 0 ? activeStrategyNames : withBacktest.map((s) => s.name),
      monthlyPnL,
      winRateOverTime: [],
      equityCurve,
    });
  } catch (error) {
    console.error("Error fetching analytics:", error);
    return NextResponse.json(
      { error: "Failed to fetch analytics" },
      { status: 500 }
    );
  }
}
