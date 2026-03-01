import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { toJsonObjectString, parseJsonObject } from "@/lib/db-utils";

export async function PUT(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { prisma } = await import("@tradeos/db");

    await prisma.user.update({
      where: { id: session.user.id },
      data: {
        notificationPrefs: toJsonObjectString(body),
      },
    });

    return NextResponse.json({ success: true, notifications: body });
  } catch (error) {
    console.error("Error saving notifications:", error);
    return NextResponse.json(
      { error: "Failed to save notification preferences" },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { prisma } = await import("@tradeos/db");
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { notificationPrefs: true },
    });

    const defaults = {
      backtestAnalyzed: true,
      webhookReceived: true,
      taskDueSoon: true,
      weeklyReport: true,
      portfolioAlert: true,
    };

    const prefs = user?.notificationPrefs
      ? parseJsonObject(user.notificationPrefs)
      : null;

    return NextResponse.json(prefs || defaults);
  } catch (error) {
    console.error("Error fetching notifications:", error);
    return NextResponse.json(
      { error: "Failed to fetch notification preferences" },
      { status: 500 }
    );
  }
}
