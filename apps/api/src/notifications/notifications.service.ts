import { Injectable } from "@nestjs/common";
import {
  MessageDirection,
  MessageStatus,
  OpportunityStage,
  TaskStatus,
} from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";

export type NotificationKind =
  | "task_overdue"
  | "task_due_today"
  | "lead_reply"
  | "stage_stagnant";

export interface Notification {
  id: string;
  kind: NotificationKind;
  title: string;
  description?: string;
  href?: string;
  createdAt: string;
  read: boolean;
}

export interface NotificationsResponse {
  items: Notification[];
  unreadCount: number;
}

/**
 * Notifications are derived from live state (tasks + messages + opportunities).
 * Per-user read state is tracked in-memory for now; a notification_reads table
 * is a one-line schema addition when multi-device persistence matters.
 */
@Injectable()
export class NotificationsService {
  private dismissed = new Map<string, Set<string>>(); // userId -> ids

  constructor(private readonly prisma: PrismaService) {}

  async list(userId: string): Promise<NotificationsResponse> {
    const items = await this.compute();
    const dismissedSet = this.dismissed.get(userId) ?? new Set();
    const withReadState = items.map((n) => ({
      ...n,
      read: dismissedSet.has(n.id),
    }));
    return {
      items: withReadState,
      unreadCount: withReadState.filter((n) => !n.read).length,
    };
  }

  async markAllRead(userId: string): Promise<void> {
    const items = await this.compute();
    const dismissedSet = this.dismissed.get(userId) ?? new Set<string>();
    for (const n of items) dismissedSet.add(n.id);
    this.dismissed.set(userId, dismissedSet);
  }

  private async compute(): Promise<Notification[]> {
    const now = Date.now();
    const items: Notification[] = [];

    // Overdue + due-today tasks
    const pendingTasks = await this.prisma.task.findMany({
      where: { status: TaskStatus.PENDING },
    });
    for (const t of pendingTasks) {
      const due = t.dueDate.getTime();
      const diffDays = Math.floor((due - now) / (1000 * 60 * 60 * 24));
      if (diffDays < 0) {
        items.push({
          id: `notif-task-overdue-${t.id}`,
          kind: "task_overdue",
          title: `Overdue · ${t.title}`,
          description: `Due ${Math.abs(diffDays)} day${
            Math.abs(diffDays) === 1 ? "" : "s"
          } ago`,
          href: t.leadId ? `/leads/${t.leadId}` : "/tasks",
          createdAt: t.dueDate.toISOString(),
          read: false,
        });
      } else if (diffDays === 0) {
        items.push({
          id: `notif-task-today-${t.id}`,
          kind: "task_due_today",
          title: `Due today · ${t.title}`,
          href: t.leadId ? `/leads/${t.leadId}` : "/tasks",
          createdAt: t.dueDate.toISOString(),
          read: false,
        });
      }
    }

    // Last inbound message within 48h = "lead replied, still awaiting response"
    const recentInbound = await this.prisma.message.findMany({
      where: {
        direction: MessageDirection.INBOUND,
        status: { not: MessageStatus.FAILED },
        createdAt: { gte: new Date(now - 1000 * 60 * 60 * 48) },
      },
      orderBy: { createdAt: "desc" },
      include: { lead: { select: { name: true } } },
    });
    const seenLead = new Set<string>();
    for (const m of recentInbound) {
      if (seenLead.has(m.leadId)) continue;
      seenLead.add(m.leadId);
      // Only notify if the most recent message on this thread is still this inbound
      const latest = await this.prisma.message.findFirst({
        where: { leadId: m.leadId },
        orderBy: { createdAt: "desc" },
      });
      if (!latest || latest.id !== m.id) continue;
      items.push({
        id: `notif-reply-${m.id}`,
        kind: "lead_reply",
        title: `${m.lead.name} replied`,
        description: truncate(m.messageText, 80),
        href: `/leads/${m.leadId}`,
        createdAt: m.createdAt.toISOString(),
        read: false,
      });
    }

    // Stagnant opportunities — no stage movement in 7+ days and not closed
    const stagnant = await this.prisma.opportunity.findMany({
      where: {
        stage: {
          notIn: [OpportunityStage.CLOSED_WON, OpportunityStage.CLOSED_LOST],
        },
        updatedAt: { lt: new Date(now - 7 * 24 * 60 * 60 * 1000) },
      },
      include: { lead: { select: { name: true } } },
    });
    for (const opp of stagnant) {
      const days = Math.floor(
        (now - opp.updatedAt.getTime()) / (1000 * 60 * 60 * 24),
      );
      items.push({
        id: `notif-stagnant-${opp.id}`,
        kind: "stage_stagnant",
        title: `${opp.lead.name} has gone quiet`,
        description: `No stage movement in ${days} days`,
        href: `/opportunities/${opp.id}`,
        createdAt: opp.updatedAt.toISOString(),
        read: false,
      });
    }

    items.sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
    return items;
  }
}

function truncate(s: string, n: number): string {
  return s.length <= n ? s : s.slice(0, n - 1) + "…";
}
