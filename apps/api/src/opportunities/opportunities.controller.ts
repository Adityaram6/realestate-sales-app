import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from "@nestjs/common";
import { OpportunitiesService } from "./opportunities.service";
import {
  AttachProjectsDto,
  ChangeStageDto,
  OpportunityListFiltersDto,
} from "./dto/opportunity.dto";
import {
  CurrentUser,
  type AuthenticatedUser,
} from "../common/decorators/current-user.decorator";

@Controller()
export class OpportunitiesController {
  constructor(private readonly opportunities: OpportunitiesService) {}

  @Get("opportunities")
  list(@Query() filters: OpportunityListFiltersDto) {
    return this.opportunities.list(filters);
  }

  @Get("opportunities/:id")
  get(@Param("id") id: string) {
    return this.opportunities.get(id);
  }

  @Post("opportunities/attach")
  attach(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: AttachProjectsDto,
  ) {
    return this.opportunities.attach(user.id, dto);
  }

  @Patch("opportunities/:id/stage")
  changeStage(
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
    @Body() dto: ChangeStageDto,
  ) {
    return this.opportunities.changeStage(user.id, id, dto.stage);
  }

  @Get("leads/:id/opportunities")
  forLead(@Param("id") id: string) {
    return this.opportunities.forLead(id);
  }

  @Get("projects/:id/opportunities")
  forProject(@Param("id") id: string) {
    return this.opportunities.forProject(id);
  }
}
