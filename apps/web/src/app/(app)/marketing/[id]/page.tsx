"use client";

import Link from "next/link";
import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  Building2,
  Loader2,
  Play,
  Rocket,
  Trash2,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { EmptyState } from "@/components/common/empty-state";
import { ConfirmDialog } from "@/components/common/confirm-dialog";
import {
  CampaignStatusBadge,
  CampaignTypeBadge,
} from "@/components/marketing/campaign-status-badge";
import { AudiencePanel } from "@/components/marketing/audience-panel";
import { ContentComposer } from "@/components/marketing/content-composer";
import { AnalyticsPanel } from "@/components/marketing/analytics-panel";
import { useToast } from "@/hooks/use-toast";
import { campaignsApi } from "@/lib/campaigns-api";
import { extractApiError } from "@/lib/api-client";
import { CampaignStatus } from "@realestate/shared";

export default function CampaignDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const toast = useToast();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [confirmExecute, setConfirmExecute] = useState(false);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["campaign", params.id],
    queryFn: () => campaignsApi.get(params.id),
    enabled: Boolean(params.id),
  });

  const deleteMut = useMutation({
    mutationFn: () => campaignsApi.remove(params.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["campaigns"] });
      toast.show({ title: "Campaign deleted", variant: "success" });
      router.push("/marketing");
    },
    onError: (err) => {
      toast.show({
        title: "Delete failed",
        description: extractApiError(err).message,
        variant: "destructive",
      });
    },
  });

  const executeMut = useMutation({
    mutationFn: (dryRun: boolean) => campaignsApi.execute(params.id, dryRun),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ["campaign", params.id] });
      queryClient.invalidateQueries({ queryKey: ["campaigns"] });
      queryClient.invalidateQueries({
        queryKey: ["campaign", params.id, "audience"],
      });
      toast.show({
        title: res.dryRun ? "Dry run complete" : "Campaign executed",
        description: `${res.queuedMessages} message${
          res.queuedMessages === 1 ? "" : "s"
        } ${res.dryRun ? "would be sent" : "queued"} · ${res.skipped} skipped · ${res.errors.length} errors`,
        variant: "success",
      });
      setConfirmExecute(false);
    },
    onError: (err) => {
      toast.show({
        title: "Execute failed",
        description: extractApiError(err).message,
        variant: "destructive",
      });
    },
  });

  if (isError) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" size="sm" asChild className="-ml-2">
          <Link href="/marketing">
            <ArrowLeft className="h-4 w-4" /> All campaigns
          </Link>
        </Button>
        <EmptyState title="Campaign not found" />
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

  const locked =
    data.status === CampaignStatus.COMPLETED ||
    data.status === CampaignStatus.ACTIVE;

  return (
    <div className="space-y-6">
      <Button variant="ghost" size="sm" asChild className="-ml-2 w-fit">
        <Link href="/marketing">
          <ArrowLeft className="h-4 w-4" />
          All campaigns
        </Link>
      </Button>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-tight">{data.name}</h1>
            <CampaignStatusBadge status={data.status} />
            <CampaignTypeBadge type={data.type} />
          </div>
          {data.description ? (
            <p className="text-sm text-muted-foreground">{data.description}</p>
          ) : null}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
            {data.projectName ? (
              <Link
                href={`/projects/${data.projectId}`}
                className="inline-flex items-center gap-1 hover:underline"
              >
                <Building2 className="h-3.5 w-3.5" />
                {data.projectName}
              </Link>
            ) : null}
            <span className="inline-flex items-center gap-1">
              <Users className="h-3.5 w-3.5" />
              {data.audienceSize} in audience
            </span>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            onClick={() => executeMut.mutate(true)}
            disabled={executeMut.isPending || locked}
          >
            {executeMut.isPending && executeMut.variables === true ? (
              <Loader2 className="animate-spin" />
            ) : (
              <Play className="h-4 w-4" />
            )}
            Dry run
          </Button>
          <Button
            onClick={() => setConfirmExecute(true)}
            disabled={executeMut.isPending || locked}
          >
            <Rocket className="h-4 w-4" />
            {locked ? "Executed" : "Execute"}
          </Button>
          <Button
            variant="outline"
            onClick={() => setConfirmDelete(true)}
            disabled={deleteMut.isPending}
          >
            {deleteMut.isPending ? (
              <Loader2 className="animate-spin" />
            ) : (
              <Trash2 className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>

      <Separator />

      <div className="grid gap-4 sm:grid-cols-4">
        <MetricCard label="Audience" value={data.audienceSize} />
        <MetricCard label="Pending" value={data.metrics.pending} />
        <MetricCard label="Sent" value={data.metrics.sent} />
        <MetricCard
          label="Replied"
          value={data.metrics.responded}
          highlight
        />
      </div>

      <Tabs defaultValue="content">
        <TabsList>
          <TabsTrigger value="content">Content</TabsTrigger>
          <TabsTrigger value="audience">Audience</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>
        <TabsContent value="content">
          <ContentComposer campaign={data} locked={locked} />
        </TabsContent>
        <TabsContent value="audience">
          <AudiencePanel campaignId={data.id} locked={locked} />
        </TabsContent>
        <TabsContent value="analytics">
          <AnalyticsPanel campaignId={data.id} />
        </TabsContent>
      </Tabs>

      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title="Delete this campaign?"
        description="The campaign and all its audience + messages will be removed. Sent messages in lead threads stay."
        confirmLabel="Delete"
        destructive
        loading={deleteMut.isPending}
        onConfirm={() => deleteMut.mutate()}
      />

      <ConfirmDialog
        open={confirmExecute}
        onOpenChange={setConfirmExecute}
        title={`Send to ${data.audienceSize} lead${data.audienceSize === 1 ? "" : "s"}?`}
        description="This creates outbound message rows on every audience lead's thread. Leads without DPDP consent are skipped."
        confirmLabel="Execute campaign"
        loading={executeMut.isPending}
        onConfirm={() => executeMut.mutate(false)}
      />
    </div>
  );
}

function MetricCard({
  label,
  value,
  highlight,
}: {
  label: string;
  value: number;
  highlight?: boolean;
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {label}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div
          className={
            highlight
              ? "text-2xl font-semibold text-emerald-600 tabular-nums"
              : "text-2xl font-semibold tabular-nums"
          }
        >
          {value}
        </div>
      </CardContent>
    </Card>
  );
}
