"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell, CheckCheck, Loader2 } from "lucide-react";
import { PageHeader } from "@/components/common/page-header";
import { EmptyState } from "@/components/common/empty-state";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { NotificationItem } from "@/components/notifications/notification-item";
import { notificationsApi } from "@/lib/notifications-api";

export default function NotificationsPage() {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["notifications"],
    queryFn: () => notificationsApi.list(),
  });

  const markAllMut = useMutation({
    mutationFn: () => notificationsApi.markAllRead(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });

  const items = data?.items ?? [];
  const unread = data?.unreadCount ?? 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Notifications"
        description="Derived in real time from overdue tasks, lead replies, and stagnant opportunities."
        actions={
          unread > 0 ? (
            <Button
              variant="outline"
              onClick={() => markAllMut.mutate()}
              disabled={markAllMut.isPending}
            >
              {markAllMut.isPending ? (
                <Loader2 className="animate-spin" />
              ) : (
                <CheckCheck className="h-4 w-4" />
              )}
              Mark all read
            </Button>
          ) : undefined
        }
      />

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-14 w-full" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <EmptyState
          icon={Bell}
          title="You're all caught up"
          description="No overdue tasks, unread replies, or stagnant opportunities."
        />
      ) : (
        <div className="rounded-lg border bg-card">
          <ul className="divide-y">
            {items.map((n) => (
              <li key={n.id} className="p-1.5">
                <NotificationItem notification={n} />
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
