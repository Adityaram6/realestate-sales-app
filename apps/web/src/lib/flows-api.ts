import { apiClient } from "@/lib/api-client";
import type {
  CampaignFlow,
  CampaignFlowWithRelations,
  FlowExecutionWithRelations,
  FlowStepConfig,
  FlowStepType,
  FlowTriggerType,
  OpportunityStage,
} from "@realestate/shared";

export interface CreateFlowPayload {
  name: string;
  description?: string;
  campaignId?: string;
  trigger: FlowTriggerType;
  triggerConfig?: {
    fromStage?: OpportunityStage;
    toStage?: OpportunityStage;
  };
  steps: Array<{ type: FlowStepType; config: FlowStepConfig }>;
}

export interface UpdateFlowPayload {
  name?: string;
  description?: string;
  isActive?: boolean;
  steps?: Array<{ type: FlowStepType; config: FlowStepConfig }>;
}

export interface FlowListFilters {
  trigger?: FlowTriggerType;
  isActive?: boolean;
  campaignId?: string;
}

export const flowsApi = {
  list: async (filters: FlowListFilters = {}): Promise<CampaignFlowWithRelations[]> => {
    const { data } = await apiClient.get<CampaignFlowWithRelations[]>(
      "/flows",
      { params: filters },
    );
    return data;
  },
  get: async (id: string): Promise<CampaignFlowWithRelations> => {
    const { data } = await apiClient.get<CampaignFlowWithRelations>(
      `/flows/${id}`,
    );
    return data;
  },
  create: async (payload: CreateFlowPayload): Promise<CampaignFlowWithRelations> => {
    const { data } = await apiClient.post<CampaignFlowWithRelations>(
      "/flows",
      payload,
    );
    return data;
  },
  update: async (id: string, payload: UpdateFlowPayload): Promise<CampaignFlowWithRelations> => {
    const { data } = await apiClient.patch<CampaignFlowWithRelations>(
      `/flows/${id}`,
      payload,
    );
    return data;
  },
  remove: async (id: string): Promise<void> => {
    await apiClient.delete(`/flows/${id}`);
  },
  triggerManual: async (id: string, leadId: string): Promise<unknown> => {
    const { data } = await apiClient.post(`/flows/${id}/trigger`, { leadId });
    return data;
  },
  listExecutions: async (params: {
    flowId?: string;
    leadId?: string;
    take?: number;
  } = {}): Promise<FlowExecutionWithRelations[]> => {
    const { data } = await apiClient.get<FlowExecutionWithRelations[]>(
      "/flows/executions",
      { params },
    );
    return data;
  },
};

export type { CampaignFlow };
