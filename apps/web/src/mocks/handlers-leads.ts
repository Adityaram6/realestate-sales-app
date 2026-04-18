import {
  LeadStatus,
  type Lead,
  type Paginated,
} from "@realestate/shared";
import type { MockHandler } from "@/mocks/handlers";
import { leadStore } from "@/mocks/fixtures/leads";
import type {
  BulkUploadResult,
  BulkUploadRow,
  DuplicateCheckResult,
} from "@/lib/leads-api";

function httpError(status: number, message: string) {
  return Object.assign(new Error(message), { status });
}

function normalizePhone(p: string): string {
  return p.replace(/[^\d]/g, "").slice(-10);
}

function findByPhone(phone: string): Lead | undefined {
  const normalized = normalizePhone(phone);
  return leadStore.find(
    (l) => normalizePhone(l.phone) === normalized && normalized.length >= 7,
  );
}

function findByEmail(email: string): Lead | undefined {
  const lower = email.trim().toLowerCase();
  if (!lower) return undefined;
  return leadStore.find(
    (l) => (l.email ?? "").trim().toLowerCase() === lower,
  );
}

function mergeInto(existing: Lead, incoming: Partial<Lead>): Lead {
  // New upload fills empty fields only; preserve existing non-empty values.
  const result: Lead = { ...existing };
  for (const [key, value] of Object.entries(incoming)) {
    if (value == null || value === "") continue;
    const current = (existing as unknown as Record<string, unknown>)[key];
    const isEmpty =
      current == null ||
      current === "" ||
      (Array.isArray(current) && current.length === 0);
    if (isEmpty) {
      (result as unknown as Record<string, unknown>)[key] = value;
    }
  }
  result.updatedAt = new Date().toISOString();
  return result;
}

