import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import {
  FlowExecutionStatus,
  FlowStepType,
  FlowTriggerType,
  MessageDirection,
  MessageStatus,
  Prisma,
  TaskStatus,
  type CampaignFlow,
  type FlowExecution,
  type FlowStep,
  type Lead,
} from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { FlowsQueueService } from "../queue/flows-queue.service";
import {
  CreateFlowDto,
  FlowListFiltersDto,
  UpdateFlowDto,
} from "./dto/flow.dto";

export interface FlowWithRelations extends CampaignFlow {
  steps: FlowStep[];
  activeExecutions: number;
  completedExecutions: number;
}

export interface StepExecutionContext {
  executionId: string;
  flowId: string;
  leadId: string;
  step: FlowStep;
}

export interface StepExecutionResult {
  /** Milliseconds to wait before advancing to the next step. 0 means immediate. */
  delayMs: number;
  /** If true, halt the flow here (CONDITION failed, or terminal step). */
  halt?: boolean;
  note?: string;
}

@Injectable()
export class FlowsService {
  private readonly logger = new Logger(FlowsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly queue: FlowsQueueService,
  ) {}

  // ---------- CRUD ----------

  async list(filters: FlowListFiltersDto): Promise<FlowWithRelations[]> {
    const flows = await this.prisma.campaignFlow.findMany({
      where: {
        trigger: filters.trigger,
        isActive: filters.isActive,
        campaignId: filters.campaignId,
      },
      include: {
        steps: { orderBy: { orderIndex: "asc" } },
      },
      orderBy: { updatedAt: "desc" },
    });
    return Promise.all(flows.map((f) => this.decorate(f)));
  }

  async get(id: string): Promise<FlowWithRelations> {
    const flow = await this.prisma.campaignFlow.findUnique({
      where: { id },
      include: { steps: { orderBy: { orderIndex: "asc" } } },
    });
    if (!flow) throw new NotFoundException("Flow not found");
    return this.decorate(flow);
  }

  async create(userId: string, dto: CreateFlowDto): Promise<FlowWithRelations> {
    const flow = await this.prisma.$transaction(async (tx) => {
      const created = await tx.campaignFlow.create({
        data: {
          name: dto.name,
          description: dto.description,
          campaignId: dto.campaignId,
          trigger: dto.trigger,
          triggerConfig: dto.triggerConfig
            ? (dto.triggerConfig as unknown as Prisma.InputJsonValue)
            : undefined,
          createdById: userId,
        },
      });
      await tx.flowStep.createMany({
        data: dto.steps.map((step, i) => ({
          flowId: created.id,
          orderIndex: i,
          type: step.type,
          config: step.config as unknown as Prisma.InputJsonValue,
        })),
      });
      return created;
    });
    return this.get(flow.id);
  }

  async update(id: string, dto: UpdateFlowDto): Promise<FlowWithRelations> {
    await this.ensureExists(id);
    await this.prisma.$transaction(async (tx) => {
      await tx.campaignFlow.update({
        where: { id },
        data: {
          name: dto.name,
          description: dto.description,
          isActive: dto.isActive,
        },
      });
      if (dto.steps) {
        await tx.flowStep.deleteMany({ where: { flowId: id } });
        await tx.flowStep.createMany({
          data: dto.steps.map((step, i) => ({
            flowId: id,
            orderIndex: i,
            type: step.type,
            config: step.config as unknown as Prisma.InputJsonValue,
          })),
        });
      }
    });
    return this.get(id);
  }

  async remove(id: string): Promise<void> {
    await this.ensureExists(id);
    // Cancel any running executions so BullMQ doesn't re-fire after delete.
    await this.prisma.flowExecution.updateMany({
      where: { flowId: id, status: FlowExecutionStatus.RUNNING },
      data: {
        status: FlowExecutionStatus.CANCELLED,
        completedAt: new Date(),
      },
    });
    await this.prisma.campaignFlow.delete({ where: { id } });
  }

  // ---------- Trigger dispatch ----------

