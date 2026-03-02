import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@tradeos/db";

// GET /api/historify/jobs/[jobId]
export async function GET(
  req: NextRequest,
  { params }: { params: { jobId: string } }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const job = await prisma.dataDownloadJob.findFirst({
    where: { id: params.jobId, userId: session.user.id },
    include: {
      items: { orderBy: { symbol: "asc" } },
    },
  });

  if (!job) {
    return NextResponse.json({ error: "Job not found" }, { status: 404 });
  }

  const progressPct =
    job.totalSymbols > 0
      ? Math.round(
          ((job.completedSymbols + job.failedSymbols) / job.totalSymbols) * 100
        )
      : 0;

  return NextResponse.json({ job, progressPct });
}

// DELETE /api/historify/jobs/[jobId]
// Cancels or removes a job
export async function DELETE(
  req: NextRequest,
  { params }: { params: { jobId: string } }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const job = await prisma.dataDownloadJob.findFirst({
    where: { id: params.jobId, userId: session.user.id },
  });
  if (!job) {
    return NextResponse.json({ error: "Job not found" }, { status: 404 });
  }

  await prisma.dataDownloadJob.delete({ where: { id: params.jobId } });

  return NextResponse.json({ success: true });
}
