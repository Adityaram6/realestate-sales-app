"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Users } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/common/empty-state";
import { OpportunityStageBadge } from "@/components/opportunities/opportunity-stage-badge";
import { LeadScoreDot } from "@/components/leads/lead-status-badge";
import { opportunitiesApi } from "@/lib/opportunities-api";
import { formatRelativeTime } from "@/lib/utils";

export function ProjectOpportunitiesPanel({
  projectId,
}: {
  projectId: string;
}) {
  const { data, isLoading } = useQuery({
    queryKey: ["opportunities", "for-project", projectId],
    queryFn: () => opportunitiesApi.forProject(projectId),
  });

  if (isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <EmptyState
        icon={Users}
        title="No interested leads yet"
        description="When a lead is attached to this project, they'll appear here with their opportunity stage."
      />
    );
  }

  return (
    <div className="rounded-lg border bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Lead</TableHead>
            <TableHead>Stage</TableHead>
            <TableHead>Score</TableHead>
            <TableHead className="text-right">Last interaction</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((o) => (
            <TableRow key={o.id}>
              <TableCell>
                <div className="flex flex-col">
                  <Link
                    href={`/opportunities/${o.id}`}
                    className="font-medium hover:underline"
                  >
                    {o.leadName}
                  </Link>
                  <Link
                    href={`/leads/${o.leadId}`}
                    className="text-xs text-muted-foreground hover:underline"
                  >
                    View lead
                  </Link>
                </div>
              </TableCell>
              <TableCell>
                <OpportunityStageBadge stage={o.stage} />
              </TableCell>
              <TableCell>
                <LeadScoreDot score={o.leadScore} />
              </TableCell>
              <TableCell className="text-right text-sm text-muted-foreground">
                {o.lastInteractionAt
                  ? formatRelativeTime(o.lastInteractionAt)
                  : "—"}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
