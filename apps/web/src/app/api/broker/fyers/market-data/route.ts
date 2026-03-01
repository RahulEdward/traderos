import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { decrypt } from "@/lib/crypto";
import { FyersAdapter } from "@/lib/brokers/fyers";
import type { Exchange, Resolution } from "@/lib/brokers/types";

async function getFyersCredentials(userId: string) {
  const { prisma } = await import("@tradeos/db");
  const integration = await prisma.integrationSetting.findUnique({
    where: { userId_platform: { userId, platform: "FYERS" } },
  });
  if (!integration || integration.status !== "CONNECTED" || !integration.apiKeyEncrypted) {
    return null;
  }
  return {
    apiKey: process.env.FYERS_API_KEY || "",
    accessToken: decrypt(integration.apiKeyEncrypted),
  };
}

// GET /api/broker/fyers/market-data?type=quote|depth|history&symbol=RELIANCE&exchange=NSE
export async function GET(req: NextRequest) {
  try {
    const type = req.nextUrl.searchParams.get("type") || "quote";
    const symbol = req.nextUrl.searchParams.get("symbol") || "";
    const exchange = (req.nextUrl.searchParams.get("exchange") || "NSE") as Exchange;

    if (!symbol) {
      return NextResponse.json({ error: "Symbol is required" }, { status: 400 });
    }

    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const credentials = await getFyersCredentials(session.user.id);
    if (!credentials) {
      return NextResponse.json({ error: "Fyers not connected" }, { status: 400 });
    }

    const adapter = new FyersAdapter();

    if (type === "depth") {
      const depth = await adapter.getMarketDepth(credentials, symbol, exchange);
      return NextResponse.json({ depth });
    }

    if (type === "history") {
      const resolution = (req.nextUrl.searchParams.get("resolution") || "1D") as Resolution;
      const fromDate = req.nextUrl.searchParams.get("from") || "";
      const toDate = req.nextUrl.searchParams.get("to") || "";

      if (!fromDate || !toDate) {
        return NextResponse.json(
          { error: "from and to dates are required for historical data" },
          { status: 400 }
        );
      }

      const bars = await adapter.getHistoricalData(
        credentials,
        symbol,
        exchange,
        resolution,
        fromDate,
        toDate
      );
      return NextResponse.json({ bars });
    }

    const quote = await adapter.getQuote(credentials, symbol, exchange);
    return NextResponse.json({ quote });
  } catch (error) {
    console.error("Fyers market data error:", error);
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
