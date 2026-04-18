import {
  FlowExecutionStatus,
  FlowStepType,
  FlowTriggerType,
  type CampaignFlowWithRelations,
  type FlowExecutionWithRelations,
  type FlowStep,
} from "@realestate/shared";
import type { MockHandler } from "@/mocks/handlers";
import type {
  CreateFlowPayload,
  UpdateFlowPayload,
} from "@/lib/flows-api";
import { leadStore } from "@/mocks/fixtures/leads";

interface StoredFlow extends CampaignFlowWithRelations {}
interface StoredExecution extends FlowExecutionWithRelations {}

const flowStore: StoredFlow[] = [
  {
    id: "flow-1",
    name: "New lead welcome sequence",
    description:
      "Intro WhatsApp on create, follow-up after 1 day, task on day 3 if still pending.",
    trigger: FlowTriggerType.LEAD_ADDED,
    isActive: true,
    createdById: "u-1",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 5).toISOString(),
    updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2).toISOString(),
    steps: [
      {
        id: "fs-1",
        flowId: "flow-1",
        orderIndex: 0,
        type: FlowStepType.SEND_WHATSAPP,
        config: {
          content:
            "Hi {{name}}, thanks for your interest! Sharing our project brochure now — let me know a good time to chat.",
        },
        createdAt: new Date().toISOString(),
      },
      {
        id: "fs-2",
        flowId: "flow-1",
        orderIndex: 1,
        type: FlowStepType.WAIT,
        config: { days: 1 },
        createdAt: new Date().toISOString(),
      },
      {
        id: "fs-3",
        flowId: "flow-1",
        orderIndex: 2,
        type: FlowStepType.SEND_WHATSAPP,
        config: {
          content:
            "Hi {{name}}, checking in — any thoughts on the project? Happy to set up a site visit this weekend.",
        },
        createdAt: new Date().toISOString(),
      },
      {
        id: "fs-4",
        flowId: "flow-1",
        orderIndex: 3,
        type: FlowStepType.WAIT,
        config: { days: 2 },
        createdAt: new Date().toISOString(),
      },
      {
        id: "fs-5",
        flowId: "flow-1",
        orderIndex: 4,
        type: FlowStepType.CREATE_TASK,
        config: {
          title: "Call lead — 3 days post-creation",
          dueInDays: 0,
        },
        createdAt: new Date().toISOString(),
      },
    ],
    activeExecutions: 2,
    completedExecutions: 1,
  },
];

const executionStore: StoredExecution[] = [
  {
    id: "fe-1",
    flowId: "flow-1",
    leadId: "lead-2",
    currentStepIndex: 2,
    status: FlowExecutionStatus.RUNNING,
    startedAt: new Date(Date.now() - 1000 * 60 * 60 * 28).toISOString(),
    stepsCompleted: 2,
    lead: { id: "lead-2", name: "Sneha Rao", phone: "+91 98765 10002" },
    flow: { id: "flow-1", name: "New lead welcome sequence", trigger: FlowTriggerType.LEAD_ADDED },
  },
  {
    id: "fe-2",
    flowId: "flow-1",
    leadId: "lead-4",
    currentStepIndex: 1,
    status: FlowExecutionStatus.RUNNING,
    startedAt: new Date(Date.now() - 1000 * 60 * 60 * 4).toISOString(),
    stepsCompleted: 1,
    lead: { id: "lead-4", name: "Anita Sharma", phone: "+91 98765 10004" },
    flow: { id: "flow-1", name: "New lead welcome sequence", trigger: FlowTriggerType.LEAD_ADDED },
  },
  {
    id: "fe-3",
    flowId: "flow-1",
    leadId: "lead-3",
    currentStepIndex: 4,
    status: FlowExecutionStatus.COMPLETED,
    startedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 5).toISOString(),
    completedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2).toISOString(),
    stepsCompleted: 5,
    lead: { id: "lead-3", name: "Mohan Reddy", phone: "+91 98765 10003" },
    flow: { id: "flow-1", name: "New lead welcome sequence", trigger: FlowTriggerType.LEAD_ADDED },
  },
];

function httpError(status: number, message: string) {
  return Object.assign(new Error(message), { status });
}

function buildSteps(
  flowId: string,
  steps: CreateFlowPayload["steps"],
): FlowStep[] {
  return steps.map((s, i) => ({
    id: `fs-${flowId}-${i}`,
    flowId,
    orderIndex: i,
    type: s.type,
    config: s.config,
    createdAt: new Date().toISOString(),
  }));
}

