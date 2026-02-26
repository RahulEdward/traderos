import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { isDemoMode, getDashboardStats } from "@/lib/mock-data";

// GET dashboard stats
export async function GET() {
  try {
    // Demo mode
    if (isDemoMode()) {
      return NextResponse.json(getDashboardStats());
    }

    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;
    const { prisma } = await import("@tradeos/db");

    const [
      strategies,
      activePortfolios,
      readyStrategies,
      recentTasks,
      recentNotifications,
    ] = await Promise.all([
      prisma.strategy.findMany({
        where: { userId },
        include: {
          backtestResults: {
            orderBy: { importedAt: "desc" },
            take: 1,
            select: {
              netProfit: true,
              winRate: true,
              totalTrades: true,
            },
          },
        },
      }),
      prisma.portfolio.count({
        where: { userId, status: "ACTIVE" },
      }),
      prisma.aiAnalysis.count({
        where: {
          strategy: { userId },
          readinessVerdict: "READY",
        },
      }),
      prisma.task.findMany({
        where: { userId, status: { in: ["TODO", "IN_PROGRESS"] } },
        orderBy: [{ priority: "asc" }, { dueDate: "asc" }],
        take: 5,
        include: { strategy: { select: { id: true, name: true } } },
      }),
      prisma.notification.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        take: 10,
        include: {
          strategy: { select: { id: true, name: true } },
        },
      }),
    ]);

    let totalWinRate = 0;
    let strategiesWithBacktest = 0;
    let totalNetProfit = 0;

    for (const s of strategies) {
      const bt = s.backtestResults[0];
      if (bt) {
        totalWinRate += bt.winRate;
        strategiesWithBacktest++;
        totalNetProfit += bt.netProfit;
      }
    }

    const overallWinRate =
      strategiesWithBacktest > 0 ? totalWinRate / strategiesWithBacktest : 0;

    const equityData = strategies
      .filter((s) => s.backtestResults[0])
      .map((s) => ({
        name: s.name,
        netProfit: s.backtestResults[0].netProfit,
      }));

    return NextResponse.json({
      stats: {
        totalStrategies: strategies.length,
        activePortfolios,
        overallWinRate: Math.round(overallWinRate * 100) / 100,
        strategiesReadyToLive: readyStrategies,
        totalNetProfit,
      },
      recentTasks,
      recentActivity: recentNotifications.map((n) => ({
        id: n.id,
        type: n.type,
        title: n.title,
        description: n.body || "",
        timestamp: n.createdAt,
        strategyId: n.strategyId,
        strategyName: n.strategy?.name,
      })),
      equityData,
    });
  } catch (error) {
    console.error("Error fetching dashboard:", error);
    return NextResponse.json(
      { error: "Failed to fetch dashboard data" },
      { status: 500 }
    );
  }
}
