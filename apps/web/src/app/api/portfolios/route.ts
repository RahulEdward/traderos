import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { createPortfolioSchema } from "@tradeos/shared";
import { isDemoMode, DEMO_PORTFOLIOS } from "@/lib/mock-data";

// GET all portfolios
export async function GET() {
  try {
    if (isDemoMode()) {
      const enriched = DEMO_PORTFOLIOS.map((p) => {
        let combinedPnL = 0;
        for (const ps of p.portfolioStrategies) {
          const bt = ps.strategy.backtestResults[0];
          if (bt) {
            combinedPnL += bt.netProfit * (ps.capitalAllocationPct / 100);
          }
        }
        return {
          ...p,
          combinedPnL,
          strategyCount: p.portfolioStrategies.length,
        };
      });
      return NextResponse.json(enriched);
    }

    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { prisma } = await import("@tradeos/db");
    const portfolios = await prisma.portfolio.findMany({
      where: { userId: session.user.id },
      orderBy: { updatedAt: "desc" },
      include: {
        portfolioStrategies: {
          include: {
            strategy: {
              select: {
                id: true,
                name: true,
                status: true,
                backtestResults: {
                  orderBy: { importedAt: "desc" },
                  take: 1,
                  select: {
                    netProfit: true,
                    winRate: true,
                    profitFactor: true,
                    maxDrawdownPct: true,
                    sharpeRatio: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    const enriched = portfolios.map((p) => {
      let combinedPnL = 0;
      for (const ps of p.portfolioStrategies) {
        const bt = ps.strategy.backtestResults[0];
        if (bt) {
          combinedPnL += bt.netProfit * (ps.capitalAllocationPct / 100);
        }
      }
      return {
        ...p,
        combinedPnL,
        strategyCount: p.portfolioStrategies.length,
      };
    });

    return NextResponse.json(enriched);
  } catch (error) {
    console.error("Error fetching portfolios:", error);
    return NextResponse.json(
      { error: "Failed to fetch portfolios" },
      { status: 500 }
    );
  }
}

// POST create portfolio
export async function POST(req: Request) {
  try {
    if (isDemoMode()) {
      const body = await req.json();
      return NextResponse.json(
        { id: `port-demo-${Date.now()}`, ...body },
        { status: 201 }
      );
    }

    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const parsed = createPortfolioSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0].message },
        { status: 400 }
      );
    }

    const { prisma } = await import("@tradeos/db");
    const portfolio = await prisma.portfolio.create({
      data: {
        userId: session.user.id,
        name: parsed.data.name,
        description: parsed.data.description,
        status: parsed.data.status as any,
        portfolioStrategies: {
          create: parsed.data.strategies.map((s) => ({
            strategyId: s.strategyId,
            capitalAllocationPct: s.capitalAllocationPct,
          })),
        },
      },
      include: {
        portfolioStrategies: {
          include: {
            strategy: { select: { id: true, name: true, status: true } },
          },
        },
      },
    });

    return NextResponse.json(portfolio, { status: 201 });
  } catch (error) {
    console.error("Error creating portfolio:", error);
    return NextResponse.json(
      { error: "Failed to create portfolio" },
      { status: 500 }
    );
  }
}
