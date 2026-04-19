import { UserRole, type User } from "@realestate/shared";
import type { IntegrationConfig, PipelineStage } from "@/lib/settings-api";

const nowIso = new Date().toISOString();

export const userStore: User[] = [
  {
    id: "u-1",
    name: "Priya Admin",
    email: "admin@demo.com",
    phone: "+91 9000000001",
    role: UserRole.ADMIN,
    status: "ACTIVE",
    createdAt: nowIso,
    updatedAt: nowIso,
  },
  {
    id: "u-2",
    name: "Ravi Manager",
    email: "manager@demo.com",
    phone: "+91 9000000002",
    role: UserRole.MANAGER,
    status: "ACTIVE",
    createdAt: nowIso,
    updatedAt: nowIso,
  },
  {
    id: "u-3",
    name: "Sita Sales",
    email: "sales@demo.com",
    phone: "+91 9000000003",
    role: UserRole.SALES,
    status: "ACTIVE",
    createdAt: nowIso,
    updatedAt: nowIso,
  },
];

export const integrationStore: IntegrationConfig[] = [
  {
    type: "whatsapp",
    status: "not_configured",
    config: {
      phoneNumberId: "",
      businessAccountId: "",
      accessToken: "",
    },
  },
  {
    type: "email",
    status: "not_configured",
    config: {
      smtpHost: "",
      smtpPort: "587",
      fromAddress: "",
      username: "",
    },
  },
  {
    type: "sms",
    status: "not_configured",
    config: {},
  },
];

export const pipelineStageStore: PipelineStage[] = [
  { id: "stg-1", name: "New", orderIndex: 0, isDefault: true, isClosed: false },
  {
    id: "stg-2",
    name: "Contacted",
    orderIndex: 1,
    isDefault: true,
    isClosed: false,
  },
  {
    id: "stg-3",
    name: "Site Visit Scheduled",
    orderIndex: 2,
    isDefault: true,
    isClosed: false,
  },
  {
    id: "stg-4",
    name: "Site Visit Done",
    orderIndex: 3,
    isDefault: true,
    isClosed: false,
  },
  {
    id: "stg-5",
    name: "Negotiation",
    orderIndex: 4,
    isDefault: true,
    isClosed: false,
  },
  {
    id: "stg-6",
    name: "Closed Won",
    orderIndex: 5,
    isDefault: true,
    isClosed: true,
  },
  {
    id: "stg-7",
    name: "Closed Lost",
    orderIndex: 6,
    isDefault: true,
    isClosed: true,
  },
];
