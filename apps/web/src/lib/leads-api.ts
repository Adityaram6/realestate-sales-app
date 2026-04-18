import { apiClient } from "@/lib/api-client";
import type {
  Lead,
  LeadListFilters,
  LeadStatus,
  Paginated,
} from "@realestate/shared";

export interface LeadCreatePayload {
  name: string;
  phone: string;
  email?: string;
  source?: string;
  budgetMin?: number;
  budgetMax?: number;
  locationPreference?: string;
  tags?: string[];
  status?: LeadStatus;
  assignedTo?: string;
  consentGiven: boolean;
  customFields?: Record<string, string>;
}

export type LeadUpdatePayload = Partial<LeadCreatePayload>;

export interface DuplicateCheckResult {
  phoneMatch?: Lead;
  emailMatch?: Lead;
}

export type BulkDuplicateAction = "skip" | "merge" | "create_new";

export interface BulkUploadRow {
  name: string;
  phone: string;
  email?: string;
  source?: string;
  budgetMin?: number;
  budgetMax?: number;
  locationPreference?: string;
  tags?: string[];
  customFields?: Record<string, string>;
  action: BulkDuplicateAction;
}

export interface BulkUploadResult {
  created: number;
  merged: number;
  skipped: number;
  errors: Array<{ row: number; message: string }>;
}

export const leadsApi = {
  list: async (filters: LeadListFilters = {}): Promise<Paginated<Lead>> => {
    const { data } = await apiClient.get<Paginated<Lead>>("/leads", {
      params: filters,
    });
    return data;
  },
  get: async (id: string): Promise<Lead> => {
    const { data } = await apiClient.get<Lead>(`/leads/${id}`);
    return data;
  },
  create: async (payload: LeadCreatePayload): Promise<Lead> => {
    const { data } = await apiClient.post<Lead>("/leads", payload);
    return data;
  },
  update: async (id: string, payload: LeadUpdatePayload): Promise<Lead> => {
    const { data } = await apiClient.patch<Lead>(`/leads/${id}`, payload);
    return data;
  },
  remove: async (id: string): Promise<void> => {
    await apiClient.delete(`/leads/${id}`);
  },
  anonymize: async (id: string): Promise<void> => {
    await apiClient.post(`/leads/${id}/anonymize`);
  },
  checkDuplicate: async (
    phone: string,
    email?: string,
  ): Promise<DuplicateCheckResult> => {
    const { data } = await apiClient.get<DuplicateCheckResult>(
      "/leads/duplicate-check",
      { params: { phone, email } },
    );
    return data;
  },
  bulkUpload: async (rows: BulkUploadRow[]): Promise<BulkUploadResult> => {
    const { data } = await apiClient.post<BulkUploadResult>(
      "/leads/bulk-upload",
      { rows },
    );
    return data;
  },
};
