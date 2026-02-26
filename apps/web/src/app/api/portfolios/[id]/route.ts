import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@tradeos/db";

// GET single portfolio with full data
export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const portfolio = await prisma.portfolio.findFirst({
      where: { id: params.id, userId: session.user.id },
      include: {
        portfolioStrategies: {
          include: {
            strategy: {
              select: {
                id: true,
                name: true,
                status: true,
                market: true,
                timeframe: true,
                backtestResults: {
                  orderBy: { importedAt: "desc" },
                  take: 1,
                  include: {
                    trades: {
                      orderBy: { tradeNumber: "asc" },
                      select: {
                        profitLoss: true,
                        profitLossPct: true,
                        entryDate: true,
                        exitDate: true,
                      },
                    },
                  },
                },
                aiAnalyses: {
                  orderBy: { createdAt: "desc" },
                  take: 1,
                  select: { overallScore: true, readinessVerdict: true },
                },
              },
            },
          },
        },
      },
    });

    if (!portfolio) {
      return NextResponse.json(
        { error: "Portfolio not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(portfolio);
  } catch (error) {
    console.error("Error fetching portfolio:", error);
    return NextResponse.json(
      { error: "Failed to fetch portfolio" },
      { status: 500 }
    );
  }
}

// PATCH update portfolio
export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();

    // Update basic fields
    const updateData: any = {};
    if (body.name !== undefined) updateData.name = body.name;
    if (body.description !== undefined) updateData.description = body.description;
    if (body.status !== undefined) updateData.status = body.status;

    const result = await prisma.portfolio.updateMany({
      where: { id: params.id, userId: session.user.id },
      data: updateData,
    });

    if (result.count === 0) {
      return NextResponse.json(
        { error: "Portfolio not found" },
        { status: 404 }
      );
    }

    // Update strategies if provided
    if (Array.isArray(body.strategies)) {
      // Delete existing
      await prisma.portfolioStrategy.deleteMany({
        where: { portfolioId: params.id },
      });

      // Create new
      if (body.strategies.length > 0) {
        await prisma.portfolioStrategy.createMany({
          data: body.strategies.map((s: any) => ({
            portfolioId: params.id,
            strategyId: s.strategyId,
            capitalAllocationPct: s.capitalAllocationPct,
          })),
        });
      }
    }

    const updated = await prisma.portfolio.findUnique({
      where: { id: params.id },
      include: {
        portfolioStrategies: {
          include: {
            strategy: { select: { id: true, name: true, status: true } },
          },
        },
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Error updating portfolio:", error);
    return NextResponse.json(
      { error: "Failed to update portfolio" },
      { status: 500 }
    );
  }
}

// DELETE portfolio
export async function DELETE(
  _req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await prisma.portfolio.deleteMany({
      where: { id: params.id, userId: session.user.id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting portfolio:", error);
    return NextResponse.json(
      { error: "Failed to delete portfolio" },
      { status: 500 }
    );
  }
}
