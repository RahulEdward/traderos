import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@tradeos/db";

interface ParsedTrade {
  tradeNumber: number;
  entryDate: string;
  exitDate: string | null;
  direction: "LONG" | "SHORT";
  entryPrice: number;
  exitPrice: number | null;
  profitLoss: number;
  profitLossPct: number;
  holdingPeriod: number;
  symbol: string;
}

// POST import backtest
export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify strategy belongs to user
    const strategy = await prisma.strategy.findFirst({
      where: { id: params.id, userId: session.user.id },
      include: { _count: { select: { backtestResults: true } } },
    });

    if (!strategy) {
      return NextResponse.json(
        { error: "Strategy not found" },
        { status: 404 }
      );
    }

    const body = await req.json();
    const {
      trades,
      sourcePlatform,
      notes,
      metrics,
    }: {
      trades: ParsedTrade[];
      sourcePlatform: string;
      notes?: string;
      metrics: any;
    } = body;

    const versionNumber = strategy._count.backtestResults + 1;

    // Create backtest result with trades
    const backtestResult = await prisma.backtestResult.create({
      data: {
        strategyId: params.id,
        versionNumber,
        sourcePlatform: sourcePlatform as any,
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
        startDate: trades.length > 0 ? new Date(trades[0].entryDate) : null,
        endDate:
          trades.length > 0
            ? new Date(trades[trades.length - 1].exitDate || trades[trades.length - 1].entryDate)
            : null,
        notes,
        trades: {
          create: trades.map((t) => ({
            tradeNumber: t.tradeNumber,
            entryDate: new Date(t.entryDate),
            exitDate: t.exitDate ? new Date(t.exitDate) : null,
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
      include: {
        trades: true,
      },
    });

    // Update strategy status to BACKTESTING if it's still in IDEA
    if (strategy.status === "IDEA" || strategy.status === "IN_DEVELOPMENT") {
      await prisma.strategy.update({
        where: { id: params.id },
        data: { status: "BACKTESTING" },
      });
    }

    return NextResponse.json(backtestResult, { status: 201 });
  } catch (error) {
    console.error("Error importing backtest:", error);
    return NextResponse.json(
      { error: "Failed to import backtest" },
      { status: 500 }
    );
  }
}
