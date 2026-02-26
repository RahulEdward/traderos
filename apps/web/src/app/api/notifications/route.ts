import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { isDemoMode, DEMO_NOTIFICATIONS } from "@/lib/mock-data";

// GET notifications
export async function GET(req: Request) {
  try {
    if (isDemoMode()) {
      const { searchParams } = new URL(req.url);
      const limit = parseInt(searchParams.get("limit") || "20");
      const notifications = DEMO_NOTIFICATIONS.slice(0, limit);
      const unreadCount = DEMO_NOTIFICATIONS.filter((n) => !n.read).length;
      return NextResponse.json({ notifications, unreadCount });
    }

    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get("limit") || "20");
    const { prisma } = await import("@tradeos/db");

    const [notifications, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        where: { userId: session.user.id },
        orderBy: { createdAt: "desc" },
        take: limit,
        include: {
          strategy: { select: { id: true, name: true } },
          portfolio: { select: { id: true, name: true } },
        },
      }),
      prisma.notification.count({
        where: { userId: session.user.id, read: false },
      }),
    ]);

    return NextResponse.json({ notifications, unreadCount });
  } catch (error) {
    console.error("Error fetching notifications:", error);
    return NextResponse.json(
      { error: "Failed to fetch notifications" },
      { status: 500 }
    );
  }
}

// PATCH mark as read
export async function PATCH(req: Request) {
  try {
    if (isDemoMode()) {
      return NextResponse.json({ success: true });
    }

    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { prisma } = await import("@tradeos/db");

    if (body.markAllRead) {
      await prisma.notification.updateMany({
        where: { userId: session.user.id, read: false },
        data: { read: true },
      });
    } else if (body.notificationId) {
      await prisma.notification.updateMany({
        where: { id: body.notificationId, userId: session.user.id },
        data: { read: true },
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error updating notifications:", error);
    return NextResponse.json(
      { error: "Failed to update notifications" },
      { status: 500 }
    );
  }
}
