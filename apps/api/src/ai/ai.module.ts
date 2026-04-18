import { Module } from "@nestjs/common";
import { AiService } from "./ai.service";
import { AiController } from "./ai.controller";
import { ClaudeProvider } from "./claude.provider";
import { AiRateLimitService } from "./ai-rate-limit.service";

@Module({
  controllers: [AiController],
  providers: [AiService, ClaudeProvider, AiRateLimitService],
  exports: [AiService, AiRateLimitService],
})
export class AiModule {}
