import type { LeadStatus, MessageChannel } from "../enums";

// Values match the Prisma enum (UPPERCASE) to stay aligned with wire format.
// See packages/shared/src/enums/index.ts for the reasoning.

export const CampaignType = {
  WHATSAPP_BLAST: "WHATSAPP_BLAST",
  EMAIL_BLAST: "EMAIL_BLAST",
  SOCIAL: "SOCIAL",
  MULTI_CHANNEL: "MULTI_CHANNEL",
} as const;
export type CampaignType = (typeof CampaignType)[keyof typeof CampaignType];

export const CAMPAIGN_TYPE_LABEL: Record<CampaignType, string> = {
  WHATSAPP_BLAST: "WhatsApp blast",
  EMAIL_BLAST: "Email blast",
  SOCIAL: "Social post",
  MULTI_CHANNEL: "Multi-channel",
};

export const CampaignStatus = {
  DRAFT: "DRAFT",
  SCHEDULED: "SCHEDULED",
  ACTIVE: "ACTIVE",
  PAUSED: "PAUSED",
  COMPLETED: "COMPLETED",
  FAILED: "FAILED",
} as const;
export type CampaignStatus = (typeof CampaignStatus)[keyof typeof CampaignStatus];

export const CampaignAudienceStatus = {
  PENDING: "PENDING",
  SENT: "SENT",
  DELIVERED: "DELIVERED",
  RESPONDED: "RESPONDED",
  FAILED: "FAILED",
  UNSUBSCRIBED: "UNSUBSCRIBED",
} as const;
export type CampaignAudienceStatus =
  (typeof CampaignAudienceStatus)[keyof typeof CampaignAudienceStatus];

export const CampaignMessageStatus = {
  DRAFT: "DRAFT",
  SCHEDULED: "SCHEDULED",
  SENT: "SENT",
  FAILED: "FAILED",
} as const;
export type CampaignMessageStatus =
  (typeof CampaignMessageStatus)[keyof typeof CampaignMessageStatus];

export const SocialPlatform = {
  FACEBOOK: "FACEBOOK",
  INSTAGRAM: "INSTAGRAM",
  LINKEDIN: "LINKEDIN",
} as const;
export type SocialPlatform = (typeof SocialPlatform)[keyof typeof SocialPlatform];

export const SOCIAL_PLATFORM_LABEL: Record<SocialPlatform, string> = {
  FACEBOOK: "Facebook",
  INSTAGRAM: "Instagram",
  LINKEDIN: "LinkedIn",
};

export const SocialPostStatus = {
  DRAFT: "DRAFT",
  SCHEDULED: "SCHEDULED",
  PUBLISHED: "PUBLISHED",
  FAILED: "FAILED",
} as const;
export type SocialPostStatus =
  (typeof SocialPostStatus)[keyof typeof SocialPostStatus];

export interface AudienceFilter {
  status?: LeadStatus;
  tags?: string[];
  projectId?: string;
  minScore?: number;
  source?: string;
}

export interface Campaign {
  id: string;
  name: string;
  description?: string;
  projectId?: string;
  type: CampaignType;
  status: CampaignStatus;
  audienceFilter?: AudienceFilter;
  startDate?: string;
  endDate?: string;
  createdById: string;
  createdAt: string;
  updatedAt: string;
}

export interface CampaignAudienceMember {
  id: string;
  campaignId: string;
  leadId: string;
  leadName: string;
  leadPhone: string;
  leadEmail?: string;
  status: CampaignAudienceStatus;
  sentAt?: string;
  respondedAt?: string;
  errorMessage?: string;
}

export interface CampaignMessage {
  id: string;
  campaignId: string;
  channel: MessageChannel;
  content: string;
  mediaUrl?: string;
  scheduledAt?: string;
  status: CampaignMessageStatus;
  createdAt: string;
}

export interface CampaignWithRelations extends Campaign {
  projectName?: string;
  audienceSize: number;
  messages: CampaignMessage[];
  metrics: {
    pending: number;
    sent: number;
    responded: number;
    failed: number;
  };
}

export interface SocialPost {
  id: string;
  campaignId?: string;
  platform: SocialPlatform;
  content: string;
  mediaUrl?: string;
  scheduledAt?: string;
  publishedAt?: string;
  status: SocialPostStatus;
  createdAt: string;
}
