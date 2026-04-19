import { UserRole, type AuthResponse, type User } from "@realestate/shared";
import { projectMockHandlers } from "@/mocks/handlers-projects";
import { leadMockHandlers } from "@/mocks/handlers-leads";
import { opportunityMockHandlers } from "@/mocks/handlers-opportunities";
import { aiMockHandlers } from "@/mocks/handlers-ai";
import { activityMockHandlers } from "@/mocks/handlers-activities";
import { messageMockHandlers } from "@/mocks/handlers-messages";
import { taskMockHandlers } from "@/mocks/handlers-tasks";
import { settingsMockHandlers } from "@/mocks/handlers-settings";
import { notificationMockHandlers } from "@/mocks/handlers-notifications";
import { campaignMockHandlers } from "@/mocks/handlers-campaigns";
import { socialMockHandlers } from "@/mocks/handlers-social";
import { flowMockHandlers } from "@/mocks/handlers-flows";

export interface MockHandlerContext {
  params: Record<string, string>;
  body: unknown;
  query: Record<string, string>;
}

export interface MockHandler {
  method: "get" | "post" | "patch" | "put" | "delete";
  path: string;
  handler: (ctx: MockHandlerContext) => Promise<{ data: unknown; status?: number }>;
}

const DEMO_USERS: Array<User & { password: string }> = [
  {
    id: "u-1",
    name: "Priya Admin",
    email: "admin@demo.com",
    phone: "+91 9000000001",
    role: UserRole.ADMIN,
    status: "ACTIVE",
    password: "password",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "u-2",
    name: "Ravi Manager",
    email: "manager@demo.com",
    phone: "+91 9000000002",
    role: UserRole.MANAGER,
    status: "ACTIVE",
    password: "password",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "u-3",
    name: "Sita Sales",
    email: "sales@demo.com",
    phone: "+91 9000000003",
    role: UserRole.SALES,
    status: "ACTIVE",
    password: "password",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

function makeAuthResponse(user: User): AuthResponse {
  return {
    user,
    tokens: {
      accessToken: `mock-access-${user.id}-${Date.now()}`,
      refreshToken: `mock-refresh-${user.id}-${Date.now()}`,
    },
  };
}

const coreHandlers: MockHandler[] = [
  {
    method: "post",
    path: "/auth/login",
    handler: async ({ body }) => {
      const { email, password } = (body ?? {}) as {
        email?: string;
        password?: string;
      };
      const user = DEMO_USERS.find((u) => u.email === email);
      if (!user || user.password !== password) {
        throw Object.assign(new Error("Invalid email or password"), {
          status: 401,
        });
      }
      const { password: _pw, ...publicUser } = user;
      return { data: makeAuthResponse(publicUser) };
    },
  },
  {
    method: "post",
    path: "/auth/register",
    handler: async ({ body }) => {
      const { name, email, password, phone } = (body ?? {}) as {
        name?: string;
        email?: string;
        password?: string;
        phone?: string;
      };
      if (!name || !email || !password) {
        throw Object.assign(new Error("Missing required fields"), {
          status: 400,
        });
      }
      if (DEMO_USERS.some((u) => u.email === email)) {
        throw Object.assign(new Error("Email already registered"), {
          status: 409,
        });
      }
      const user: User = {
        id: `u-${DEMO_USERS.length + 1}`,
        name,
        email,
        phone,
        role: UserRole.SALES,
        status: "ACTIVE",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      DEMO_USERS.push({ ...user, password });
      return { data: makeAuthResponse(user), status: 201 };
    },
  },
  {
    method: "get",
    path: "/auth/me",
    handler: async () => {
      const user = DEMO_USERS[0]!;
      const { password: _pw, ...publicUser } = user;
      return { data: publicUser };
    },
  },
  {
    method: "get",
    path: "/dashboard/metrics",
    handler: async () => {
      const { computeDashboardMetrics } = await import(
        "@/mocks/dashboard-metrics"
      );
      return { data: computeDashboardMetrics() };
    },
  },
];

export const mockHandlers: MockHandler[] = [
  ...coreHandlers,
  ...projectMockHandlers,
  ...leadMockHandlers,
  ...opportunityMockHandlers,
  ...aiMockHandlers,
  ...activityMockHandlers,
  ...messageMockHandlers,
  ...taskMockHandlers,
  ...settingsMockHandlers,
  ...notificationMockHandlers,
  ...campaignMockHandlers,
  ...socialMockHandlers,
  ...flowMockHandlers,
];
