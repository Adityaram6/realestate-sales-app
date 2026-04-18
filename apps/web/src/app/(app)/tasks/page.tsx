"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Plus,
  CheckSquare,
  Clock,
  AlertCircle,
  Check,
  Pencil,
  Trash2,
  Loader2,
} from "lucide-react";
import { PageHeader } from "@/components/common/page-header";
import { EmptyState } from "@/components/common/empty-state";
import { ConfirmDialog } from "@/components/common/confirm-dialog";
import { TaskDialog } from "@/components/tasks/task-dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { tasksApi, type Task } from "@/lib/tasks-api";
import { extractApiError } from "@/lib/api-client";
import { useAuth } from "@/hooks/use-auth";
import { formatDate, formatRelativeTime, cn } from "@/lib/utils";

type View = "mine" | "overdue" | "all" | "completed";

export default function TasksPage() {
  const { user } = useAuth();
  const toast = useToast();
  const queryClient = useQueryClient();
  const [view, setView] = useState<View>("mine");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Task | undefined>();
  const [deleteTarget, setDeleteTarget] = useState<Task | null>(null);

  const filters = useMemo(() => {
    switch (view) {
      case "mine":
        return { assignedTo: user?.id, status: "pending" as const };
      case "overdue":
        return { overdue: true };
      case "completed":
        return { status: "completed" as const };
      default:
        return {};
    }
  }, [view, user?.id]);

  const { data, isLoading } = useQuery({
    queryKey: ["tasks", "list", filters],
    queryFn: () => tasksApi.list(filters),
  });

  const toggleMut = useMutation({
    mutationFn: (task: Task) =>
      tasksApi.update(task.id, {
        status: task.status === "completed" ? "pending" : "completed",
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
    },
    onError: (err) => {
      toast.show({
        title: "Couldn't update task",
        description: extractApiError(err).message,
        variant: "destructive",
      });
    },
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => tasksApi.remove(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      toast.show({ title: "Task deleted", variant: "success" });
      setDeleteTarget(null);
    },
    onError: (err) => {
      toast.show({
        title: "Delete failed",
        description: extractApiError(err).message,
        variant: "destructive",
      });
    },
  });

  const openCreate = () => {
    setEditing(undefined);
    setDialogOpen(true);
  };

  const openEdit = (t: Task) => {
    setEditing(t);
    setDialogOpen(true);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Tasks"
        description="Follow-ups, reminders, and internal to-dos — scoped to you or the whole team."
        actions={
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4" />
            New task
          </Button>
        }
      />

      <Tabs value={view} onValueChange={(v) => setView(v as View)}>
        <TabsList>
          <TabsTrigger value="mine">My tasks</TabsTrigger>
          <TabsTrigger value="overdue">Overdue</TabsTrigger>
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="completed">Completed</TabsTrigger>
        </TabsList>
        <TabsContent value={view}>
          {isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : !data || data.length === 0 ? (
            <EmptyState
              icon={CheckSquare}
              title={emptyTitle(view)}
              description="Create a task to start tracking follow-ups."
              action={
                <Button size="sm" onClick={openCreate}>
                  <Plus className="h-4 w-4" /> New task
                </Button>
              }
            />
          ) : (
            <ul className="space-y-2">
              {data.map((task) => (
                <TaskRow
                  key={task.id}
                  task={task}
                  onToggle={() => toggleMut.mutate(task)}
                  onEdit={() => openEdit(task)}
                  onDelete={() => setDeleteTarget(task)}
                  isTogglePending={
                    toggleMut.isPending && toggleMut.variables?.id === task.id
                  }
                />
              ))}
            </ul>
          )}
        </TabsContent>
      </Tabs>

      <TaskDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        initial={editing}
      />

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Delete this task?"
        description={deleteTarget?.title}
        confirmLabel="Delete"
        destructive
        loading={deleteMut.isPending}
        onConfirm={() =>
          deleteTarget ? deleteMut.mutate(deleteTarget.id) : undefined
        }
      />
    </div>
  );
}

function TaskRow({
  task,
  onToggle,
  onEdit,
  onDelete,
  isTogglePending,
}: {
  task: Task;
  onToggle: () => void;
  onEdit: () => void;
  onDelete: () => void;
  isTogglePending: boolean;
}) {
  const dueMs = new Date(task.dueDate).getTime();
  const isOverdue = task.status === "pending" && dueMs < Date.now();
  const completed = task.status === "completed";

  return (
    <li className="flex items-start gap-3 rounded-lg border bg-card p-4">
      <button
        type="button"
        onClick={onToggle}
        disabled={isTogglePending}
        aria-label={completed ? "Mark as pending" : "Mark complete"}
        className={cn(
          "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border transition-colors",
          completed
            ? "border-primary bg-primary text-primary-foreground"
            : "border-input hover:border-primary",
        )}
      >
        {isTogglePending ? (
          <Loader2 className="h-3 w-3 animate-spin" />
        ) : completed ? (
          <Check className="h-3 w-3" />
        ) : null}
      </button>
      <div className="min-w-0 flex-1 space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={cn(
              "text-sm font-medium",
              completed && "text-muted-foreground line-through",
            )}
          >
            {task.title}
          </span>
          {isOverdue ? (
            <Badge variant="destructive">
              <AlertCircle className="mr-1 h-3 w-3" />
              Overdue
            </Badge>
          ) : null}
          {task.leadId ? (
            <Link
              href={`/leads/${task.leadId}`}
              className="text-xs text-primary hover:underline"
            >
              Lead
            </Link>
          ) : null}
        </div>
        {task.description ? (
          <p className="text-sm text-muted-foreground">{task.description}</p>
        ) : null}
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <Clock className="h-3 w-3" />
          Due {formatDate(task.dueDate)} ·{" "}
          {isOverdue
            ? `${formatRelativeTime(task.dueDate)} (overdue)`
            : formatRelativeTime(task.dueDate)}
        </div>
      </div>
      <div className="flex gap-1">
        <Button
          variant="ghost"
          size="icon"
          onClick={onEdit}
          aria-label="Edit task"
        >
          <Pencil className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={onDelete}
          aria-label="Delete task"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </li>
  );
}

function emptyTitle(view: View) {
  switch (view) {
    case "mine":
      return "No tasks assigned to you";
    case "overdue":
      return "Nothing overdue — nice work";
    case "completed":
      return "No completed tasks yet";
    default:
      return "No tasks";
  }
}
