import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@tradeos/db";

// GET /api/historify/watchlist
// Returns user's watchlist with candle data summary
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const items = await prisma.watchlist.findMany({
    where: { userId: session.user.id, isActive: true },
    orderBy: { createdAt: "asc" },
  });

  // Get candle stats for each symbol
  const symbolStats = await Promise.all(
    items.map(async (item) => {
      const stats = await prisma.historicalCandle.aggregate({
        where: { symbol: item.symbol, exchange: item.exchange },
        _count: { id: true },
        _min: { timestamp: true },
        _max: { timestamp: true },
      });
      return {
        ...item,
        candleCount: stats._count.id,
        firstDate: stats._min.timestamp,
        lastDate: stats._max.timestamp,
      };
    })
  );

  return NextResponse.json({ watchlist: symbolStats });
}

// POST /api/historify/watchlist
// Add symbols to watchlist
// Body: { symbols: [{ symbol, exchange, instrumentType?, lotSize?, brokerSymbol? }] }
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { symbols } = body as {
    symbols: Array<{
      symbol: string;
      exchange: string;
      instrumentType?: string;
      lotSize?: number;
      brokerSymbol?: string;
    }>;
  };

  if (!symbols || !Array.isArray(symbols) || symbols.length === 0) {
    return NextResponse.json(
      { error: "symbols array is required" },
      { status: 400 }
    );
  }

  const added: string[] = [];
  const skipped: string[] = [];

  for (const s of symbols) {
    if (!s.symbol || !s.exchange) continue;
    try {
      await prisma.watchlist.upsert({
        where: {
          userId_symbol_exchange: {
            userId: session.user.id,
            symbol: s.symbol.toUpperCase(),
            exchange: s.exchange.toUpperCase(),
          },
        },
        update: { isActive: true },
        create: {
          userId: session.user.id,
          symbol: s.symbol.toUpperCase(),
          exchange: s.exchange.toUpperCase(),
          instrumentType: s.instrumentType,
          lotSize: s.lotSize,
          brokerSymbol: s.brokerSymbol,
          isActive: true,
        },
      });
      added.push(`${s.symbol}:${s.exchange}`);
    } catch {
      skipped.push(`${s.symbol}:${s.exchange}`);
    }
  }

  return NextResponse.json({ added, skipped, total: added.length });
}

// DELETE /api/historify/watchlist?symbol=X&exchange=Y
export async function DELETE(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const symbol = req.nextUrl.searchParams.get("symbol");
  const exchange = req.nextUrl.searchParams.get("exchange");

  if (!symbol || !exchange) {
    return NextResponse.json(
      { error: "symbol and exchange are required" },
      { status: 400 }
    );
  }

  await prisma.watchlist.updateMany({
    where: {
      userId: session.user.id,
      symbol: symbol.toUpperCase(),
      exchange: exchange.toUpperCase(),
    },
    data: { isActive: false },
  });

  return NextResponse.json({ success: true });
}
