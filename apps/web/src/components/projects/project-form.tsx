"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, Save, FileCheck } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import { TagInput } from "@/components/common/tag-input";
import { LocationInput } from "@/components/common/location-input";
import { useToast } from "@/hooks/use-toast";
import {
  projectsApi,
  PROPERTY_TYPES,
  type ProjectCreatePayload,
} from "@/lib/projects-api";
import { extractApiError } from "@/lib/api-client";
import type { Project } from "@realestate/shared";

const PROJECT_TAG_SUGGESTIONS = [
  "DTCP Approved",
  "RERA Approved",
  "Gated",
  "Near Highway",
  "Ready to Move",
  "Farm Land",
  "Investor Pick",
] as const;

const schema = z.object({
  name: z.string().min(2, "Name is too short"),
  locationText: z.string().min(2, "Location is required"),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  description: z.string().max(2000).optional(),
  propertyType: z.string().min(1, "Select a property type"),
  tags: z.array(z.string()).default([]),
});

type ProjectFormValues = z.infer<typeof schema>;

interface ProjectFormProps {
  initial?: Project;
}

export function ProjectForm({ initial }: ProjectFormProps) {
  const router = useRouter();
  const toast = useToast();
  const queryClient = useQueryClient();
  const isEdit = Boolean(initial);
  const [saveMode, setSaveMode] = useState<"draft" | "active">("active");

  const {
    control,
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ProjectFormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: initial?.name ?? "",
      locationText: initial?.locationText ?? "",
      latitude: initial?.latitude,
      longitude: initial?.longitude,
      description: initial?.description ?? "",
      propertyType: initial?.propertyType ?? PROPERTY_TYPES[0],
      tags: initial?.tags ?? [],
    },
  });

  const createMut = useMutation({
    mutationFn: (payload: ProjectCreatePayload) => projectsApi.create(payload),
  });
  const updateMut = useMutation({
    mutationFn: (payload: ProjectCreatePayload) =>
      projectsApi.update(initial!.id, payload),
  });

  const onSubmit = async (values: ProjectFormValues) => {
    const payload: ProjectCreatePayload = {
      ...values,
      status: saveMode,
    };
    try {
      const project = isEdit
        ? await updateMut.mutateAsync(payload)
        : await createMut.mutateAsync(payload);
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      toast.show({
        title: isEdit ? "Project updated" : "Project created",
        description: `${project.name} (${project.projectCode})`,
        variant: "success",
      });
      router.push(`/projects/${project.id}`);
    } catch (err) {
      toast.show({
        title: "Save failed",
        description: extractApiError(err).message,
        variant: "destructive",
      });
    }
  };

  const pending =
    isSubmitting || createMut.isPending || updateMut.isPending;

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6" noValidate>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Basic details</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-5 md:grid-cols-2">
          <FormField
            label="Project name"
            required
            htmlFor="name"
            error={errors.name?.message}
          >
            <Input id="name" {...register("name")} placeholder="Green Valley" />
          </FormField>

          <FormField
            label="Property type"
            required
            htmlFor="propertyType"
            error={errors.propertyType?.message}
          >
            <Controller
              control={control}
              name="propertyType"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger id="propertyType">
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    {PROPERTY_TYPES.map((t) => (
                      <SelectItem key={t} value={t}>
                        {t}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </FormField>

          <div className="md:col-span-2">
            <FormField
              label="Location"
              required
              htmlFor="locationText"
              error={errors.locationText?.message}
            >
              <Controller
                control={control}
                name="locationText"
                render={({ field }) => (
                  <LocationInput
                    id="locationText"
                    value={{
                      text: field.value,
                      latitude: initial?.latitude,
                      longitude: initial?.longitude,
                    }}
                    onChange={(v) => field.onChange(v.text)}
                  />
                )}
              />
            </FormField>
          </div>

          <div className="md:col-span-2">
            <FormField label="Description" htmlFor="description">
              <Textarea
                id="description"
                rows={4}
                placeholder="Key highlights, specifications, amenities…"
                {...register("description")}
              />
            </FormField>
          </div>

          <div className="md:col-span-2">
            <FormField label="Tags" htmlFor="tags">
              <Controller
                control={control}
                name="tags"
                render={({ field }) => (
                  <TagInput
                    id="tags"
                    value={field.value ?? []}
                    onChange={field.onChange}
                    suggestions={PROJECT_TAG_SUGGESTIONS}
                  />
                )}
              />
            </FormField>
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-wrap items-center justify-end gap-3">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.back()}
          disabled={pending}
        >
          Cancel
        </Button>
        <Button
          type="submit"
          variant="outline"
          onClick={() => setSaveMode("draft")}
          disabled={pending}
        >
          {pending && saveMode === "draft" ? (
            <Loader2 className="animate-spin" />
          ) : (
            <Save className="h-4 w-4" />
          )}
          Save as draft
        </Button>
        <Button
          type="submit"
          onClick={() => setSaveMode("active")}
          disabled={pending}
        >
          {pending && saveMode === "active" ? (
            <Loader2 className="animate-spin" />
          ) : (
            <FileCheck className="h-4 w-4" />
          )}
          {isEdit ? "Save changes" : "Publish project"}
        </Button>
      </div>
    </form>
  );
}
