import { prisma } from "@tradeos/db";
import { io } from "../index";

interface CreateNotificationInput {
  userId: string;
  type: string;
  title: string;
  body?: string;
  strategyId?: string;
  portfolioId?: string;
}

export async function createNotification(input: CreateNotificationInput) {
  const notification = await prisma.notification.create({
    data: {
      userId: input.userId,
      type: input.type,
      title: input.title,
      body: input.body,
      strategyId: input.strategyId,
      portfolioId: input.portfolioId,
    },
  });

  // Emit real-time event to user's room
  io.to(input.userId).emit(input.type, {
    id: notification.id,
    type: input.type,
    title: input.title,
    body: input.body,
    strategyId: input.strategyId,
    portfolioId: input.portfolioId,
    createdAt: notification.createdAt,
  });

  return notification;
}

export async function getUserNotifications(userId: string, limit = 20) {
  return prisma.notification.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: limit,
    include: {
      strategy: { select: { id: true, name: true } },
      portfolio: { select: { id: true, name: true } },
    },
  });
}

export async function markNotificationRead(notificationId: string, userId: string) {
  return prisma.notification.updateMany({
    where: { id: notificationId, userId },
    data: { read: true },
  });
}

export async function markAllNotificationsRead(userId: string) {
  return prisma.notification.updateMany({
    where: { userId, read: false },
    data: { read: true },
  });
}

export async function getUnreadCount(userId: string): Promise<number> {
  return prisma.notification.count({
    where: { userId, read: false },
  });
}
