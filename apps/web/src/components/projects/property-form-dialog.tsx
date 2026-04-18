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
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
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
import { extractApiError } from "@/lib/api-client";
import { projectsApi, type PropertyPayload } from "@/lib/projects-api";
import { PropertyStatus, type Property } from "@realestate/shared";

const schema = z.object({
  unitNumber: z.string().min(1, "Required"),
  size: z.coerce.number().positive("Enter a positive number"),
  sizeUnit: z.enum(["sqft", "sqyd"]),
  price: z.coerce.number().nonnegative("Price can't be negative"),
  facing: z.string().optional(),
  status: z.enum([
    PropertyStatus.AVAILABLE,
    PropertyStatus.RESERVED,
    PropertyStatus.SOLD,
  ]),
});

type PropertyFormValues = z.infer<typeof schema>;

interface PropertyFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  initial?: Property;
}

export function PropertyFormDialog({
  open,
  onOpenChange,
  projectId,
  initial,
}: PropertyFormDialogProps) {
  const toast = useToast();
  const queryClient = useQueryClient();
  const isEdit = Boolean(initial);

  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<PropertyFormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      unitNumber: "",
      size: 0,
      sizeUnit: "sqyd",
      price: 0,
      facing: "",
      status: PropertyStatus.AVAILABLE,
    },
  });

  useEffect(() => {
    if (open) {
      reset({
        unitNumber: initial?.unitNumber ?? "",
        size: initial?.size ?? 0,
        sizeUnit: initial?.sizeUnit ?? "sqyd",
        price: initial?.price ?? 0,
        facing: initial?.facing ?? "",
        status: initial?.status ?? PropertyStatus.AVAILABLE,
      });
    }
  }, [open, initial, reset]);

  const saveMut = useMutation({
    mutationFn: async (payload: PropertyPayload) =>
      isEdit
        ? projectsApi.updateProperty(initial!.id, payload)
        : projectsApi.createProperty(projectId, payload),
    onSuccess: (property) => {
      queryClient.invalidateQueries({ queryKey: ["project", projectId] });
      queryClient.invalidateQueries({
        queryKey: ["project", projectId, "properties"],
      });
      toast.show({
        title: isEdit ? "Property updated" : "Property added",
        description: `${property.unitNumber} · ${property.status}`,
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

  const onSubmit = (values: PropertyFormValues) => {
    saveMut.mutate(values);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {isEdit ? "Edit property" : "Add property"}
          </DialogTitle>
          <DialogDescription>
            Plots and units must have a unique unit number within this project.
          </DialogDescription>
        </DialogHeader>

        <form
          id="property-form"
          onSubmit={handleSubmit(onSubmit)}
          className="grid gap-4 sm:grid-cols-2"
          noValidate
        >
          <FormField
            label="Unit number"
            required
            htmlFor="unitNumber"
            error={errors.unitNumber?.message}
            className="sm:col-span-2"
          >
            <Input
              id="unitNumber"
              placeholder="A-01"
              {...register("unitNumber")}
            />
          </FormField>

          <FormField label="Size" required error={errors.size?.message}>
            <Input
              type="number"
              step="any"
              {...register("size", { valueAsNumber: true })}
            />
          </FormField>

          <FormField label="Unit" error={errors.sizeUnit?.message}>
            <Controller
              control={control}
              name="sizeUnit"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sqyd">sq. yards</SelectItem>
                    <SelectItem value="sqft">sq. feet</SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
          </FormField>

          <FormField
            label="Price (₹)"
            required
            error={errors.price?.message}
            className="sm:col-span-2"
          >
            <Input
              type="number"
              step="any"
              {...register("price", { valueAsNumber: true })}
            />
          </FormField>

          <FormField label="Facing" error={errors.facing?.message}>
            <Input placeholder="East / North / West / South" {...register("facing")} />
          </FormField>

          <FormField label="Status" error={errors.status?.message}>
            <Controller
              control={control}
              name="status"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={PropertyStatus.AVAILABLE}>
                      Available
                    </SelectItem>
                    <SelectItem value={PropertyStatus.RESERVED}>
                      Reserved
                    </SelectItem>
                    <SelectItem value={PropertyStatus.SOLD}>Sold</SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
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
            form="property-form"
            disabled={saveMut.isPending || isSubmitting}
          >
            {saveMut.isPending ? <Loader2 className="animate-spin" /> : null}
            {isEdit ? "Save changes" : "Add property"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
