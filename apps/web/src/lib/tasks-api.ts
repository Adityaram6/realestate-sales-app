import { apiClient } from "@/lib/api-client";

export interface Task {
  id: string;
  title: string;
  description?: string;
  dueDate: string;
  status: "PENDING" | "COMPLETED";
  assignedTo: string;
  leadId?: string;
  opportunityId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface TaskCreatePayload {
  title: string;
  description?: string;
  dueDate: string;
  assignedTo?: string;
  leadId?: string;
  opportunityId?: string;
}

export interface TaskListFilters {
  assignedTo?: string;
  status?: Task["status"];
  overdue?: boolean;
  leadId?: string;
}

export const tasksApi = {
  list: async (filters: TaskListFilters = {}): Promise<Task[]> => {
    const { data } = await apiClient.get<Task[]>("/tasks", { params: filters });
    return data;
  },
  create: async (payload: TaskCreatePayload): Promise<Task> => {
    const { data } = await apiClient.post<Task>("/tasks", payload);
    return data;
  },
  update: async (id: string, payload: Partial<TaskCreatePayload> & {
    status?: Task["status"];
  }): Promise<Task> => {
    const { data } = await apiClient.patch<Task>(`/tasks/${id}`, payload);
    return data;
  },
  remove: async (id: string): Promise<void> => {
    await apiClient.delete(`/tasks/${id}`);
  },
};
