import { Body, Controller, Get, Post } from "@nestjs/common";
import { AiService } from "./ai.service";
import {
  GenerateContentDto,
  GenerateMessageDto,
  ScoreDto,
  StrategyDto,
} from "./dto/ai.dto";
import {
  CurrentUser,
  type AuthenticatedUser,
} from "../common/decorators/current-user.decorator";

@Controller("ai")
export class AiController {
  constructor(private readonly ai: AiService) {}

  @Post("generate-message")
  generate(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: GenerateMessageDto,
  ) {
    return this.ai.generateMessage(user.id, dto);
  }

  @Post("recommendation")
  strategy(@Body() dto: StrategyDto) {
    return this.ai.strategy(dto);
  }

  @Post("score-lead")
  score(@Body() dto: ScoreDto) {
    return this.ai.score(dto);
  }

  @Post("generate-content")
  generateContent(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: GenerateContentDto,
  ) {
    return this.ai.generateContent(user.id, dto);
  }

  @Get("usage")
  usage(@CurrentUser() user: AuthenticatedUser) {
    return this.ai.getUsage(user.id);
  }
}
