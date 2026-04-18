import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import Anthropic from "@anthropic-ai/sdk";
import type { AppConfig } from "../config/configuration";
import type { AiContext, MessageVariation, MarketingContentVariation } from "./ai.engine";
import { validateOutput } from "./ai.engine";
import type { AiIntent, AiTone, MarketingPlatform } from "./dto/ai.dto";

export interface ClaudeCallMetadata {
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens?: number;
  cacheCreationTokens?: number;
  modelUsed: string;
}

/**
 * Real Anthropic Claude provider. Used when USE_MOCK_AI=false.
 *
 * Prompt caching strategy:
 * - The system prompt (sales expert personality + JSON output schema) is
 *   marked `cache_control: ephemeral` on every call. It's identical across
 *   all generate-message requests so ~90% cache hit rate after warm-up.
 * - Context (per-lead/opportunity data) is NOT cached — varies per request.
 *
 * Why Sonnet 4.5: strong at structured JSON output + long-context reasoning
 * over the lead's history. Haiku is cheaper but regresses on the sales
 * strategist reasoning. If you need cheaper, swap CLAUDE_MODEL env var.
 */
@Injectable()
export class ClaudeProvider {
  private readonly logger = new Logger(ClaudeProvider.name);
  private readonly client: Anthropic | null;
  private readonly model: string;

  constructor(config: ConfigService<AppConfig, true>) {
    this.model = config.get("claudeModel", { infer: true });
    const apiKey = config.get("anthropicApiKey", { infer: true });
    this.client = apiKey ? new Anthropic({ apiKey }) : null;
    if (!apiKey) {
      this.logger.warn(
        "ANTHROPIC_API_KEY not set — ClaudeProvider disabled. Set USE_MOCK_AI=true or provide the key.",
      );
    }
  }

  isAvailable(): boolean {
    return this.client !== null;
  }

  async generateMessageVariations(params: {
    context: AiContext;
    intent: AiIntent;
    tone: AiTone;
  }): Promise<{ variations: MessageVariation[]; metadata: ClaudeCallMetadata }> {
    if (!this.client) throw new Error("Claude not configured");

    const systemPrompt = this.messageSystemPrompt();
    const userPrompt = this.messageUserPrompt(params);

    const response = await this.client.messages.create({
      model: this.model,
      max_tokens: 1024,
      system: [
        {
          type: "text",
          text: systemPrompt,
          cache_control: { type: "ephemeral" },
        },
      ],
      messages: [{ role: "user", content: userPrompt }],
    });

    const text = this.extractText(response);
    const parsed = this.parseJson<{ variations: RawMessageVariation[] }>(text);

    const validated: MessageVariation[] = [];
    for (const v of parsed?.variations ?? []) {
      if (!v.text) continue;
      const check = validateOutput(v.text);
      if (!check.ok) {
        this.logger.warn(
          `Claude output rejected by controller: ${check.reason} — "${v.text.slice(0, 50)}…"`,
        );
        continue;
      }
      validated.push({
        approach: (v.approach ?? "direct") as MessageVariation["approach"],
        tone: params.tone,
        text: v.text.trim(),
        scores: v.scores ?? {
          actionability: 70,
          personalization: 70,
          clarity: 80,
        },
      });
    }

    return {
      variations: validated,
      metadata: this.buildMetadata(response),
    };
  }

  async generateMarketingContent(params: {
    platform: MarketingPlatform;
    project: {
      name: string;
      type: string;
      location: string;
      tags: string[];
      description?: string;
      priceRange?: string;
    };
    targetAudience?: string;
    tone?: AiTone;
  }): Promise<{
    variations: MarketingContentVariation[];
    metadata: ClaudeCallMetadata;
  }> {
    if (!this.client) throw new Error("Claude not configured");

    const systemPrompt = this.marketingSystemPrompt();
    const userPrompt = this.marketingUserPrompt(params);

    const response = await this.client.messages.create({
      model: this.model,
      max_tokens: 2048,
      system: [
        {
          type: "text",
          text: systemPrompt,
          cache_control: { type: "ephemeral" },
        },
      ],
      messages: [{ role: "user", content: userPrompt }],
    });

    const text = this.extractText(response);
    const parsed = this.parseJson<{ variations: RawMarketingVariation[] }>(text);
    const variations: MarketingContentVariation[] = (parsed?.variations ?? [])
      .filter((v): v is RawMarketingVariation & { content: string } =>
        Boolean(v?.content),
      )
      .map((v) => ({
        approach: (v.approach ?? "headline_first") as MarketingContentVariation["approach"],
        content: v.content.trim(),
        hashtags: v.hashtags,
        charCount: v.content.length,
      }));

    return { variations, metadata: this.buildMetadata(response) };
  }

