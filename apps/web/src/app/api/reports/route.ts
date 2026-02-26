import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { isDemoMode } from "@/lib/mock-data";

function getDemoReports() {
  return [
    {
      id: "rpt-001",
      type: "STRATEGY",
      title: "Nifty 50 Breakout — Strategy Report",
      strategyName: "Nifty 50 Breakout",
      createdAt: new Date("2025-02-20T10:00:00"),
      status: "READY",
      downloadUrl: "#",
      shareableLink: null,
    },
    {
      id: "rpt-002",
      type: "PORTFOLIO",
      title: "Intraday Core Portfolio — Portfolio Report",
      strategyName: "Intraday Core Portfolio",
      createdAt: new Date("2025-02-18T14:30:00"),
      status: "READY",
      downloadUrl: "#",
      shareableLink: "https://tradeosindia.com/reports/share/abc123",
    },
    {
      id: "rpt-003",
      type: "WEEKLY",
      title: "Weekly Summary — Feb 10-16, 2025",
      strategyName: null,
      createdAt: new Date("2025-02-17T09:00:00"),
      status: "READY",
      downloadUrl: "#",
      shareableLink: null,
    },
  ];
}

export async function GET() {
  try {
    if (isDemoMode()) {
      return NextResponse.json({ reports: getDemoReports() });
    }

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
    if (isDemoMode()) {
      return NextResponse.json({
        id: "rpt-new",
        status: "GENERATING",
        message: "Report generation started (demo mode)",
      });
    }

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
