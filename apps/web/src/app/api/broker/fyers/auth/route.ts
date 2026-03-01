import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { FyersAdapter } from "@/lib/brokers/fyers";
import { encrypt } from "@/lib/crypto";

// POST /api/broker/fyers/auth - Exchange auth code for access token
export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { authCode } = await req.json();
    if (!authCode) {
      return NextResponse.json(
        { error: "Authorization code is required" },
        { status: 400 }
      );
    }

    const adapter = new FyersAdapter();
    const result = await adapter.authenticate(authCode);

    // Store encrypted token in DB
    const { prisma } = await import("@tradeos/db");
    await prisma.integrationSetting.upsert({
      where: {
        userId_platform: {
          userId: session.user.id,
          platform: "FYERS",
        },
      },
      update: {
        apiKeyEncrypted: encrypt(result.accessToken),
        status: "CONNECTED",
        lastSyncAt: new Date(),
      },
      create: {
        userId: session.user.id,
        platform: "FYERS",
        apiKeyEncrypted: encrypt(result.accessToken),
        status: "CONNECTED",
        lastSyncAt: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      broker: "fyers",
      message: "Fyers account connected successfully",
    });
  } catch (error) {
    console.error("Fyers auth error:", error);
    return NextResponse.json(
      { error: (error as Error).message || "Failed to authenticate with Fyers" },
      { status: 500 }
    );
  }
}

// GET /api/broker/fyers/auth - Get auth URL for OAuth redirect
export async function GET() {
  const apiKey = process.env.FYERS_API_KEY;
  const redirectUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/broker/fyers/callback`;

  if (!apiKey) {
    return NextResponse.json(
      { error: "Fyers API key not configured" },
      { status: 500 }
    );
  }

  const authUrl = `https://api-t1.fyers.in/api/v3/generate-authcode?client_id=${apiKey}&redirect_uri=${encodeURIComponent(redirectUrl)}&response_type=code&state=tradeos`;

  return NextResponse.json({ authUrl });
}