  // ---------- Prompt construction ----------

  private messageSystemPrompt(): string {
    return `You are a highly experienced real estate sales expert from India with 15+ years of experience. You help salespeople convert leads via WhatsApp/email by generating personalised, conversational messages.

Rules:
- Each message must be under 60 words
- Must include the lead's first name and the project name
- Must end with a clear next-step CTA (visit / call / reply)
- No generic phrases like "hope you are doing well"
- Be human, not salesy

Output strictly as JSON in this shape:
{
  "variations": [
    {
      "approach": "soft" | "direct" | "urgency",
      "text": "<message>",
      "scores": {
        "actionability": 0-100,
        "personalization": 0-100,
        "clarity": 0-100
      }
    }
  ]
}
Generate exactly 3 variations — one per approach. No prose outside the JSON.`;
  }

  private messageUserPrompt(params: {
    context: AiContext;
    intent: AiIntent;
    tone: AiTone;
  }): string {
    return `Generate 3 message variations (soft / direct / urgency-driven) for intent "${params.intent}" in tone "${params.tone}".

Lead + project context:
\`\`\`json
${JSON.stringify(params.context, null, 2)}
\`\`\``;
  }

  private marketingSystemPrompt(): string {
    return `You are a performance marketer specialising in Indian real estate. You write platform-native copy that drives clicks and enquiries.

Platform limits (characters):
- facebook: 600 | instagram: 500 | linkedin: 800 | whatsapp_blast: 350 | email_blast: 1200

Rules:
- Respect the platform's character limit
- For facebook/instagram/linkedin: include 4–8 strategic hashtags
- For email_blast: start with "Subject: …" on its own line
- For whatsapp_blast: single CTA, no hashtags, no emojis
- No generic filler phrases

Output strictly as JSON:
{
  "variations": [
    {
      "approach": "headline_first" | "story_first" | "benefit_first",
      "content": "<copy>",
      "hashtags": ["#tag1", "#tag2"] // omit for whatsapp_blast/email_blast
    }
  ]
}
Generate exactly 3 variations. No prose outside the JSON.`;
  }

  private marketingUserPrompt(params: {
    platform: MarketingPlatform;
    project: {
      name: string;
      type: string;
      location: string;
      tags: string[];
      description?: string;
      priceRange?: string;
    };
    targetAudience?: string;
    tone?: AiTone;
  }): string {
    return `Write marketing copy for platform "${params.platform}"${params.tone ? `, tone "${params.tone}"` : ""}${params.targetAudience ? `, audience "${params.targetAudience}"` : ""}.

Project:
\`\`\`json
${JSON.stringify(params.project, null, 2)}
\`\`\``;
  }

  // ---------- Helpers ----------

  private extractText(response: Anthropic.Message): string {
    const first = response.content[0];
    if (!first || first.type !== "text") return "";
    return first.text;
  }

  private parseJson<T>(text: string): T | null {
    // Claude sometimes wraps JSON in ``` fences — strip before parsing.
    const cleaned = text
      .replace(/^```json\s*/i, "")
      .replace(/^```\s*/, "")
      .replace(/```\s*$/, "")
      .trim();
    try {
      return JSON.parse(cleaned) as T;
    } catch (err) {
      this.logger.error(
        `Couldn't parse Claude JSON response: ${(err as Error).message}\n${text.slice(0, 500)}`,
      );
      return null;
    }
  }

  private buildMetadata(response: Anthropic.Message): ClaudeCallMetadata {
    return {
      inputTokens: response.usage.input_tokens,
      outputTokens: response.usage.output_tokens,
      cacheReadTokens: response.usage.cache_read_input_tokens ?? undefined,
      cacheCreationTokens:
        response.usage.cache_creation_input_tokens ?? undefined,
      modelUsed: response.model,
    };
  }
}

interface RawMessageVariation {
  approach?: string;
  text?: string;
  scores?: {
    actionability: number;
    personalization: number;
    clarity: number;
  };
}

interface RawMarketingVariation {
  approach?: string;
  content?: string;
  hashtags?: string[];
}
