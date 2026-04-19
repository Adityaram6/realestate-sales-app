// NOTE: Enum string values match the Prisma schema (UPPERCASE) because the API
// serializes Prisma enums verbatim over the wire. Keeping them aligned avoids
// having to normalize on both sides — the frontend compares values exactly as
// they come from the server. Display labels live in the *_LABEL maps below.

export const UserRole = {
  ADMIN: "ADMIN",
  MANAGER: "MANAGER",
  SALES: "SALES",
} as const;
export type UserRole = (typeof UserRole)[keyof typeof UserRole];

export const OpportunityStage = {
  NEW: "NEW",
  CONTACTED: "CONTACTED",
  SITE_VISIT_SCHEDULED: "SITE_VISIT_SCHEDULED",
  SITE_VISIT_DONE: "SITE_VISIT_DONE",
  NEGOTIATION: "NEGOTIATION",
  CLOSED_WON: "CLOSED_WON",
  CLOSED_LOST: "CLOSED_LOST",
} as const;
export type OpportunityStage =
  (typeof OpportunityStage)[keyof typeof OpportunityStage];

export const OPPORTUNITY_STAGE_ORDER: OpportunityStage[] = [
  OpportunityStage.NEW,
  OpportunityStage.CONTACTED,
  OpportunityStage.SITE_VISIT_SCHEDULED,
  OpportunityStage.SITE_VISIT_DONE,
  OpportunityStage.NEGOTIATION,
  OpportunityStage.CLOSED_WON,
  OpportunityStage.CLOSED_LOST,
];

export const OPPORTUNITY_STAGE_LABEL: Record<OpportunityStage, string> = {
  NEW: "New",
  CONTACTED: "Contacted",
  SITE_VISIT_SCHEDULED: "Site Visit Scheduled",
  SITE_VISIT_DONE: "Site Visit Done",
  NEGOTIATION: "Negotiation",
  CLOSED_WON: "Closed Won",
  CLOSED_LOST: "Closed Lost",
};

export const LeadStatus = {
  HOT: "HOT",
  WARM: "WARM",
  COLD: "COLD",
} as const;
export type LeadStatus = (typeof LeadStatus)[keyof typeof LeadStatus];

export const PropertyStatus = {
  AVAILABLE: "AVAILABLE",
  RESERVED: "RESERVED",
  SOLD: "SOLD",
} as const;
export type PropertyStatus = (typeof PropertyStatus)[keyof typeof PropertyStatus];

export const ProjectStatus = {
  DRAFT: "DRAFT",
  ACTIVE: "ACTIVE",
  INACTIVE: "INACTIVE",
} as const;
export type ProjectStatus = (typeof ProjectStatus)[keyof typeof ProjectStatus];

export const ActivityType = {
  CALL: "CALL",
  EMAIL: "EMAIL",
  WHATSAPP: "WHATSAPP",
  NOTE: "NOTE",
  MEETING: "MEETING",
  SYSTEM: "SYSTEM",
} as const;
export type ActivityType = (typeof ActivityType)[keyof typeof ActivityType];

export const MessageChannel = {
  WHATSAPP: "WHATSAPP",
  EMAIL: "EMAIL",
  SMS: "SMS",
} as const;
export type MessageChannel = (typeof MessageChannel)[keyof typeof MessageChannel];

export const MessageDirection = {
  INBOUND: "INBOUND",
  OUTBOUND: "OUTBOUND",
} as const;
export type MessageDirection =
  (typeof MessageDirection)[keyof typeof MessageDirection];

export const MessageStatus = {
  SENT: "SENT",
  DELIVERED: "DELIVERED",
  READ: "READ",
  FAILED: "FAILED",
} as const;
export type MessageStatus = (typeof MessageStatus)[keyof typeof MessageStatus];

export const AiIntent = {
  FOLLOW_UP: "follow_up",
  SITE_VISIT: "site_visit",
  NEGOTIATION: "negotiation",
  CLOSING: "closing",
  RE_ENGAGEMENT: "re_engagement",
  CROSS_SELL: "cross_sell",
} as const;
export type AiIntent = (typeof AiIntent)[keyof typeof AiIntent];

export const AiTone = {
  PROFESSIONAL: "professional",
  FRIENDLY: "friendly",
  AGGRESSIVE: "aggressive",
} as const;
export type AiTone = (typeof AiTone)[keyof typeof AiTone];

export const LEAD_SOURCE_SUGGESTIONS = [
  "Website",
  "WhatsApp",
  "Referral",
  "Walk-in",
  "Ads",
] as const;
