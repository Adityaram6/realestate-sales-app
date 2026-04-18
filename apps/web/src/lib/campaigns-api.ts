import { apiClient } from "@/lib/api-client";
import type {
  AudienceFilter,
  Campaign,
  CampaignAudienceMember,
  CampaignMessage,
  CampaignStatus,
  CampaignType,
  CampaignWithRelations,
  MessageChannel,
} from "@realestate/shared";

export interface CampaignListFilters {
  status?: CampaignStatus;
  type?: CampaignType;
  projectId?: string;
  search?: string;
}

export interface CreateCampaignPayload {
  name: string;
  description?: string;
  projectId?: string;
  type: CampaignType;
  audienceFilter?: AudienceFilter;
  startDate?: string;
  endDate?: string;
}

export type UpdateCampaignPayload = Partial<CreateCampaignPayload> & {
  status?: CampaignStatus;
};

export interface AssignAudiencePayload {
  leadIds?: string[];
  filter?: AudienceFilter;
}

export interface AddCampaignMessagePayload {
  channel: MessageChannel;
  content: string;
  mediaUrl?: string;
  scheduledAt?: string;
}

export interface ExecuteCampaignResult {
  campaignId: string;
  dryRun: boolean;
  totalAudience: number;
  queuedMessages: number;
  skipped: number;
  errors: Array<{ leadId: string; reason: string }>;
}

export interface CampaignAnalytics {
  campaignId: string;
  audienceSize: number;
  deliveryFunnel: {
    pending: number;
    sent: number;
    delivered: number;
    responded: number;
    failed: number;
  };
  conversion: {
    deliveredPercent: number;
    responseRatePercent: number;
    failureRatePercent: number;
  };
  topVariations: Array<{
    messageId: string;
    channel: string;
    contentPreview: string;
    sent: number;
  }>;
}

export interface GenerateContentPayload {
  projectId: string;
  platform:
    | "facebook"
    | "instagram"
    | "linkedin"
    | "whatsapp_blast"
    | "email_blast";
  targetAudience?: string;
  tone?: "professional" | "friendly" | "aggressive";
}

export interface MarketingContentVariation {
  approach: "headline_first" | "story_first" | "benefit_first";
  content: string;
  hashtags?: string[];
  charCount: number;
}

export const campaignsApi = {
  list: async (
    filters: CampaignListFilters = {},
  ): Promise<CampaignWithRelations[]> => {
    const { data } = await apiClient.get<CampaignWithRelations[]>(
      "/campaigns",
      { params: filters },
    );
    return data;
  },
  get: async (id: string): Promise<CampaignWithRelations> => {
    const { data } = await apiClient.get<CampaignWithRelations>(
      `/campaigns/${id}`,
    );
    return data;
  },
  create: async (payload: CreateCampaignPayload): Promise<Campaign> => {
    const { data } = await apiClient.post<Campaign>("/campaigns", payload);
    return data;
  },
  update: async (
    id: string,
    payload: UpdateCampaignPayload,
  ): Promise<Campaign> => {
    const { data } = await apiClient.patch<Campaign>(
      `/campaigns/${id}`,
      payload,
    );
    return data;
  },
  remove: async (id: string): Promise<void> => {
    await apiClient.delete(`/campaigns/${id}`);
  },
  listAudience: async (
    campaignId: string,
  ): Promise<CampaignAudienceMember[]> => {
    const { data } = await apiClient.get<CampaignAudienceMember[]>(
      `/campaigns/${campaignId}/audience`,
    );
    return data;
  },
  assignAudience: async (
    campaignId: string,
    payload: AssignAudiencePayload,
  ): Promise<{ added: number; alreadyPresent: number }> => {
    const { data } = await apiClient.post<{
      added: number;
      alreadyPresent: number;
    }>(`/campaigns/${campaignId}/audience`, payload);
    return data;
  },
  removeAudienceMember: async (
    campaignId: string,
    leadId: string,
  ): Promise<void> => {
    await apiClient.delete(`/campaigns/${campaignId}/audience/${leadId}`);
  },
  addMessage: async (
    campaignId: string,
    payload: AddCampaignMessagePayload,
  ): Promise<CampaignMessage> => {
    const { data } = await apiClient.post<CampaignMessage>(
      `/campaigns/${campaignId}/messages`,
      payload,
    );
    return data;
  },
  deleteMessage: async (messageId: string): Promise<void> => {
    await apiClient.delete(`/campaigns/messages/${messageId}`);
  },
  execute: async (
    campaignId: string,
    dryRun = false,
  ): Promise<ExecuteCampaignResult> => {
    const { data } = await apiClient.post<ExecuteCampaignResult>(
      `/campaigns/${campaignId}/execute`,
      { dryRun },
    );
    return data;
  },
  analytics: async (campaignId: string): Promise<CampaignAnalytics> => {
    const { data } = await apiClient.get<CampaignAnalytics>(
      `/campaigns/${campaignId}/analytics`,
    );
    return data;
  },
  generateContent: async (
    payload: GenerateContentPayload,
  ): Promise<{
    variations: MarketingContentVariation[];
    storedInteractionId: string;
  }> => {
    const { data } = await apiClient.post<{
      variations: MarketingContentVariation[];
      storedInteractionId: string;
    }>("/ai/generate-content", payload);
    return data;
  },
};
