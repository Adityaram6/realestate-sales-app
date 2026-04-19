import {
  CampaignAudienceStatus,
  CampaignMessageStatus,
  CampaignStatus,
  CampaignType,
  MessageChannel,
  type Campaign,
  type CampaignMessage,
} from "@realestate/shared";

const now = Date.now();
const day = 1000 * 60 * 60 * 24;

export const campaignStore: Campaign[] = [
  {
    id: "camp-1",
    name: "Green Valley — Weekend Open House",
    description: "Promote Saturday site visit for Green Valley plots.",
    projectId: "prj-1",
    type: CampaignType.WHATSAPP_BLAST,
    status: CampaignStatus.DRAFT,
    audienceFilter: { status: "WARM", minScore: 50 },
    createdById: "u-1",
    createdAt: new Date(now - day * 2).toISOString(),
    updatedAt: new Date(now - day * 1).toISOString(),
  },
  {
    id: "camp-2",
    name: "Skyline Heights — Pre-launch Nurture",
    description: "Educate premium leads ahead of Tower 3 launch.",
    projectId: "prj-2",
    type: CampaignType.EMAIL_BLAST,
    status: CampaignStatus.COMPLETED,
    createdById: "u-1",
    createdAt: new Date(now - day * 10).toISOString(),
    updatedAt: new Date(now - day * 6).toISOString(),
  },
];

export interface StoredAudienceMember {
  id: string;
  campaignId: string;
  leadId: string;
  status: CampaignAudienceStatus;
  sentAt?: string;
  respondedAt?: string;
  errorMessage?: string;
}

export const campaignAudienceStore: StoredAudienceMember[] = [
  {
    id: "aud-1",
    campaignId: "camp-1",
    leadId: "lead-1",
    status: CampaignAudienceStatus.PENDING,
  },
  {
    id: "aud-2",
    campaignId: "camp-1",
    leadId: "lead-4",
    status: CampaignAudienceStatus.PENDING,
  },
  {
    id: "aud-3",
    campaignId: "camp-2",
    leadId: "lead-2",
    status: CampaignAudienceStatus.SENT,
    sentAt: new Date(now - day * 6).toISOString(),
  },
];

export const campaignMessageStore: CampaignMessage[] = [
  {
    id: "cmsg-1",
    campaignId: "camp-1",
    channel: MessageChannel.WHATSAPP,
    content:
      "Hi {{name}}, our Green Valley site visit is this Saturday 11am. Plots A-01 and A-02 are still open. Want me to reserve a slot?",
    status: CampaignMessageStatus.DRAFT,
    createdAt: new Date(now - day * 2).toISOString(),
  },
  {
    id: "cmsg-2",
    campaignId: "camp-2",
    channel: MessageChannel.EMAIL,
    content:
      "Subject: Skyline Heights Tower 3 — priority access\n\nHi,\n\nWe're opening Tower 3 bookings next month. As a premium prospect you get first pick of east-facing units. Reply for the price sheet.",
    status: CampaignMessageStatus.SENT,
    createdAt: new Date(now - day * 8).toISOString(),
  },
];
