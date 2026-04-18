import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Query,
} from "@nestjs/common";
import { FlowsService } from "./flows.service";
import {
  CreateFlowDto,
  FlowExecutionListFiltersDto,
  FlowListFiltersDto,
  TriggerFlowManualDto,
  UpdateFlowDto,
} from "./dto/flow.dto";
import {
  CurrentUser,
  type AuthenticatedUser,
} from "../common/decorators/current-user.decorator";

@Controller("flows")
export class FlowsController {
  constructor(private readonly flows: FlowsService) {}

  @Get()
  list(@Query() filters: FlowListFiltersDto) {
    return this.flows.list(filters);
  }

  @Get("executions")
  listExecutions(@Query() filters: FlowExecutionListFiltersDto) {
    return this.flows.listExecutions(
      filters.flowId,
      filters.leadId,
      filters.take,
    );
  }

  @Get(":id")
  get(@Param("id") id: string) {
    return this.flows.get(id);
  }

  @Post()
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateFlowDto,
  ) {
    return this.flows.create(user.id, dto);
  }

  @Patch(":id")
  update(@Param("id") id: string, @Body() dto: UpdateFlowDto) {
    return this.flows.update(id, dto);
  }

  @Delete(":id")
  @HttpCode(200)
  async remove(@Param("id") id: string) {
    await this.flows.remove(id);
    return { success: true };
  }

  @Post(":id/trigger")
  trigger(@Param("id") id: string, @Body() dto: TriggerFlowManualDto) {
    return this.flows.triggerManual(id, dto.leadId);
  }
}
