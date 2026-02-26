import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { createTaskSchema } from "@tradeos/shared";
import { isDemoMode, DEMO_TASKS } from "@/lib/mock-data";

// GET all tasks for user
export async function GET(req: Request) {
  try {
    if (isDemoMode()) {
      const { searchParams } = new URL(req.url);
      const status = searchParams.get("status");
      const priority = searchParams.get("priority");
      const taskType = searchParams.get("taskType");
      const strategyId = searchParams.get("strategyId");

      let tasks = [...DEMO_TASKS];
      if (status) tasks = tasks.filter((t) => t.status === status);
      if (priority) tasks = tasks.filter((t) => t.priority === priority);
      if (taskType) tasks = tasks.filter((t) => t.taskType === taskType);
      if (strategyId) tasks = tasks.filter((t) => t.strategyId === strategyId);

      return NextResponse.json(tasks);
    }

    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");
    const priority = searchParams.get("priority");
    const taskType = searchParams.get("taskType");
    const strategyId = searchParams.get("strategyId");

    const where: any = { userId: session.user.id };
    if (status) where.status = status;
    if (priority) where.priority = priority;
    if (taskType) where.taskType = taskType;
    if (strategyId) where.strategyId = strategyId;

    const { prisma } = await import("@tradeos/db");
    const tasks = await prisma.task.findMany({
      where,
      orderBy: [{ status: "asc" }, { priority: "asc" }, { createdAt: "desc" }],
      include: {
        strategy: { select: { id: true, name: true } },
      },
    });

    return NextResponse.json(tasks);
  } catch (error) {
    console.error("Error fetching tasks:", error);
    return NextResponse.json(
      { error: "Failed to fetch tasks" },
      { status: 500 }
    );
  }
}

// POST create task
export async function POST(req: Request) {
  try {
    if (isDemoMode()) {
      const body = await req.json();
      return NextResponse.json(
        { id: `task-demo-${Date.now()}`, ...body },
        { status: 201 }
      );
    }

    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const parsed = createTaskSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0].message },
        { status: 400 }
      );
    }

    const { prisma } = await import("@tradeos/db");
    const task = await prisma.task.create({
      data: {
        userId: session.user.id,
        title: parsed.data.title,
        description: parsed.data.description,
        strategyId: parsed.data.strategyId,
        taskType: parsed.data.taskType as any,
        priority: parsed.data.priority as any,
        dueDate: parsed.data.dueDate ? new Date(parsed.data.dueDate) : null,
      },
      include: {
        strategy: { select: { id: true, name: true } },
      },
    });

    return NextResponse.json(task, { status: 201 });
  } catch (error) {
    console.error("Error creating task:", error);
    return NextResponse.json(
      { error: "Failed to create task" },
      { status: 500 }
    );
  }
}
