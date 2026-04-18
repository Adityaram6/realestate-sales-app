import {
  CampaignAudienceStatus,
  CampaignMessageStatus,
  CampaignStatus,
  CampaignType,
  MessageChannel,
  MessageDirection,
  MessageStatus,
  type AudienceFilter,
  type CampaignAudienceMember,
  type CampaignMessage,
  type CampaignWithRelations,
  type Lead,
} from "@realestate/shared";
import type { MockHandler } from "@/mocks/handlers";
import {
  campaignStore,
  campaignAudienceStore,
  campaignMessageStore,
  type StoredAudienceMember,
} from "@/mocks/fixtures/campaigns";
import { leadStore } from "@/mocks/fixtures/leads";
import { projectStore } from "@/mocks/fixtures/projects";
import { messageStore } from "@/mocks/fixtures/messages";
import type {
  AddCampaignMessagePayload,
  AssignAudiencePayload,
  CreateCampaignPayload,
  GenerateContentPayload,
  UpdateCampaignPayload,
} from "@/lib/campaigns-api";

function httpError(status: number, message: string) {
  return Object.assign(new Error(message), { status });
}

function decorate(campaign: (typeof campaignStore)[number]): CampaignWithRelations {
  const project = projectStore.find((p) => p.id === campaign.projectId);
  const audience = campaignAudienceStore.filter(
    (a) => a.campaignId === campaign.id,
  );
  const messages = campaignMessageStore.filter(
    (m) => m.campaignId === campaign.id,
  );
  const metrics = {
    pending: audience.filter((a) => a.status === CampaignAudienceStatus.PENDING)
      .length,
    sent: audience.filter(
      (a) =>
        a.status === CampaignAudienceStatus.SENT ||
        a.status === CampaignAudienceStatus.DELIVERED,
    ).length,
    responded: audience.filter(
      (a) => a.status === CampaignAudienceStatus.RESPONDED,
    ).length,
    failed: audience.filter((a) => a.status === CampaignAudienceStatus.FAILED)
      .length,
  };
  return {
    ...campaign,
    projectName: project?.name,
    audienceSize: audience.length,
    messages,
    metrics,
  };
}

function resolveFilterLeads(filter: AudienceFilter): Lead[] {
  return leadStore.filter((l) => {
    if (filter.status && l.status !== filter.status) return false;
    if (filter.minScore != null && (l.score ?? 0) < filter.minScore) return false;
    if (filter.source && (l.source ?? "").toLowerCase() !== filter.source.toLowerCase()) {
      return false;
    }
    if (filter.tags?.length) {
      const has = filter.tags.some((t) => l.tags.includes(t));
      if (!has) return false;
    }
    // projectId filter would require opportunities — skipped in mock.
    return true;
  });
}

function channelMatchesCampaign(
  type: CampaignType,
  channel: MessageChannel,
): boolean {
  switch (type) {
    case CampaignType.WHATSAPP_BLAST:
      return channel === MessageChannel.WHATSAPP;
    case CampaignType.EMAIL_BLAST:
      return channel === MessageChannel.EMAIL;
    case CampaignType.MULTI_CHANNEL:
      return true;
    default:
      return false;
  }
}

