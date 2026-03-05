import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { decrypt } from "@/lib/crypto";

// GET /api/broker/angelone/live-data - Get streaming credentials for client-side WebSocket
// Returns the feed token and config needed to connect from the frontend
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { prisma } = await import("@tradeos/db");
    const integration = await prisma.integrationSetting.findUnique({
      where: {
        userId_platform: { userId: session.user.id, platform: "ANGELONE" },
      },
    });

    if (
      !integration ||
      integration.status !== "CONNECTED" ||
      !integration.apiKeyEncrypted
    ) {
      return NextResponse.json(
        { error: "Angel One not connected" },
        { status: 400 }
      );
    }

    const config = typeof integration.configJson === "string"
      ? JSON.parse(integration.configJson)
      : (integration.configJson as any) || {};

    const authToken = decrypt(integration.apiKeyEncrypted);

    // Read SmartAPI key from stored config (not from env var which may be empty)
    const smartApiKey = config?.smartApiKeyEncrypted
      ? decrypt(config.smartApiKeyEncrypted)
      : process.env.ANGELONE_API_KEY || "";

    return NextResponse.json({
      wsUrl: "wss://smartapisocket.angelone.in/smart-stream",
      apiKey: smartApiKey,
      clientCode: config?.clientCode || "",
      authToken,
      // feedToken would be stored during auth if available
      feedToken: config?.feedToken
        ? decrypt(config.feedToken)
        : authToken,
    });
  } catch (error) {
    console.error("AngelOne live-data creds error:", error);
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}

// POST /api/broker/angelone/live-data - Server-side streaming management
// Used to start/stop server-managed streams that broadcast via Socket.io
export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { action, exchange, tokens, mode } = body;

    if (!action || !exchange || !tokens?.length) {
      return NextResponse.json(
        { error: "action, exchange, and tokens are required" },
        { status: 400 }
      );
    }

    // For now, return streaming config for the Express backend to manage
    // The Express server (apps/api) will handle actual WebSocket connections
    const wsApiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

    // Forward to Express backend
    const res = await fetch(`${wsApiUrl}/api/stream/angelone`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId: session.user.id,
        action, // "subscribe" | "unsubscribe"
        exchange,
        tokens,
        mode: mode || 1, // default LTP
      }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      return NextResponse.json(
        { error: err.error || "Stream management failed" },
        { status: res.status }
      );
    }

    const result = await res.json();
    return NextResponse.json(result);
  } catch (error) {
    console.error("AngelOne stream management error:", error);
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}
