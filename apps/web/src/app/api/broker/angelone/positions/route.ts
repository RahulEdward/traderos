import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { decrypt } from "@/lib/crypto";
import { AngelOneAdapter } from "@/lib/brokers/angelone";

async function getAngelCredentials(userId: string) {
  const { prisma } = await import("@tradeos/db");
  const integration = await prisma.integrationSetting.findUnique({
    where: { userId_platform: { userId, platform: "ANGELONE" } },
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

// GET /api/broker/angelone/positions - Get positions, holdings & funds
export async function GET(req: NextRequest) {
  try {
    const type = req.nextUrl.searchParams.get("type") || "positions";

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

    const adapter = new AngelOneAdapter();

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
    console.error("AngelOne positions error:", error);
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}

// DELETE /api/broker/angelone/positions - Close all positions
export async function DELETE() {
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

    const { AngelOneClient } = await import("@/lib/brokers/angelone");
    const client = new AngelOneClient(
      credentials.apiKey,
      credentials.accessToken
    );
    const results = await client.closeAllPositions();

    return NextResponse.json({ message: "All positions closed", results });
  } catch (error) {
    console.error("AngelOne close positions error:", error);
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}
