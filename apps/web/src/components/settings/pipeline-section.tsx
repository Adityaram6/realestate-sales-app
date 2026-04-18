"use client";

import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowDown, ArrowUp, Lock, Loader2, GripVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { settingsApi, type PipelineStage } from "@/lib/settings-api";
import { extractApiError } from "@/lib/api-client";

export function PipelineSection() {
  const toast = useToast();
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["settings", "pipeline-stages"],
    queryFn: () => settingsApi.listPipelineStages(),
  });

  const [order, setOrder] = useState<PipelineStage[]>([]);
  useEffect(() => {
    if (data) setOrder(data);
  }, [data]);

  const dirty =
    data && order.length === data.length
      ? order.some((s, i) => s.id !== data[i]?.id)
      : false;

  const saveMut = useMutation({
    mutationFn: () =>
      settingsApi.reorderPipelineStages(order.map((s) => s.id)),
    onSuccess: (next) => {
      queryClient.setQueryData(["settings", "pipeline-stages"], next);
      toast.show({ title: "Pipeline order saved", variant: "success" });
    },
    onError: (err) => {
      toast.show({
        title: "Save failed",
        description: extractApiError(err).message,
        variant: "destructive",
      });
    },
  });

  const move = (index: number, delta: number) => {
    const next = [...order];
    const target = index + delta;
    if (target < 0 || target >= next.length) return;
    const [moved] = next.splice(index, 1);
    if (!moved) return;
    next.splice(target, 0, moved);
    setOrder(next);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Pipeline stages</h2>
          <p className="text-sm text-muted-foreground">
            Reorder opportunity stages. Default stages can't be deleted but can
            be renamed or reordered.
          </p>
        </div>
        <Button
          disabled={!dirty || saveMut.isPending}
          onClick={() => saveMut.mutate()}
        >
          {saveMut.isPending ? <Loader2 className="animate-spin" /> : null}
          Save order
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      ) : (
        <ol className="space-y-1.5">
          {order.map((stage, idx) => (
            <li
              key={stage.id}
              className="flex items-center gap-3 rounded-md border bg-card px-3 py-2.5"
            >
              <GripVertical className="h-4 w-4 text-muted-foreground" />
              <div className="flex-1">
                <div className="font-medium">{stage.name}</div>
                <div className="text-xs text-muted-foreground">
                  Position {idx + 1}
                </div>
              </div>
              {stage.isClosed ? (
                <Badge variant="muted">Terminal</Badge>
              ) : null}
              {stage.isDefault ? (
                <Badge variant="outline" className="gap-1">
                  <Lock className="h-3 w-3" />
                  Default
                </Badge>
              ) : null}
              <Button
                variant="ghost"
                size="icon"
                onClick={() => move(idx, -1)}
                disabled={idx === 0}
                aria-label="Move up"
              >
                <ArrowUp className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => move(idx, 1)}
                disabled={idx === order.length - 1}
                aria-label="Move down"
              >
                <ArrowDown className="h-4 w-4" />
              </Button>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
