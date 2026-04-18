import { apiClient } from "@/lib/api-client";
import type { User, UserRole } from "@realestate/shared";

export interface IntegrationConfig {
  type: "whatsapp" | "email" | "sms";
  status: "connected" | "not_configured" | "error";
  config: Record<string, string>;
}

export interface PipelineStage {
  id: string;
  name: string;
  orderIndex: number;
  isDefault: boolean;
  isClosed: boolean;
}

export const settingsApi = {
  listUsers: async (): Promise<User[]> => {
    const { data } = await apiClient.get<User[]>("/users");
    return data;
  },
  updateUserRole: async (id: string, role: UserRole): Promise<User> => {
    const { data } = await apiClient.patch<User>(`/users/${id}`, { role });
    return data;
  },
  listIntegrations: async (): Promise<IntegrationConfig[]> => {
    const { data } = await apiClient.get<IntegrationConfig[]>("/integrations");
    return data;
  },
  updateIntegration: async (
    type: IntegrationConfig["type"],
    config: Record<string, string>,
  ): Promise<IntegrationConfig> => {
    const { data } = await apiClient.patch<IntegrationConfig>(
      `/integrations/${type}`,
      { config },
    );
    return data;
  },
  listPipelineStages: async (): Promise<PipelineStage[]> => {
    const { data } = await apiClient.get<PipelineStage[]>(
      "/settings/pipeline-stages",
    );
    return data;
  },
  reorderPipelineStages: async (
    orderedIds: string[],
  ): Promise<PipelineStage[]> => {
    const { data } = await apiClient.patch<PipelineStage[]>(
      "/settings/pipeline-stages/reorder",
      { orderedIds },
    );
    return data;
  },
};
