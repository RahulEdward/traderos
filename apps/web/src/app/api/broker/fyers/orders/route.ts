import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { FyersAdapter } from "@/lib/brokers/fyers";
import { decrypt } from "@/lib/crypto";
import type { BrokerCredentials, OrderRequest } from "@/lib/brokers/types";

// Helper to get stored Fyers credentials for the user
async function getFyersCredentials(userId: string): Promise<BrokerCredentials | null> {
  const { prisma } = await import("@tradeos/db");
  const integration = await prisma.integrationSetting.findUnique({
    where: {
      userId_platform: { userId, platform: "FYERS" },
    },
  });

  if (!integration || integration.status !== "CONNECTED" || !integration.apiKeyEncrypted) {
    return null;
  }

  return {
    apiKey: process.env.FYERS_API_KEY || "",
    accessToken: decrypt(integration.apiKeyEncrypted),
  };
}

// GET /api/broker/fyers/orders - Get order book
export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const credentials = await getFyersCredentials(session.user.id);
    if (!credentials) {
      return NextResponse.json(
        { error: "Fyers not connected. Please connect your broker." },
        { status: 400 }
      );
    }

    const adapter = new FyersAdapter();
    const orders = await adapter.getOrderBook(credentials);

    return NextResponse.json({ orders });
  } catch (error) {
    console.error("Fyers orders error:", error);
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}

// POST /api/broker/fyers/orders - Place a new order
export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const credentials = await getFyersCredentials(session.user.id);
    if (!credentials) {
      return NextResponse.json(
        { error: "Fyers not connected" },
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

    const adapter = new FyersAdapter();
    const result = await adapter.placeOrder(credentials, order);

    return NextResponse.json(result);
  } catch (error) {
    console.error("Fyers place order error:", error);
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}

// DELETE /api/broker/fyers/orders - Cancel order
export async function DELETE(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const credentials = await getFyersCredentials(session.user.id);
    if (!credentials) {
      return NextResponse.json({ error: "Fyers not connected" }, { status: 400 });
    }

    const body = await req.json();
    const adapter = new FyersAdapter();
    const result = await adapter.cancelOrder(credentials, body.orderId);

    return NextResponse.json(result);
  } catch (error) {
    console.error("Fyers cancel order error:", error);
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}
