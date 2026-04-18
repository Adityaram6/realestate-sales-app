"use client";

import { useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { useToast } from "@/hooks/use-toast";
import { extractApiError } from "@/lib/api-client";
import { tasksApi, type Task } from "@/lib/tasks-api";

const schema = z.object({
  title: z.string().min(1, "Required"),
  description: z.string().max(1000).optional(),
  dueDate: z.string().min(1, "Required"),
});

type TaskFormValues = z.infer<typeof schema>;

interface TaskDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initial?: Task;
  defaultLeadId?: string;
}

export function TaskDialog({
  open,
  onOpenChange,
  initial,
  defaultLeadId,
}: TaskDialogProps) {
  const toast = useToast();
  const queryClient = useQueryClient();
  const isEdit = Boolean(initial);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<TaskFormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      title: "",
      description: "",
      dueDate: toDateInputValue(Date.now() + 1000 * 60 * 60 * 24),
    },
  });

  useEffect(() => {
    if (open) {
      reset({
        title: initial?.title ?? "",
        description: initial?.description ?? "",
        dueDate: initial
          ? toDateInputValue(initial.dueDate)
          : toDateInputValue(Date.now() + 1000 * 60 * 60 * 24),
      });
    }
  }, [open, initial, reset]);

  const saveMut = useMutation({
    mutationFn: (v: TaskFormValues) => {
      const dueDate = new Date(v.dueDate + "T23:59:00").toISOString();
      if (isEdit) {
        return tasksApi.update(initial!.id, {
          title: v.title,
          description: v.description,
          dueDate,
        });
      }
      return tasksApi.create({
        title: v.title,
        description: v.description,
        dueDate,
        leadId: defaultLeadId,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      toast.show({
        title: isEdit ? "Task updated" : "Task created",
        variant: "success",
      });
      onOpenChange(false);
    },
    onError: (err) => {
      toast.show({
        title: "Save failed",
        description: extractApiError(err).message,
        variant: "destructive",
      });
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit task" : "New task"}</DialogTitle>
        </DialogHeader>

        <form
          id="task-form"
          onSubmit={handleSubmit((v) => saveMut.mutate(v))}
          className="space-y-4"
          noValidate
        >
          <FormField
            label="Title"
            required
            htmlFor="title"
            error={errors.title?.message}
          >
            <Input id="title" {...register("title")} />
          </FormField>
          <FormField label="Description" htmlFor="description">
            <Textarea id="description" rows={3} {...register("description")} />
          </FormField>
          <FormField
            label="Due date"
            required
            htmlFor="dueDate"
            error={errors.dueDate?.message}
          >
            <Input id="dueDate" type="date" {...register("dueDate")} />
          </FormField>
        </form>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={saveMut.isPending || isSubmitting}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            form="task-form"
            disabled={saveMut.isPending || isSubmitting}
          >
            {saveMut.isPending ? <Loader2 className="animate-spin" /> : null}
            {isEdit ? "Save changes" : "Create task"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function toDateInputValue(input: string | number | Date): string {
  const d = new Date(input);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
