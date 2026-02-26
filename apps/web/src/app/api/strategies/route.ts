import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { createStrategySchema } from "@tradeos/shared";
import { isDemoMode, DEMO_STRATEGIES } from "@/lib/mock-data";

// GET all strategies for user
export async function GET() {
  try {
    if (isDemoMode()) {
      const strategies = DEMO_STRATEGIES.map((s) => ({
        ...s,
        backtestResults: s.backtestResults.slice(0, 1).map((bt) => ({
          winRate: bt.winRate,
          profitFactor: bt.profitFactor,
          maxDrawdownPct: bt.maxDrawdownPct,
          netProfit: bt.netProfit,
        })),
        _count: { backtestResults: s.backtestResults.length },
      }));
      return NextResponse.json(strategies);
    }

    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { prisma } = await import("@tradeos/db");
    const strategies = await prisma.strategy.findMany({
      where: { userId: session.user.id, archivedAt: null },
      include: {
        backtestResults: {
          orderBy: { importedAt: "desc" },
          take: 1,
          select: {
            winRate: true,
            profitFactor: true,
            maxDrawdownPct: true,
            netProfit: true,
          },
        },
        _count: { select: { backtestResults: true } },
      },
      orderBy: { updatedAt: "desc" },
    });

    return NextResponse.json(strategies);
  } catch (error) {
    console.error("Error fetching strategies:", error);
    return NextResponse.json(
      { error: "Failed to fetch strategies" },
      { status: 500 }
    );
  }
}

// POST create new strategy
export async function POST(req: Request) {
  try {
    if (isDemoMode()) {
      const body = await req.json();
      const parsed = createStrategySchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json(
          { error: parsed.error.errors[0].message },
          { status: 400 }
        );
      }
      return NextResponse.json(
        {
          id: `strat-demo-${Date.now()}`,
          ...parsed.data,
          userId: "demo-user-001",
          version: 1,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        { status: 201 }
      );
    }

    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const parsed = createStrategySchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0].message },
        { status: 400 }
      );
    }

    const { prisma } = await import("@tradeos/db");
    const strategy = await prisma.strategy.create({
      data: {
        ...parsed.data,
        userId: session.user.id,
      },
    });

    return NextResponse.json(strategy, { status: 201 });
  } catch (error) {
    console.error("Error creating strategy:", error);
    return NextResponse.json(
      { error: "Failed to create strategy" },
      { status: 500 }
    );
  }
}
