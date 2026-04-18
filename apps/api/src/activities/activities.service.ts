import { Injectable } from "@nestjs/common";
import type {
  ActivityType,
  MessageChannel,
  OpportunityStage,
} from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { CreateActivityDto } from "./dto/activity.dto";

const STAGE_LABEL: Record<OpportunityStage, string> = {
  NEW: "New",
  CONTACTED: "Contacted",
  SITE_VISIT_SCHEDULED: "Site Visit Scheduled",
  SITE_VISIT_DONE: "Site Visit Done",
  NEGOTIATION: "Negotiation",
  CLOSED_WON: "Closed Won",
  CLOSED_LOST: "Closed Lost",
};

export type TimelineKind = "activity" | "message" | "stage_change";

export interface TimelineItem {
  id: string;
  kind: TimelineKind;
  type: string;
  title: string;
  description?: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
  createdBy?: string;
  opportunityId?: string;
  projectName?: string;
}

@Injectable()
export class ActivitiesService {
  constructor(private readonly prisma: PrismaService) {}

  async timeline(
    leadId: string,
    options: { types?: TimelineKind[]; since?: Date } = {},
  ): Promise<TimelineItem[]> {
    const [activities, messages, history] = await Promise.all([
      this.prisma.activity.findMany({
        where: {
          leadId,
          ...(options.since ? { createdAt: { gte: options.since } } : {}),
        },
        include: {
          opportunity: {
            include: { project: { select: { name: true } } },
          },
        },
      }),
      this.prisma.message.findMany({
        where: {
          leadId,
          ...(options.since ? { createdAt: { gte: options.since } } : {}),
        },
      }),
      this.prisma.opportunityStageHistory.findMany({
        where: {
          opportunity: { leadId },
          ...(options.since ? { changedAt: { gte: options.since } } : {}),
        },
        include: {
          opportunity: {
            include: { project: { select: { name: true } } },
          },
        },
      }),
    ]);

    const items: TimelineItem[] = [];

    for (const a of activities) {
      items.push({
        id: a.id,
        kind: "activity",
        type: a.type.toLowerCase(),
        title: a.title,
        description: a.description ?? undefined,
        metadata:
          a.type === ("CALL" as ActivityType) && a.outcome
            ? { channel: a.outcome }
            : undefined,
        createdAt: a.createdAt.toISOString(),
        createdBy: a.createdById,
        opportunityId: a.opportunityId ?? undefined,
        projectName: a.opportunity?.project?.name,
      });
    }

    for (const m of messages) {
      const direction = m.direction === "INBOUND" ? "inbound" : "outbound";
      items.push({
        id: m.id,
        kind: "message",
        type: `${direction}_message`,
        title: `${direction === "inbound" ? "Inbound" : "Outbound"} ${friendlyChannel(m.channel)} message`,
        description: m.messageText,
        metadata: { channel: m.channel.toLowerCase() },
        createdAt: m.createdAt.toISOString(),
        createdBy: m.sentById ?? undefined,
        opportunityId: m.opportunityId ?? undefined,
      });
    }

    for (const h of history) {
      items.push({
        id: h.id,
        kind: "stage_change",
        type: "stage_change",
        title: h.oldStage
          ? `Stage: ${STAGE_LABEL[h.oldStage]} → ${STAGE_LABEL[h.newStage]}`
          : `Opportunity created · ${STAGE_LABEL[h.newStage]}`,
        metadata: {
          oldStage: h.oldStage ?? undefined,
          newStage: h.newStage,
        },
        createdAt: h.changedAt.toISOString(),
        createdBy: h.changedById,
        opportunityId: h.opportunityId,
        projectName: h.opportunity?.project?.name,
      });
    }

    let filtered = items;
    if (options.types?.length) {
      filtered = filtered.filter((i) => options.types!.includes(i.kind));
    }

    filtered.sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );

    return filtered;
  }

  async create(
    userId: string,
    dto: CreateActivityDto,
  ): Promise<TimelineItem> {
    const activity = await this.prisma.activity.create({
      data: {
        type: dto.type,
        leadId: dto.leadId,
        opportunityId: dto.opportunityId,
        title: dto.title,
        description: dto.description,
        durationMinutes: dto.durationMinutes,
        outcome: dto.outcome,
        createdById: userId,
      },
    });

    return {
      id: activity.id,
      kind: "activity",
      type: activity.type.toLowerCase(),
      title: activity.title,
      description: activity.description ?? undefined,
      createdAt: activity.createdAt.toISOString(),
      createdBy: activity.createdById,
      opportunityId: activity.opportunityId ?? undefined,
    };
  }
}

function friendlyChannel(channel: MessageChannel): string {
  return channel === "WHATSAPP"
    ? "WhatsApp"
    : channel === "EMAIL"
      ? "email"
      : "SMS";
}
