import { apiClient } from "@/lib/api-client";

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

export const notificationsApi = {
  list: async (): Promise<NotificationsResponse> => {
    const { data } = await apiClient.get<NotificationsResponse>(
      "/notifications",
    );
    return data;
  },
  markAllRead: async (): Promise<void> => {
    await apiClient.post("/notifications/mark-all-read");
  },
};
