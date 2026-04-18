import {
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
  NotFoundException,
  UnprocessableEntityException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PrismaService } from "../prisma/prisma.service";
import {
  GenerateContentDto,
  GenerateMessageDto,
  ScoreDto,
  StrategyDto,
} from "./dto/ai.dto";
import {
  buildContext,
  composeMarketingContent,
  composeMessages,
  decideIntent,
  scoreLead,
  suggestStrategy,
  type MarketingContentVariation,
  type MessageVariation,
  type ScoreOutput,
  type StrategyOutput,
} from "./ai.engine";
import { ClaudeProvider } from "./claude.provider";
import {
  AiRateLimitExceededError,
  AiRateLimitService,
} from "./ai-rate-limit.service";
import type { AppConfig } from "../config/configuration";

export interface GenerateMessageResult {
  variations: MessageVariation[];
  suggestedIntent: string;
  storedInteractionId: string;
}

/**
 * Rate-limit note: 50 req/user/day is the locked cap. Real implementation
 * uses Redis to track per-user-per-day counters; for now we persist every
 * call to ai_interactions and let an upstream rate limiter enforce caps.
 */
@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);
  private readonly useMock: boolean;
  private readonly mockModelName: string;

  constructor(
    private readonly prisma: PrismaService,
    config: ConfigService<AppConfig, true>,
    private readonly claude: ClaudeProvider,
    private readonly rateLimit: AiRateLimitService,
  ) {
    this.useMock = config.get("useMockAi", { infer: true });
    this.mockModelName = "mock-sonnet";
  }

  private async enforceRateLimit(userId: string) {
    try {
      await this.rateLimit.checkAndReserveRequest(userId);
    } catch (err) {
      if (err instanceof AiRateLimitExceededError) {
        throw new HttpException(
          { message: err.message, snapshot: err.snapshot, kind: err.kind },
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }
      throw err;
    }
  }

  getUsage(userId: string) {
    return this.rateLimit.snapshot(userId);
  }

  /**
   * Route decision: USE_MOCK_AI=true → mock engine. USE_MOCK_AI=false
   * → Claude API, with mock fallback if Claude throws (never let the UI
   * block on an AI outage).
   */
  private useClaude(): boolean {
    return !this.useMock && this.claude.isAvailable();
  }

  async generateMessage(
    userId: string,
    dto: GenerateMessageDto,
  ): Promise<GenerateMessageResult> {
    await this.enforceRateLimit(userId);
    const { lead, project, opportunity } = await this.loadContext(
      dto.leadId,
      dto.opportunityId,
    );
    const ctx = buildContext({ lead, project, opportunity });
    const suggestedIntent = decideIntent(ctx);

    let variations: MessageVariation[] = [];
    let modelUsed = this.mockModelName;
    let tokensUsed: number | undefined;

    if (this.useClaude()) {
      try {
        const result = await this.claude.generateMessageVariations({
          context: ctx,
          intent: dto.intent,
          tone: dto.tone,
        });
        variations = result.variations;
        modelUsed = result.metadata.modelUsed;
        tokensUsed =
          result.metadata.inputTokens + result.metadata.outputTokens;
      } catch (err) {
        this.logger.error(
          `Claude call failed, falling back to mock: ${(err as Error).message}`,
        );
      }
    }

    if (variations.length === 0) {
      variations = composeMessages(ctx, dto.intent, dto.tone);
    }
    if (variations.length === 0) {
      throw new UnprocessableEntityException(
        "All generated variations failed the output controller. Try a different tone or intent.",
      );
    }

    const interaction = await this.prisma.aiInteraction.create({
      data: {
        leadId: dto.leadId,
        opportunityId: dto.opportunityId,
        inputContext: ctx as unknown as object,
        prompt: `generate_message intent=${dto.intent} tone=${dto.tone}`,
        response: JSON.stringify(variations),
        modelUsed,
        tokensUsed,
        createdById: userId,
      },
    });

    if (tokensUsed) {
      await this.rateLimit.recordTokens(userId, tokensUsed);
    }

    return {
      variations,
      suggestedIntent,
      storedInteractionId: interaction.id,
    };
  }

  async strategy(dto: StrategyDto): Promise<StrategyOutput> {
    const { lead, project, opportunity } = await this.loadContext(
      dto.leadId,
      dto.opportunityId,
    );
    const ctx = buildContext({ lead, project, opportunity });
    return suggestStrategy(ctx);
  }

  async generateContent(
    userId: string,
    dto: GenerateContentDto,
  ): Promise<{
    variations: MarketingContentVariation[];
    storedInteractionId: string;
  }> {
    await this.enforceRateLimit(userId);
    const project = await this.prisma.project.findUnique({
      where: { id: dto.projectId },
    });
    if (!project) throw new NotFoundException("Project not found");

    const priceRange = await this.derivePriceRange(project.id);

    const projectCtx = {
      name: project.name,
      type: project.propertyType,
      location: project.locationText,
      tags: project.tags,
      description: project.description ?? undefined,
      priceRange,
    };

    let variations: MarketingContentVariation[] = [];
    let modelUsed = this.mockModelName;
    let tokensUsed: number | undefined;

    if (this.useClaude()) {
      try {
        const result = await this.claude.generateMarketingContent({
          platform: dto.platform,
          project: projectCtx,
          targetAudience: dto.targetAudience,
          tone: dto.tone,
        });
        variations = result.variations;
        modelUsed = result.metadata.modelUsed;
        tokensUsed =
          result.metadata.inputTokens + result.metadata.outputTokens;
      } catch (err) {
        this.logger.error(
          `Claude content call failed, falling back to mock: ${(err as Error).message}`,
        );
      }
    }

    if (variations.length === 0) {
      variations = composeMarketingContent({
        platform: dto.platform,
        project: projectCtx,
        targetAudience: dto.targetAudience,
        tone: dto.tone,
      });
    }

    if (variations.length === 0) {
      throw new UnprocessableEntityException(
        "No content variations passed the output controller. Try a different platform or audience.",
      );
    }

    const interaction = await this.prisma.aiInteraction.create({
      data: {
        inputContext: {
          projectId: dto.projectId,
          platform: dto.platform,
          tone: dto.tone,
          targetAudience: dto.targetAudience,
        },
        prompt: `generate_content platform=${dto.platform}`,
        response: JSON.stringify(variations),
        modelUsed,
        tokensUsed,
        createdById: userId,
      },
    });

    if (tokensUsed) {
      await this.rateLimit.recordTokens(userId, tokensUsed);
    }

    return { variations, storedInteractionId: interaction.id };
  }

  private async derivePriceRange(projectId: string): Promise<string | undefined> {
    const props = await this.prisma.property.findMany({
      where: { projectId },
      select: { price: true },
    });
    if (props.length === 0) return undefined;
    const prices = props.map((p) => p.price).sort((a, b) => a - b);
    const min = prices[0]!;
    const max = prices[prices.length - 1]!;
    return `₹${format(min)} – ₹${format(max)}`;
  }

  async score(dto: ScoreDto): Promise<ScoreOutput> {
    const lead = await this.prisma.lead.findFirst({
      where: { id: dto.leadId, deletedAt: null },
    });
    if (!lead) throw new NotFoundException("Lead not found");
    const opportunities = await this.prisma.opportunity.findMany({
      where: { leadId: lead.id },
    });
    const result = scoreLead(lead, opportunities);

    // Persist so history is auditable (lead_scores table).
    await this.prisma.leadScore.create({
      data: {
        leadId: lead.id,
        score: result.score,
        label: result.label,
        factors: result.factors as unknown as object,
      },
    });

    return result;
  }

  private async loadContext(leadId: string, opportunityId?: string) {
    const lead = await this.prisma.lead.findFirst({
      where: { id: leadId, deletedAt: null },
    });
    if (!lead) throw new NotFoundException("Lead not found");

    if (!opportunityId) {
      return { lead, project: undefined, opportunity: undefined };
    }

    const opportunity = await this.prisma.opportunity.findUnique({
      where: { id: opportunityId },
      include: { project: true, lead: { select: { score: true } } },
    });
    if (!opportunity) {
      return { lead, project: undefined, opportunity: undefined };
    }
    return {
      lead,
      project: opportunity.project,
      opportunity: {
        ...opportunity,
        leadScore: opportunity.lead?.score ?? undefined,
      },
    };
  }
}

function format(n: number): string {
  if (n >= 10_000_000) return `${(n / 10_000_000).toFixed(1)} Cr`;
  if (n >= 100_000) return `${(n / 100_000).toFixed(0)}L`;
  return n.toLocaleString("en-IN");
}
