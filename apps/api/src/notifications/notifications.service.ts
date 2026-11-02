import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class NotificationsService {
  constructor(private readonly db: PrismaService) {}

  async list(userId: string) {
    const [items, unread] = await Promise.all([
      this.db.appNotification.findMany({
        where: { userId },
        select: {
          id: true,
          kind: true,
          title: true,
          body: true,
          href: true,
          readAt: true,
          createdAt: true,
        },
        orderBy: { createdAt: "desc" },
        take: 30,
      }),
      this.db.appNotification.count({ where: { userId, readAt: null } }),
    ]);
    return { items, unread };
  }

  async read(userId: string, notificationId: string) {
    const changed = await this.db.appNotification.updateMany({
      where: { id: notificationId, userId, readAt: null },
      data: { readAt: new Date() },
    });
    if (!changed.count) {
      const exists = await this.db.appNotification.findFirst({
        where: { id: notificationId, userId },
        select: { id: true },
      });
      if (!exists) throw new NotFoundException("Notificação não encontrada");
    }
    return { ok: true };
  }

  async readAll(userId: string) {
    await this.db.appNotification.updateMany({
      where: { userId, readAt: null },
      data: { readAt: new Date() },
    });
    return { ok: true };
  }
}
