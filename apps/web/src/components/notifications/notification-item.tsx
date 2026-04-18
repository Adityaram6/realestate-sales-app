import Link from "next/link";
import {
  AlertCircle,
  Clock,
  MessageSquare,
  Snowflake,
} from "lucide-react";
import { cn, formatRelativeTime } from "@/lib/utils";
import type { Notification, NotificationKind } from "@/lib/notifications-api";

const ICON: Record<NotificationKind, typeof Clock> = {
  task_overdue: AlertCircle,
  task_due_today: Clock,
  lead_reply: MessageSquare,
  stage_stagnant: Snowflake,
};

const ACCENT: Record<NotificationKind, string> = {
  task_overdue: "bg-red-100 text-red-700",
  task_due_today: "bg-amber-100 text-amber-700",
  lead_reply: "bg-emerald-100 text-emerald-700",
  stage_stagnant: "bg-slate-100 text-slate-700",
};

export function NotificationItem({
  notification,
  onClick,
}: {
  notification: Notification;
  onClick?: () => void;
}) {
  const Icon = ICON[notification.kind];
  const accent = ACCENT[notification.kind];
  const body = (
    <div
      className={cn(
        "flex items-start gap-3 rounded-md px-3 py-2.5 transition-colors",
        !notification.read && "bg-primary/5",
        notification.href ? "hover:bg-accent" : "",
      )}
    >
      <span
        className={cn(
          "mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full",
          accent,
        )}
      >
        <Icon className="h-3.5 w-3.5" />
      </span>
      <div className="min-w-0 flex-1 space-y-0.5">
        <div className="flex items-center gap-2">
          <p className="truncate text-sm font-medium">{notification.title}</p>
          {!notification.read ? (
            <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
          ) : null}
        </div>
        {notification.description ? (
          <p className="text-xs text-muted-foreground line-clamp-2">
            {notification.description}
          </p>
        ) : null}
        <p className="text-[11px] text-muted-foreground">
          {formatRelativeTime(notification.createdAt)}
        </p>
      </div>
    </div>
  );

  if (notification.href) {
    return (
      <Link href={notification.href} onClick={onClick} className="block">
        {body}
      </Link>
    );
  }
  return body;
}
