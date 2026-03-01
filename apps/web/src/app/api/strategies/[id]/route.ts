import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { updateStrategySchema } from "@tradeos/shared";
import { toJsonString, parseStrategyArrays, parseAnalysisArrays } from "@/lib/db-utils";

// GET single strategy
export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { prisma } = await import("@tradeos/db");
    const strategy = await prisma.strategy.findFirst({
      where: { id: params.id, userId: session.user.id },
      include: {
        backtestResults: {
          orderBy: { importedAt: "desc" },
          include: { trades: { orderBy: { tradeNumber: "asc" } } },
        },
        aiAnalyses: { orderBy: { createdAt: "desc" } },
        tasks: { orderBy: { createdAt: "desc" } },
        liveTrades: { orderBy: { createdAt: "desc" } },
      },
    });

    if (!strategy) {
      return NextResponse.json(
        { error: "Strategy not found" },
        { status: 404 }
      );
    }

    // Parse JSON arrays for SQLite
    parseStrategyArrays(strategy);
    strategy.aiAnalyses?.forEach(parseAnalysisArrays);

    return NextResponse.json(strategy);
  } catch (error) {
    console.error("Error fetching strategy:", error);
    return NextResponse.json(
      { error: "Failed to fetch strategy" },
      { status: 500 }
    );
  }
}

// PATCH update strategy
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
    const parsed = updateStrategySchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0].message },
        { status: 400 }
      );
    }

    const { prisma } = await import("@tradeos/db");
    const updateData = { ...parsed.data } as any;
    if (updateData.tags !== undefined) {
      updateData.tags = toJsonString(updateData.tags);
    }
    const strategy = await prisma.strategy.updateMany({
      where: { id: params.id, userId: session.user.id },
      data: updateData,
    });

    if (strategy.count === 0) {
      return NextResponse.json(
        { error: "Strategy not found" },
        { status: 404 }
      );
    }

    const updated = await prisma.strategy.findUnique({
      where: { id: params.id },
    });

    return NextResponse.json(parseStrategyArrays(updated as any));
  } catch (error) {
    console.error("Error updating strategy:", error);
    return NextResponse.json(
      { error: "Failed to update strategy" },
      { status: 500 }
    );
  }
}

// DELETE strategy
export async function DELETE(
  _req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { prisma } = await import("@tradeos/db");
    await prisma.strategy.deleteMany({
      where: { id: params.id, userId: session.user.id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting strategy:", error);
    return NextResponse.json(
      { error: "Failed to delete strategy" },
      { status: 500 }
    );
  }
}
