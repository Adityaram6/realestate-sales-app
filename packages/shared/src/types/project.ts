import type { ProjectStatus, PropertyStatus } from "../enums";

export interface Project {
  id: string;
  projectCode: string; // PRJ-2026-0001
  name: string;
  description?: string;
  locationText: string;
  latitude?: number;
  longitude?: number;
  propertyType: string;
  tags: string[];
  status: ProjectStatus;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface Property {
  id: string;
  projectId: string;
  unitNumber: string;
  size: number;
  sizeUnit: "sqft" | "sqyd";
  price: number;
  facing?: string;
  status: PropertyStatus;
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface ProjectDocument {
  id: string;
  projectId: string;
  fileUrl: string;
  fileName: string;
  fileType: "brochure" | "layout" | "legal" | "media";
  fileSize: number;
  mimeType: string;
  version: number;
  uploadedBy: string;
  createdAt: string;
}
