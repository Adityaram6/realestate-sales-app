"use client";

import { useMemo, useState } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { KanbanColumn } from "@/components/pipeline/kanban-column";
import { KanbanCardPreview } from "@/components/pipeline/kanban-card";
import { useToast } from "@/hooks/use-toast";
import { extractApiError } from "@/lib/api-client";
import { opportunitiesApi } from "@/lib/opportunities-api";
import {
  OpportunityStage,
  OPPORTUNITY_STAGE_ORDER,
  type OpportunityWithRelations,
} from "@realestate/shared";

interface KanbanBoardProps {
  opportunities: OpportunityWithRelations[];
}

export function KanbanBoard({ opportunities }: KanbanBoardProps) {
  const toast = useToast();
  const queryClient = useQueryClient();
  const [activeId, setActiveId] = useState<string | null>(null);
  // Optimistic overrides: opportunityId -> newStage. Cleared when server
  // confirms via query invalidation.
  const [optimistic, setOptimistic] = useState<
    Record<string, OpportunityStage>
  >({});

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 4 },
    }),
    useSensor(KeyboardSensor),
  );

  const merged = useMemo(
    () =>
      opportunities.map((o) =>
        optimistic[o.id] ? { ...o, stage: optimistic[o.id]! } : o,
      ),
    [opportunities, optimistic],
  );

  const byStage = useMemo(() => {
    const groups: Record<OpportunityStage, OpportunityWithRelations[]> = {
      [OpportunityStage.NEW]: [],
      [OpportunityStage.CONTACTED]: [],
      [OpportunityStage.SITE_VISIT_SCHEDULED]: [],
      [OpportunityStage.SITE_VISIT_DONE]: [],
      [OpportunityStage.NEGOTIATION]: [],
      [OpportunityStage.CLOSED_WON]: [],
      [OpportunityStage.CLOSED_LOST]: [],
    };
    for (const o of merged) groups[o.stage].push(o);
    return groups;
  }, [merged]);

  const active = merged.find((o) => o.id === activeId) ?? null;

  const stageMut = useMutation({
    mutationFn: ({
      id,
      stage,
    }: {
      id: string;
      stage: OpportunityStage;
    }) => opportunitiesApi.updateStage(id, stage),
  });

  const onDragStart = (e: DragStartEvent) => {
    setActiveId(String(e.active.id));
  };

  const onDragEnd = (e: DragEndEvent) => {
    setActiveId(null);
    if (!e.over) return;
    const targetStage = e.over.id as OpportunityStage;
    const opportunityId = String(e.active.id);
    const current = merged.find((o) => o.id === opportunityId);
    if (!current || current.stage === targetStage) return;

    const previousStage = current.stage;
    setOptimistic((prev) => ({ ...prev, [opportunityId]: targetStage }));
    stageMut.mutate(
      { id: opportunityId, stage: targetStage },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: ["opportunities"] });
          queryClient.invalidateQueries({ queryKey: ["pipeline"] });
          queryClient.invalidateQueries({
            queryKey: ["opportunity", opportunityId],
          });
          setOptimistic((prev) => {
            const next = { ...prev };
            delete next[opportunityId];
            return next;
          });
        },
        onError: (err) => {
          setOptimistic((prev) => {
            const next = { ...prev };
            next[opportunityId] = previousStage;
            delete next[opportunityId];
            return next;
          });
          toast.show({
            title: "Couldn't move card",
            description: extractApiError(err).message,
            variant: "destructive",
          });
        },
      },
    );
  };

  return (
    <DndContext
      sensors={sensors}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onDragCancel={() => setActiveId(null)}
    >
      <div className="flex gap-3 overflow-x-auto pb-2">
        {OPPORTUNITY_STAGE_ORDER.map((stage) => (
          <KanbanColumn
            key={stage}
            stage={stage}
            opportunities={byStage[stage]}
          />
        ))}
      </div>
      <DragOverlay>
        {active ? <KanbanCardPreview opportunity={active} /> : null}
      </DragOverlay>
    </DndContext>
  );
}
