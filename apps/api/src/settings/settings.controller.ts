import { Body, Controller, Get, Param, Patch, UseGuards } from "@nestjs/common";
import { UserRole } from "@prisma/client";
import { SettingsService } from "./settings.service";
import {
  ReorderStagesDto,
  UpdateIntegrationDto,
} from "./dto/settings.dto";
import { Roles } from "../common/decorators/roles.decorator";
import { RolesGuard } from "../common/guards/roles.guard";

@Controller()
@UseGuards(RolesGuard)
export class SettingsController {
  constructor(private readonly settings: SettingsService) {}

  @Get("integrations")
  integrations() {
    return this.settings.listIntegrations();
  }

  @Patch("integrations/:type")
  @Roles(UserRole.ADMIN)
  updateIntegration(
    @Param("type") type: string,
    @Body() dto: UpdateIntegrationDto,
  ) {
    return this.settings.updateIntegration(type, dto.config);
  }

  @Get("settings/pipeline-stages")
  stages() {
    return this.settings.listPipelineStages();
  }

  @Patch("settings/pipeline-stages/reorder")
  @Roles(UserRole.ADMIN)
  reorder(@Body() dto: ReorderStagesDto) {
    return this.settings.reorderStages(dto.orderedIds);
  }
}
