import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { runBacktest, calculateAFMLStatistics } from "@/lib/backtest";
import type { BacktestTrade, BacktestConfig, BacktestMethod } from "@/lib/backtest";

/**
 * POST /api/backtest/run
 * Run a backtest using AFML methods (WF, CV, CPCV, Synthetic)
 *
 * Body: { strategyId, method, config }
 * Returns: BacktestRunResult with full AFML statistics
 */
export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { strategyId, method, config } = body as {
      strategyId: string;
      method: BacktestMethod;
      config?: Partial<BacktestConfig>;
    };

    if (!strategyId || !method) {
      return NextResponse.json(
        { error: "strategyId and method are required" },
        { status: 400 }
      );
    }

    const { prisma } = await import("@tradeos/db");

    // Get the latest backtest result trades for this strategy
    const backtestResult = await prisma.backtestResult.findFirst({
      where: { strategyId, strategy: { userId: session.user.id } },
      orderBy: { importedAt: "desc" },
      include: { trades: { orderBy: { tradeNumber: "asc" } } },
    });

    if (!backtestResult || backtestResult.trades.length < 5) {
      return NextResponse.json(
        { error: "Need at least 5 imported trades to run backtest analysis" },
        { status: 400 }
      );
    }

    const trades: BacktestTrade[] = backtestResult.trades.map((t) => ({
      tradeNumber: t.tradeNumber,
      entryDate: t.entryDate,
      exitDate: t.exitDate || t.entryDate,
      direction: t.direction as "LONG" | "SHORT",
      entryPrice: t.entryPrice,
      exitPrice: t.exitPrice || t.entryPrice,
      profitLoss: t.profitLoss,
      profitLossPct: t.profitLossPct || 0,
      holdingPeriod: t.holdingPeriod || 1,
      symbol: t.symbol || backtestResult.strategyId,
    }));

    const backtestConfig: BacktestConfig = {
      method,
      trainWindow: config?.trainWindow,
      testWindow: config?.testWindow,
      kFolds: config?.kFolds || 5,
      purgeWindow: config?.purgeWindow || Math.max(1, Math.floor(trades.length * 0.02)),
      embargoWindow: config?.embargoWindow || Math.max(1, Math.floor(trades.length * 0.01)),
      nGroups: config?.nGroups || Math.min(10, Math.floor(trades.length / 5)),
      kTestGroups: config?.kTestGroups || 2,
      nPaths: config?.nPaths || 10000,
      maxHoldingPeriod: config?.maxHoldingPeriod || 50,
    };

    const result = runBacktest(trades, backtestConfig);

    return NextResponse.json({
      success: true,
      result: {
        method: result.method,
        config: result.config,
        statistics: result.statistics,
        sharpeDistribution: result.sharpeDistribution,
        numPaths: result.paths.length,
        pathSummary: result.paths.slice(0, 20).map((p) => ({
          pathId: p.pathId,
          sharpeRatio: p.sharpeRatio,
          pnl: p.pnl,
          tradeCount: p.trades.length,
        })),
        runTimestamp: result.runTimestamp,
      },
    });
  } catch (error) {
    console.error("Backtest run error:", error);
    return NextResponse.json(
      { error: "Failed to run backtest" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/backtest/run?strategyId=xxx
 * Get AFML statistics for a strategy's existing trades (no backtesting method, just stats)
 */
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const strategyId = req.nextUrl.searchParams.get("strategyId");

  if (!strategyId) {
    return NextResponse.json(
      { error: "strategyId required" },
      { status: 400 }
    );
  }

  const { prisma } = await import("@tradeos/db");

  // Get the latest backtest result trades for this strategy
  const backtestResult = await prisma.backtestResult.findFirst({
    where: { strategyId, strategy: { userId: session.user.id } },
    orderBy: { importedAt: "desc" },
    include: { trades: { orderBy: { tradeNumber: "asc" } } },
  });

  if (!backtestResult || backtestResult.trades.length === 0) {
    return NextResponse.json({ error: "No trades found" }, { status: 404 });
  }

  const trades: BacktestTrade[] = backtestResult.trades.map((t) => ({
    tradeNumber: t.tradeNumber,
    entryDate: t.entryDate,
    exitDate: t.exitDate || t.entryDate,
    direction: t.direction as "LONG" | "SHORT",
    entryPrice: t.entryPrice,
    exitPrice: t.exitPrice || t.entryPrice,
    profitLoss: t.profitLoss,
    profitLossPct: t.profitLossPct || 0,
    holdingPeriod: t.holdingPeriod || 1,
    symbol: t.symbol || backtestResult.strategyId,
  }));

  const stats = calculateAFMLStatistics(trades, {
    numTrials: 1,
    varianceOfTrialSRs: 0.5,
    targetSR: 1.0,
  });

  return NextResponse.json({ success: true, statistics: stats });
}
