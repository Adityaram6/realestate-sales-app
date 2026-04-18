"use client";

import { useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { activitiesApi } from "@/lib/activities-api";
import { extractApiError } from "@/lib/api-client";
import { ActivityType } from "@realestate/shared";

const TYPE_OPTIONS: Array<{ value: ActivityType; label: string }> = [
  { value: ActivityType.CALL, label: "Call" },
  { value: ActivityType.WHATSAPP, label: "WhatsApp" },
  { value: ActivityType.EMAIL, label: "Email" },
  { value: ActivityType.MEETING, label: "Meeting / site visit" },
  { value: ActivityType.NOTE, label: "Note" },
];

const schema = z.object({
  type: z.enum([
    ActivityType.CALL,
    ActivityType.WHATSAPP,
    ActivityType.EMAIL,
    ActivityType.MEETING,
    ActivityType.NOTE,
  ]),
  title: z.string().min(1, "Required"),
  description: z.string().max(2000).optional(),
  durationMinutes: z.coerce.number().positive().optional(),
  outcome: z.string().optional(),
});

type ActivityFormValues = z.infer<typeof schema>;

interface AddActivityDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  leadId: string;
  opportunityId?: string;
}

export function AddActivityDialog({
  open,
  onOpenChange,
  leadId,
  opportunityId,
}: AddActivityDialogProps) {
  const toast = useToast();
  const queryClient = useQueryClient();

  const {
    register,
    control,
    handleSubmit,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ActivityFormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      type: ActivityType.CALL,
      title: "",
      description: "",
    },
  });

  const type = watch("type");

  useEffect(() => {
    if (open) {
      reset({
        type: ActivityType.CALL,
        title: "",
        description: "",
      });
    }
  }, [open, reset]);

  const saveMut = useMutation({
    mutationFn: (values: ActivityFormValues) =>
      activitiesApi.logActivity({
        leadId,
        opportunityId,
        ...values,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["timeline", leadId] });
      toast.show({ title: "Activity logged", variant: "success" });
      onOpenChange(false);
    },
    onError: (err) => {
      toast.show({
        title: "Couldn't log activity",
        description: extractApiError(err).message,
        variant: "destructive",
      });
    },
  });

  const showDuration = type === ActivityType.CALL || type === ActivityType.MEETING;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Log activity</DialogTitle>
          <DialogDescription>
            Captures what happened so the pipeline stays grounded in real
            interactions.
          </DialogDescription>
        </DialogHeader>

        <form
          id="activity-form"
          onSubmit={handleSubmit((v) => saveMut.mutate(v))}
          className="space-y-4"
          noValidate
        >
          <FormField label="Type" error={errors.type?.message}>
            <Controller
              control={control}
              name="type"
              render={({ field }) => (
                <Select
                  value={field.value}
                  onValueChange={(v) => field.onChange(v as ActivityType)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TYPE_OPTIONS.map((o) => (
                      <SelectItem key={o.value} value={o.value}>
                        {o.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </FormField>

          <FormField
            label="Title"
            required
            htmlFor="title"
            error={errors.title?.message}
          >
            <Input
              id="title"
              placeholder="e.g. Pricing discussion"
              {...register("title")}
            />
          </FormField>

          <FormField label="Notes" htmlFor="description">
            <Textarea
              id="description"
              rows={3}
              placeholder="What was discussed, agreed, open questions…"
              {...register("description")}
            />
          </FormField>

          {showDuration ? (
            <div className="grid gap-3 sm:grid-cols-2">
              <FormField
                label="Duration (min)"
                htmlFor="durationMinutes"
                error={errors.durationMinutes?.message}
              >
                <Input
                  id="durationMinutes"
                  type="number"
                  {...register("durationMinutes", { valueAsNumber: true })}
                />
              </FormField>
              <FormField label="Outcome" htmlFor="outcome">
                <Input
                  id="outcome"
                  placeholder="e.g. Interested, scheduled visit"
                  {...register("outcome")}
                />
              </FormField>
            </div>
          ) : null}
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
            form="activity-form"
            disabled={saveMut.isPending || isSubmitting}
          >
            {saveMut.isPending ? <Loader2 className="animate-spin" /> : null}
            Log activity
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
