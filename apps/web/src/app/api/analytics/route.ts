import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { isDemoMode, DEMO_STRATEGIES, DEMO_PORTFOLIOS } from "@/lib/mock-data";

function getAnalyticsMockData() {
  const strategies = DEMO_STRATEGIES.filter((s) => s.backtestResults.length > 0);

  // Strategy comparison data
  const strategyComparison = strategies.map((s) => {
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

  // Monthly P&L aggregated across strategies
  const months = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
  ];
  const monthlyPnL = months.map((month, i) => {
    let total = 0;
    const stratPnLs: Record<string, number> = {};
    strategies.forEach((s) => {
      const bt = s.backtestResults[0];
      if (bt) {
        const monthPnL = Math.round(
          (bt.netProfit / 12) * (0.6 + Math.random() * 0.8)
        );
        stratPnLs[s.name] = monthPnL;
        total += monthPnL;
      }
    });
    return { month, total, ...stratPnLs };
  });

  // Win rate over time (simulated monthly)
  const winRateOverTime = months.map((month, i) => {
    const data: Record<string, any> = { month };
    strategies.forEach((s) => {
      const bt = s.backtestResults[0];
      if (bt) {
        data[s.name] = Math.round(
          bt.winRate + (Math.random() - 0.5) * 10 * 100
        ) / 100;
      }
    });
    return data;
  });

  // Cumulative equity curve
  const equityCurve = months.map((month, i) => {
    const data: Record<string, any> = { month };
    let cumTotal = 0;
    strategies.forEach((s) => {
      const bt = s.backtestResults[0];
      if (bt) {
        const cumulative = Math.round((bt.netProfit / 12) * (i + 1));
        data[s.name] = cumulative;
        cumTotal += cumulative;
      }
    });
    data["Total"] = cumTotal;
    return data;
  });

  // Risk metrics comparison
  const riskMetrics = strategies.map((s) => {
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

  // Strategy status distribution
  const allStrategies = DEMO_STRATEGIES;
  const statusDistribution = allStrategies.reduce(
    (acc, s) => {
      acc[s.status] = (acc[s.status] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  // Market distribution
  const marketDistribution = allStrategies.reduce(
    (acc, s) => {
      if (s.market) {
        acc[s.market] = (acc[s.market] || 0) + 1;
      }
      return acc;
    },
    {} as Record<string, number>
  );

  // Aggregate stats
  const totalNetProfit = strategies.reduce(
    (sum, s) => sum + (s.backtestResults[0]?.netProfit || 0),
    0
  );
  const avgWinRate =
    strategies.reduce(
      (sum, s) => sum + (s.backtestResults[0]?.winRate || 0),
      0
    ) / strategies.length;
  const avgProfitFactor =
    strategies.reduce(
      (sum, s) => sum + (s.backtestResults[0]?.profitFactor || 0),
      0
    ) / strategies.length;
  const bestStrategy = strategies.reduce((best, s) => {
    const bt = s.backtestResults[0];
    const bestBt = best.backtestResults[0];
    return bt && (!bestBt || bt.netProfit > bestBt.netProfit) ? s : best;
  }, strategies[0]);
  const worstDrawdown = Math.max(
    ...strategies.map((s) => s.backtestResults[0]?.maxDrawdownPct || 0)
  );

  return {
    strategyComparison,
    monthlyPnL,
    winRateOverTime,
    equityCurve,
    riskMetrics,
    statusDistribution,
    marketDistribution,
    aggregateStats: {
      totalNetProfit,
      avgWinRate: Math.round(avgWinRate * 100) / 100,
      avgProfitFactor: Math.round(avgProfitFactor * 100) / 100,
      totalStrategies: allStrategies.length,
      strategiesWithBacktest: strategies.length,
      bestStrategy: bestStrategy?.name || "—",
      worstDrawdown: Math.round(worstDrawdown * 100) / 100,
    },
    strategyNames: strategies.map((s) => s.name),
  };
}

export async function GET() {
  try {
    if (isDemoMode()) {
      return NextResponse.json(getAnalyticsMockData());
    }

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
      strategyNames: withBacktest.map((s) => s.name),
      monthlyPnL: [],
      winRateOverTime: [],
      equityCurve: [],
    });
  } catch (error) {
    console.error("Error fetching analytics:", error);
    return NextResponse.json(
      { error: "Failed to fetch analytics" },
      { status: 500 }
    );
  }
}
