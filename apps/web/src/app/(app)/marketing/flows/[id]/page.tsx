"use client";

import Link from "next/link";
import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  Loader2,
  Play,
  Pause,
  Trash2,
  Activity,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { EmptyState } from "@/components/common/empty-state";
import { ConfirmDialog } from "@/components/common/confirm-dialog";
import { StepEditor, type EditableStep } from "@/components/flows/step-editor";
import {
  FlowExecutionStatusBadge,
  FlowTriggerBadge,
} from "@/components/flows/flow-status-badge";
import { useToast } from "@/hooks/use-toast";
import { flowsApi } from "@/lib/flows-api";
import { extractApiError } from "@/lib/api-client";
import { formatRelativeTime } from "@/lib/utils";

export default function FlowDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const toast = useToast();
  const [confirmDelete, setConfirmDelete] = useState(false);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["flow", params.id],
    queryFn: () => flowsApi.get(params.id),
    enabled: Boolean(params.id),
  });

  const { data: executions } = useQuery({
    queryKey: ["flow", params.id, "executions"],
    queryFn: () => flowsApi.listExecutions({ flowId: params.id, take: 50 }),
    enabled: Boolean(params.id),
    refetchInterval: 5000,
  });

  const toggleMut = useMutation({
    mutationFn: (isActive: boolean) =>
      flowsApi.update(params.id, { isActive }),
    onSuccess: (flow) => {
      queryClient.invalidateQueries({ queryKey: ["flow", params.id] });
      queryClient.invalidateQueries({ queryKey: ["flows"] });
      toast.show({
        title: flow.isActive ? "Flow activated" : "Flow paused",
        variant: "success",
      });
    },
    onError: (err) => {
      toast.show({
        title: "Update failed",
        description: extractApiError(err).message,
        variant: "destructive",
      });
    },
  });

  const stepsMut = useMutation({
    mutationFn: (steps: EditableStep[]) =>
      flowsApi.update(params.id, { steps }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["flow", params.id] });
      toast.show({ title: "Steps saved", variant: "success" });
    },
    onError: (err) => {
      toast.show({
        title: "Save failed",
        description: extractApiError(err).message,
        variant: "destructive",
      });
    },
  });

  const deleteMut = useMutation({
    mutationFn: () => flowsApi.remove(params.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["flows"] });
      toast.show({ title: "Flow deleted", variant: "success" });
      router.push("/marketing/flows");
    },
    onError: (err) => {
      toast.show({
        title: "Delete failed",
        description: extractApiError(err).message,
        variant: "destructive",
      });
    },
  });

  if (isError) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" size="sm" asChild className="-ml-2">
          <Link href="/marketing/flows">
            <ArrowLeft className="h-4 w-4" /> All flows
          </Link>
        </Button>
        <EmptyState title="Flow not found" />
      </div>
    );
  }

  if (isLoading || !data) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-9 w-40" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  const editableSteps: EditableStep[] = data.steps.map((s) => ({
    type: s.type,
    config: s.config,
  }));

  return (
    <div className="space-y-6">
      <Button variant="ghost" size="sm" asChild className="-ml-2 w-fit">
        <Link href="/marketing/flows">
          <ArrowLeft className="h-4 w-4" />
          All flows
        </Link>
      </Button>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-tight">
              {data.name}
            </h1>
            <Badge variant={data.isActive ? "success" : "muted"}>
              {data.isActive ? "Active" : "Paused"}
            </Badge>
            <FlowTriggerBadge trigger={data.trigger} />
          </div>
          {data.description ? (
            <p className="text-sm text-muted-foreground">{data.description}</p>
          ) : null}
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            onClick={() => toggleMut.mutate(!data.isActive)}
            disabled={toggleMut.isPending}
          >
            {toggleMut.isPending ? (
              <Loader2 className="animate-spin" />
            ) : data.isActive ? (
              <Pause className="h-4 w-4" />
            ) : (
              <Play className="h-4 w-4" />
            )}
            {data.isActive ? "Pause" : "Activate"}
          </Button>
          <Button
            variant="outline"
            onClick={() => setConfirmDelete(true)}
            disabled={deleteMut.isPending}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <Separator />

      <div className="grid gap-4 sm:grid-cols-4">
        <MetricCard label="Steps" value={data.steps.length} />
        <MetricCard label="Running" value={data.activeExecutions} />
        <MetricCard label="Completed" value={data.completedExecutions} />
        <MetricCard
          label="Total executions"
          value={data.activeExecutions + data.completedExecutions}
        />
      </div>

      <Tabs defaultValue="steps">
        <TabsList>
          <TabsTrigger value="steps">Steps</TabsTrigger>
          <TabsTrigger value="executions">Execution log</TabsTrigger>
        </TabsList>

        <TabsContent value="steps" className="space-y-4">
          <StepEditor
            steps={editableSteps}
            onChange={(next) => stepsMut.mutate(next)}
          />
          {stepsMut.isPending ? (
            <p className="text-xs text-muted-foreground">
              <Loader2 className="mr-1 inline h-3 w-3 animate-spin" />
              Saving step changes…
            </p>
          ) : null}
        </TabsContent>

        <TabsContent value="executions">
          {!executions || executions.length === 0 ? (
            <EmptyState
              icon={Activity}
              title="No executions yet"
              description="When the trigger fires, each matching lead gets its own execution logged here."
            />
          ) : (
            <div className="rounded-lg border bg-card">
              <ul className="divide-y">
                {executions.map((e) => (
                  <li
                    key={e.id}
                    className="flex items-start justify-between gap-4 p-4"
                  >
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex items-center gap-2">
                        <Link
                          href={`/leads/${e.leadId}`}
                          className="font-medium hover:underline"
                        >
                          {e.lead.name}
                        </Link>
                        <FlowExecutionStatusBadge status={e.status} />
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Started {formatRelativeTime(e.startedAt)} ·{" "}
                        {e.stepsCompleted}/{data.steps.length} steps done
                        {e.errorMessage ? (
                          <span className="ml-2 text-destructive">
                            · {e.errorMessage}
                          </span>
                        ) : null}
                      </div>
                    </div>
                    <div className="text-right text-xs text-muted-foreground">
                      {e.completedAt
                        ? `Finished ${formatRelativeTime(e.completedAt)}`
                        : `At step ${e.currentStepIndex + 1}`}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </TabsContent>
      </Tabs>

      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title="Delete this flow?"
        description="Running executions will be cancelled. Sent messages and created tasks stay."
        confirmLabel="Delete"
        destructive
        loading={deleteMut.isPending}
        onConfirm={() => deleteMut.mutate()}
      />
    </div>
  );
}

function MetricCard({ label, value }: { label: string; value: number }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {label}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-semibold tabular-nums">{value}</div>
      </CardContent>
    </Card>
  );
}
