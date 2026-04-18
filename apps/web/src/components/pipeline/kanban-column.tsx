"use client";

import { useDroppable } from "@dnd-kit/core";
import { KanbanCard } from "@/components/pipeline/kanban-card";
import { cn } from "@/lib/utils";
import {
  OpportunityStage,
  OPPORTUNITY_STAGE_LABEL,
  type OpportunityWithRelations,
} from "@realestate/shared";

interface KanbanColumnProps {
  stage: OpportunityStage;
  opportunities: OpportunityWithRelations[];
}

const ACCENT: Record<OpportunityStage, string> = {
  [OpportunityStage.NEW]: "border-slate-300",
  [OpportunityStage.CONTACTED]: "border-blue-300",
  [OpportunityStage.SITE_VISIT_SCHEDULED]: "border-amber-300",
  [OpportunityStage.SITE_VISIT_DONE]: "border-amber-400",
  [OpportunityStage.NEGOTIATION]: "border-indigo-400",
  [OpportunityStage.CLOSED_WON]: "border-emerald-400",
  [OpportunityStage.CLOSED_LOST]: "border-slate-300",
};

export function KanbanColumn({ stage, opportunities }: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id: stage });
  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex w-72 shrink-0 flex-col rounded-lg border bg-muted/30 transition-colors",
        isOver && "bg-primary/5 ring-2 ring-primary/30",
      )}
    >
      <div
        className={cn(
          "flex items-center justify-between border-b-2 px-3 py-2.5",
          ACCENT[stage],
        )}
      >
        <h3 className="text-sm font-semibold">
          {OPPORTUNITY_STAGE_LABEL[stage]}
        </h3>
        <span className="rounded-full bg-background px-2 py-0.5 text-xs font-medium text-muted-foreground">
          {opportunities.length}
        </span>
      </div>
      <div className="flex-1 space-y-2 overflow-y-auto p-2 min-h-[8rem]">
        {opportunities.length === 0 ? (
          <div className="mt-6 text-center text-xs text-muted-foreground">
            No opportunities in this stage.
          </div>
        ) : (
          opportunities.map((o) => <KanbanCard key={o.id} opportunity={o} />)
        )}
      </div>
    </div>
  );
}