export const flowMockHandlers: MockHandler[] = [
  {
    method: "get",
    path: "/flows",
    handler: async ({ query }) => {
      let list = [...flowStore];
      if (query.trigger) list = list.filter((f) => f.trigger === query.trigger);
      if (query.isActive != null) {
        const want = query.isActive === "true";
        list = list.filter((f) => f.isActive === want);
      }
      if (query.campaignId)
        list = list.filter((f) => f.campaignId === query.campaignId);
      return { data: list };
    },
  },
  {
    method: "get",
    path: "/flows/executions",
    handler: async ({ query }) => {
      let list = [...executionStore];
      if (query.flowId) list = list.filter((e) => e.flowId === query.flowId);
      if (query.leadId) list = list.filter((e) => e.leadId === query.leadId);
      list.sort(
        (a, b) =>
          new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime(),
      );
      const take = query.take ? Number(query.take) : 50;
      return { data: list.slice(0, take) };
    },
  },
  {
    method: "get",
    path: "/flows/:id",
    handler: async ({ params }) => {
      const flow = flowStore.find((f) => f.id === params.id);
      if (!flow) throw httpError(404, "Flow not found");
      return { data: flow };
    },
  },
  {
    method: "post",
    path: "/flows",
    handler: async ({ body }) => {
      const payload = body as CreateFlowPayload;
      if (!payload.name) throw httpError(400, "Name required");
      if (!payload.trigger) throw httpError(400, "Trigger required");
      if (!payload.steps?.length)
        throw httpError(400, "At least one step required");

      const id = `flow-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      const now = new Date().toISOString();
      const flow: StoredFlow = {
        id,
        name: payload.name,
        description: payload.description,
        campaignId: payload.campaignId,
        trigger: payload.trigger,
        triggerConfig: payload.triggerConfig,
        isActive: false,
        createdById: "u-1",
        createdAt: now,
        updatedAt: now,
        steps: buildSteps(id, payload.steps),
        activeExecutions: 0,
        completedExecutions: 0,
      };
      flowStore.push(flow);
      return { data: flow, status: 201 };
    },
  },
  {
    method: "patch",
    path: "/flows/:id",
    handler: async ({ params, body }) => {
      const idx = flowStore.findIndex((f) => f.id === params.id);
      if (idx === -1) throw httpError(404, "Flow not found");
      const payload = body as UpdateFlowPayload;
      const current = flowStore[idx]!;
      const updated: StoredFlow = {
        ...current,
        name: payload.name ?? current.name,
        description: payload.description ?? current.description,
        isActive: payload.isActive ?? current.isActive,
        updatedAt: new Date().toISOString(),
      };
      if (payload.steps) {
        updated.steps = buildSteps(current.id, payload.steps);
      }
      flowStore[idx] = updated;
      return { data: updated };
    },
  },
  {
    method: "delete",
    path: "/flows/:id",
    handler: async ({ params }) => {
      const idx = flowStore.findIndex((f) => f.id === params.id);
      if (idx === -1) throw httpError(404, "Flow not found");
      flowStore.splice(idx, 1);
      // Cancel running executions
      for (const e of executionStore) {
        if (e.flowId === params.id && e.status === FlowExecutionStatus.RUNNING) {
          e.status = FlowExecutionStatus.CANCELLED;
          e.completedAt = new Date().toISOString();
        }
      }
      return { data: { success: true } };
    },
  },
  {
    method: "post",
    path: "/flows/:id/trigger",
    handler: async ({ params, body }) => {
      const flow = flowStore.find((f) => f.id === params.id);
      if (!flow) throw httpError(404, "Flow not found");
      const payload = body as { leadId?: string };
      if (!payload.leadId) throw httpError(400, "leadId required");
      if (flow.trigger !== FlowTriggerType.MANUAL) {
        throw httpError(
          400,
          `Flow trigger is '${flow.trigger}', not MANUAL. Use the appropriate event.`,
        );
      }
      const lead = leadStore.find((l) => l.id === payload.leadId);
      if (!lead) throw httpError(404, "Lead not found");
      const execution: StoredExecution = {
        id: `fe-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        flowId: flow.id,
        leadId: lead.id,
        currentStepIndex: 0,
        status: FlowExecutionStatus.RUNNING,
        startedAt: new Date().toISOString(),
        stepsCompleted: 0,
        lead: { id: lead.id, name: lead.name, phone: lead.phone },
        flow: { id: flow.id, name: flow.name, trigger: flow.trigger },
      };
      executionStore.push(execution);
      return { data: execution, status: 201 };
    },
  },
];
