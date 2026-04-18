import { apiClient } from "@/lib/api-client";
import type {
  Paginated,
  Project,
  ProjectDocument,
  Property,
} from "@realestate/shared";

export interface ProjectListFilters {
  search?: string;
  location?: string;
  tag?: string;
  status?: Project["status"];
  page?: number;
  pageSize?: number;
}

export interface ProjectCreatePayload {
  name: string;
  description?: string;
  locationText: string;
  latitude?: number;
  longitude?: number;
  propertyType: string;
  tags: string[];
  status: "draft" | "active";
}

export interface ProjectUpdatePayload extends Partial<ProjectCreatePayload> {}

export interface PropertyPayload {
  unitNumber: string;
  size: number;
  sizeUnit: "sqft" | "sqyd";
  price: number;
  facing?: string;
  status: Property["status"];
}

export interface ProjectDetailResponse extends Project {
  properties: Property[];
  documents: ProjectDocument[];
  interestedLeadsCount: number;
}

export const projectsApi = {
  list: async (
    filters: ProjectListFilters = {},
  ): Promise<Paginated<Project>> => {
    const { data } = await apiClient.get<Paginated<Project>>("/projects", {
      params: filters,
    });
    return data;
  },
  get: async (id: string): Promise<ProjectDetailResponse> => {
    const { data } = await apiClient.get<ProjectDetailResponse>(
      `/projects/${id}`,
    );
    return data;
  },
  create: async (payload: ProjectCreatePayload): Promise<Project> => {
    const { data } = await apiClient.post<Project>("/projects", payload);
    return data;
  },
  update: async (
    id: string,
    payload: ProjectUpdatePayload,
  ): Promise<Project> => {
    const { data } = await apiClient.patch<Project>(`/projects/${id}`, payload);
    return data;
  },
  remove: async (id: string): Promise<void> => {
    await apiClient.delete(`/projects/${id}`);
  },
  listProperties: async (projectId: string): Promise<Property[]> => {
    const { data } = await apiClient.get<Property[]>(
      `/projects/${projectId}/properties`,
    );
    return data;
  },
  createProperty: async (
    projectId: string,
    payload: PropertyPayload,
  ): Promise<Property> => {
    const { data } = await apiClient.post<Property>(
      `/projects/${projectId}/properties`,
      payload,
    );
    return data;
  },
  updateProperty: async (
    propertyId: string,
    payload: Partial<PropertyPayload>,
  ): Promise<Property> => {
    const { data } = await apiClient.patch<Property>(
      `/properties/${propertyId}`,
      payload,
    );
    return data;
  },
  uploadDocument: async (
    projectId: string,
    payload: {
      fileName: string;
      fileType: ProjectDocument["fileType"];
      fileSize: number;
      mimeType: string;
    },
  ): Promise<ProjectDocument> => {
    const { data } = await apiClient.post<ProjectDocument>(
      `/projects/${projectId}/documents`,
      payload,
    );
    return data;
  },
  deleteDocument: async (documentId: string): Promise<void> => {
    await apiClient.delete(`/documents/${documentId}`);
  },
};

export const PROPERTY_TYPES = [
  "Villa Plots",
  "Apartments",
  "Independent Houses",
  "Commercial",
  "Farm Land",
  "Residential Plots",
] as const;
