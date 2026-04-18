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
import { CampaignStatus } from "@prisma/client";
import { CampaignsService } from "./campaigns.service";
import { CampaignsQueueService } from "../queue/campaigns-queue.service";
import {
  AddCampaignMessageDto,
  AssignAudienceDto,
  CampaignListFiltersDto,
  CreateCampaignDto,
  ExecuteCampaignDto,
  UpdateCampaignDto,
} from "./dto/campaign.dto";
import {
  CurrentUser,
  type AuthenticatedUser,
} from "../common/decorators/current-user.decorator";

@Controller("campaigns")
export class CampaignsController {
  constructor(
    private readonly campaigns: CampaignsService,
    private readonly queue: CampaignsQueueService,
  ) {}

  @Get()
  list(@Query() filters: CampaignListFiltersDto) {
    return this.campaigns.list(filters);
  }

  @Get(":id")
  get(@Param("id") id: string) {
    return this.campaigns.get(id);
  }

  @Post()
  async create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateCampaignDto,
  ) {
    const campaign = await this.campaigns.create(user.id, dto);
    await this.syncSchedule(campaign.id, user.id, dto.startDate);
    return campaign;
  }

  @Patch(":id")
  async update(
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
    @Body() dto: UpdateCampaignDto,
  ) {
    const campaign = await this.campaigns.update(id, dto);
    await this.syncSchedule(
      campaign.id,
      user.id,
      dto.startDate,
      campaign.status,
    );
    return campaign;
  }

  @Delete(":id")
  @HttpCode(200)
  async remove(@Param("id") id: string) {
    await this.queue.cancelScheduled(id);
    await this.campaigns.remove(id);
    return { success: true };
  }

  @Get(":id/analytics")
  analytics(@Param("id") id: string) {
    return this.campaigns.analytics(id);
  }

  @Get(":id/audience")
  listAudience(@Param("id") id: string) {
    return this.campaigns.listAudience(id);
  }

  @Post(":id/audience")
  assignAudience(@Param("id") id: string, @Body() dto: AssignAudienceDto) {
    return this.campaigns.assignAudience(id, dto);
  }

  @Delete(":id/audience/:leadId")
  @HttpCode(200)
  async removeAudience(
    @Param("id") id: string,
    @Param("leadId") leadId: string,
  ) {
    await this.campaigns.removeAudienceMember(id, leadId);
    return { success: true };
  }

  @Post(":id/messages")
  addMessage(@Param("id") id: string, @Body() dto: AddCampaignMessageDto) {
    return this.campaigns.addMessage(id, dto);
  }

  @Delete("messages/:messageId")
  @HttpCode(200)
  async deleteMessage(@Param("messageId") messageId: string) {
    await this.campaigns.deleteMessage(messageId);
    return { success: true };
  }

  @Post(":id/execute")
  async execute(
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
    @Body() dto: ExecuteCampaignDto,
  ) {
    // Manual execute cancels any pending scheduled job — prevents double-sends.
    await this.queue.cancelScheduled(id);
    return this.campaigns.execute(user.id, id, dto);
  }

  private async syncSchedule(
    campaignId: string,
    userId: string,
    startDate?: string,
    status?: CampaignStatus,
  ) {
    if (!startDate) {
      await this.queue.cancelScheduled(campaignId);
      return;
    }
    if (
      status === CampaignStatus.COMPLETED ||
      status === CampaignStatus.FAILED
    ) {
      await this.queue.cancelScheduled(campaignId);
      return;
    }
    await this.queue.scheduleExecution(
      campaignId,
      userId,
      new Date(startDate),
    );
  }
}
