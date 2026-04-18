import type { LeadStatus } from "../enums";

export interface Lead {
  id: string;
  name: string;
  phone: string;
  email?: string;
  source?: string;
  budgetMin?: number;
  budgetMax?: number;
  locationPreference?: string;
  tags: string[];
  status?: LeadStatus;
  score?: number;
  assignedTo?: string;
  consentGiven: boolean;
  consentTimestamp?: string;
  customFields?: Record<string, string>;
  createdAt: string;
  updatedAt: string;
}

export interface LeadListFilters {
  status?: LeadStatus;
  budgetMin?: number;
  budgetMax?: number;
  location?: string;
  assignedTo?: string;
  search?: string;
  page?: number;
  pageSize?: number;
}
