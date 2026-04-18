import type { MockHandler } from "@/mocks/handlers";
import type {
  Notification,
  NotificationKind,
  NotificationsResponse,
} from "@/lib/notifications-api";
import { taskStore } from "@/mocks/fixtures/tasks";
import { messageStore } from "@/mocks/fixtures/messages";
import { opportunityStore } from "@/mocks/fixtures/opportunities";
import { leadStore } from "@/mocks/fixtures/leads";
import {
  MessageDirection,
  MessageStatus,
  OpportunityStage,
} from "@realestate/shared";

/**
 * Notifications are computed on every fetch from current state — no
 * separate store. Reads from tasks + messages + opportunities. A real
 * backend would materialize these into a table for pagination + push, but
 * derivation is the right shape for the mock.
 */

const dismissedIds = new Set<string>();

export const notificationMockHandlers: MockHandler[] = [
  {
    method: "get",
    path: "/notifications",
    handler: async () => ({ data: compute() }),
  },
  {
    method: "post",
    path: "/notifications/mark-all-read",
    handler: async () => {
      for (const n of compute().items) dismissedIds.add(n.id);
      return { data: { success: true } };
    },
  },
];

function compute(): NotificationsResponse {
  const now = Date.now();
  const items: Notification[] = [];

  // Overdue + due-today tasks
  for (const task of taskStore) {
    if (task.status !== "pending") continue;
    const due = new Date(task.dueDate).getTime();
    const diffDays = Math.floor((due - now) / (1000 * 60 * 60 * 24));
    if (diffDays < 0) {
      items.push(
        mark({
          id: `notif-task-overdue-${task.id}`,
          kind: "task_overdue",
          title: `Overdue · ${task.title}`,
          description: `Due ${Math.abs(diffDays)} day${Math.abs(diffDays) === 1 ? "" : "s"} ago`,
          href: task.leadId ? `/leads/${task.leadId}` : "/tasks",
          createdAt: task.dueDate,
        }),
      );
    } else if (diffDays === 0) {
      items.push(
        mark({
          id: `notif-task-today-${task.id}`,
          kind: "task_due_today",
          title: `Due today · ${task.title}`,
          href: task.leadId ? `/leads/${task.leadId}` : "/tasks",
          createdAt: task.dueDate,
        }),
      );
    }
  }

  // Inbound messages that haven't been replied to (rough heuristic: last
  // message in thread is inbound and within last 48h)
  const threads = new Map<string, (typeof messageStore)[number][]>();
  for (const m of messageStore) {
    if (!threads.has(m.leadId)) threads.set(m.leadId, []);
    threads.get(m.leadId)!.push(m);
  }
  for (const [leadId, thread] of threads) {
    thread.sort(
      (a, b) =>
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
    );
    const last = thread[thread.length - 1];
    if (!last) continue;
    if (last.direction !== MessageDirection.INBOUND) continue;
    if (last.status === MessageStatus.FAILED) continue;
    const hoursOld =
      (now - new Date(last.createdAt).getTime()) / (1000 * 60 * 60);
    if (hoursOld > 48) continue;
    const lead = leadStore.find((l) => l.id === leadId);
    items.push(
      mark({
        id: `notif-reply-${last.id}`,
        kind: "lead_reply",
        title: `${lead?.name ?? "Lead"} replied`,
        description: truncate(last.messageText, 80),
        href: `/leads/${leadId}`,
        createdAt: last.createdAt,
      }),
    );
  }

  // Stagnant opportunities — same stage > 7 days, not closed
  for (const opp of opportunityStore) {
    if (
      opp.stage === OpportunityStage.CLOSED_WON ||
      opp.stage === OpportunityStage.CLOSED_LOST
    )
      continue;
    const days = Math.floor(
      (now - new Date(opp.updatedAt).getTime()) / (1000 * 60 * 60 * 24),
    );
    if (days < 7) continue;
    const lead = leadStore.find((l) => l.id === opp.leadId);
    items.push(
      mark({
        id: `notif-stagnant-${opp.id}`,
        kind: "stage_stagnant",
        title: `${lead?.name ?? "Opportunity"} has gone quiet`,
        description: `No stage movement in ${days} days`,
        href: `/opportunities/${opp.id}`,
        createdAt: opp.updatedAt,
      }),
    );
  }

  items.sort(
    (a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );

  return {
    items,
    unreadCount: items.filter((n) => !n.read).length,
  };
}

function mark(base: Omit<Notification, "read">): Notification {
  return { ...base, read: dismissedIds.has(base.id) };
}

function truncate(s: string, n: number) {
  if (s.length <= n) return s;
  return s.slice(0, n - 1) + "…";
}

// Guard against TS unused-import (future-proofing)
export type { NotificationKind };
