import { Injectable } from "@nestjs/common";
import {
  MessageDirection,
  OpportunityStage,
  ProjectStatus,
  type OpportunityStage as OppStageT,
} from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";

const STAGE_LABEL: Record<OppStageT, string> = {
  NEW: "New",
  CONTACTED: "Contacted",
  SITE_VISIT_SCHEDULED: "Site Visit Scheduled",
  SITE_VISIT_DONE: "Site Visit Done",
  NEGOTIATION: "Negotiation",
  CLOSED_WON: "Closed Won",
  CLOSED_LOST: "Closed Lost",
};

export interface DashboardMetrics {
  totalLeads: number;
  activeOpportunities: number;
  conversionRate: number;
  leadsPerProject: Array<{ projectName: string; count: number }>;
  recentActivity: Array<{
    id: string;
    type: string;
    description: string;
    createdAt: string;
  }>;
}

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async metrics(): Promise<DashboardMetrics> {
    const closed = [OpportunityStage.CLOSED_WON, OpportunityStage.CLOSED_LOST];

    const [
      totalLeads,
      activeOpportunities,
      wonCount,
      closedCount,
      leadsPerProjectRaw,
      recentStages,
      recentActivities,
      recentInbound,
    ] = await Promise.all([
      this.prisma.lead.count({ where: { deletedAt: null } }),
      this.prisma.opportunity.count({
        where: { stage: { notIn: closed } },
      }),
      this.prisma.opportunity.count({
        where: { stage: OpportunityStage.CLOSED_WON },
      }),
      this.prisma.opportunity.count({ where: { stage: { in: closed } } }),
      this.prisma.opportunity.groupBy({
        by: ["projectId", "leadId"],
      }),
      this.prisma.opportunityStageHistory.findMany({
        orderBy: { changedAt: "desc" },
        take: 5,
        include: {
          opportunity: {
            include: {
              lead: { select: { name: true } },
              project: { select: { name: true, status: true } },
            },
          },
        },
      }),
      this.prisma.activity.findMany({
        orderBy: { createdAt: "desc" },
        take: 5,
        include: { lead: { select: { name: true } } },
      }),
      this.prisma.message.findMany({
        where: { direction: MessageDirection.INBOUND },
        orderBy: { createdAt: "desc" },
        take: 5,
        include: { lead: { select: { name: true } } },
      }),
    ]);

    const conversionRate =
      closedCount > 0
        ? Math.round((wonCount / closedCount) * 1000) / 10
        : 0;

    // leadsPerProject: group by project, count distinct leads, resolve names
    const byProject = new Map<string, Set<string>>();
    for (const row of leadsPerProjectRaw) {
      if (!byProject.has(row.projectId)) byProject.set(row.projectId, new Set());
      byProject.get(row.projectId)!.add(row.leadId);
    }
    const activeProjects = await this.prisma.project.findMany({
      where: {
        id: { in: Array.from(byProject.keys()) },
        status: { not: ProjectStatus.INACTIVE },
      },
      select: { id: true, name: true },
    });
    const leadsPerProject = activeProjects
      .map((p) => ({
        projectName: p.name,
        count: byProject.get(p.id)?.size ?? 0,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 6);

    // Merge recent activity from 3 sources, sort, take 6
    const combined: DashboardMetrics["recentActivity"] = [];

    for (const h of recentStages) {
      const leadName = h.opportunity?.lead?.name ?? "Lead";
      const projectName = h.opportunity?.project?.name ?? "project";
      combined.push({
        id: `stage-${h.id}`,
        type: "stage_change",
        description: `${leadName} → ${STAGE_LABEL[h.newStage]} on ${projectName}`,
        createdAt: h.changedAt.toISOString(),
      });
    }
    for (const a of recentActivities) {
      combined.push({
        id: `act-${a.id}`,
        type: a.type.toLowerCase(),
        description: `${a.title} · ${a.lead?.name ?? "Lead"}`,
        createdAt: a.createdAt.toISOString(),
      });
    }
    for (const m of recentInbound) {
      combined.push({
        id: `msg-${m.id}`,
        type: "whatsapp",
        description: `Inbound ${m.channel.toLowerCase()} from ${m.lead?.name ?? "Lead"}`,
        createdAt: m.createdAt.toISOString(),
      });
    }

    combined.sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );

    return {
      totalLeads,
      activeOpportunities,
      conversionRate,
      leadsPerProject,
      recentActivity: combined.slice(0, 6),
    };
  }
}
