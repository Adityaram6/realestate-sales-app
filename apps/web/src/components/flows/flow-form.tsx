"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, Save } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { FormField } from "@/components/ui/form-field";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { StepEditor, type EditableStep } from "@/components/flows/step-editor";
import { useToast } from "@/hooks/use-toast";
import { flowsApi } from "@/lib/flows-api";
import { extractApiError } from "@/lib/api-client";
import {
  FlowStepType,
  FlowTriggerType,
  FLOW_TRIGGER_LABEL,
  OpportunityStage,
  OPPORTUNITY_STAGE_LABEL,
  OPPORTUNITY_STAGE_ORDER,
  type CampaignFlowWithRelations,
} from "@realestate/shared";

interface FlowFormProps {
  initial?: CampaignFlowWithRelations;
}

export function FlowForm({ initial }: FlowFormProps) {
  const router = useRouter();
  const toast = useToast();
  const queryClient = useQueryClient();
  const isEdit = Boolean(initial);

  const [name, setName] = useState(initial?.name ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [trigger, setTrigger] = useState<FlowTriggerType>(
    initial?.trigger ?? FlowTriggerType.LEAD_ADDED,
  );
  const [toStage, setToStage] = useState<OpportunityStage | undefined>(
    initial?.triggerConfig?.toStage,
  );
  const [steps, setSteps] = useState<EditableStep[]>(
    initial?.steps.map((s) => ({ type: s.type, config: s.config })) ?? [
      { type: FlowStepType.SEND_WHATSAPP, config: { content: "" } },
    ],
  );

  const saveMut = useMutation({
    mutationFn: async () => {
      if (isEdit) {
        return flowsApi.update(initial!.id, {
          name,
          description: description || undefined,
          steps,
        });
      }
      return flowsApi.create({
        name,
        description: description || undefined,
        trigger,
        triggerConfig:
          trigger === FlowTriggerType.STAGE_CHANGED && toStage
            ? { toStage }
            : undefined,
        steps,
      });
    },
    onSuccess: (flow) => {
      queryClient.invalidateQueries({ queryKey: ["flows"] });
      toast.show({
        title: isEdit ? "Flow updated" : "Flow created",
        description: flow.name,
        variant: "success",
      });
      router.push(`/marketing/flows/${flow.id}`);
    },
    onError: (err) => {
      toast.show({
        title: "Save failed",
        description: extractApiError(err).message,
        variant: "destructive",
      });
    },
  });

  const valid = name.length >= 2 && steps.length > 0;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Flow basics</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-5 md:grid-cols-2">
          <FormField label="Name" required className="md:col-span-2">
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="New lead welcome sequence"
            />
          </FormField>

          <FormField label="Trigger" required>
            <Select
              value={trigger}
              onValueChange={(v) => setTrigger(v as FlowTriggerType)}
              disabled={isEdit}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.values(FlowTriggerType).map((t) => (
                  <SelectItem key={t} value={t}>
                    {FLOW_TRIGGER_LABEL[t]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormField>

          {trigger === FlowTriggerType.STAGE_CHANGED ? (
            <FormField
              label="When stage changes to"
              hint="Leave blank to fire on any stage change"
            >
              <Select
                value={toStage ?? "any"}
                onValueChange={(v) =>
                  setToStage(v === "any" ? undefined : (v as OpportunityStage))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="any">Any stage</SelectItem>
                  {OPPORTUNITY_STAGE_ORDER.map((s) => (
                    <SelectItem key={s} value={s}>
                      {OPPORTUNITY_STAGE_LABEL[s]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>
          ) : null}

          <FormField
            label="Description"
            className="md:col-span-2"
            hint="Optional — what this flow does and why"
          >
            <Textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </FormField>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Steps</CardTitle>
        </CardHeader>
        <CardContent>
          <StepEditor steps={steps} onChange={setSteps} />
        </CardContent>
      </Card>

      <div className="flex items-center justify-end gap-3">
        <Button
          variant="outline"
          onClick={() => router.back()}
          disabled={saveMut.isPending}
        >
          Cancel
        </Button>
        <Button
          onClick={() => saveMut.mutate()}
          disabled={!valid || saveMut.isPending}
        >
          {saveMut.isPending ? (
            <Loader2 className="animate-spin" />
          ) : (
            <Save className="h-4 w-4" />
          )}
          {isEdit ? "Save changes" : "Create flow"}
        </Button>
      </div>
    </div>
  );
}
