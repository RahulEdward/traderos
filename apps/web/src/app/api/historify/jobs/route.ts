import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@tradeos/db";

// GET /api/historify/jobs
// Returns user's download jobs (most recent first)
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const limit = parseInt(req.nextUrl.searchParams.get("limit") || "20");

  const jobs = await prisma.dataDownloadJob.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
    take: limit,
    include: {
      _count: { select: { items: true } },
      items: {
        orderBy: { symbol: "asc" },
      },
    },
  });

  return NextResponse.json({ jobs });
}
