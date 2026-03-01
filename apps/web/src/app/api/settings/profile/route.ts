import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";

export async function PUT(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { prisma } = await import("@tradeos/db");

    const updated = await prisma.user.update({
      where: { id: session.user.id },
      data: {
        name: body.name,
        timezone: body.timezone || "Asia/Kolkata",
        riskProfile: body.riskProfile,
      },
      select: {
        id: true,
        name: true,
        email: true,
        timezone: true,
        riskProfile: true,
      },
    });

    return NextResponse.json({ success: true, profile: updated });
  } catch (error) {
    console.error("Error saving profile:", error);
    return NextResponse.json(
      { error: "Failed to save profile" },
      { status: 500 }
    );
  }
}
