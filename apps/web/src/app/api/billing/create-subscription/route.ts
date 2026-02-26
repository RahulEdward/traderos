import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { isDemoMode } from "@/lib/mock-data";

export async function POST(req: NextRequest) {
  try {
    if (isDemoMode()) {
      return NextResponse.json({
        subscriptionId: "sub_demo_123",
        shortUrl: "https://rzp.io/demo",
      });
    }

    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { planId } = body; // "pro_monthly", "pro_annual", "agency_monthly"

    const PLAN_MAP: Record<string, string> = {
      pro_monthly: process.env.RAZORPAY_PLAN_PRO_MONTHLY || "",
      pro_annual: process.env.RAZORPAY_PLAN_PRO_ANNUAL || "",
      agency_monthly: process.env.RAZORPAY_PLAN_AGENCY_MONTHLY || "",
    };

    const razorpayPlanId = PLAN_MAP[planId];
    if (!razorpayPlanId) {
      return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
    }

    const Razorpay = (await import("razorpay")).default;
    const razorpay = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID!,
      key_secret: process.env.RAZORPAY_KEY_SECRET!,
    });

    const subscription = await razorpay.subscriptions.create({
      plan_id: razorpayPlanId,
      total_count: 12,
      quantity: 1,
      notes: {
        userId: session.user.id,
        userEmail: session.user.email || "",
      },
    });

    // Save subscription to DB
    const { prisma } = await import("@tradeos/db");
    await prisma.subscription.create({
      data: {
        userId: session.user.id,
        plan: planId.toUpperCase(),
        razorpaySubscriptionId: subscription.id,
        status: "CREATED",
      },
    });

    return NextResponse.json({
      subscriptionId: subscription.id,
      shortUrl: subscription.short_url,
    });
  } catch (error) {
    console.error("Error creating subscription:", error);
    return NextResponse.json({ error: "Failed to create subscription" }, { status: 500 });
  }
}
