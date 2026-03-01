import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { decrypt } from "@/lib/crypto";
import { FyersAdapter } from "@/lib/brokers/fyers";

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

// GET /api/broker/fyers/positions - Get positions, holdings & funds
export async function GET(req: NextRequest) {
  try {
    const type = req.nextUrl.searchParams.get("type") || "positions";

    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const credentials = await getFyersCredentials(session.user.id);
    if (!credentials) {
      return NextResponse.json({ error: "Fyers not connected" }, { status: 400 });
    }

    const adapter = new FyersAdapter();

    if (type === "holdings") {
      const holdings = await adapter.getHoldings(credentials);
      return NextResponse.json({ holdings });
    }
    if (type === "funds") {
      const funds = await adapter.getFunds(credentials);
      return NextResponse.json({ funds });
    }

    const positions = await adapter.getPositions(credentials);
    return NextResponse.json({ positions });
  } catch (error) {
    console.error("Fyers positions error:", error);
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}

// DELETE /api/broker/fyers/positions - Close all positions
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

    const { FyersClient } = await import("@/lib/brokers/fyers");
    const client = new FyersClient(credentials.apiKey, credentials.accessToken);
    const result = await client.closeAllPositions();

    return NextResponse.json({ message: "All positions closed", result });
  } catch (error) {
    console.error("Fyers close positions error:", error);
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
