import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";

export async function GET(req: NextRequest) {
  try {
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
        grossPnl: body.grossPnl ? parseFloat(body.grossPnl) : undefined,
        netPnl: body.netPnl ? parseFloat(body.netPnl) : undefined,
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