export const campaignMockHandlers: MockHandler[] = [
  {
    method: "get",
    path: "/campaigns",
    handler: async ({ query }) => {
      let list = [...campaignStore];
      if (query.status) list = list.filter((c) => c.status === query.status);
      if (query.type) list = list.filter((c) => c.type === query.type);
      if (query.projectId)
        list = list.filter((c) => c.projectId === query.projectId);
      if (query.search) {
        const needle = query.search.toLowerCase();
        list = list.filter(
          (c) =>
            c.name.toLowerCase().includes(needle) ||
            (c.description ?? "").toLowerCase().includes(needle),
        );
      }
      list.sort(
        (a, b) =>
          new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
      );
      return { data: list.map(decorate) };
    },
  },
  {
    method: "get",
    path: "/campaigns/:id",
    handler: async ({ params }) => {
      const campaign = campaignStore.find((c) => c.id === params.id);
      if (!campaign) throw httpError(404, "Campaign not found");
      return { data: decorate(campaign) };
    },
  },
  {
    method: "post",
    path: "/campaigns",
    handler: async ({ body }) => {
      const payload = body as CreateCampaignPayload;
      if (!payload?.name) throw httpError(400, "Name is required");
      if (!payload?.type) throw httpError(400, "Type is required");
      const now = new Date().toISOString();
      const campaign: (typeof campaignStore)[number] = {
        id: `camp-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        name: payload.name,
        description: payload.description,
        projectId: payload.projectId,
        type: payload.type,
        status: CampaignStatus.DRAFT,
        audienceFilter: payload.audienceFilter,
        startDate: payload.startDate,
        endDate: payload.endDate,
        createdById: "u-1",
        createdAt: now,
        updatedAt: now,
      };
      campaignStore.push(campaign);
      return { data: campaign, status: 201 };
    },
  },
  {
    method: "patch",
    path: "/campaigns/:id",
    handler: async ({ params, body }) => {
      const idx = campaignStore.findIndex((c) => c.id === params.id);
      if (idx === -1) throw httpError(404, "Campaign not found");
      const payload = body as UpdateCampaignPayload;
      const updated = {
        ...campaignStore[idx]!,
        ...payload,
        id: campaignStore[idx]!.id,
        updatedAt: new Date().toISOString(),
      };
      campaignStore[idx] = updated;
      return { data: updated };
    },
  },
  {
    method: "delete",
    path: "/campaigns/:id",
    handler: async ({ params }) => {
      const idx = campaignStore.findIndex((c) => c.id === params.id);
      if (idx === -1) throw httpError(404, "Campaign not found");
      campaignStore.splice(idx, 1);
      // Cascade delete audience + messages
      for (let i = campaignAudienceStore.length - 1; i >= 0; i--) {
        if (campaignAudienceStore[i]!.campaignId === params.id) {
          campaignAudienceStore.splice(i, 1);
        }
      }
      for (let i = campaignMessageStore.length - 1; i >= 0; i--) {
        if (campaignMessageStore[i]!.campaignId === params.id) {
          campaignMessageStore.splice(i, 1);
        }
      }
      return { data: { success: true } };
    },
  },
  {
    method: "get",
    path: "/campaigns/:id/audience",
    handler: async ({ params }) => {
      const result: CampaignAudienceMember[] = [];
      for (const m of campaignAudienceStore) {
        if (m.campaignId !== params.id) continue;
        const lead = leadStore.find((l) => l.id === m.leadId);
        if (!lead) continue;
        const entry: CampaignAudienceMember = {
          id: m.id,
          campaignId: m.campaignId,
          leadId: m.leadId,
          leadName: lead.name,
          leadPhone: lead.phone,
          status: m.status,
        };
        if (lead.email) entry.leadEmail = lead.email;
        if (m.sentAt) entry.sentAt = m.sentAt;
        if (m.respondedAt) entry.respondedAt = m.respondedAt;
        if (m.errorMessage) entry.errorMessage = m.errorMessage;
        result.push(entry);
      }
      result.sort((a, b) => a.leadName.localeCompare(b.leadName));
      return { data: result };
    },
  },
  {
    method: "post",
    path: "/campaigns/:id/audience",
    handler: async ({ params, body }) => {
      const campaignId = params.id!;
      if (!campaignStore.find((c) => c.id === campaignId)) {
        throw httpError(404, "Campaign not found");
      }
      const payload = body as AssignAudiencePayload;
      let leadIds = payload.leadIds ?? [];
      if (payload.filter) {
        const matched = resolveFilterLeads(payload.filter);
        leadIds = [...new Set([...leadIds, ...matched.map((l) => l.id)])];
      }
      if (leadIds.length === 0) {
        throw httpError(
          400,
          "No leads to assign — pass leadIds or a non-empty filter.",
        );
      }
      const existing = new Set(
        campaignAudienceStore
          .filter((a) => a.campaignId === campaignId)
          .map((a) => a.leadId),
      );
      let added = 0;
      for (const leadId of leadIds) {
        if (existing.has(leadId)) continue;
        const member: StoredAudienceMember = {
          id: `aud-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          campaignId,
          leadId,
          status: CampaignAudienceStatus.PENDING,
        };
        campaignAudienceStore.push(member);
        added += 1;
      }
      return {
        data: { added, alreadyPresent: leadIds.length - added },
      };
    },
  },
  {
    method: "delete",
    path: "/campaigns/:id/audience/:leadId",
    handler: async ({ params }) => {
      for (let i = campaignAudienceStore.length - 1; i >= 0; i--) {
        const a = campaignAudienceStore[i]!;
        if (a.campaignId === params.id && a.leadId === params.leadId) {
          campaignAudienceStore.splice(i, 1);
        }
      }
      return { data: { success: true } };
    },
  },
  {
    method: "post",
    path: "/campaigns/:id/messages",
    handler: async ({ params, body }) => {
      const campaignId = params.id!;
      if (!campaignStore.find((c) => c.id === campaignId)) {
        throw httpError(404, "Campaign not found");
      }
      const payload = body as AddCampaignMessagePayload;
      const msg: CampaignMessage = {
        id: `cmsg-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        campaignId,
        channel: payload.channel,
        content: payload.content,
        mediaUrl: payload.mediaUrl,
        scheduledAt: payload.scheduledAt,
        status: CampaignMessageStatus.DRAFT,
        createdAt: new Date().toISOString(),
      };
      campaignMessageStore.push(msg);
      return { data: msg, status: 201 };
    },
  },
  {
    method: "delete",
    path: "/campaigns/messages/:messageId",
    handler: async ({ params }) => {
      const idx = campaignMessageStore.findIndex(
        (m) => m.id === params.messageId,
      );
      if (idx === -1) throw httpError(404, "Campaign message not found");
      if (campaignMessageStore[idx]!.status === CampaignMessageStatus.SENT) {
        throw httpError(400, "Can't delete a sent message");
      }
      campaignMessageStore.splice(idx, 1);
      return { data: { success: true } };
    },
  },
  {
    method: "post",
    path: "/campaigns/:id/execute",
    handler: async ({ params, body }) => {
      const campaign = campaignStore.find((c) => c.id === params.id);
      if (!campaign) throw httpError(404, "Campaign not found");
      if (campaign.type === CampaignType.SOCIAL) {
        throw httpError(400, "Social campaigns use a different endpoint");
      }
      const payload = (body ?? {}) as { dryRun?: boolean };
      const dryRun = Boolean(payload.dryRun);

      const deliverable = campaignMessageStore.filter(
        (m) =>
          m.campaignId === campaign.id &&
          m.status !== CampaignMessageStatus.SENT,
      );
      if (deliverable.length === 0) {
        throw httpError(
          400,
          "Campaign has no deliverable messages. Add at least one first.",
        );
      }

      const audience = campaignAudienceStore.filter(
        (a) => a.campaignId === campaign.id,
      );

      const result = {
        campaignId: campaign.id,
        dryRun,
        totalAudience: audience.length,
        queuedMessages: 0,
        skipped: 0,
        errors: [] as Array<{ leadId: string; reason: string }>,
      };

      for (const member of audience) {
        const lead = leadStore.find((l) => l.id === member.leadId);
        if (!lead) continue;
        if (member.status === CampaignAudienceStatus.SENT) {
          result.skipped += 1;
          continue;
        }
        if (!lead.consentGiven) {
          result.errors.push({
            leadId: lead.id,
            reason: "No DPDP consent on file",
          });
          continue;
        }
        for (const msg of deliverable) {
          if (!channelMatchesCampaign(campaign.type, msg.channel)) continue;
          if (!dryRun) {
            messageStore.push({
              id: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
              leadId: lead.id,
              channel: msg.channel,
              direction: MessageDirection.OUTBOUND,
              messageText: msg.content,
              status: MessageStatus.SENT,
              sentBy: "u-1",
              createdAt: new Date().toISOString(),
            });
            member.status = CampaignAudienceStatus.SENT;
            member.sentAt = new Date().toISOString();
          }
          result.queuedMessages += 1;
        }
      }

      if (!dryRun) {
        for (const msg of deliverable) {
          msg.status = CampaignMessageStatus.SENT;
        }
        campaign.status = CampaignStatus.ACTIVE;
        campaign.updatedAt = new Date().toISOString();
      }

      return { data: result };
    },
  },
  {
    method: "get",
    path: "/campaigns/:id/analytics",
    handler: async ({ params }) => {
      const campaign = campaignStore.find((c) => c.id === params.id);
      if (!campaign) throw httpError(404, "Campaign not found");
      const audience = campaignAudienceStore.filter(
        (a) => a.campaignId === campaign.id,
      );
      const messages = campaignMessageStore.filter(
        (m) => m.campaignId === campaign.id,
      );
      const funnel = {
        pending: 0,
        sent: 0,
        delivered: 0,
        responded: 0,
        failed: 0,
      };
      for (const a of audience) {
        switch (a.status) {
          case CampaignAudienceStatus.PENDING:
            funnel.pending += 1;
            break;
          case CampaignAudienceStatus.SENT:
            funnel.sent += 1;
            break;
          case CampaignAudienceStatus.DELIVERED:
            funnel.delivered += 1;
            break;
          case CampaignAudienceStatus.RESPONDED:
            funnel.responded += 1;
            break;
          case CampaignAudienceStatus.FAILED:
            funnel.failed += 1;
            break;
        }
      }
      const audienceSize = audience.length;
      const touched = funnel.sent + funnel.delivered + funnel.responded;
      const finalised = touched + funnel.failed;
      return {
        data: {
          campaignId: campaign.id,
          audienceSize,
          deliveryFunnel: funnel,
          conversion: {
            deliveredPercent:
              audienceSize === 0
                ? 0
                : Math.round((touched / audienceSize) * 1000) / 10,
            responseRatePercent:
              touched === 0
                ? 0
                : Math.round((funnel.responded / touched) * 1000) / 10,
            failureRatePercent:
              finalised === 0
                ? 0
                : Math.round((funnel.failed / finalised) * 1000) / 10,
          },
          topVariations: messages.map((m) => ({
            messageId: m.id,
            channel: m.channel,
            contentPreview:
              m.content.slice(0, 80) + (m.content.length > 80 ? "…" : ""),
            sent: touched,
          })),
        },
      };
    },
  },
  {
    method: "post",
    path: "/ai/generate-content",
    handler: async ({ body }) => {
      const payload = body as GenerateContentPayload;
      const project = projectStore.find((p) => p.id === payload.projectId);
      if (!project) throw httpError(404, "Project not found");

      const variations = buildContentVariations(project, payload);
      return {
        data: {
          variations,
          storedInteractionId: `ai-int-${Date.now()}`,
        },
      };
    },
  },
];

function buildContentVariations(
  project: (typeof projectStore)[number],
  payload: GenerateContentPayload,
) {
  const platform = payload.platform;
  const tag = project.tags[0] ?? project.propertyType;
  const loc = project.locationText;
  const headlines: Record<GenerateContentPayload["platform"], string> = {
    facebook: `🏡 ${project.name} in ${loc}. ${project.propertyType} with ${project.tags.slice(0, 2).join(" & ") || "unmatched value"}. Tap to know more.`,
    instagram: `🏡 ${project.name} · ${loc}\n${project.propertyType} you'll love coming home to. ${project.tags.slice(0, 2).join(" & ") || ""}`,
    linkedin: `${project.name} is now open for investors in ${loc}. A ${project.propertyType.toLowerCase()} designed with ${project.tags.slice(0, 2).join(", ") || "long-term value"} at its core.`,
    whatsapp_blast: `Hi — quick update on ${project.name} at ${loc}. ${project.propertyType}. Want the brochure?`,
    email_blast: `Subject: ${project.name} — ${project.propertyType} in ${loc}\n\nHi there,\n\nWe just opened bookings at ${project.name}. Key highlights: ${project.tags.slice(0, 3).join(", ") || "DTCP approved, premium layout"}.\n\nReply to this email for the full layout + pricing sheet.\n\n— Team`,
  };
  const story = `${platform === "email_blast" ? "" : "✨ "}Imagine waking up to ${tag.toLowerCase()} in ${loc}. ${project.name} — built for families who want more than just four walls.${ctaFor(platform)}`;
  const benefits = `Why ${project.name}? ${(project.tags.length ? project.tags : ["DTCP Approved", "Gated", "Investor Pick"]).slice(0, 3).join(" · ")}. Located in ${loc}. ${ctaFor(platform).trim()}`;

  const hashtags = ["facebook", "instagram", "linkedin"].includes(platform)
    ? buildHashtags(project, platform)
    : undefined;

  return [
    {
      approach: "headline_first" as const,
      content: headlines[platform],
      hashtags,
      charCount: headlines[platform].length,
    },
    {
      approach: "story_first" as const,
      content: story,
      hashtags,
      charCount: story.length,
    },
    {
      approach: "benefit_first" as const,
      content: benefits,
      hashtags,
      charCount: benefits.length,
    },
  ];
}

function ctaFor(platform: GenerateContentPayload["platform"]): string {
  switch (platform) {
    case "facebook":
    case "instagram":
      return " Book a visit this weekend — link in bio.";
    case "linkedin":
      return " Comment or DM for a detailed brief.";
    case "whatsapp_blast":
      return " Reply YES for brochure + price sheet.";
    case "email_blast":
      return " Reply to this email to schedule a call.";
  }
}

function buildHashtags(
  project: (typeof projectStore)[number],
  platform: GenerateContentPayload["platform"],
): string[] {
  const base = [
    project.name.replace(/\s+/g, ""),
    project.locationText.split(",")[0]?.replace(/\s+/g, "") ?? "",
    project.propertyType.replace(/\s+/g, ""),
    "RealEstate",
  ].filter(Boolean);
  if (platform === "instagram") {
    base.push("DreamHome", "InvestmentOpportunity", "PropertyGoals");
  } else if (platform === "linkedin") {
    base.push("RealEstateInvesting", "PropertyTrends");
  }
  return base.map((h) => `#${h}`);
}
