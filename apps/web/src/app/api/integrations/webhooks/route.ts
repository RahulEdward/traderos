import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { isDemoMode, DEMO_USER } from "@/lib/mock-data";
import crypto from "crypto";

// GET: list user webhooks
export async function GET() {
  try {
    if (isDemoMode()) {
      return NextResponse.json({
        webhooks: [
          {
            id: "wh-001",
            userId: DEMO_USER.id,
            strategyId: "strat-001",
            webhookKey: "tvwh_demo_abc123def456",
            name: "Nifty 50 Breakout Alert",
            createdAt: new Date("2025-01-20"),
            lastTriggeredAt: new Date("2025-02-24T14:32:00"),
            totalTriggers: 47,
            strategy: { id: "strat-001", name: "Nifty 50 Breakout" },
          },
        ],
        webhookLogs: [
          {
            id: "whl-001",
            webhookId: "wh-001",
            receivedAt: new Date("2025-02-24T14:32:00"),
            payload: { ticker: "NIFTY", action: "buy", close: 22450.5, time: "2025-02-24T14:32:00" },
            status: "SUCCESS",
            errorMessage: null,
          },
          {
            id: "whl-002",
            webhookId: "wh-001",
            receivedAt: new Date("2025-02-24T11:15:00"),
            payload: { ticker: "NIFTY", action: "sell", close: 22380.2, time: "2025-02-24T11:15:00" },
            status: "SUCCESS",
            errorMessage: null,
          },
          {
            id: "whl-003",
            webhookId: "wh-001",
            receivedAt: new Date("2025-02-23T10:45:00"),
            payload: { ticker: "NIFTY", action: "buy", close: 22510.8 },
            status: "FAILED",
            errorMessage: "Invalid payload format: missing time field",
          },
        ],
      });
    }

    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { prisma } = await import("@tradeos/db");
    const webhooks = await prisma.webhook.findMany({
      where: { userId: session.user.id },
      include: {
        strategy: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    const webhookIds = webhooks.map((w) => w.id);
    const webhookLogs = await prisma.webhookLog.findMany({
      where: { webhookId: { in: webhookIds } },
      orderBy: { receivedAt: "desc" },
      take: 50,
    });

    return NextResponse.json({ webhooks, webhookLogs });
  } catch (error) {
    console.error("Error fetching webhooks:", error);
    return NextResponse.json({ error: "Failed to fetch webhooks" }, { status: 500 });
  }
}

// POST: create new webhook
export async function POST(req: NextRequest) {
  try {
    if (isDemoMode()) {
      return NextResponse.json({
        id: "wh-new",
        webhookKey: "tvwh_" + crypto.randomBytes(16).toString("hex"),
        name: "New Webhook",
        createdAt: new Date(),
      });
    }

    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { name, strategyId } = body;

    if (!name || !strategyId) {
      return NextResponse.json({ error: "Name and strategy are required" }, { status: 400 });
    }

    const { prisma } = await import("@tradeos/db");
    const webhookKey = "tvwh_" + crypto.randomBytes(16).toString("hex");

    const webhook = await prisma.webhook.create({
      data: {
        userId: session.user.id,
        strategyId,
        webhookKey,
        name,
      },
      include: {
        strategy: { select: { id: true, name: true } },
      },
    });

    return NextResponse.json(webhook);
  } catch (error) {
    console.error("Error creating webhook:", error);
    return NextResponse.json({ error: "Failed to create webhook" }, { status: 500 });
  }
}
