"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { extractApiError } from "@/lib/api-client";
import { opportunitiesApi } from "@/lib/opportunities-api";
import {
  OpportunityStage,
  OPPORTUNITY_STAGE_ORDER,
  OPPORTUNITY_STAGE_LABEL,
} from "@realestate/shared";

interface StageSelectorProps {
  opportunityId: string;
  currentStage: OpportunityStage;
  disabled?: boolean;
}

export function StageSelector({
  opportunityId,
  currentStage,
  disabled,
}: StageSelectorProps) {
  const toast = useToast();
  const queryClient = useQueryClient();

  const mut = useMutation({
    mutationFn: (stage: OpportunityStage) =>
      opportunitiesApi.updateStage(opportunityId, stage),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["opportunity", opportunityId] });
      queryClient.invalidateQueries({ queryKey: ["opportunities"] });
      queryClient.invalidateQueries({ queryKey: ["pipeline"] });
      toast.show({ title: "Stage updated", variant: "success" });
    },
    onError: (err) => {
      toast.show({
        title: "Couldn't change stage",
        description: extractApiError(err).message,
        variant: "destructive",
      });
    },
  });

  return (
    <div className="inline-flex items-center gap-2">
      <Select
        value={currentStage}
        onValueChange={(v) => mut.mutate(v as OpportunityStage)}
        disabled={disabled || mut.isPending}
      >
        <SelectTrigger className="w-[220px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {OPPORTUNITY_STAGE_ORDER.map((s) => (
            <SelectItem key={s} value={s}>
              {OPPORTUNITY_STAGE_LABEL[s]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {mut.isPending ? (
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
      ) : null}
    </div>
  );
}
