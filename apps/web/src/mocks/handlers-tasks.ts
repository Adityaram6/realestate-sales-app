import type { MockHandler } from "@/mocks/handlers";
import { taskStore } from "@/mocks/fixtures/tasks";
import type { Task, TaskCreatePayload } from "@/lib/tasks-api";

function httpError(status: number, message: string) {
  return Object.assign(new Error(message), { status });
}

export const taskMockHandlers: MockHandler[] = [
  {
    method: "get",
    path: "/tasks",
    handler: async ({ query }) => {
      let tasks = [...taskStore];
      if (query.assignedTo) {
        tasks = tasks.filter((t) => t.assignedTo === query.assignedTo);
      }
      if (query.status) {
        tasks = tasks.filter((t) => t.status === query.status);
      }
      if (query.leadId) {
        tasks = tasks.filter((t) => t.leadId === query.leadId);
      }
      if (query.overdue === "true") {
        const now = Date.now();
        tasks = tasks.filter(
          (t) =>
            t.status === "pending" &&
            new Date(t.dueDate).getTime() < now,
        );
      }
      tasks.sort(
        (a, b) =>
          new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime(),
      );
      return { data: tasks };
    },
  },
  {
    method: "post",
    path: "/tasks",
    handler: async ({ body }) => {
      const payload = body as TaskCreatePayload;
      if (!payload?.title) throw httpError(400, "title required");
      if (!payload?.dueDate) throw httpError(400, "dueDate required");
      const now = new Date().toISOString();
      const task: Task = {
        id: `task-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        title: payload.title,
        description: payload.description,
        dueDate: payload.dueDate,
        status: "pending",
        assignedTo: payload.assignedTo ?? "u-3",
        leadId: payload.leadId,
        opportunityId: payload.opportunityId,
        createdAt: now,
        updatedAt: now,
      };
      taskStore.push(task);
      return { data: task, status: 201 };
    },
  },
  {
    method: "patch",
    path: "/tasks/:id",
    handler: async ({ params, body }) => {
      const idx = taskStore.findIndex((t) => t.id === params.id);
      if (idx === -1) throw httpError(404, "Task not found");
      const payload = body as Partial<Task>;
      const updated: Task = {
        ...taskStore[idx]!,
        ...payload,
        id: taskStore[idx]!.id,
        updatedAt: new Date().toISOString(),
      };
      taskStore[idx] = updated;
      return { data: updated };
    },
  },
  {
    method: "delete",
    path: "/tasks/:id",
    handler: async ({ params }) => {
      const idx = taskStore.findIndex((t) => t.id === params.id);
      if (idx === -1) throw httpError(404, "Task not found");
      taskStore.splice(idx, 1);
      return { data: { success: true } };
    },
  },
];
