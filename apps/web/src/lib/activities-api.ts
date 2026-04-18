import { apiClient } from "@/lib/api-client";
import type { ActivityType, OpportunityStage } from "@realestate/shared";

/**
 * Unified timeline item — messages, stage changes, and manual activities
 * all render through the same shape. The backend will compose this from
 * the activities, messages, and opportunity_stage_history tables.
 */
export interface TimelineItem {
  id: string;
  kind: "activity" | "message" | "stage_change";
  type: ActivityType | "inbound_message" | "outbound_message" | "stage_change";
  title: string;
  description?: string;
  metadata?: {
    channel?: string;
    oldStage?: OpportunityStage;
    newStage?: OpportunityStage;
  };
  createdAt: string;
  createdBy?: string;
  opportunityId?: string;
  projectName?: string;
}

export interface CreateActivityPayload {
  leadId: string;
  opportunityId?: string;
  type: ActivityType;
  title: string;
  description?: string;
  durationMinutes?: number;
  outcome?: string;
}

export interface TimelineFilters {
  types?: Array<TimelineItem["kind"]>;
  since?: string;
}

export const activitiesApi = {
  timeline: async (
    leadId: string,
    filters: TimelineFilters = {},
  ): Promise<TimelineItem[]> => {
    const { data } = await apiClient.get<TimelineItem[]>(
      `/leads/${leadId}/timeline`,
      {
        params: {
          types: filters.types?.join(","),
          since: filters.since,
        },
      },
    );
    return data;
  },
  logActivity: async (payload: CreateActivityPayload): Promise<TimelineItem> => {
    const { data } = await apiClient.post<TimelineItem>(
      "/activities",
      payload,
    );
    return data;
  },
};
