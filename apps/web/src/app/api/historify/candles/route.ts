import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@tradeos/db";

// GET /api/historify/candles
// ?symbol=X&exchange=Y&interval=Z&from=date&to=date&format=json|csv
// Without symbol: returns catalog (one row per symbol/exchange/interval)
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const symbol = req.nextUrl.searchParams.get("symbol");
  const exchange = req.nextUrl.searchParams.get("exchange");
  const interval = req.nextUrl.searchParams.get("interval");
  const from = req.nextUrl.searchParams.get("from");
  const to = req.nextUrl.searchParams.get("to");
  const format = req.nextUrl.searchParams.get("format") || "json";

  // ── Catalog mode: no symbol specified ──────────────────────────────
  if (!symbol) {
    // Return aggregated catalog of all downloaded data for this user's watchlist
    const watchlist = await prisma.watchlist.findMany({
      where: { userId: session.user.id, isActive: true },
      select: { symbol: true, exchange: true },
    });

    const catalog = await Promise.all(
      watchlist.map(async (w) => {
        // Get all intervals available for this symbol
        const intervals = await prisma.historicalCandle.groupBy({
          by: ["interval"],
          where: { symbol: w.symbol, exchange: w.exchange },
          _count: { id: true },
          _min: { timestamp: true },
          _max: { timestamp: true },
        });
        return {
          symbol: w.symbol,
          exchange: w.exchange,
          intervals: intervals.map((i) => ({
            interval: i.interval,
            count: i._count.id,
            firstDate: i._min.timestamp,
            lastDate: i._max.timestamp,
          })),
          totalCandles: intervals.reduce((s, i) => s + i._count.id, 0),
        };
      })
    );

    return NextResponse.json({
      catalog: catalog.filter((c) => c.totalCandles > 0),
    });
  }

  // ── Candle data mode: specific symbol ──────────────────────────────
  const where: any = {
    symbol: symbol.toUpperCase(),
    exchange: (exchange || "NSE").toUpperCase(),
  };

  if (interval) where.interval = interval;
  if (from) where.timestamp = { ...where.timestamp, gte: new Date(from) };
  if (to) where.timestamp = { ...where.timestamp, lte: new Date(to) };

  const candles = await prisma.historicalCandle.findMany({
    where,
    orderBy: { timestamp: "asc" },
    take: 50000, // max 50k candles per request
  });

  // ── CSV export ──────────────────────────────────────────────────────
  if (format === "csv") {
    const header = "timestamp,open,high,low,close,volume,oi\n";
    const rows = candles
      .map(
        (c) =>
          `${c.timestamp.toISOString()},${c.open},${c.high},${c.low},${c.close},${c.volume},${c.oi ?? ""}`
      )
      .join("\n");
    const csv = header + rows;

    const filename = `${symbol}_${exchange}_${interval || "ALL"}_${from || "start"}_${to || "end"}.csv`;
    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  }

  // ── JSON response ───────────────────────────────────────────────────
  return NextResponse.json({
    symbol: symbol.toUpperCase(),
    exchange: (exchange || "NSE").toUpperCase(),
    interval: interval || "ALL",
    count: candles.length,
    candles,
  });
}

// DELETE /api/historify/candles?symbol=X&exchange=Y&interval=Z
// Delete stored candles for a symbol
export async function DELETE(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const symbol = req.nextUrl.searchParams.get("symbol");
  const exchange = req.nextUrl.searchParams.get("exchange");
  const interval = req.nextUrl.searchParams.get("interval");

  if (!symbol || !exchange) {
    return NextResponse.json(
      { error: "symbol and exchange are required" },
      { status: 400 }
    );
  }

  // Verify the symbol is in the user's watchlist (ownership check)
  const inWatchlist = await prisma.watchlist.findFirst({
    where: {
      userId: session.user.id,
      symbol: symbol.toUpperCase(),
      exchange: exchange.toUpperCase(),
    },
  });

  if (!inWatchlist) {
    return NextResponse.json(
      { error: "Symbol not in your watchlist" },
      { status: 403 }
    );
  }

  const where: any = {
    symbol: symbol.toUpperCase(),
    exchange: exchange.toUpperCase(),
  };
  if (interval) where.interval = interval;

  const { count } = await prisma.historicalCandle.deleteMany({ where });

  return NextResponse.json({ deleted: count });
}