  /**
   * Called by event sources (LeadsService on create, OpportunitiesService on
   * stage change, manual button). Finds matching active flows and starts an
   * execution for each, queuing the first step.
   */
  async dispatchTrigger(
    trigger: FlowTriggerType,
    leadId: string,
    triggerData?: Record<string, unknown>,
  ): Promise<string[]> {
    const flows = await this.prisma.campaignFlow.findMany({
      where: { trigger, isActive: true },
      include: { steps: { orderBy: { orderIndex: "asc" } } },
    });

    const startedIds: string[] = [];
    for (const flow of flows) {
      if (!this.triggerMatches(flow, triggerData)) continue;
      if (flow.steps.length === 0) continue;

      const execution = await this.prisma.flowExecution.create({
        data: {
          flowId: flow.id,
          leadId,
          currentStepIndex: 0,
          status: FlowExecutionStatus.RUNNING,
          triggerData: triggerData
            ? (triggerData as unknown as Prisma.InputJsonValue)
            : Prisma.JsonNull,
        },
      });
      await this.queue.enqueueAdvance(execution.id, 0);
      startedIds.push(execution.id);
    }
    if (startedIds.length > 0) {
      this.logger.log(
        `Trigger ${trigger} on lead ${leadId} started ${startedIds.length} execution(s)`,
      );
    }
    return startedIds;
  }

  async triggerManual(flowId: string, leadId: string): Promise<FlowExecution> {
    const flow = await this.prisma.campaignFlow.findUnique({
      where: { id: flowId },
      include: { steps: { orderBy: { orderIndex: "asc" } } },
    });
    if (!flow) throw new NotFoundException("Flow not found");
    if (flow.trigger !== FlowTriggerType.MANUAL) {
      throw new BadRequestException(
        `Flow is configured for trigger '${flow.trigger}', not MANUAL.`,
      );
    }
    if (flow.steps.length === 0) {
      throw new BadRequestException("Flow has no steps.");
    }
    const execution = await this.prisma.flowExecution.create({
      data: {
        flowId,
        leadId,
        currentStepIndex: 0,
        status: FlowExecutionStatus.RUNNING,
      },
    });
    await this.queue.enqueueAdvance(execution.id, 0);
    return execution;
  }

  // ---------- Execution (called by processor) ----------

  async advance(executionId: string): Promise<void> {
    const execution = await this.prisma.flowExecution.findUnique({
      where: { id: executionId },
      include: {
        flow: { include: { steps: { orderBy: { orderIndex: "asc" } } } },
        lead: true,
      },
    });
    if (!execution) return; // deleted between enqueue and run
    if (execution.status !== FlowExecutionStatus.RUNNING) return;

    const step = execution.flow.steps[execution.currentStepIndex];
    if (!step) {
      await this.complete(execution.id);
      return;
    }

    try {
      const result = await this.executeStep({
        executionId: execution.id,
        flowId: execution.flow.id,
        leadId: execution.leadId,
        step,
      }, execution.lead);

      if (result.halt) {
        await this.prisma.flowExecution.update({
          where: { id: execution.id },
          data: {
            status: FlowExecutionStatus.COMPLETED,
            completedAt: new Date(),
            stepsCompleted: execution.currentStepIndex + 1,
          },
        });
        return;
      }

      const nextIndex = execution.currentStepIndex + 1;
      const hasMore = nextIndex < execution.flow.steps.length;

      await this.prisma.flowExecution.update({
        where: { id: execution.id },
        data: {
          currentStepIndex: nextIndex,
          stepsCompleted: execution.currentStepIndex + 1,
        },
      });

      if (!hasMore) {
        await this.complete(execution.id);
        return;
      }

      await this.queue.enqueueAdvance(execution.id, result.delayMs);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      this.logger.error(
        `Flow execution ${execution.id} step ${execution.currentStepIndex} failed: ${message}`,
      );
      await this.prisma.flowExecution.update({
        where: { id: execution.id },
        data: {
          status: FlowExecutionStatus.FAILED,
          completedAt: new Date(),
          errorMessage: message,
        },
      });
    }
  }

  // ---------- Executions listing ----------

  async listExecutions(flowId?: string, leadId?: string, take = 50) {
    return this.prisma.flowExecution.findMany({
      where: { flowId, leadId },
      include: {
        lead: { select: { id: true, name: true, phone: true } },
        flow: { select: { id: true, name: true, trigger: true } },
      },
      orderBy: { startedAt: "desc" },
      take,
    });
  }

  // ---------- Step execution (the juicy bit) ----------

