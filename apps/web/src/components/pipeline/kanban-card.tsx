"use client";

import { forwardRef } from "react";
import Link from "next/link";
import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { Building2, GripVertical } from "lucide-react";
import { LeadScoreDot } from "@/components/leads/lead-status-badge";
import { formatRelativeTime, cn } from "@/lib/utils";
import type { OpportunityWithRelations } from "@realestate/shared";

interface KanbanCardProps {
  opportunity: OpportunityWithRelations;
}

/**
 * Dragged card. We use `useDraggable` (not sortable) because columns don't
 * care about intra-column order yet — we just move cards across stages.
 */
export function KanbanCard({ opportunity }: KanbanCardProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({ id: opportunity.id, data: { opportunity } });

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Translate.toString(transform),
      }}
      className={cn(
        "group rounded-md border bg-card p-3 shadow-sm transition-shadow",
        isDragging && "opacity-40 shadow-none",
      )}
    >
      <div className="flex items-start gap-2">
        <button
          type="button"
          {...listeners}
          {...attributes}
          aria-label="Drag card"
          className="mt-0.5 shrink-0 cursor-grab text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 focus:opacity-100 active:cursor-grabbing"
        >
          <GripVertical className="h-4 w-4" />
        </button>
        <div className="min-w-0 flex-1 space-y-1.5">
          <Link
            href={`/opportunities/${opportunity.id}`}
            className="block text-sm font-medium leading-snug hover:underline"
          >
            {opportunity.leadName}
          </Link>
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Building2 className="h-3 w-3" />
            <span className="truncate">{opportunity.projectName}</span>
          </div>
          <div className="flex items-center justify-between pt-1">
            <LeadScoreDot score={opportunity.leadScore} />
            <span className="text-xs text-muted-foreground">
              {opportunity.lastInteractionAt
                ? formatRelativeTime(opportunity.lastInteractionAt)
                : "—"}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

/** Non-draggable preview used inside the DragOverlay. */
export const KanbanCardPreview = forwardRef<
  HTMLDivElement,
  { opportunity: OpportunityWithRelations }
>(({ opportunity }, ref) => (
  <div
    ref={ref}
    className="rounded-md border bg-card p-3 shadow-lg ring-2 ring-primary/40"
  >
    <div className="text-sm font-medium">{opportunity.leadName}</div>
    <div className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
      <Building2 className="h-3 w-3" />
      {opportunity.projectName}
    </div>
  </div>
));
KanbanCardPreview.displayName = "KanbanCardPreview";
