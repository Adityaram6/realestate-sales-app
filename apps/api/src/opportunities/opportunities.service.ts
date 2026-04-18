import {
  ConflictException,
  forwardRef,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import {
  FlowTriggerType,
  OpportunityStage,
  type Opportunity,
  type OpportunityStageHistory,
} from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { FlowsService } from "../flows/flows.service";
import {
  AttachProjectsDto,
  OpportunityListFiltersDto,
} from "./dto/opportunity.dto";

interface DecoratedOpportunity extends Opportunity {
  leadName: string;
  projectName: string;
  leadScore?: number;
  lastInteractionAt: string;
}

export interface OpportunityDetail extends DecoratedOpportunity {
  leadPhone: string;
  leadEmail?: string | null;
  projectLocation: string;
  projectCode: string;
  history: OpportunityStageHistory[];
}

export interface AttachProjectsResult {
  created: DecoratedOpportunity[];
  skipped: Array<{ projectId: string; reason: string }>;
}

@Injectable()
export class OpportunitiesService {
  private readonly logger = new Logger(OpportunitiesService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject(forwardRef(() => FlowsService))
    private readonly flows: FlowsService,
  ) {}

  private fireTrigger(
    trigger: FlowTriggerType,
    leadId: string,
    data: Record<string, unknown>,
  ): void {
    this.flows
      .dispatchTrigger(trigger, leadId, data)
      .catch((err) =>
        this.logger.error(
          `Trigger ${trigger} for lead ${leadId} failed: ${(err as Error).message}`,
        ),
      );
  }

  async list(filters: OpportunityListFiltersDto): Promise<DecoratedOpportunity[]> {
    const opps = await this.prisma.opportunity.findMany({
      where: {
        stage: filters.stage,
        projectId: filters.projectId,
        leadId: filters.leadId,
        assignedToId: filters.assignedTo,
      },
      include: {
        lead: { select: { name: true, score: true } },
        project: { select: { name: true } },
      },
      orderBy: { updatedAt: "desc" },
    });
    return opps.map(decorate);
  }

  async get(id: string): Promise<OpportunityDetail> {
    const opp = await this.prisma.opportunity.findUnique({
      where: { id },
      include: {
        lead: {
          select: { name: true, phone: true, email: true, score: true },
        },
        project: {
          select: { name: true, locationText: true, projectCode: true },
        },
        stageHistory: { orderBy: { changedAt: "desc" } },
      },
    });
    if (!opp) throw new NotFoundException("Opportunity not found");

    return {
      ...opp,
      leadName: opp.lead.name,
      projectName: opp.project.name,
      leadScore: opp.lead.score ?? undefined,
      leadPhone: opp.lead.phone,
      leadEmail: opp.lead.email,
      projectLocation: opp.project.locationText,
      projectCode: opp.project.projectCode,
      lastInteractionAt: opp.updatedAt.toISOString(),
      history: opp.stageHistory,
    };
  }

  async attach(
    userId: string,
    dto: AttachProjectsDto,
  ): Promise<AttachProjectsResult> {
    const lead = await this.prisma.lead.findFirst({
      where: { id: dto.leadId, deletedAt: null },
    });
    if (!lead) throw new NotFoundException("Lead not found");

    const result: AttachProjectsResult = { created: [], skipped: [] };

    for (const projectId of dto.projectIds) {
      const project = await this.prisma.project.findUnique({
        where: { id: projectId },
        select: { id: true, name: true },
      });
      if (!project) {
        result.skipped.push({ projectId, reason: "Project not found" });
        continue;
      }

      const existing = await this.prisma.opportunity.findUnique({
        where: { leadId_projectId: { leadId: dto.leadId, projectId } },
      });
      if (existing) {
        result.skipped.push({
          projectId,
          reason: "Opportunity already exists for this lead + project",
        });
        continue;
      }

      const created = await this.prisma.$transaction(async (tx) => {
        const opportunity = await tx.opportunity.create({
          data: {
            leadId: dto.leadId,
            projectId,
            stage: OpportunityStage.NEW,
            probability: 10,
            assignedToId: lead.assignedToId ?? userId,
          },
        });
        await tx.opportunityStageHistory.create({
          data: {
            opportunityId: opportunity.id,
            oldStage: null,
            newStage: OpportunityStage.NEW,
            changedById: userId,
          },
        });
        return opportunity;
      });

      result.created.push({
        ...created,
        leadName: lead.name,
        projectName: project.name,
        leadScore: lead.score ?? undefined,
        lastInteractionAt: created.updatedAt.toISOString(),
      });
    }

    return result;
  }

  async changeStage(
    userId: string,
    id: string,
    nextStage: OpportunityStage,
  ): Promise<Opportunity> {
    const current = await this.prisma.opportunity.findUnique({
      where: { id },
    });
    if (!current) throw new NotFoundException("Opportunity not found");

    if (
      current.stage === OpportunityStage.CLOSED_WON ||
      current.stage === OpportunityStage.CLOSED_LOST
    ) {
      throw new ConflictException(
        "Closed opportunities cannot be re-opened from the pipeline.",
      );
    }
    if (current.stage === nextStage) return current;

    const updated = await this.prisma.$transaction(async (tx) => {
      const next = await tx.opportunity.update({
        where: { id },
        data: { stage: nextStage },
      });
      await tx.opportunityStageHistory.create({
        data: {
          opportunityId: id,
          oldStage: current.stage,
          newStage: nextStage,
          changedById: userId,
        },
      });
      return next;
    });

    this.fireTrigger(FlowTriggerType.STAGE_CHANGED, current.leadId, {
      opportunityId: id,
      fromStage: current.stage,
      toStage: nextStage,
    });

    return updated;
  }

  async forLead(leadId: string): Promise<DecoratedOpportunity[]> {
    return this.list({ leadId });
  }

  async forProject(projectId: string): Promise<DecoratedOpportunity[]> {
    return this.list({ projectId });
  }
}

function decorate(
  opp: Opportunity & {
    lead: { name: string; score: number | null };
    project: { name: string };
  },
): DecoratedOpportunity {
  return {
    ...opp,
    leadName: opp.lead.name,
    projectName: opp.project.name,
    leadScore: opp.lead.score ?? undefined,
    lastInteractionAt: opp.updatedAt.toISOString(),
  };
}
