"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Plus, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/common/empty-state";
import { OpportunityStageBadge } from "@/components/opportunities/opportunity-stage-badge";
import { AttachProjectDialog } from "@/components/opportunities/attach-project-dialog";
import { opportunitiesApi } from "@/lib/opportunities-api";
import { formatRelativeTime } from "@/lib/utils";

interface LeadOpportunitiesPanelProps {
  leadId: string;
  leadName: string;
}

export function LeadOpportunitiesPanel({
  leadId,
  leadName,
}: LeadOpportunitiesPanelProps) {
  const [attachOpen, setAttachOpen] = useState(false);
  const { data, isLoading } = useQuery({
    queryKey: ["opportunities", "for-lead", leadId],
    queryFn: () => opportunitiesApi.forLead(leadId),
  });

  const excludeIds = data?.map((o) => o.projectId) ?? [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Interested projects</h2>
          <p className="text-sm text-muted-foreground">
            Each attached project creates an opportunity you can move through
            the pipeline.
          </p>
        </div>
        <Button onClick={() => setAttachOpen(true)}>
          <Plus className="h-4 w-4" />
          Attach project
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 2 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </div>
      ) : !data || data.length === 0 ? (
        <EmptyState
          icon={Building2}
          title="No projects attached yet"
          description="Attach one or more projects to start tracking the lead's interest."
          action={
            <Button size="sm" onClick={() => setAttachOpen(true)}>
              <Plus className="h-4 w-4" />
              Attach project
            </Button>
          }
        />
      ) : (
        <ul className="space-y-2">
          {data.map((o) => (
            <li key={o.id}>
              <Link
                href={`/opportunities/${o.id}`}
                className="flex items-center justify-between rounded-lg border bg-card p-4 transition-colors hover:border-primary/40"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">{o.projectName}</span>
                  </div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    Last interaction{" "}
                    {o.lastInteractionAt
                      ? formatRelativeTime(o.lastInteractionAt)
                      : "—"}
                  </div>
                </div>
                <OpportunityStageBadge stage={o.stage} />
              </Link>
            </li>
          ))}
        </ul>
      )}

      <AttachProjectDialog
        open={attachOpen}
        onOpenChange={setAttachOpen}
        leadId={leadId}
        leadName={leadName}
        excludeProjectIds={excludeIds}
      />
    </div>
  );
}
