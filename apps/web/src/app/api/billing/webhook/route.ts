import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";

// POST /api/billing/webhook - Razorpay webhook handler
export async function POST(req: NextRequest) {
  try {
    const body = await req.text();
    const signature = req.headers.get("x-razorpay-signature");

    // Verify webhook signature
    if (process.env.RAZORPAY_WEBHOOK_SECRET && signature) {
      const expectedSignature = crypto
        .createHmac("sha256", process.env.RAZORPAY_WEBHOOK_SECRET)
        .update(body)
        .digest("hex");

      if (signature !== expectedSignature) {
        return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
      }
    }

    const event = JSON.parse(body);
    const { prisma } = await import("@tradeos/db");

    switch (event.event) {
      case "subscription.activated": {
        const subscriptionId = event.payload.subscription.entity.id;
        const subscription = await prisma.subscription.findFirst({
          where: { razorpaySubscriptionId: subscriptionId },
        });
        if (subscription) {
          const plan = subscription.plan;
          const tier = plan.startsWith("PRO") ? "PRO" : plan.startsWith("AGENCY") ? "AGENCY" : "FREE";

          await prisma.subscription.update({
            where: { id: subscription.id },
            data: {
              status: "ACTIVE",
              currentPeriodStart: new Date(),
              currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
            },
          });

          await prisma.user.update({
            where: { id: subscription.userId },
            data: { tier: tier as any },
          });
        }
        break;
      }

      case "subscription.charged": {
        const subscriptionId = event.payload.subscription.entity.id;
        const subscription = await prisma.subscription.findFirst({
          where: { razorpaySubscriptionId: subscriptionId },
        });
        if (subscription) {
          await prisma.subscription.update({
            where: { id: subscription.id },
            data: {
              status: "ACTIVE",
              currentPeriodStart: new Date(),
              currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
            },
          });
        }
        break;
      }

      case "subscription.cancelled": {
        const subscriptionId = event.payload.subscription.entity.id;
        const subscription = await prisma.subscription.findFirst({
          where: { razorpaySubscriptionId: subscriptionId },
        });
        if (subscription) {
          await prisma.subscription.update({
            where: { id: subscription.id },
            data: { status: "CANCELLED" },
          });

          await prisma.user.update({
            where: { id: subscription.userId },
            data: { tier: "FREE" },
          });
        }
        break;
      }

      case "payment.authorized": {
        // Payment was authorized, subscription should be active
        break;
      }
    }

    return NextResponse.json({ status: "ok" });
  } catch (error) {
    console.error("Razorpay webhook error:", error);
    return NextResponse.json({ status: "ok" }); // Always return 200
  }
}
