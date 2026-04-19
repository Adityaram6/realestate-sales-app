import type { Task } from "@/lib/tasks-api";

const now = Date.now();
const day = 1000 * 60 * 60 * 24;

export const taskStore: Task[] = [
  {
    id: "task-1",
    title: "Call Ravi Kumar — negotiation follow-up",
    description: "Close on price or walk away by Thursday.",
    dueDate: new Date(now + day * 1).toISOString(),
    status: "PENDING",
    assignedTo: "u-3",
    leadId: "lead-1",
    opportunityId: "opp-1",
    createdAt: new Date(now - day * 2).toISOString(),
    updatedAt: new Date(now - day * 2).toISOString(),
  },
  {
    id: "task-2",
    title: "Share master layout with Sneha Rao",
    dueDate: new Date(now - day * 1).toISOString(),
    status: "PENDING",
    assignedTo: "u-3",
    leadId: "lead-2",
    opportunityId: "opp-2",
    createdAt: new Date(now - day * 3).toISOString(),
    updatedAt: new Date(now - day * 3).toISOString(),
  },
  {
    id: "task-3",
    title: "Prepare brochure — Palm Grove launch",
    description: "Dhanya to design, review by Monday.",
    dueDate: new Date(now + day * 4).toISOString(),
    status: "PENDING",
    assignedTo: "u-2",
    createdAt: new Date(now - day * 1).toISOString(),
    updatedAt: new Date(now - day * 1).toISOString(),
  },
  {
    id: "task-4",
    title: "Update Anita Sharma with new price card",
    dueDate: new Date(now - day * 3).toISOString(),
    status: "COMPLETED",
    assignedTo: "u-3",
    leadId: "lead-4",
    createdAt: new Date(now - day * 5).toISOString(),
    updatedAt: new Date(now - day * 2).toISOString(),
  },
];
