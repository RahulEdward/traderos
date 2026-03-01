import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { auth } from "@/lib/auth";

// PayU plan IDs (configure in PayU dashboard)
const PLAN_MAP: Record<string, { amount: number; name: string }> = {
  pro_monthly: { amount: 2999, name: "TradeOS Pro Monthly" },
  pro_annual: { amount: 24999, name: "TradeOS Pro Annual" },
  agency_monthly: { amount: 9999, name: "TradeOS Agency Monthly" },
};

function generatePayUHash(params: Record<string, string>) {
  const hashString = `${params.key}|${params.txnid}|${params.amount}|${params.productinfo}|${params.firstname}|${params.email}|||||||||||${process.env.PAYU_MERCHANT_SALT}`;
  return crypto.createHash("sha512").update(hashString).digest("hex");
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { planId } = body; // "pro_monthly", "pro_annual", "agency_monthly"

    const plan = PLAN_MAP[planId];
    if (!plan) {
      return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
    }

    const txnId = `TOS_${session.user.id.slice(0, 8)}_${Date.now()}`;
    const amountWithGst = Math.round(plan.amount * 1.18); // 18% GST

    // Save subscription to DB
    const { prisma } = await import("@tradeos/db");
    await prisma.subscription.create({
      data: {
        userId: session.user.id,
        plan: planId.toUpperCase().includes("AGENCY") ? "AGENCY" : "PRO",
        payuTransactionId: txnId,
        status: "CREATED",
      },
    });

    // Generate PayU payment parameters
    const payuParams = {
      key: process.env.PAYU_MERCHANT_KEY || "",
      txnid: txnId,
      amount: amountWithGst.toString(),
      productinfo: plan.name,
      firstname: (session.user as any).name || "User",
      email: session.user.email || "",
      phone: "",
      surl: `${process.env.NEXT_PUBLIC_APP_URL}/api/billing/payu-callback?status=success`,
      furl: `${process.env.NEXT_PUBLIC_APP_URL}/api/billing/payu-callback?status=failure`,
    };

    const hash = generatePayUHash(payuParams);

    const payuBaseUrl = process.env.PAYU_MODE === "production"
      ? "https://secure.payu.in/_payment"
      : "https://test.payu.in/_payment";

    return NextResponse.json({
      payuUrl: payuBaseUrl,
      params: {
        ...payuParams,
        hash,
      },
    });
  } catch (error) {
    console.error("Error creating subscription:", error);
    return NextResponse.json(
      { error: "Failed to create subscription" },
      { status: 500 }
    );
  }
}
