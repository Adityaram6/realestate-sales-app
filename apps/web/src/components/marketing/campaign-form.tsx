"use client";

import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2 } from "lucide-react";
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
import { useToast } from "@/hooks/use-toast";
import { extractApiError } from "@/lib/api-client";
import {
  campaignsApi,
  type CreateCampaignPayload,
} from "@/lib/campaigns-api";
import { projectsApi } from "@/lib/projects-api";
import {
  CampaignType,
  CAMPAIGN_TYPE_LABEL,
  LeadStatus,
  ProjectStatus,
  type Campaign,
} from "@realestate/shared";

const schema = z.object({
  name: z.string().min(2, "Name is too short"),
  description: z.string().max(2000).optional(),
  projectId: z.string().optional(),
  type: z.enum([
    CampaignType.WHATSAPP_BLAST,
    CampaignType.EMAIL_BLAST,
    CampaignType.SOCIAL,
    CampaignType.MULTI_CHANNEL,
  ]),
  audienceStatus: z
    .enum([LeadStatus.HOT, LeadStatus.WARM, LeadStatus.COLD])
    .optional(),
  minScore: z.coerce.number().min(0).max(100).optional(),
  startDate: z.string().optional(),
});

type CampaignFormValues = z.infer<typeof schema>;

interface CampaignFormProps {
  initial?: Campaign;
}

export function CampaignForm({ initial }: CampaignFormProps) {
  const router = useRouter();
  const toast = useToast();
  const queryClient = useQueryClient();
  const isEdit = Boolean(initial);

  const {
    control,
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<CampaignFormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: initial?.name ?? "",
      description: initial?.description ?? "",
      projectId: initial?.projectId ?? undefined,
      type: initial?.type ?? CampaignType.WHATSAPP_BLAST,
      audienceStatus: initial?.audienceFilter?.status,
      minScore: initial?.audienceFilter?.minScore,
      startDate: initial?.startDate
        ? initial.startDate.slice(0, 16)
        : undefined,
    },
  });

  const { data: projects } = useQuery({
    queryKey: ["projects", "for-campaign-picker"],
    queryFn: () =>
      projectsApi.list({ status: ProjectStatus.ACTIVE, pageSize: 100 }),
  });

  const saveMut = useMutation({
    mutationFn: async (values: CampaignFormValues) => {
      const payload: CreateCampaignPayload = {
        name: values.name,
        description: values.description,
        projectId: values.projectId === "none" ? undefined : values.projectId,
        type: values.type,
        audienceFilter:
          values.audienceStatus || values.minScore != null
            ? {
                status: values.audienceStatus,
                minScore: values.minScore,
              }
            : undefined,
        startDate: values.startDate
          ? new Date(values.startDate).toISOString()
          : undefined,
      };
      return isEdit
        ? campaignsApi.update(initial!.id, payload)
        : campaignsApi.create(payload);
    },
    onSuccess: (campaign) => {
      queryClient.invalidateQueries({ queryKey: ["campaigns"] });
      toast.show({
        title: isEdit ? "Campaign updated" : "Campaign created",
        description: campaign.name,
        variant: "success",
      });
      router.push(`/marketing/${campaign.id}`);
    },
    onError: (err) => {
      toast.show({
        title: "Save failed",
        description: extractApiError(err).message,
        variant: "destructive",
      });
    },
  });

  const pending = isSubmitting || saveMut.isPending;

  return (
    <form
      onSubmit={handleSubmit((v) => saveMut.mutate(v))}
      className="space-y-6"
      noValidate
    >
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Campaign basics</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-5 md:grid-cols-2">
          <FormField
            label="Name"
            required
            htmlFor="name"
            error={errors.name?.message}
            className="md:col-span-2"
          >
            <Input
              id="name"
              placeholder="Green Valley — Weekend Open House"
              {...register("name")}
            />
          </FormField>

          <FormField
            label="Type"
            required
            error={errors.type?.message}
          >
            <Controller
              control={control}
              name="type"
              render={({ field }) => (
                <Select
                  value={field.value}
                  onValueChange={(v) => field.onChange(v as CampaignType)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.values(CampaignType).map((t) => (
                      <SelectItem key={t} value={t}>
                        {CAMPAIGN_TYPE_LABEL[t]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </FormField>

          <FormField label="Project">
            <Controller
              control={control}
              name="projectId"
              render={({ field }) => (
                <Select
                  value={field.value ?? "none"}
                  onValueChange={(v) => field.onChange(v === "none" ? undefined : v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="None" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No project</SelectItem>
                    {projects?.data.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </FormField>

          <FormField
            label="Schedule"
            htmlFor="startDate"
            hint="Leave blank to run manually. The job queue fires execute() at this time."
            className="md:col-span-2"
          >
            <Input
              id="startDate"
              type="datetime-local"
              {...register("startDate")}
            />
          </FormField>

          <FormField
            label="Description"
            htmlFor="description"
            className="md:col-span-2"
          >
            <Textarea
              id="description"
              rows={3}
              placeholder="What's this campaign about?"
              {...register("description")}
            />
          </FormField>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Default audience filter</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Pre-filter leads for later bulk-add. You can also add leads
            manually on the detail page.
          </p>
          <div className="grid gap-5 md:grid-cols-2">
            <FormField label="Lead status">
              <Controller
                control={control}
                name="audienceStatus"
                render={({ field }) => (
                  <Select
                    value={field.value ?? "any"}
                    onValueChange={(v) =>
                      field.onChange(v === "any" ? undefined : (v as LeadStatus))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="any">Any</SelectItem>
                      <SelectItem value={LeadStatus.HOT}>Hot</SelectItem>
                      <SelectItem value={LeadStatus.WARM}>Warm</SelectItem>
                      <SelectItem value={LeadStatus.COLD}>Cold</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
            </FormField>

            <FormField
              label="Min score (0–100)"
              htmlFor="minScore"
              error={errors.minScore?.message}
              hint="Only leads scored at or above this number"
            >
              <Input
                id="minScore"
                type="number"
                min={0}
                max={100}
                {...register("minScore", { valueAsNumber: true })}
              />
            </FormField>
          </div>
        </CardContent>
      </Card>

      <div className="flex items-center justify-end gap-3">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.back()}
          disabled={pending}
        >
          Cancel
        </Button>
        <Button type="submit" disabled={pending}>
          {pending ? <Loader2 className="animate-spin" /> : null}
          {isEdit ? "Save changes" : "Create campaign"}
        </Button>
      </div>
    </form>
  );
}
