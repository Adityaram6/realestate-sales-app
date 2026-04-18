"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { KanbanSquare } from "lucide-react";
import { PageHeader } from "@/components/common/page-header";
import { EmptyState } from "@/components/common/empty-state";
import { KanbanBoard } from "@/components/pipeline/kanban-board";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { opportunitiesApi } from "@/lib/opportunities-api";
import { projectsApi } from "@/lib/projects-api";

export default function PipelinePage() {
  const [projectFilter, setProjectFilter] = useState<string>("all");

  const { data: opportunities, isLoading } = useQuery({
    queryKey: ["pipeline", { projectFilter }],
    queryFn: () =>
      opportunitiesApi.list(
        projectFilter === "all" ? {} : { projectId: projectFilter },
      ),
  });

  const { data: projectList } = useQuery({
    queryKey: ["projects", "for-pipeline-filter"],
    queryFn: () => projectsApi.list({ pageSize: 100 }),
  });

  const hasAny = (opportunities?.length ?? 0) > 0;

  const count = useMemo(() => {
    if (!opportunities) return 0;
    return opportunities.length;
  }, [opportunities]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Pipeline"
        description={`Drag cards across stages to move opportunities. ${count} active.`}
        actions={
          <Select value={projectFilter} onValueChange={setProjectFilter}>
            <SelectTrigger className="w-[220px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All projects</SelectItem>
              {projectList?.data.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        }
      />

      {isLoading ? (
        <div className="flex gap-3 overflow-x-auto pb-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-[420px] w-72 shrink-0" />
          ))}
        </div>
      ) : !hasAny ? (
        <EmptyState
          icon={KanbanSquare}
          title="No opportunities yet"
          description="Attach a project to a lead from the lead's detail page to create the first opportunity."
        />
      ) : (
        <KanbanBoard opportunities={opportunities!} />
      )}
    </div>
  );
}
