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
