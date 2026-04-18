import {
  ProjectStatus,
  PropertyStatus,
  type Paginated,
  type Project,
  type ProjectDocument,
  type Property,
} from "@realestate/shared";
import type { MockHandler } from "@/mocks/handlers";
import {
  projectStore,
  propertyStore,
  documentStore,
  nextProjectCode,
} from "@/mocks/fixtures/projects";
import { opportunityStore } from "@/mocks/fixtures/opportunities";

function httpError(status: number, message: string) {
  return Object.assign(new Error(message), { status });
}

export const projectMockHandlers: MockHandler[] = [
  {
    method: "get",
    path: "/projects",
    handler: async ({ query }) => {
      const page = Number(query.page ?? 1);
      const pageSize = Number(query.pageSize ?? 10);
      const search = (query.search ?? "").toLowerCase();
      const location = (query.location ?? "").toLowerCase();
      const tag = query.tag;
      const status = query.status as Project["status"] | undefined;

      let filtered = [...projectStore];
      if (search) {
        filtered = filtered.filter(
          (p) =>
            p.name.toLowerCase().includes(search) ||
            p.projectCode.toLowerCase().includes(search),
        );
      }
      if (location) {
        filtered = filtered.filter((p) =>
          p.locationText.toLowerCase().includes(location),
        );
      }
      if (tag) {
        filtered = filtered.filter((p) => p.tags.includes(tag));
      }
      if (status) {
        filtered = filtered.filter((p) => p.status === status);
      }

      filtered.sort(
        (a, b) =>
          new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
      );

      const total = filtered.length;
      const start = (page - 1) * pageSize;
      const data = filtered.slice(start, start + pageSize);

      const response: Paginated<Project> = { data, total, page, pageSize };
      return { data: response };
    },
  },
  {
    method: "get",
    path: "/projects/:id",
    handler: async ({ params }) => {
      const project = projectStore.find((p) => p.id === params.id);
      if (!project) throw httpError(404, "Project not found");
      const properties = propertyStore.filter((p) => p.projectId === params.id);
      const documents = documentStore.filter((d) => d.projectId === params.id);
      const interestedLeadsCount = new Set(
        opportunityStore
          .filter((o) => o.projectId === params.id)
          .map((o) => o.leadId),
      ).size;
      return {
        data: {
          ...project,
          properties,
          documents,
          interestedLeadsCount,
        },
      };
    },
  },
  {
    method: "post",
    path: "/projects",
    handler: async ({ body }) => {
      const payload = (body ?? {}) as Partial<Project> & {
        status?: "draft" | "active";
      };
      if (!payload.name) throw httpError(400, "Name is required");
      if (!payload.locationText)
        throw httpError(400, "Location is required");

      const duplicate = projectStore.find(
        (p) =>
          p.name.trim().toLowerCase() ===
            payload.name!.trim().toLowerCase() &&
          p.locationText.trim().toLowerCase() ===
            payload.locationText!.trim().toLowerCase(),
      );
      if (duplicate) {
        throw httpError(
          409,
          "A project with this name already exists at this location.",
        );
      }

      const now = new Date().toISOString();
      const project: Project = {
        id: `prj-${Date.now()}`,
        projectCode: nextProjectCode(),
        name: payload.name!,
        description: payload.description,
        locationText: payload.locationText!,
        latitude: payload.latitude,
        longitude: payload.longitude,
        propertyType: payload.propertyType ?? "Residential Plots",
        tags: payload.tags ?? [],
        status:
          payload.status === "draft"
            ? ProjectStatus.DRAFT
            : ProjectStatus.ACTIVE,
        createdBy: "u-1",
        createdAt: now,
        updatedAt: now,
      };
      projectStore.push(project);
      return { data: project, status: 201 };
    },
  },
  {
    method: "patch",
    path: "/projects/:id",
    handler: async ({ params, body }) => {
      const idx = projectStore.findIndex((p) => p.id === params.id);
      if (idx === -1) throw httpError(404, "Project not found");
      const current = projectStore[idx]!;
      const payload = (body ?? {}) as Partial<Project>;
      const updated: Project = {
        ...current,
        ...payload,
        id: current.id,
        projectCode: current.projectCode,
        updatedAt: new Date().toISOString(),
      };
      projectStore[idx] = updated;
      return { data: updated };
    },
  },
  {
    method: "delete",
    path: "/projects/:id",
    handler: async ({ params }) => {
      const idx = projectStore.findIndex((p) => p.id === params.id);
      if (idx === -1) throw httpError(404, "Project not found");
      projectStore[idx] = {
        ...projectStore[idx]!,
        status: ProjectStatus.INACTIVE,
        updatedAt: new Date().toISOString(),
      };
      return { data: { success: true } };
    },
  },
  {
    method: "get",
    path: "/projects/:id/properties",
    handler: async ({ params }) => {
      return {
        data: propertyStore.filter((p) => p.projectId === params.id),
      };
    },
  },
  {
    method: "post",
    path: "/projects/:id/properties",
    handler: async ({ params, body }) => {
      const payload = (body ?? {}) as Partial<Property>;
      if (!payload.unitNumber)
        throw httpError(400, "Unit number is required");
      const duplicate = propertyStore.find(
        (p) =>
          p.projectId === params.id &&
          p.unitNumber.toLowerCase() === payload.unitNumber!.toLowerCase(),
      );
      if (duplicate) {
        throw httpError(409, "Unit number already exists in this project.");
      }
      const now = new Date().toISOString();
      const property: Property = {
        id: `prop-${Date.now()}`,
        projectId: params.id!,
        unitNumber: payload.unitNumber!,
        size: Number(payload.size ?? 0),
        sizeUnit: payload.sizeUnit ?? "sqyd",
        price: Number(payload.price ?? 0),
        facing: payload.facing,
        status: payload.status ?? PropertyStatus.AVAILABLE,
        createdAt: now,
        updatedAt: now,
      };
      propertyStore.push(property);
      return { data: property, status: 201 };
    },
  },
  {
    method: "patch",
    path: "/properties/:id",
    handler: async ({ params, body }) => {
      const idx = propertyStore.findIndex((p) => p.id === params.id);
      if (idx === -1) throw httpError(404, "Property not found");
      const payload = (body ?? {}) as Partial<Property>;
      const updated: Property = {
        ...propertyStore[idx]!,
        ...payload,
        id: propertyStore[idx]!.id,
        projectId: propertyStore[idx]!.projectId,
        updatedAt: new Date().toISOString(),
      };
      propertyStore[idx] = updated;
      return { data: updated };
    },
  },
  {
    method: "post",
    path: "/projects/:id/documents",
    handler: async ({ params, body }) => {
      const payload = (body ?? {}) as Partial<ProjectDocument>;
      if (!payload.fileName || !payload.fileType) {
        throw httpError(400, "fileName and fileType are required");
      }
      const doc: ProjectDocument = {
        id: `doc-${Date.now()}`,
        projectId: params.id!,
        fileName: payload.fileName!,
        fileUrl: `https://example.com/mock/${encodeURIComponent(payload.fileName!)}`,
        fileType: payload.fileType!,
        fileSize: payload.fileSize ?? 0,
        mimeType: payload.mimeType ?? "application/octet-stream",
        version: 1,
        uploadedBy: "u-1",
        createdAt: new Date().toISOString(),
      };
      documentStore.push(doc);
      return { data: doc, status: 201 };
    },
  },
  {
    method: "delete",
    path: "/documents/:id",
    handler: async ({ params }) => {
      const idx = documentStore.findIndex((d) => d.id === params.id);
      if (idx === -1) throw httpError(404, "Document not found");
      documentStore.splice(idx, 1);
      return { data: { success: true } };
    },
  },
];
