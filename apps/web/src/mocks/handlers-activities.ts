import type { MockHandler } from "@/mocks/handlers";
import type {
  CreateActivityPayload,
  TimelineItem,
} from "@/lib/activities-api";
import { activityStore } from "@/mocks/fixtures/activities";
import {
  opportunityStore,
  stageHistoryStore,
} from "@/mocks/fixtures/opportunities";
import { messageStore } from "@/mocks/fixtures/messages";
import { projectStore } from "@/mocks/fixtures/projects";
import {
  OPPORTUNITY_STAGE_LABEL,
  type ActivityType,
} from "@realestate/shared";

function httpError(status: number, message: string) {
  return Object.assign(new Error(message), { status });
}

function activityTitleDefault(type: ActivityType, channel?: string): string {
  switch (type) {
    case "CALL":
      return "Call logged";
    case "WHATSAPP":
      return "WhatsApp interaction";
    case "EMAIL":
      return "Email exchange";
    case "NOTE":
      return "Internal note";
    case "MEETING":
      return "Meeting";
    case "SYSTEM":
      return channel ? `System: ${channel}` : "System event";
    default:
      return "Activity";
  }
}

export const activityMockHandlers: MockHandler[] = [
  {
    method: "get",
    path: "/leads/:id/timeline",
    handler: async ({ params, query }) => {
      const leadId = params.id!;
      const kinds = (query.types ?? "")
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean) as TimelineItem["kind"][];
      const since = query.since ? new Date(query.since) : null;

      const opps = opportunityStore.filter((o) => o.leadId === leadId);
      const oppIds = new Set(opps.map((o) => o.id));
      const projectNameById = new Map(
        projectStore.map((p) => [p.id, p.name] as const),
      );

      const items: TimelineItem[] = [];

      // Manual activities
      for (const a of activityStore) {
        if (a.leadId !== leadId) continue;
        const project = a.opportunityId
          ? projectNameById.get(
              opportunityStore.find((o) => o.id === a.opportunityId)
                ?.projectId ?? "",
            )
          : undefined;
        items.push({
          id: a.id,
          kind: "activity",
          type: a.type,
          title: a.title,
          description: a.description,
          metadata:
            a.type === "CALL" && a.outcome
              ? { channel: a.outcome }
              : undefined,
          createdAt: a.createdAt,
          createdBy: a.createdBy,
          opportunityId: a.opportunityId,
          projectName: project,
        });
      }

      // Messages (inbound/outbound)
      for (const m of messageStore) {
        if (m.leadId !== leadId) continue;
        items.push({
          id: m.id,
          kind: "message",
          type:
            m.direction === "INBOUND"
              ? "inbound_message"
              : "outbound_message",
          title:
            m.direction === "INBOUND"
              ? `Inbound ${m.channel} message`
              : `Outbound ${m.channel} message`,
          description: m.messageText,
          metadata: { channel: m.channel },
          createdAt: m.createdAt,
          createdBy: m.sentBy,
          opportunityId: m.opportunityId,
        });
      }

      // Stage changes (scoped to this lead's opportunities)
      for (const h of stageHistoryStore) {
        if (!oppIds.has(h.opportunityId)) continue;
        const opp = opportunityStore.find((o) => o.id === h.opportunityId);
        const projectName = opp
          ? projectNameById.get(opp.projectId)
          : undefined;
        items.push({
          id: h.id,
          kind: "stage_change",
          type: "stage_change",
          title: h.oldStage
            ? `Stage: ${OPPORTUNITY_STAGE_LABEL[h.oldStage]} → ${OPPORTUNITY_STAGE_LABEL[h.newStage]}`
            : `Opportunity created · ${OPPORTUNITY_STAGE_LABEL[h.newStage]}`,
          metadata: {
            oldStage: h.oldStage ?? undefined,
            newStage: h.newStage,
          },
          createdAt: h.changedAt,
          createdBy: h.changedBy,
          opportunityId: h.opportunityId,
          projectName,
        });
      }

      let filtered = items;
      if (kinds.length > 0) {
        filtered = filtered.filter((i) => kinds.includes(i.kind));
      }
      if (since) {
        filtered = filtered.filter(
          (i) => new Date(i.createdAt).getTime() >= since.getTime(),
        );
      }

      filtered.sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );

      return { data: filtered };
    },
  },
  {
    method: "post",
    path: "/activities",
    handler: async ({ body }) => {
      const payload = body as CreateActivityPayload;
      if (!payload?.leadId) throw httpError(400, "leadId required");
      if (!payload?.type) throw httpError(400, "type required");
      if (!payload?.title) throw httpError(400, "title required");

      const activity = {
        id: `act-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        leadId: payload.leadId,
        opportunityId: payload.opportunityId,
        type: payload.type,
        title: payload.title || activityTitleDefault(payload.type),
        description: payload.description,
        durationMinutes: payload.durationMinutes,
        outcome: payload.outcome,
        createdBy: "u-3",
        createdAt: new Date().toISOString(),
      };
      activityStore.push(activity);

      const result: TimelineItem = {
        id: activity.id,
        kind: "activity",
        type: activity.type,
        title: activity.title,
        description: activity.description,
        createdAt: activity.createdAt,
        createdBy: activity.createdBy,
        opportunityId: activity.opportunityId,
      };
      return { data: result, status: 201 };
    },
  },
];
