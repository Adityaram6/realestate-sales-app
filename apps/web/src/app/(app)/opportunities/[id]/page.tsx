"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  Phone,
  Mail,
  MapPin,
  Building2,
  User,
  Activity,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/common/empty-state";
import { OpportunityStageBadge } from "@/components/opportunities/opportunity-stage-badge";
import { StageSelector } from "@/components/opportunities/stage-selector";
import { LeadScoreDot } from "@/components/leads/lead-status-badge";
import { AiMessageGenerator } from "@/components/ai/ai-message-generator";
import { AiStrategistPanel } from "@/components/ai/ai-strategist-panel";
import { AiScorePanel } from "@/components/ai/ai-score-panel";
import { opportunitiesApi } from "@/lib/opportunities-api";
import { formatDateTime, formatRelativeTime } from "@/lib/utils";
import { OPPORTUNITY_STAGE_LABEL } from "@realestate/shared";

export default function OpportunityDetailPage() {
  const params = useParams<{ id: string }>();
  const { data, isLoading, isError } = useQuery({
    queryKey: ["opportunity", params.id],
    queryFn: () => opportunitiesApi.get(params.id),
    enabled: Boolean(params.id),
  });

  if (isError) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" size="sm" asChild className="-ml-2">
          <Link href="/pipeline">
            <ArrowLeft className="h-4 w-4" />
            Back to pipeline
          </Link>
        </Button>
        <EmptyState title="Opportunity not found" />
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

  return (
    <div className="space-y-6">
      <Button variant="ghost" size="sm" asChild className="-ml-2 w-fit">
        <Link href="/pipeline">
          <ArrowLeft className="h-4 w-4" />
          Back to pipeline
        </Link>
      </Button>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-tight">
              {data.leadName} × {data.projectName}
            </h1>
            <OpportunityStageBadge stage={data.stage} />
          </div>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <User className="h-3.5 w-3.5" />
              <Link
                href={`/leads/${data.leadId}`}
                className="hover:underline"
              >
                Lead
              </Link>
            </span>
            <span className="inline-flex items-center gap-1">
              <Building2 className="h-3.5 w-3.5" />
              <Link
                href={`/projects/${data.projectId}`}
                className="hover:underline"
              >
                {data.projectCode}
              </Link>
            </span>
            {data.probability != null ? (
              <span>{data.probability}% probability</span>
            ) : null}
            <LeadScoreDot score={data.leadScore} />
          </div>
        </div>
        <StageSelector
          opportunityId={data.id}
          currentStage={data.stage}
        />
      </div>

      <Separator />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <AiMessageGenerator
            leadId={data.leadId}
            leadName={data.leadName}
            opportunityId={data.id}
          />

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Stage history</CardTitle>
            </CardHeader>
            <CardContent>
              {data.history.length === 0 ? (
                <EmptyState
                  icon={Activity}
                  title="No stage changes yet"
                  description="Stage progression will appear here chronologically."
                />
              ) : (
                <ol className="relative space-y-4 border-l pl-6">
                  {data.history.map((h) => (
                    <li key={h.id} className="relative">
                      <span className="absolute -left-[26px] top-1 h-3 w-3 rounded-full border-2 border-primary bg-background" />
                      <div className="text-sm">
                        <span className="font-medium">
                          {h.oldStage
                            ? `${OPPORTUNITY_STAGE_LABEL[h.oldStage]} → `
                            : "Created as "}
                        </span>
                        <span className="font-medium">
                          {OPPORTUNITY_STAGE_LABEL[h.newStage]}
                        </span>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {formatRelativeTime(h.changedAt)} ·{" "}
                        {formatDateTime(h.changedAt)}
                      </div>
                    </li>
                  ))}
                </ol>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <AiStrategistPanel leadId={data.leadId} opportunityId={data.id} />
          <AiScorePanel leadId={data.leadId} />

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Lead</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <Link
                href={`/leads/${data.leadId}`}
                className="block font-medium hover:underline"
              >
                {data.leadName}
              </Link>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Phone className="h-3.5 w-3.5" />
                {data.leadPhone || "—"}
              </div>
              {data.leadEmail ? (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Mail className="h-3.5 w-3.5" />
                  {data.leadEmail}
                </div>
              ) : null}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Project</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <Link
                href={`/projects/${data.projectId}`}
                className="block font-medium hover:underline"
              >
                {data.projectName}
              </Link>
              <div className="flex items-center gap-2 text-muted-foreground">
                <MapPin className="h-3.5 w-3.5" />
                {data.projectLocation || "—"}
              </div>
              <div className="font-mono text-xs text-muted-foreground">
                {data.projectCode}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