export const leadMockHandlers: MockHandler[] = [
  {
    method: "get",
    path: "/leads",
    handler: async ({ query }) => {
      const page = Number(query.page ?? 1);
      const pageSize = Number(query.pageSize ?? 20);
      const search = (query.search ?? "").toLowerCase();
      const status = query.status as LeadStatus | undefined;
      const budgetMin = query.budgetMin ? Number(query.budgetMin) : undefined;
      const budgetMax = query.budgetMax ? Number(query.budgetMax) : undefined;
      const location = (query.location ?? "").toLowerCase();
      const assignedTo = query.assignedTo;

      let filtered = [...leadStore];
      if (search) {
        filtered = filtered.filter(
          (l) =>
            l.name.toLowerCase().includes(search) ||
            l.phone.toLowerCase().includes(search) ||
            (l.email ?? "").toLowerCase().includes(search),
        );
      }
      if (status) filtered = filtered.filter((l) => l.status === status);
      if (location)
        filtered = filtered.filter((l) =>
          (l.locationPreference ?? "").toLowerCase().includes(location),
        );
      if (assignedTo)
        filtered = filtered.filter((l) => l.assignedTo === assignedTo);
      if (budgetMin != null)
        filtered = filtered.filter((l) => (l.budgetMax ?? 0) >= budgetMin);
      if (budgetMax != null)
        filtered = filtered.filter(
          (l) => (l.budgetMin ?? Infinity) <= budgetMax,
        );

      filtered.sort(
        (a, b) =>
          new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
      );

      const total = filtered.length;
      const start = (page - 1) * pageSize;
      const response: Paginated<Lead> = {
        data: filtered.slice(start, start + pageSize),
        total,
        page,
        pageSize,
      };
      return { data: response };
    },
  },
  {
    method: "get",
    path: "/leads/duplicate-check",
    handler: async ({ query }) => {
      const phone = query.phone ?? "";
      const email = query.email;
      const result: DuplicateCheckResult = {};
      if (phone) {
        const match = findByPhone(phone);
        if (match) result.phoneMatch = match;
      }
      if (email) {
        const match = findByEmail(email);
        if (match) result.emailMatch = match;
      }
      return { data: result };
    },
  },
  {
    method: "get",
    path: "/leads/:id",
    handler: async ({ params }) => {
      const lead = leadStore.find((l) => l.id === params.id);
      if (!lead) throw httpError(404, "Lead not found");
      return { data: lead };
    },
  },
  {
    method: "post",
    path: "/leads",
    handler: async ({ body }) => {
      const payload = (body ?? {}) as Partial<Lead>;
      if (!payload.name) throw httpError(400, "Name is required");
      if (!payload.phone) throw httpError(400, "Phone is required");
      if (!payload.consentGiven)
        throw httpError(
          400,
          "Consent must be captured before creating a lead.",
        );

      const now = new Date().toISOString();
      const lead: Lead = {
        id: `lead-${Date.now()}`,
        name: payload.name!,
        phone: payload.phone!,
        email: payload.email,
        source: payload.source,
        budgetMin: payload.budgetMin,
        budgetMax: payload.budgetMax,
        locationPreference: payload.locationPreference,
        tags: payload.tags ?? [],
        status: payload.status ?? LeadStatus.WARM,
        score: payload.score,
        assignedTo: payload.assignedTo ?? "u-3",
        consentGiven: payload.consentGiven!,
        consentTimestamp: now,
        customFields: payload.customFields,
        createdAt: now,
        updatedAt: now,
      };
      leadStore.push(lead);
      return { data: lead, status: 201 };
    },
  },
  {
    method: "patch",
    path: "/leads/:id",
    handler: async ({ params, body }) => {
      const idx = leadStore.findIndex((l) => l.id === params.id);
      if (idx === -1) throw httpError(404, "Lead not found");
      const payload = (body ?? {}) as Partial<Lead>;
      const updated: Lead = {
        ...leadStore[idx]!,
        ...payload,
        id: leadStore[idx]!.id,
        updatedAt: new Date().toISOString(),
      };
      leadStore[idx] = updated;
      return { data: updated };
    },
  },
  {
    method: "delete",
    path: "/leads/:id",
    handler: async ({ params }) => {
      const idx = leadStore.findIndex((l) => l.id === params.id);
      if (idx === -1) throw httpError(404, "Lead not found");
      leadStore.splice(idx, 1);
      return { data: { success: true } };
    },
  },
  {
    method: "post",
    path: "/leads/bulk-upload",
    handler: async ({ body }) => {
      const payload = body as { rows?: BulkUploadRow[] };
      const rows = payload?.rows ?? [];
      const result: BulkUploadResult = {
        created: 0,
        merged: 0,
        skipped: 0,
        errors: [],
      };

      rows.forEach((row, i) => {
        if (!row.name || !row.phone) {
          result.errors.push({
            row: i + 1,
            message: "Missing required Name or Phone",
          });
          return;
        }

        const existing = findByPhone(row.phone) ?? (row.email ? findByEmail(row.email) : undefined);
        if (existing) {
          if (row.action === "skip") {
            result.skipped += 1;
          } else if (row.action === "merge") {
            const idx = leadStore.findIndex((l) => l.id === existing.id);
            if (idx !== -1) {
              leadStore[idx] = mergeInto(existing, {
                name: row.name,
                phone: row.phone,
                email: row.email,
                source: row.source,
                budgetMin: row.budgetMin,
                budgetMax: row.budgetMax,
                locationPreference: row.locationPreference,
                tags: row.tags,
                customFields: row.customFields,
              });
              result.merged += 1;
            }
          } else {
            leadStore.push(buildLead(row));
            result.created += 1;
          }
          return;
        }

        leadStore.push(buildLead(row));
        result.created += 1;
      });

      return { data: result };
    },
  },
];

function buildLead(row: BulkUploadRow): Lead {
  const now = new Date().toISOString();
  return {
    id: `lead-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    name: row.name,
    phone: row.phone,
    email: row.email,
    source: row.source,
    budgetMin: row.budgetMin,
    budgetMax: row.budgetMax,
    locationPreference: row.locationPreference,
    tags: row.tags ?? [],
    status: LeadStatus.WARM,
    assignedTo: "u-3",
    consentGiven: true,
    consentTimestamp: now,
    customFields: row.customFields,
    createdAt: now,
    updatedAt: now,
  };
}
