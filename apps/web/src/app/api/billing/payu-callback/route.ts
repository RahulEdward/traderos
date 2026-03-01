import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";

// POST /api/billing/payu-callback - PayU payment success/failure redirect
export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const status = formData.get("status") as string;
    const txnId = formData.get("txnid") as string;
    const amount = formData.get("amount") as string;
    const productInfo = formData.get("productinfo") as string;
    const firstName = formData.get("firstname") as string;
    const email = formData.get("email") as string;
    const hash = formData.get("hash") as string;
    const mihpayid = formData.get("mihpayid") as string;

    // Verify PayU response hash (reverse hash)
    if (process.env.PAYU_MERCHANT_SALT && hash) {
      const reverseHashString = `${process.env.PAYU_MERCHANT_SALT}|${status}|||||||||||${email}|${firstName}|${productInfo}|${amount}|${txnId}|${process.env.PAYU_MERCHANT_KEY}`;
      const expectedHash = crypto
        .createHash("sha512")
        .update(reverseHashString)
        .digest("hex");

      if (hash !== expectedHash) {
        return NextResponse.redirect(
          new URL("/settings?tab=billing&payment=invalid", req.url)
        );
      }
    }

    const { prisma } = await import("@tradeos/db");

    if (status === "success") {
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

      return NextResponse.redirect(
        new URL("/settings?tab=billing&payment=success", req.url)
      );
    } else {
      return NextResponse.redirect(
        new URL("/settings?tab=billing&payment=failed", req.url)
      );
    }
  } catch (error) {
    console.error("PayU callback error:", error);
    return NextResponse.redirect(
      new URL("/settings?tab=billing&payment=error", req.url)
    );
  }
}
