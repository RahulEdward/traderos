import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import crypto from "crypto";

// GET: list user webhooks
export async function GET() {
  try {
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
