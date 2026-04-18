import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import {
  CampaignAudienceStatus,
  CampaignMessageStatus,
  CampaignStatus,
  CampaignType,
  MessageChannel,
  MessageDirection,
  MessageStatus,
  Prisma,
  type Campaign,
  type CampaignMessage,
  type Lead,
} from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import {
  AddCampaignMessageDto,
  AssignAudienceDto,
  AudienceFilterDto,
  CampaignListFiltersDto,
  CreateCampaignDto,
  ExecuteCampaignDto,
  UpdateCampaignDto,
} from "./dto/campaign.dto";

interface CampaignMetrics {
  pending: number;
  sent: number;
  responded: number;
  failed: number;
}

export interface CampaignWithRelations extends Campaign {
  projectName?: string;
  audienceSize: number;
  messages: CampaignMessage[];
  metrics: CampaignMetrics;
}

export interface ExecuteResult {
  campaignId: string;
  dryRun: boolean;
  totalAudience: number;
  queuedMessages: number;
  skipped: number;
  errors: Array<{ leadId: string; reason: string }>;
}

export interface CampaignAnalytics {
  campaignId: string;
  audienceSize: number;
  deliveryFunnel: {
    pending: number;
    sent: number;
    delivered: number;
    responded: number;
    failed: number;
  };
  conversion: {
    deliveredPercent: number;
    responseRatePercent: number;
    failureRatePercent: number;
  };
  topVariations: Array<{
    messageId: string;
    channel: string;
    contentPreview: string;
    sent: number;
  }>;
}

@Injectable()
export class CampaignsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(filters: CampaignListFiltersDto): Promise<CampaignWithRelations[]> {
    const where: Prisma.CampaignWhereInput = {};
    if (filters.status) where.status = filters.status;
    if (filters.type) where.type = filters.type;
    if (filters.projectId) where.projectId = filters.projectId;
    if (filters.search) {
      where.OR = [
        { name: { contains: filters.search, mode: "insensitive" } },
        { description: { contains: filters.search, mode: "insensitive" } },
      ];
    }

