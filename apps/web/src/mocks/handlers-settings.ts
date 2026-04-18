import type { MockHandler } from "@/mocks/handlers";
import { UserRole, type User } from "@realestate/shared";
import {
  userStore,
  integrationStore,
  pipelineStageStore,
} from "@/mocks/fixtures/settings";

function httpError(status: number, message: string) {
  return Object.assign(new Error(message), { status });
}

export const settingsMockHandlers: MockHandler[] = [
  {
    method: "get",
    path: "/users",
    handler: async () => ({ data: userStore }),
  },
  {
    method: "patch",
    path: "/users/:id",
    handler: async ({ params, body }) => {
      const idx = userStore.findIndex((u) => u.id === params.id);
      if (idx === -1) throw httpError(404, "User not found");
      const payload = body as Partial<User>;
      if (payload.role && !Object.values(UserRole).includes(payload.role)) {
        throw httpError(400, "Invalid role");
      }
      const updated: User = {
        ...userStore[idx]!,
        ...payload,
        id: userStore[idx]!.id,
        updatedAt: new Date().toISOString(),
      };
      userStore[idx] = updated;
      return { data: updated };
    },
  },
  {
    method: "get",
    path: "/integrations",
    handler: async () => ({ data: integrationStore }),
  },
  {
    method: "patch",
    path: "/integrations/:type",
    handler: async ({ params, body }) => {
      const idx = integrationStore.findIndex((i) => i.type === params.type);
      if (idx === -1) throw httpError(404, "Integration not found");
      const payload = body as { config?: Record<string, string> };
      const merged = {
        ...integrationStore[idx]!,
        config: { ...integrationStore[idx]!.config, ...(payload.config ?? {}) },
      };
      const hasAllRequired = requiredKeys(merged.type).every((k) =>
        Boolean((merged.config as Record<string, string>)[k]),
      );
      merged.status = hasAllRequired ? "connected" : "not_configured";
      integrationStore[idx] = merged;
      return { data: merged };
    },
  },
  {
    method: "get",
    path: "/settings/pipeline-stages",
    handler: async () => ({
      data: [...pipelineStageStore].sort(
        (a, b) => a.orderIndex - b.orderIndex,
      ),
    }),
  },
  {
    method: "patch",
    path: "/settings/pipeline-stages/reorder",
    handler: async ({ body }) => {
      const payload = body as { orderedIds?: string[] };
      if (!payload?.orderedIds?.length)
        throw httpError(400, "orderedIds required");
      const ids = payload.orderedIds;
      for (const id of ids) {
        if (!pipelineStageStore.find((s) => s.id === id)) {
          throw httpError(400, `Unknown stage id ${id}`);
        }
      }
      ids.forEach((id, i) => {
        const stage = pipelineStageStore.find((s) => s.id === id);
        if (stage) stage.orderIndex = i;
      });
      return {
        data: [...pipelineStageStore].sort(
          (a, b) => a.orderIndex - b.orderIndex,
        ),
      };
    },
  },
];

function requiredKeys(type: string): string[] {
  switch (type) {
    case "whatsapp":
      return ["phoneNumberId", "businessAccountId", "accessToken"];
    case "email":
      return ["smtpHost", "smtpPort", "fromAddress", "username"];
    default:
      return [];
  }
}
