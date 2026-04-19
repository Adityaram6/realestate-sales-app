import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import Groq from "groq-sdk";
import type { AppConfig } from "../config/configuration";
import type {
  AiContext,
  MarketingContentVariation,
  MessageVariation,
} from "./ai.engine";
import { validateOutput } from "./ai.engine";
import type { AiIntent, AiTone, MarketingPlatform } from "./dto/ai.dto";
import type { ClaudeCallMetadata } from "./claude.provider";

/**
 * Groq provider — drop-in alternative to ClaudeProvider. Matches the public
 * surface (`generateMessageVariations`, `generateMarketingContent`,
 * `isAvailable`) so AiService can swap between the two via AI_PROVIDER env.
 *
 * Why Groq:
 * - Free tier is usable for demos (no credit card)
 * - LPU inference is ~10x faster than hosted Claude for the same task
 * - OpenAI-compatible JSON mode gives reliable structured output
 *
 * Default model: llama-3.3-70b-versatile — best quality-per-token on Groq as
 * of Apr 2026. Override via GROQ_MODEL if you want llama-3.1-8b-instant for
 * even faster / cheaper calls at some quality cost.
 *
 * Prompt caching isn't available on Groq (LPU regenerates every call), so we
 * reuse the same system + user prompts but report 0 cache tokens.
 */
@Injectable()
export class GroqProvider {
  private readonly logger = new Logger(GroqProvider.name);
  private readonly client: Groq | null;
  private readonly model: string;

  constructor(config: ConfigService<AppConfig, true>) {
    this.model = config.get("groqModel", { infer: true });
    const apiKey = config.get("groqApiKey", { infer: true });
    this.client = apiKey ? new Groq({ apiKey }) : null;
    if (!apiKey) {
      this.logger.warn(
        "GROQ_API_KEY not set — GroqProvider disabled. Set USE_MOCK_AI=true or provide the key.",
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
    if (!this.client) throw new Error("Groq not configured");

    const systemPrompt = this.messageSystemPrompt();
    const userPrompt = this.messageUserPrompt(params);

    const response = await this.client.chat.completions.create({
      model: this.model,
      max_tokens: 1024,
      temperature: 0.7,
      // Groq supports JSON mode via response_format — tells the model to
      // guarantee syntactically valid JSON (frees us from prose-stripping).
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
    });

    const text = this.extractText(response);
    const parsed = this.parseJson<{ variations: RawMessageVariation[] }>(text);

    const validated: MessageVariation[] = [];
    for (const v of parsed?.variations ?? []) {
      if (!v.text) continue;
      const check = validateOutput(v.text);
      if (!check.ok) {
        this.logger.warn(
          `Groq output rejected by controller: ${check.reason} — "${v.text.slice(0, 50)}…"`,
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
    if (!this.client) throw new Error("Groq not configured");

    const systemPrompt = this.marketingSystemPrompt();
    const userPrompt = this.marketingUserPrompt(params);

    const response = await this.client.chat.completions.create({
      model: this.model,
      max_tokens: 2048,
      temperature: 0.8,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
    });

    const text = this.extractText(response);
    const parsed = this.parseJson<{ variations: RawMarketingVariation[] }>(text);
    const variations: MarketingContentVariation[] = (parsed?.variations ?? [])
      .filter((v): v is RawMarketingVariation & { content: string } =>
        Boolean(v?.content),
      )
      .map((v) => ({
        approach: (v.approach ??
          "headline_first") as MarketingContentVariation["approach"],
        content: v.content.trim(),
        hashtags: v.hashtags,
        charCount: v.content.length,
      }));

    return { variations, metadata: this.buildMetadata(response) };
  }

  // ---------- Prompt construction (identical to ClaudeProvider) ----------

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
      "hashtags": ["#tag1", "#tag2"]
    }
  ]
}
Generate exactly 3 variations. Omit hashtags for whatsapp_blast/email_blast. No prose outside the JSON.`;
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

  private extractText(
    response: Groq.Chat.Completions.ChatCompletion,
  ): string {
    return response.choices[0]?.message?.content ?? "";
  }

  private parseJson<T>(text: string): T | null {
    // Groq in JSON mode always returns valid JSON, but strip fences
    // defensively in case the model wraps anyway.
    const cleaned = text
      .replace(/^```json\s*/i, "")
      .replace(/^```\s*/, "")
      .replace(/```\s*$/, "")
      .trim();
    try {
      return JSON.parse(cleaned) as T;
    } catch (err) {
      this.logger.error(
        `Couldn't parse Groq JSON response: ${(err as Error).message}\n${text.slice(0, 500)}`,
      );
      return null;
    }
  }

  private buildMetadata(
    response: Groq.Chat.Completions.ChatCompletion,
  ): ClaudeCallMetadata {
    return {
      inputTokens: response.usage?.prompt_tokens ?? 0,
      outputTokens: response.usage?.completion_tokens ?? 0,
      modelUsed: response.model,
      // Groq has no prompt caching — leave cache fields undefined.
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
