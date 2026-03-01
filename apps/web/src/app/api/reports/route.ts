import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // In production, fetch reports from DB
    return NextResponse.json({ reports: [] });
  } catch (error) {
    console.error("Error fetching reports:", error);
    return NextResponse.json({ error: "Failed to fetch reports" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { type, strategyId, portfolioId, dateRange } = body;

    // In production: queue report generation via BullMQ
    // 1. Create report record in DB with status GENERATING
    // 2. Queue Puppeteer job to render /report/[id] page
    // 3. Upload PDF to S3
    // 4. Update report record with downloadUrl

    return NextResponse.json({
      id: "rpt-new",
      status: "GENERATING",
      message: "Report generation started. You will be notified when it's ready.",
    });
  } catch (error) {
    console.error("Error generating report:", error);
    return NextResponse.json({ error: "Failed to generate report" }, { status: 500 });
  }
}
