import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { createStrategySchema } from "@tradeos/shared";
import { toJsonString, parseStrategyArrays } from "@/lib/db-utils";

// GET all strategies for user
export async function GET() {
  try {
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

    return NextResponse.json(strategies.map(parseStrategyArrays));
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
        tags: toJsonString(parsed.data.tags),
        userId: session.user.id,
      },
    });

    return NextResponse.json(parseStrategyArrays(strategy), { status: 201 });
  } catch (error) {
    console.error("Error creating strategy:", error);
    return NextResponse.json(
      { error: "Failed to create strategy" },
      { status: 500 }
    );
  }
}
