export const UserRole = {
  ADMIN: "admin",
  MANAGER: "manager",
  SALES: "sales",
} as const;
export type UserRole = (typeof UserRole)[keyof typeof UserRole];

export const OpportunityStage = {
  NEW: "new",
  CONTACTED: "contacted",
  SITE_VISIT_SCHEDULED: "site_visit_scheduled",
  SITE_VISIT_DONE: "site_visit_done",
  NEGOTIATION: "negotiation",
  CLOSED_WON: "closed_won",
  CLOSED_LOST: "closed_lost",
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
  new: "New",
  contacted: "Contacted",
  site_visit_scheduled: "Site Visit Scheduled",
  site_visit_done: "Site Visit Done",
  negotiation: "Negotiation",
  closed_won: "Closed Won",
  closed_lost: "Closed Lost",
};

export const LeadStatus = {
  HOT: "hot",
  WARM: "warm",
  COLD: "cold",
} as const;
export type LeadStatus = (typeof LeadStatus)[keyof typeof LeadStatus];

export const PropertyStatus = {
  AVAILABLE: "available",
  RESERVED: "reserved",
  SOLD: "sold",
} as const;
export type PropertyStatus = (typeof PropertyStatus)[keyof typeof PropertyStatus];

export const ProjectStatus = {
  DRAFT: "draft",
  ACTIVE: "active",
  INACTIVE: "inactive",
} as const;
export type ProjectStatus = (typeof ProjectStatus)[keyof typeof ProjectStatus];

export const ActivityType = {
  CALL: "call",
  EMAIL: "email",
  WHATSAPP: "whatsapp",
  NOTE: "note",
  MEETING: "meeting",
  SYSTEM: "system",
} as const;
export type ActivityType = (typeof ActivityType)[keyof typeof ActivityType];

export const MessageChannel = {
  WHATSAPP: "whatsapp",
  EMAIL: "email",
  SMS: "sms",
} as const;
export type MessageChannel = (typeof MessageChannel)[keyof typeof MessageChannel];

export const MessageDirection = {
  INBOUND: "inbound",
  OUTBOUND: "outbound",
} as const;
export type MessageDirection =
  (typeof MessageDirection)[keyof typeof MessageDirection];

export const MessageStatus = {
  SENT: "sent",
  DELIVERED: "delivered",
  READ: "read",
  FAILED: "failed",
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
