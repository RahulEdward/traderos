import { NextRequest, NextResponse } from "next/server";
import { isDemoMode } from "@/lib/mock-data";

// POST /api/webhooks/receive/:webhookKey
// Public endpoint - no auth required. Validates webhook key.
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ webhookKey: string }> }
) {
  try {
    const { webhookKey } = await params;

    if (isDemoMode()) {
      return NextResponse.json({ status: "ok", message: "Webhook received (demo mode)" });
    }

    const { prisma } = await import("@tradeos/db");

    // Validate webhook key
    const webhook = await prisma.webhook.findUnique({
      where: { webhookKey },
      include: { user: { select: { id: true } } },
    });

    if (!webhook) {
      return NextResponse.json({ error: "Invalid webhook key" }, { status: 404 });
    }

    // Parse payload
    let payload: any;
    try {
      payload = await req.json();
    } catch {
      payload = { raw: await req.text() };
    }

    // Store webhook log - async, return 200 immediately
    const logPromise = prisma.webhookLog.create({
      data: {
        webhookId: webhook.id,
        payload,
        status: "SUCCESS",
      },
    });

    // Update webhook stats
    const updatePromise = prisma.webhook.update({
      where: { id: webhook.id },
      data: {
        lastTriggeredAt: new Date(),
        totalTriggers: { increment: 1 },
      },
    });

    // Create notification
    const notifPromise = prisma.notification.create({
      data: {
        userId: webhook.userId,
        type: "webhook_received",
        title: "Webhook Alert Received",
        body: `Alert received for ${webhook.name}: ${payload?.action || "signal"} on ${payload?.ticker || "unknown"}`,
        strategyId: webhook.strategyId,
      },
    });

    // Execute all async ops in parallel
    await Promise.all([logPromise, updatePromise, notifPromise]);

    return NextResponse.json({ status: "ok" });
  } catch (error) {
    console.error("Webhook receive error:", error);

    // Try to log the failure
    try {
      const { webhookKey } = await params;
      if (!isDemoMode()) {
        const { prisma } = await import("@tradeos/db");
        const webhook = await prisma.webhook.findUnique({ where: { webhookKey } });
        if (webhook) {
          await prisma.webhookLog.create({
            data: {
              webhookId: webhook.id,
              payload: {},
              status: "FAILED",
              errorMessage: (error as Error).message,
            },
          });
        }
      }
    } catch {
      // Silently fail on error logging
    }

    return NextResponse.json({ status: "ok" }); // Always return 200 to prevent retries
  }
}
