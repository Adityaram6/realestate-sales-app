import type { MockHandler } from "@/mocks/handlers";
import { leadStore } from "@/mocks/fixtures/leads";
import { projectStore } from "@/mocks/fixtures/projects";
import { opportunityStore } from "@/mocks/fixtures/opportunities";
import {
  buildContext,
  composeMessages,
  decideIntent,
  scoreLead,
  suggestStrategy,
} from "@/lib/ai-mock";
import type {
  GenerateMessageRequest,
  GenerateMessageResponse,
  ScoreRequest,
  StrategyRequest,
} from "@/lib/ai-api";

function httpError(status: number, message: string) {
  return Object.assign(new Error(message), { status });
}

export const aiMockHandlers: MockHandler[] = [
  {
    method: "post",
    path: "/ai/generate-message",
    handler: async ({ body }) => {
      const payload = body as GenerateMessageRequest;
      const lead = leadStore.find((l) => l.id === payload.leadId);
      if (!lead) throw httpError(404, "Lead not found");
      const opportunity = payload.opportunityId
        ? decorateOpp(
            opportunityStore.find((o) => o.id === payload.opportunityId),
          )
        : undefined;
      const project = opportunity
        ? projectStore.find((p) => p.id === opportunity.projectId)
        : undefined;

      const ctx = buildContext({ lead, project, opportunity });
      const suggestedIntent = decideIntent(ctx);
      const variations = composeMessages(ctx, payload.intent, payload.tone);

      if (variations.length === 0) {
        throw httpError(
          422,
          "All generated variations failed the output controller. Try a different tone or intent.",
        );
      }

      const response: GenerateMessageResponse = {
        variations,
        suggestedIntent,
        storedInteractionId: `ai-int-${Date.now()}`,
      };
      return { data: response };
    },
  },
  {
    method: "post",
    path: "/ai/recommendation",
    handler: async ({ body }) => {
      const payload = body as StrategyRequest;
      const lead = leadStore.find((l) => l.id === payload.leadId);
      if (!lead) throw httpError(404, "Lead not found");
      const opportunity = payload.opportunityId
        ? decorateOpp(
            opportunityStore.find((o) => o.id === payload.opportunityId),
          )
        : undefined;
      const project = opportunity
        ? projectStore.find((p) => p.id === opportunity.projectId)
        : undefined;

      const ctx = buildContext({ lead, project, opportunity });
      return { data: suggestStrategy(ctx) };
    },
  },
  {
    method: "post",
    path: "/ai/score-lead",
    handler: async ({ body }) => {
      const payload = body as ScoreRequest;
      const lead = leadStore.find((l) => l.id === payload.leadId);
      if (!lead) throw httpError(404, "Lead not found");
      const opportunities = opportunityStore
        .filter((o) => o.leadId === payload.leadId)
        .map(decorateOpp)
        .filter((o): o is NonNullable<typeof o> => Boolean(o));
      return { data: scoreLead(lead, opportunities) };
    },
  },
];

function decorateOpp(
  opp: (typeof opportunityStore)[number] | undefined,
) {
  if (!opp) return undefined;
  const lead = leadStore.find((l) => l.id === opp.leadId);
  const project = projectStore.find((p) => p.id === opp.projectId);
  return {
    ...opp,
    leadName: lead?.name ?? "",
    projectName: project?.name ?? "",
    leadScore: lead?.score,
    lastInteractionAt: opp.updatedAt,
  };
}
