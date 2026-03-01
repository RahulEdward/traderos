import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { AngelOneAdapter } from "@/lib/brokers/angelone";
import { encrypt } from "@/lib/crypto";

// POST /api/broker/angelone/auth - Login with client code + password + TOTP
export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { clientCode, password, totp } = await req.json();
    if (!clientCode || !password || !totp) {
      return NextResponse.json(
        { error: "Client code, password, and TOTP are required" },
        { status: 400 }
      );
    }

    const adapter = new AngelOneAdapter();
    const result = await adapter.authenticate(
      JSON.stringify({ clientCode, password, totp })
    );

    // Store encrypted tokens in DB
    const { prisma } = await import("@tradeos/db");

    // Store JWT token encrypted, and feedToken + clientCode in configJson
    await prisma.integrationSetting.upsert({
      where: {
        userId_platform: {
          userId: session.user.id,
          platform: "ANGELONE",
        },
      },
      update: {
        apiKeyEncrypted: encrypt(result.accessToken),
        status: "CONNECTED",
        lastSyncAt: new Date(),
        configJson: {
          clientCode,
          refreshToken: result.refreshToken
            ? encrypt(result.refreshToken)
            : null,
        },
      },
      create: {
        userId: session.user.id,
        platform: "ANGELONE",
        apiKeyEncrypted: encrypt(result.accessToken),
        status: "CONNECTED",
        lastSyncAt: new Date(),
        configJson: {
          clientCode,
          refreshToken: result.refreshToken
            ? encrypt(result.refreshToken)
            : null,
        },
      },
    });

    return NextResponse.json({
      success: true,
      broker: "angelone",
      message: "Angel One account connected successfully",
    });
  } catch (error) {
    console.error("AngelOne auth error:", error);
    return NextResponse.json(
      {
        error:
          (error as Error).message || "Failed to authenticate with Angel One",
      },
      { status: 500 }
    );
  }
}

// GET /api/broker/angelone/auth - Get connection status
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { prisma } = await import("@tradeos/db");
    const integration = await prisma.integrationSetting.findUnique({
      where: {
        userId_platform: {
          userId: session.user.id,
          platform: "ANGELONE",
        },
      },
    });

    if (!integration || integration.status !== "CONNECTED") {
      return NextResponse.json({
        connected: false,
        broker: "angelone",
      });
    }

    const config = integration.configJson as any;

    return NextResponse.json({
      connected: true,
      broker: "angelone",
      clientCode: config?.clientCode || "",
      lastSyncAt: integration.lastSyncAt,
    });
  } catch (error) {
    console.error("AngelOne status error:", error);
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}

// DELETE /api/broker/angelone/auth - Disconnect broker
export async function DELETE() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { prisma, Prisma } = await import("@tradeos/db");
    await prisma.integrationSetting.update({
      where: {
        userId_platform: {
          userId: session.user.id,
          platform: "ANGELONE",
        },
      },
      data: {
        status: "DISCONNECTED",
        apiKeyEncrypted: null,
        configJson: Prisma.DbNull,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Angel One account disconnected",
    });
  } catch (error) {
    console.error("AngelOne disconnect error:", error);
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}
