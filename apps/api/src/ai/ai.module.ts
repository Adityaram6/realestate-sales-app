import { Module } from "@nestjs/common";
import { AiService } from "./ai.service";
import { AiController } from "./ai.controller";
import { ClaudeProvider } from "./claude.provider";
import { GroqProvider } from "./groq.provider";
import { AiRateLimitService } from "./ai-rate-limit.service";

/**
 * Both LLM providers are registered unconditionally; AiService picks one at
 * runtime based on `aiProvider` config. This keeps the module declaration
 * simple and makes it cheap to switch providers via an env var without a
 * restart-changing dependency graph.
 */
@Module({
  controllers: [AiController],
  providers: [AiService, ClaudeProvider, GroqProvider, AiRateLimitService],
  exports: [AiService, AiRateLimitService],
})
export class AiModule {}
