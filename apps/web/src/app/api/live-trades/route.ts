import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { isDemoMode, DEMO_STRATEGIES } from "@/lib/mock-data";

function getDemoLiveTrades() {
  const trades = [
    {
      id: "lt-001",
      strategyId: "strat-001",
      userId: "demo-user-001",
      entryDate: "2025-02-10T09:30:00",
      exitDate: "2025-02-10T14:15:00",
      symbol: "NIFTY 50",
      direction: "LONG",
      entryPrice: 22450.5,
      exitPrice: 22520.3,
      quantity: 50,
      grossPnl: 3490,
      netPnl: 3250,
      broker: "Zerodha",
      notes: "Clean breakout above PDH with volume confirmation",
      screenshotUrl: null,
      createdAt: "2025-02-10T14:30:00",
      strategy: { id: "strat-001", name: "Nifty 50 Breakout" },
    },
    {
      id: "lt-002",
      strategyId: "strat-001",
      userId: "demo-user-001",
      entryDate: "2025-02-12T10:00:00",
      exitDate: "2025-02-12T13:45:00",
      symbol: "NIFTY 50",
      direction: "LONG",
      entryPrice: 22580.0,
      exitPrice: 22510.5,
      quantity: 50,
      grossPnl: -3475,
      netPnl: -3715,
      broker: "Zerodha",
      notes: "False breakout, stopped out",
      screenshotUrl: null,
      createdAt: "2025-02-12T14:00:00",
      strategy: { id: "strat-001", name: "Nifty 50 Breakout" },
    },
    {
      id: "lt-003",
      strategyId: "strat-001",
      userId: "demo-user-001",
      entryDate: "2025-02-14T09:45:00",
      exitDate: "2025-02-14T15:00:00",
      symbol: "NIFTY 50",
      direction: "SHORT",
      entryPrice: 22620.0,
      exitPrice: 22540.5,
      quantity: 50,
      grossPnl: 3975,
      netPnl: 3735,
      broker: "Zerodha",
      notes: "Breakdown below support with sector weakness",
      screenshotUrl: null,
      createdAt: "2025-02-14T15:15:00",
      strategy: { id: "strat-001", name: "Nifty 50 Breakout" },
    },
    {
      id: "lt-004",
      strategyId: "strat-005",
      userId: "demo-user-001",
      entryDate: "2025-02-17T09:50:00",
      exitDate: "2025-02-17T14:30:00",
      symbol: "HDFCBANK",
      direction: "LONG",
      entryPrice: 1685.5,
      exitPrice: 1702.8,
      quantity: 300,
      grossPnl: 5190,
      netPnl: 4950,
      broker: "Angel One",
      notes: "ORB breakout with strong volume",
      screenshotUrl: null,
      createdAt: "2025-02-17T14:45:00",
      strategy: { id: "strat-005", name: "HDFC Bank Range Breakout" },
    },
    {
      id: "lt-005",
      strategyId: "strat-001",
      userId: "demo-user-001",
      entryDate: "2025-02-19T09:30:00",
      exitDate: "2025-02-19T12:00:00",
      symbol: "NIFTY 50",
      direction: "LONG",
      entryPrice: 22700.0,
      exitPrice: 22780.5,
      quantity: 50,
      grossPnl: 4025,
      netPnl: 3785,
      broker: "Zerodha",
      notes: "Gap up breakout, rode the momentum",
      screenshotUrl: null,
      createdAt: "2025-02-19T12:15:00",
      strategy: { id: "strat-001", name: "Nifty 50 Breakout" },
    },
    {
      id: "lt-006",
      strategyId: "strat-001",
      userId: "demo-user-001",
      entryDate: "2025-02-21T10:15:00",
      exitDate: "2025-02-21T14:45:00",
      symbol: "NIFTY 50",
      direction: "LONG",
      entryPrice: 22820.0,
      exitPrice: 22870.3,
      quantity: 50,
      grossPnl: 2515,
      netPnl: 2275,
      broker: "Zerodha",
      notes: "Moderate breakout, partial target hit",
      screenshotUrl: null,
      createdAt: "2025-02-21T15:00:00",
      strategy: { id: "strat-001", name: "Nifty 50 Breakout" },
    },
  ];

  const totalPnl = trades.reduce((sum, t) => sum + t.netPnl, 0);
  const totalInvested = 500000;
  const winningTrades = trades.filter((t) => t.netPnl > 0).length;

  return {
    trades,
    summary: {
      totalTrades: trades.length,
      totalPnl,
      totalInvested,
      pnlPercentage: ((totalPnl / totalInvested) * 100).toFixed(2),
      winningTrades,
      losingTrades: trades.length - winningTrades,
      avgSlippage: 240,
      worstSlippage: 475,
    },
  };
}

export async function GET(req: NextRequest) {
  try {
    if (isDemoMode()) {
      const strategyId = req.nextUrl.searchParams.get("strategyId");
      const data = getDemoLiveTrades();
      if (strategyId) {
        data.trades = data.trades.filter((t) => t.strategyId === strategyId);
      }
      return NextResponse.json(data);
    }

    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { prisma } = await import("@tradeos/db");
    const strategyId = req.nextUrl.searchParams.get("strategyId");

    const where: any = { userId: session.user.id };
    if (strategyId) where.strategyId = strategyId;

    const trades = await prisma.liveTrade.findMany({
      where,
      include: { strategy: { select: { id: true, name: true } } },
      orderBy: { entryDate: "desc" },
    });

    const totalPnl = trades.reduce((sum, t) => sum + (t.netPnl || 0), 0);
    const winningTrades = trades.filter((t) => (t.netPnl || 0) > 0).length;

    return NextResponse.json({
      trades,
      summary: {
        totalTrades: trades.length,
        totalPnl,
        totalInvested: 0,
        pnlPercentage: "0.00",
        winningTrades,
        losingTrades: trades.length - winningTrades,
        avgSlippage: 0,
        worstSlippage: 0,
      },
    });
  } catch (error) {
    console.error("Error fetching live trades:", error);
    return NextResponse.json({ error: "Failed to fetch live trades" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    if (isDemoMode()) {
      return NextResponse.json({ id: "lt-new", message: "Trade logged (demo)" });
    }

    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { prisma } = await import("@tradeos/db");

    const trade = await prisma.liveTrade.create({
      data: {
        userId: session.user.id,
        strategyId: body.strategyId,
        entryDate: new Date(body.entryDate),
        exitDate: body.exitDate ? new Date(body.exitDate) : null,
        symbol: body.symbol,
        direction: body.direction,
        entryPrice: parseFloat(body.entryPrice),
        exitPrice: body.exitPrice ? parseFloat(body.exitPrice) : null,
        quantity: parseInt(body.quantity),
        grossPnl: body.grossPnl ? parseFloat(body.grossPnl) : null,
        netPnl: body.netPnl ? parseFloat(body.netPnl) : null,
        broker: body.broker || null,
        notes: body.notes || null,
        screenshotUrl: body.screenshotUrl || null,
      },
    });

    return NextResponse.json(trade);
  } catch (error) {
    console.error("Error creating live trade:", error);
    return NextResponse.json({ error: "Failed to log trade" }, { status: 500 });
  }
}
