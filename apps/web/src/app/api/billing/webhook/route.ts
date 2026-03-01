import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";

// POST /api/billing/webhook - PayU webhook/IPN handler
export async function POST(req: NextRequest) {
  try {
    const body = await req.formData();
    const status = body.get("status") as string;
    const txnId = body.get("txnid") as string;
    const amount = body.get("amount") as string;
    const productInfo = body.get("productinfo") as string;
    const firstName = body.get("firstname") as string;
    const email = body.get("email") as string;
    const hash = body.get("hash") as string;
    const mihpayid = body.get("mihpayid") as string;

    // Verify PayU hash (reverse hash for response)
    if (process.env.PAYU_MERCHANT_SALT && hash) {
      const reverseHashString = `${process.env.PAYU_MERCHANT_SALT}|${status}|||||||||||${email}|${firstName}|${productInfo}|${amount}|${txnId}|${process.env.PAYU_MERCHANT_KEY}`;
      const expectedHash = crypto
        .createHash("sha512")
        .update(reverseHashString)
        .digest("hex");

      if (hash !== expectedHash) {
        console.error("PayU webhook: Invalid hash");
        return NextResponse.json({ error: "Invalid hash" }, { status: 400 });
      }
    }

    const { prisma } = await import("@tradeos/db");

    if (status === "success") {
      // Find subscription by txnId
      const subscription = await prisma.subscription.findFirst({
        where: { payuTransactionId: txnId },
      });

      if (subscription) {
        const tier = subscription.plan === "AGENCY" ? "AGENCY" : "PRO";

        await prisma.subscription.update({
          where: { id: subscription.id },
          data: {
            status: "ACTIVE",
            payuPaymentId: mihpayid,
            currentPeriodStart: new Date(),
            currentPeriodEnd: new Date(
              Date.now() + 30 * 24 * 60 * 60 * 1000
            ),
          },
        });

        await prisma.user.update({
          where: { id: subscription.userId },
          data: { tier: tier as any },
        });
      }
    } else if (status === "failure" || status === "cancelled") {
      const subscription = await prisma.subscription.findFirst({
        where: { payuTransactionId: txnId },
      });

      if (subscription) {
        await prisma.subscription.update({
          where: { id: subscription.id },
          data: { status: "CANCELLED" },
        });
      }
    }

    return NextResponse.json({ status: "ok" });
  } catch (error) {
    console.error("PayU webhook error:", error);
    return NextResponse.json({ status: "ok" }); // Always return 200
  }
}
