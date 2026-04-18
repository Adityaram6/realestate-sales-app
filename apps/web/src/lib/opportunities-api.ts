import { apiClient } from "@/lib/api-client";
import type {
  Opportunity,
  OpportunityStage,
  OpportunityStageHistory,
  OpportunityWithRelations,
} from "@realestate/shared";

export interface OpportunityListFilters {
  stage?: OpportunityStage;
  projectId?: string;
  leadId?: string;
  assignedTo?: string;
}

export interface AttachProjectsPayload {
  leadId: string;
  projectIds: string[];
}

export interface AttachProjectsResult {
  created: OpportunityWithRelations[];
  skipped: Array<{ projectId: string; reason: string }>;
}

export interface OpportunityDetail extends OpportunityWithRelations {
  leadPhone: string;
  leadEmail?: string;
  projectLocation: string;
  projectCode: string;
  history: OpportunityStageHistory[];
}

export const opportunitiesApi = {
  list: async (
    filters: OpportunityListFilters = {},
  ): Promise<OpportunityWithRelations[]> => {
    const { data } = await apiClient.get<OpportunityWithRelations[]>(
      "/opportunities",
      { params: filters },
    );
    return data;
  },
  get: async (id: string): Promise<OpportunityDetail> => {
    const { data } = await apiClient.get<OpportunityDetail>(
      `/opportunities/${id}`,
    );
    return data;
  },
  attach: async (
    payload: AttachProjectsPayload,
  ): Promise<AttachProjectsResult> => {
    const { data } = await apiClient.post<AttachProjectsResult>(
      "/opportunities/attach",
      payload,
    );
    return data;
  },
  updateStage: async (
    id: string,
    stage: OpportunityStage,
  ): Promise<Opportunity> => {
    const { data } = await apiClient.patch<Opportunity>(
      `/opportunities/${id}/stage`,
      { stage },
    );
    return data;
  },
  forLead: async (leadId: string): Promise<OpportunityWithRelations[]> => {
    const { data } = await apiClient.get<OpportunityWithRelations[]>(
      `/leads/${leadId}/opportunities`,
    );
    return data;
  },
  forProject: async (projectId: string): Promise<OpportunityWithRelations[]> => {
    const { data } = await apiClient.get<OpportunityWithRelations[]>(
      `/projects/${projectId}/opportunities`,
    );
    return data;
  },
};
