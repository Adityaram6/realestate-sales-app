import { apiClient } from "@/lib/api-client";

export interface DashboardMetrics {
  totalLeads: number;
  activeOpportunities: number;
  conversionRate: number;
  leadsPerProject: Array<{ projectName: string; count: number }>;
  recentActivity: Array<{
    id: string;
    type: string;
    description: string;
    createdAt: string;
  }>;
}

export const dashboardApi = {
  metrics: async (): Promise<DashboardMetrics> => {
    const { data } = await apiClient.get<DashboardMetrics>("/dashboard/metrics");
    return data;
  },
};
