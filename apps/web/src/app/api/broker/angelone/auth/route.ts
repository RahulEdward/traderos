import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { AngelOneClient } from "@/lib/brokers/angelone/client";
import { encrypt, decrypt } from "@/lib/crypto";

// ─── POST /api/broker/angelone/auth ──────────────────────────────
// action: "save"    → save API Key + Client Code + MPIN encrypted (no connect yet)
// action: "connect" → use saved credentials + TOTP to authenticate
export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { action } = body;
    const { prisma } = await import("@tradeos/db");

    // ── SAVE CREDENTIALS ────────────────────────────────────────
    if (action === "save") {
      const { apiKey, clientCode, mpin } = body;
      if (!apiKey || !clientCode || !mpin) {
        return NextResponse.json(
          { error: "API Key, Client Code, and MPIN are required" },
          { status: 400 }
        );
      }

      const savedConfig = JSON.stringify({
        clientCode,
        smartApiKeyEncrypted: encrypt(apiKey),
        mpinEncrypted: encrypt(mpin),
      });

      await prisma.integrationSetting.upsert({
        where: {
          userId_platform: { userId: session.user.id, platform: "ANGELONE" },
        },
        update: {
          status: "SAVED",
          apiKeyEncrypted: null,
          lastSyncAt: new Date(),
          configJson: savedConfig,
        },
        create: {
          userId: session.user.id,
          platform: "ANGELONE",
          status: "SAVED",
          apiKeyEncrypted: null,
          lastSyncAt: new Date(),
          configJson: savedConfig,
        },
      });

      return NextResponse.json({
        success: true,
        message: "Angel One credentials saved. Enter TOTP to connect.",
      });
    }

    // ── CONNECT WITH TOTP ───────────────────────────────────────
    if (action === "connect") {
      const { totp } = body;
      if (!totp) {
        return NextResponse.json(
          { error: "TOTP is required to connect" },
          { status: 400 }
        );
      }

      // Load saved credentials
      const integration = await prisma.integrationSetting.findUnique({
        where: {
          userId_platform: { userId: session.user.id, platform: "ANGELONE" },
        },
      });

      if (!integration || !integration.configJson) {
        return NextResponse.json(
          { error: "No saved credentials found. Please save your credentials first." },
          { status: 400 }
        );
      }

      const config = typeof integration.configJson === "string"
        ? JSON.parse(integration.configJson)
        : integration.configJson as any;
      if (!config.smartApiKeyEncrypted || !config.mpinEncrypted || !config.clientCode) {
        return NextResponse.json(
          { error: "Saved credentials are incomplete. Please re-save your credentials." },
          { status: 400 }
        );
      }

      // Decrypt saved credentials
      const smartApiKey = decrypt(config.smartApiKeyEncrypted);
      const mpin = decrypt(config.mpinEncrypted);
      const clientCode = config.clientCode;

      // Authenticate with Angel One SmartAPI
      const result = await AngelOneClient.authenticate(
        smartApiKey,
        clientCode,
        mpin,
        totp
      );

      // Store encrypted tokens, keep saved credentials too
      await prisma.integrationSetting.update({
        where: {
          userId_platform: { userId: session.user.id, platform: "ANGELONE" },
        },
        data: {
          apiKeyEncrypted: encrypt(result.jwtToken),
          status: "CONNECTED",
          lastSyncAt: new Date(),
          configJson: JSON.stringify({
            clientCode,
            smartApiKeyEncrypted: config.smartApiKeyEncrypted,
            mpinEncrypted: config.mpinEncrypted,
            refreshTokenEncrypted: result.refreshToken ? encrypt(result.refreshToken) : null,
            feedToken: result.feedToken || null,
          }),
        },
      });

      return NextResponse.json({
        success: true,
        broker: "angelone",
        clientCode,
        message: "Angel One connected successfully",
      });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    console.error("AngelOne auth error:", error);
    return NextResponse.json(
      { error: (error as Error).message || "Authentication failed" },
      { status: 500 }
    );
  }
}

// ─── GET /api/broker/angelone/auth ───────────────────────────────
// Returns all saved brokers for the current user (for the dropdown)
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { prisma } = await import("@tradeos/db");

    // Get all integration settings for this user
    const integrations = await prisma.integrationSetting.findMany({
      where: { userId: session.user.id },
    });

    const brokers = integrations.map((integration) => {
      const config = typeof integration.configJson === "string"
        ? JSON.parse(integration.configJson)
        : (integration.configJson as any) || {};
      return {
        platform: integration.platform,
        status: integration.status, // "SAVED" | "CONNECTED" | "DISCONNECTED"
        clientCode: config?.clientCode || "",
        lastSyncAt: integration.lastSyncAt,
        // For Angel One specifically
        connected: integration.platform === "ANGELONE" && integration.status === "CONNECTED",
        hasSavedCredentials:
          integration.platform === "ANGELONE" &&
          (integration.status === "SAVED" || integration.status === "CONNECTED"),
      };
    });

    // Also return Angel One specific status for backwards compatibility
    const angelOne = brokers.find((b) => b.platform === "ANGELONE");

    return NextResponse.json({
      brokers,
      // Angel One specific fields (backwards compat)
      connected: angelOne?.connected || false,
      hasSavedCredentials: angelOne?.hasSavedCredentials || false,
      clientCode: angelOne?.clientCode || "",
      status: angelOne?.status || "DISCONNECTED",
      lastSyncAt: angelOne?.lastSyncAt || null,
    });
  } catch (error) {
    console.error("AngelOne status error:", error);
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}

// ─── DELETE /api/broker/angelone/auth ────────────────────────────
// Disconnect broker (keeps saved credentials, just clears tokens)
export async function DELETE(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const url = new URL(req.url);
    const full = url.searchParams.get("full") === "true"; // full=true also removes saved creds
    const { prisma, Prisma } = await import("@tradeos/db");

    const existing = await prisma.integrationSetting.findUnique({
      where: { userId_platform: { userId: session.user.id, platform: "ANGELONE" } },
    });

    if (!existing) {
      return NextResponse.json({ success: true, message: "Already disconnected" });
    }

    if (full) {
      // Remove everything
      await prisma.integrationSetting.update({
        where: { userId_platform: { userId: session.user.id, platform: "ANGELONE" } },
        data: {
          status: "DISCONNECTED",
          apiKeyEncrypted: null,
          configJson: Prisma.DbNull,
        },
      });
    } else {
      // Just disconnect - keep saved credentials (clientCode, smartApiKey, mpin)
      const config = typeof existing.configJson === "string"
        ? JSON.parse(existing.configJson)
        : (existing.configJson as any) || {};
      await prisma.integrationSetting.update({
        where: { userId_platform: { userId: session.user.id, platform: "ANGELONE" } },
        data: {
          status: "SAVED",
          apiKeyEncrypted: null,
          configJson: JSON.stringify({
            clientCode: config?.clientCode || "",
            smartApiKeyEncrypted: config?.smartApiKeyEncrypted || null,
            mpinEncrypted: config?.mpinEncrypted || null,
          }),
        },
      });
    }

    return NextResponse.json({
      success: true,
      message: full ? "Angel One credentials removed" : "Angel One disconnected (credentials kept)",
    });
  } catch (error) {
    console.error("AngelOne disconnect error:", error);
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