    const campaigns = await this.prisma.campaign.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      include: {
        project: { select: { name: true } },
        messages: true,
        _count: { select: { audience: true } },
      },
    });

    return Promise.all(campaigns.map((c) => this.decorate(c)));
  }

  async get(id: string): Promise<CampaignWithRelations> {
    const campaign = await this.prisma.campaign.findUnique({
      where: { id },
      include: {
        project: { select: { name: true } },
        messages: { orderBy: { createdAt: "asc" } },
        _count: { select: { audience: true } },
      },
    });
    if (!campaign) throw new NotFoundException("Campaign not found");
    return this.decorate(campaign);
  }

  async create(userId: string, dto: CreateCampaignDto): Promise<Campaign> {
    return this.prisma.campaign.create({
      data: {
        name: dto.name,
        description: dto.description,
        projectId: dto.projectId,
        type: dto.type,
        audienceFilter: dto.audienceFilter
          ? (dto.audienceFilter as unknown as Prisma.InputJsonValue)
          : undefined,
        startDate: dto.startDate ? new Date(dto.startDate) : undefined,
        endDate: dto.endDate ? new Date(dto.endDate) : undefined,
        status: CampaignStatus.DRAFT,
        createdById: userId,
      },
    });
  }

  async update(id: string, dto: UpdateCampaignDto): Promise<Campaign> {
    await this.ensureExists(id);
    return this.prisma.campaign.update({
      where: { id },
      data: {
        name: dto.name,
        description: dto.description,
        projectId: dto.projectId,
        type: dto.type,
        status: dto.status,
        audienceFilter: dto.audienceFilter
          ? (dto.audienceFilter as unknown as Prisma.InputJsonValue)
          : undefined,
        startDate: dto.startDate ? new Date(dto.startDate) : undefined,
        endDate: dto.endDate ? new Date(dto.endDate) : undefined,
      },
    });
  }

  async remove(id: string): Promise<void> {
    await this.ensureExists(id);
    await this.prisma.campaign.delete({ where: { id } });
  }

  async listAudience(campaignId: string) {
    await this.ensureExists(campaignId);
    const rows = await this.prisma.campaignAudience.findMany({
      where: { campaignId },
      include: {
        lead: {
          select: { id: true, name: true, phone: true, email: true },
        },
      },
      orderBy: { lead: { name: "asc" } },
    });
    return rows.map((r) => ({
      id: r.id,
      campaignId: r.campaignId,
      leadId: r.leadId,
      leadName: r.lead.name,
      leadPhone: r.lead.phone,
      leadEmail: r.lead.email ?? undefined,
      status: r.status,
      sentAt: r.sentAt?.toISOString(),
      respondedAt: r.respondedAt?.toISOString(),
      errorMessage: r.errorMessage ?? undefined,
    }));
  }

  /**
   * Assign leads to audience. Can pass explicit leadIds OR a filter.
   * Skips leads already in the audience (idempotent).
   */
  async assignAudience(
    campaignId: string,
    dto: AssignAudienceDto,
  ): Promise<{ added: number; alreadyPresent: number }> {
    await this.ensureExists(campaignId);

    let leadIds = dto.leadIds ?? [];
    if (dto.filter) {
      const matched = await this.resolveFilterLeads(dto.filter);
      leadIds = [...new Set([...leadIds, ...matched.map((l) => l.id)])];
    }
    if (leadIds.length === 0) {
      throw new BadRequestException(
        "No leads to assign — pass leadIds or a non-empty filter.",
      );
    }

    const existing = await this.prisma.campaignAudience.findMany({
      where: { campaignId, leadId: { in: leadIds } },
      select: { leadId: true },
    });
    const existingSet = new Set(existing.map((e) => e.leadId));
    const newIds = leadIds.filter((id) => !existingSet.has(id));

    if (newIds.length > 0) {
      await this.prisma.campaignAudience.createMany({
        data: newIds.map((leadId) => ({
          campaignId,
          leadId,
          status: CampaignAudienceStatus.PENDING,
        })),
      });
    }

    return { added: newIds.length, alreadyPresent: existingSet.size };
  }

  async removeAudienceMember(
    campaignId: string,
    leadId: string,
  ): Promise<void> {
    await this.prisma.campaignAudience.deleteMany({
      where: { campaignId, leadId },
    });
  }

  async addMessage(
    campaignId: string,
    dto: AddCampaignMessageDto,
  ): Promise<CampaignMessage> {
    await this.ensureExists(campaignId);
    return this.prisma.campaignMessage.create({
      data: {
        campaignId,
        channel: dto.channel,
        content: dto.content,
        mediaUrl: dto.mediaUrl,
        scheduledAt: dto.scheduledAt ? new Date(dto.scheduledAt) : undefined,
        status: dto.status ?? CampaignMessageStatus.DRAFT,
      },
    });
  }

  async deleteMessage(messageId: string): Promise<void> {
    const existing = await this.prisma.campaignMessage.findUnique({
      where: { id: messageId },
    });
    if (!existing) throw new NotFoundException("Campaign message not found");
    if (existing.status === CampaignMessageStatus.SENT) {
      throw new BadRequestException("Can't delete a sent message.");
    }
    await this.prisma.campaignMessage.delete({ where: { id: messageId } });
  }

  /**
   * Simulated execution: iterate audience, create Message rows for each lead
   * per direct-channel message (WhatsApp/email). Skip leads already marked
   * SENT in a prior run. Updates audience.status + message.status.
   *
   * Real Phase 2 replaces this with a BullMQ queue + worker that calls the
   * actual Meta/SMTP providers. The endpoint shape stays the same.
   */
  async execute(
    userId: string,
    campaignId: string,
    dto: ExecuteCampaignDto,
  ): Promise<ExecuteResult> {
    const campaign = await this.prisma.campaign.findUnique({
      where: { id: campaignId },
      include: { messages: true, audience: { include: { lead: true } } },
    });
    if (!campaign) throw new NotFoundException("Campaign not found");

    if (
      campaign.type === CampaignType.SOCIAL
    ) {
      throw new BadRequestException(
        "Social campaigns aren't executed via this endpoint — use /social/posts.",
      );
    }

    const deliverableMessages = campaign.messages.filter(
      (m) => m.status !== CampaignMessageStatus.SENT,
    );
    if (deliverableMessages.length === 0) {
      throw new BadRequestException(
        "Campaign has no deliverable messages. Add at least one before executing.",
      );
    }

    const result: ExecuteResult = {
      campaignId,
      dryRun: Boolean(dto.dryRun),
      totalAudience: campaign.audience.length,
      queuedMessages: 0,
      skipped: 0,
      errors: [],
    };

    for (const member of campaign.audience) {
      if (member.status === CampaignAudienceStatus.SENT) {
        result.skipped += 1;
        continue;
      }
      if (!member.lead.consentGiven) {
        result.errors.push({
          leadId: member.leadId,
          reason: "No DPDP consent on file",
        });
        continue;
      }

      for (const msg of deliverableMessages) {
        const channelOk = this.channelMatchesCampaign(campaign.type, msg.channel);
        if (!channelOk) continue;

        if (!dto.dryRun) {
          await this.prisma.$transaction([
            this.prisma.message.create({
              data: {
                leadId: member.leadId,
                channel: msg.channel,
                direction: MessageDirection.OUTBOUND,
                messageText: msg.content,
                mediaUrl: msg.mediaUrl,
                status: MessageStatus.SENT,
                sentById: userId,
              },
            }),
            this.prisma.campaignAudience.update({
              where: { id: member.id },
              data: {
                status: CampaignAudienceStatus.SENT,
                sentAt: new Date(),
              },
            }),
          ]);
        }
        result.queuedMessages += 1;
      }
    }

    if (!dto.dryRun && deliverableMessages.length > 0) {
      await this.prisma.campaignMessage.updateMany({
        where: { id: { in: deliverableMessages.map((m) => m.id) } },
        data: { status: CampaignMessageStatus.SENT },
      });
      await this.prisma.campaign.update({
        where: { id: campaignId },
        data: { status: CampaignStatus.ACTIVE },
      });
    }

    return result;
  }

  async analytics(id: string): Promise<CampaignAnalytics> {
    await this.ensureExists(id);

    const [audienceGroups, messages] = await Promise.all([
      this.prisma.campaignAudience.groupBy({
        by: ["status"],
        where: { campaignId: id },
        _count: { status: true },
      }),
      this.prisma.campaignMessage.findMany({
        where: { campaignId: id },
        orderBy: { createdAt: "asc" },
      }),
    ]);

    const funnel = {
      pending: 0,
      sent: 0,
      delivered: 0,
      responded: 0,
      failed: 0,
    };
    for (const g of audienceGroups) {
      switch (g.status) {
        case CampaignAudienceStatus.PENDING:
          funnel.pending = g._count.status;
          break;
        case CampaignAudienceStatus.SENT:
          funnel.sent = g._count.status;
          break;
        case CampaignAudienceStatus.DELIVERED:
          funnel.delivered = g._count.status;
          break;
        case CampaignAudienceStatus.RESPONDED:
          funnel.responded = g._count.status;
          break;
        case CampaignAudienceStatus.FAILED:
          funnel.failed = g._count.status;
          break;
      }
    }

    const audienceSize =
      funnel.pending +
      funnel.sent +
      funnel.delivered +
      funnel.responded +
      funnel.failed;
    const touched = funnel.sent + funnel.delivered + funnel.responded;
    const finalised = touched + funnel.failed;

    const conversion = {
      deliveredPercent:
        audienceSize === 0
          ? 0
          : Math.round((touched / audienceSize) * 1000) / 10,
      responseRatePercent:
        touched === 0 ? 0 : Math.round((funnel.responded / touched) * 1000) / 10,
      failureRatePercent:
        finalised === 0 ? 0 : Math.round((funnel.failed / finalised) * 1000) / 10,
    };

    const topVariations = messages.map((m) => ({
      messageId: m.id,
      channel: m.channel,
      contentPreview: m.content.slice(0, 80) + (m.content.length > 80 ? "…" : ""),
      // Each variation was "sent" once to every responder+sent+delivered pairing.
      // Real-world response-per-variation requires tracking which message each
      // audience member received — Phase 3c.
      sent: touched,
    }));

    return {
      campaignId: id,
      audienceSize,
      deliveryFunnel: funnel,
      conversion,
      topVariations,
    };
  }

  // ---------- internals ----------

  private async decorate(
    campaign: Campaign & {
      project?: { name: string } | null;
      messages: CampaignMessage[];
      _count: { audience: number };
    },
  ): Promise<CampaignWithRelations> {
    const audienceGroups = await this.prisma.campaignAudience.groupBy({
      by: ["status"],
      where: { campaignId: campaign.id },
      _count: { status: true },
    });
    const metrics: CampaignMetrics = {
      pending: 0,
      sent: 0,
      responded: 0,
      failed: 0,
    };
    for (const g of audienceGroups) {
      switch (g.status) {
        case CampaignAudienceStatus.PENDING:
          metrics.pending = g._count.status;
          break;
        case CampaignAudienceStatus.SENT:
        case CampaignAudienceStatus.DELIVERED:
          metrics.sent += g._count.status;
          break;
        case CampaignAudienceStatus.RESPONDED:
          metrics.responded = g._count.status;
          break;
        case CampaignAudienceStatus.FAILED:
          metrics.failed = g._count.status;
          break;
      }
    }

    const { project, _count, ...rest } = campaign;
    return {
      ...rest,
      projectName: project?.name,
      audienceSize: _count.audience,
      metrics,
    };
  }

  private async resolveFilterLeads(filter: AudienceFilterDto): Promise<Lead[]> {
    const where: Prisma.LeadWhereInput = { deletedAt: null };
    if (filter.status) where.status = filter.status;
    if (filter.tags?.length) {
      where.tags = { hasSome: filter.tags };
    }
    if (filter.minScore != null) {
      where.score = { gte: filter.minScore };
    }
    if (filter.source) {
      where.source = { equals: filter.source, mode: "insensitive" };
    }
    if (filter.projectId) {
      where.opportunities = { some: { projectId: filter.projectId } };
    }
    return this.prisma.lead.findMany({ where });
  }

  private channelMatchesCampaign(
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

  private async ensureExists(id: string) {
    const count = await this.prisma.campaign.count({ where: { id } });
    if (!count) throw new NotFoundException("Campaign not found");
  }
}
