import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { AngelOneAdapter } from "@/lib/brokers/angelone";
import { decrypt } from "@/lib/crypto";
import type { BrokerCredentials, OrderRequest } from "@/lib/brokers/types";

// Helper to get stored Angel One credentials for the user
async function getAngelCredentials(
  userId: string
): Promise<BrokerCredentials | null> {
  const { prisma } = await import("@tradeos/db");
  const integration = await prisma.integrationSetting.findUnique({
    where: {
      userId_platform: { userId, platform: "ANGELONE" },
    },
  });

  if (
    !integration ||
    integration.status !== "CONNECTED" ||
    !integration.apiKeyEncrypted
  ) {
    return null;
  }

  // Read the SmartAPI key from saved config (not from env var which may be empty)
  const config = typeof integration.configJson === "string"
    ? JSON.parse(integration.configJson)
    : (integration.configJson as any) || {};
  const smartApiKey = config?.smartApiKeyEncrypted
    ? decrypt(config.smartApiKeyEncrypted)
    : process.env.ANGELONE_API_KEY || "";

  return {
    apiKey: smartApiKey,
    accessToken: decrypt(integration.apiKeyEncrypted),
  };
}

// GET /api/broker/angelone/orders - Get order book
export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const credentials = await getAngelCredentials(session.user.id);
    if (!credentials) {
      return NextResponse.json(
        { error: "Angel One not connected. Please connect your broker." },
        { status: 400 }
      );
    }

    const type = req.nextUrl.searchParams.get("type") || "orders";
    const adapter = new AngelOneAdapter();

    if (type === "trades") {
      const trades = await adapter.getTradeBook(credentials);
      return NextResponse.json({ trades });
    }

    const orders = await adapter.getOrderBook(credentials);
    return NextResponse.json({ orders });
  } catch (error) {
    console.error("AngelOne orders error:", error);
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}

// POST /api/broker/angelone/orders - Place a new order
export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const credentials = await getAngelCredentials(session.user.id);
    if (!credentials) {
      return NextResponse.json(
        { error: "Angel One not connected" },
        { status: 400 }
      );
    }

    const body = await req.json();
    const order: OrderRequest = {
      symbol: body.symbol,
      exchange: body.exchange || "NSE",
      side: body.side,
      orderType: body.orderType || "MARKET",
      productType: body.productType || "INTRADAY",
      quantity: body.quantity,
      price: body.price,
      triggerPrice: body.triggerPrice,
      tag: "tradeos",
    };

    const adapter = new AngelOneAdapter();
    const result = await adapter.placeOrder(credentials, order);

    return NextResponse.json(result);
  } catch (error) {
    console.error("AngelOne place order error:", error);
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}

// DELETE /api/broker/angelone/orders - Cancel order
export async function DELETE(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const credentials = await getAngelCredentials(session.user.id);
    if (!credentials) {
      return NextResponse.json(
        { error: "Angel One not connected" },
        { status: 400 }
      );
    }

    const body = await req.json();
    const adapter = new AngelOneAdapter();

    if (body.cancelAll) {
      const { AngelOneClient } = await import("@/lib/brokers/angelone");
      const client = new AngelOneClient(
        credentials.apiKey,
        credentials.accessToken
      );
      const results = await client.cancelAllOrders();
      return NextResponse.json({ message: "All orders cancelled", results });
    }

    const result = await adapter.cancelOrder(credentials, body.orderId);
    return NextResponse.json(result);
  } catch (error) {
    console.error("AngelOne cancel order error:", error);
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}
