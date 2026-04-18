import {
  OpportunityStage,
  type Opportunity,
  type OpportunityWithRelations,
} from "@realestate/shared";
import type { MockHandler } from "@/mocks/handlers";
import {
  opportunityStore,
  stageHistoryStore,
  recordStageChange,
} from "@/mocks/fixtures/opportunities";
import { leadStore } from "@/mocks/fixtures/leads";
import { projectStore } from "@/mocks/fixtures/projects";
import type {
  AttachProjectsPayload,
  AttachProjectsResult,
} from "@/lib/opportunities-api";

function httpError(status: number, message: string) {
  return Object.assign(new Error(message), { status });
}

function decorate(opp: Opportunity): OpportunityWithRelations {
  const lead = leadStore.find((l) => l.id === opp.leadId);
  const project = projectStore.find((p) => p.id === opp.projectId);
  return {
    ...opp,
    leadName: lead?.name ?? "Unknown lead",
    projectName: project?.name ?? "Unknown project",
    leadScore: lead?.score,
    lastInteractionAt: opp.updatedAt,
  };
}

function isClosed(stage: OpportunityStage): boolean {
  return (
    stage === OpportunityStage.CLOSED_WON ||
    stage === OpportunityStage.CLOSED_LOST
  );
}

export const opportunityMockHandlers: MockHandler[] = [
  {
    method: "get",
    path: "/opportunities",
    handler: async ({ query }) => {
      const stage = query.stage as OpportunityStage | undefined;
      const projectId = query.projectId;
      const leadId = query.leadId;
      const assignedTo = query.assignedTo;

      let filtered = [...opportunityStore];
      if (stage) filtered = filtered.filter((o) => o.stage === stage);
      if (projectId)
        filtered = filtered.filter((o) => o.projectId === projectId);
      if (leadId) filtered = filtered.filter((o) => o.leadId === leadId);
      if (assignedTo)
        filtered = filtered.filter((o) => o.assignedTo === assignedTo);

      return { data: filtered.map(decorate) };
    },
  },
  {
    method: "get",
    path: "/opportunities/:id",
    handler: async ({ params }) => {
      const opp = opportunityStore.find((o) => o.id === params.id);
      if (!opp) throw httpError(404, "Opportunity not found");
      const lead = leadStore.find((l) => l.id === opp.leadId);
      const project = projectStore.find((p) => p.id === opp.projectId);
      const history = stageHistoryStore
        .filter((h) => h.opportunityId === opp.id)
        .sort(
          (a, b) =>
            new Date(b.changedAt).getTime() -
            new Date(a.changedAt).getTime(),
        );
      return {
        data: {
          ...decorate(opp),
          leadPhone: lead?.phone ?? "",
          leadEmail: lead?.email,
          projectLocation: project?.locationText ?? "",
          projectCode: project?.projectCode ?? "",
          history,
        },
      };
    },
  },
  {
    method: "post",
    path: "/opportunities/attach",
    handler: async ({ body }) => {
      const payload = body as AttachProjectsPayload;
      if (!payload?.leadId) throw httpError(400, "leadId required");
      if (!payload?.projectIds?.length)
        throw httpError(400, "projectIds required");

      const lead = leadStore.find((l) => l.id === payload.leadId);
      if (!lead) throw httpError(404, "Lead not found");

      const result: AttachProjectsResult = { created: [], skipped: [] };

      for (const projectId of payload.projectIds) {
        const project = projectStore.find((p) => p.id === projectId);
        if (!project) {
          result.skipped.push({ projectId, reason: "Project not found" });
          continue;
        }
        const existing = opportunityStore.find(
          (o) => o.leadId === payload.leadId && o.projectId === projectId,
        );
        if (existing) {
          result.skipped.push({
            projectId,
            reason: "Opportunity already exists for this lead + project",
          });
          continue;
        }
        const now = new Date().toISOString();
        const opportunity: Opportunity = {
          id: `opp-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          leadId: payload.leadId,
          projectId,
          propertyId: null,
          stage: OpportunityStage.NEW,
          probability: 10,
          assignedTo: lead.assignedTo ?? "u-3",
          createdAt: now,
          updatedAt: now,
        };
        opportunityStore.push(opportunity);
        recordStageChange(opportunity.id, null, OpportunityStage.NEW);
        result.created.push(decorate(opportunity));
      }

      return { data: result, status: 201 };
    },
  },
  {
    method: "patch",
    path: "/opportunities/:id/stage",
    handler: async ({ params, body }) => {
      const idx = opportunityStore.findIndex((o) => o.id === params.id);
      if (idx === -1) throw httpError(404, "Opportunity not found");
      const payload = body as { stage?: OpportunityStage };
      if (!payload?.stage) throw httpError(400, "stage required");

      const current = opportunityStore[idx]!;
      if (isClosed(current.stage)) {
        throw httpError(
          409,
          "Closed opportunities cannot be re-opened from the pipeline.",
        );
      }
      if (current.stage === payload.stage) {
        return { data: current };
      }
      const updated: Opportunity = {
        ...current,
        stage: payload.stage,
        updatedAt: new Date().toISOString(),
      };
      opportunityStore[idx] = updated;
      recordStageChange(updated.id, current.stage, payload.stage);
      return { data: updated };
    },
  },
  {
    method: "get",
    path: "/leads/:id/opportunities",
    handler: async ({ params }) => {
      const opps = opportunityStore.filter((o) => o.leadId === params.id);
      return { data: opps.map(decorate) };
    },
  },
  {
    method: "get",
    path: "/projects/:id/opportunities",
    handler: async ({ params }) => {
      const opps = opportunityStore.filter((o) => o.projectId === params.id);
      return { data: opps.map(decorate) };
    },
  },
];