  private async executeStep(
    ctx: StepExecutionContext,
    lead: Lead,
  ): Promise<StepExecutionResult> {
    const config = (ctx.step.config ?? {}) as Record<string, unknown>;

    switch (ctx.step.type) {
      case FlowStepType.WAIT: {
        const days = Number(config.days ?? 0);
        const hours = Number(config.hours ?? 0);
        const minutes = Number(config.minutes ?? 0);
        const delayMs =
          days * 24 * 60 * 60 * 1000 +
          hours * 60 * 60 * 1000 +
          minutes * 60 * 1000;
        return { delayMs, note: `Waiting ${days}d ${hours}h ${minutes}m` };
      }

      case FlowStepType.SEND_WHATSAPP:
      case FlowStepType.SEND_EMAIL:
      case FlowStepType.SEND_SMS: {
        const content = String(config.content ?? "").trim();
        if (!content) {
          throw new Error("Step config missing 'content'");
        }
        const channel =
          ctx.step.type === FlowStepType.SEND_WHATSAPP
            ? "WHATSAPP"
            : ctx.step.type === FlowStepType.SEND_EMAIL
              ? "EMAIL"
              : "SMS";
        if (!lead.consentGiven) {
          return { delayMs: 0, halt: true, note: "No DPDP consent — halted" };
        }
        await this.prisma.message.create({
          data: {
            leadId: ctx.leadId,
            channel: channel as "WHATSAPP" | "EMAIL" | "SMS",
            direction: MessageDirection.OUTBOUND,
            messageText: this.fillTemplate(content, lead),
            status: MessageStatus.SENT,
          },
        });
        return { delayMs: 0 };
      }

      case FlowStepType.CREATE_TASK: {
        const title = String(config.title ?? "Follow-up");
        const dueInDays = Number(config.dueInDays ?? 1);
        const assignedToId = String(
          config.assignedToId ?? lead.assignedToId ?? "",
        );
        if (!assignedToId) {
          throw new Error(
            "CREATE_TASK needs either config.assignedToId or lead must be assigned",
          );
        }
        const dueDate = new Date(
          Date.now() + dueInDays * 24 * 60 * 60 * 1000,
        );
        await this.prisma.task.create({
          data: {
            title,
            dueDate,
            status: TaskStatus.PENDING,
            assignedToId,
            leadId: ctx.leadId,
          },
        });
        return { delayMs: 0 };
      }

      case FlowStepType.CONDITION: {
        // Simple condition: { field: "status"|"score", op: "eq"|"gte"|"lte", value: any }
        const field = String(config.field ?? "");
        const op = String(config.op ?? "eq");
        const value = config.value;
        let actual: unknown;
        if (field === "status") actual = lead.status;
        else if (field === "score") actual = lead.score ?? 0;
        else if (field === "source") actual = lead.source;
        else {
          throw new Error(`Unsupported condition field: ${field}`);
        }
        const pass = this.evalCondition(op, actual, value);
        return {
          delayMs: 0,
          halt: !pass,
          note: pass ? "Condition passed" : "Condition failed — halted",
        };
      }

      default:
        throw new Error(`Unknown step type: ${ctx.step.type}`);
    }
  }

  private evalCondition(op: string, actual: unknown, expected: unknown): boolean {
    switch (op) {
      case "eq":
        return actual === expected;
      case "ne":
        return actual !== expected;
      case "gte":
        return Number(actual) >= Number(expected);
      case "lte":
        return Number(actual) <= Number(expected);
      case "in":
        return Array.isArray(expected) && expected.includes(actual);
      default:
        return false;
    }
  }

  private fillTemplate(content: string, lead: Lead): string {
    return content
      .replace(/\{\{name\}\}/gi, lead.name.split(/\s+/)[0] ?? lead.name)
      .replace(/\{\{fullName\}\}/gi, lead.name)
      .replace(/\{\{phone\}\}/gi, lead.phone);
  }

  private triggerMatches(
    flow: CampaignFlow,
    data: Record<string, unknown> | undefined,
  ): boolean {
    const config = (flow.triggerConfig ?? {}) as Record<string, unknown>;
    if (flow.trigger === FlowTriggerType.STAGE_CHANGED) {
      if (config.toStage && data?.toStage !== config.toStage) return false;
      if (config.fromStage && data?.fromStage !== config.fromStage) return false;
    }
    return true;
  }

  private async complete(executionId: string) {
    await this.prisma.flowExecution.update({
      where: { id: executionId },
      data: {
        status: FlowExecutionStatus.COMPLETED,
        completedAt: new Date(),
      },
    });
  }

  private async ensureExists(id: string) {
    const count = await this.prisma.campaignFlow.count({ where: { id } });
    if (!count) throw new NotFoundException("Flow not found");
  }

  private async decorate(
    flow: CampaignFlow & { steps: FlowStep[] },
  ): Promise<FlowWithRelations> {
    const [active, completed] = await Promise.all([
      this.prisma.flowExecution.count({
        where: { flowId: flow.id, status: FlowExecutionStatus.RUNNING },
      }),
      this.prisma.flowExecution.count({
        where: { flowId: flow.id, status: FlowExecutionStatus.COMPLETED },
      }),
    ]);
    return {
      ...flow,
      activeExecutions: active,
      completedExecutions: completed,
    };
  }
}
