import type { LeadStatus, MessageChannel } from "../enums";

export const CampaignType = {
  WHATSAPP_BLAST: "whatsapp_blast",
  EMAIL_BLAST: "email_blast",
  SOCIAL: "social",
  MULTI_CHANNEL: "multi_channel",
} as const;
export type CampaignType = (typeof CampaignType)[keyof typeof CampaignType];

export const CAMPAIGN_TYPE_LABEL: Record<CampaignType, string> = {
  whatsapp_blast: "WhatsApp blast",
  email_blast: "Email blast",
  social: "Social post",
  multi_channel: "Multi-channel",
};

export const CampaignStatus = {
  DRAFT: "draft",
  SCHEDULED: "scheduled",
  ACTIVE: "active",
  PAUSED: "paused",
  COMPLETED: "completed",
  FAILED: "failed",
} as const;
export type CampaignStatus = (typeof CampaignStatus)[keyof typeof CampaignStatus];

export const CampaignAudienceStatus = {
  PENDING: "pending",
  SENT: "sent",
  DELIVERED: "delivered",
  RESPONDED: "responded",
  FAILED: "failed",
  UNSUBSCRIBED: "unsubscribed",
} as const;
export type CampaignAudienceStatus =
  (typeof CampaignAudienceStatus)[keyof typeof CampaignAudienceStatus];

export const CampaignMessageStatus = {
  DRAFT: "draft",
  SCHEDULED: "scheduled",
  SENT: "sent",
  FAILED: "failed",
} as const;
export type CampaignMessageStatus =
  (typeof CampaignMessageStatus)[keyof typeof CampaignMessageStatus];

export const SocialPlatform = {
  FACEBOOK: "facebook",
  INSTAGRAM: "instagram",
  LINKEDIN: "linkedin",
} as const;
export type SocialPlatform = (typeof SocialPlatform)[keyof typeof SocialPlatform];

export const SOCIAL_PLATFORM_LABEL: Record<SocialPlatform, string> = {
  facebook: "Facebook",
  instagram: "Instagram",
  linkedin: "LinkedIn",
};

export const SocialPostStatus = {
  DRAFT: "draft",
  SCHEDULED: "scheduled",
  PUBLISHED: "published",
  FAILED: "failed",
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
