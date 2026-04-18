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
  UseGuards,
} from "@nestjs/common";
import { UserRole } from "@prisma/client";
import { LeadsService } from "./leads.service";
import { Roles } from "../common/decorators/roles.decorator";
import { RolesGuard } from "../common/guards/roles.guard";
import {
  CurrentUser,
  type AuthenticatedUser,
} from "../common/decorators/current-user.decorator";
import {
  BulkUploadDto,
  CreateLeadDto,
  DuplicateCheckQueryDto,
  LeadListFiltersDto,
  UpdateLeadDto,
} from "./dto/lead.dto";

@Controller("leads")
export class LeadsController {
  constructor(private readonly leads: LeadsService) {}

  @Get()
  list(@Query() filters: LeadListFiltersDto) {
    return this.leads.list(filters);
  }

  @Get("duplicate-check")
  duplicate(@Query() query: DuplicateCheckQueryDto) {
    return this.leads.checkDuplicate(query.phone, query.email);
  }

  @Get(":id")
  get(@Param("id") id: string) {
    return this.leads.get(id);
  }

  @Post()
  create(@Body() dto: CreateLeadDto) {
    return this.leads.create(dto);
  }

  @Patch(":id")
  update(@Param("id") id: string, @Body() dto: UpdateLeadDto) {
    return this.leads.update(id, dto);
  }

  @Delete(":id")
  @HttpCode(200)
  async remove(@Param("id") id: string) {
    await this.leads.softDelete(id);
    return { success: true };
  }

  /**
   * DPDP "Right to Erasure" — admin-only hard anonymization.
   * Keeps the row (so history stays referentially valid) but zeroes out
   * all PII and writes an audit entry.
   */
  @Post(":id/anonymize")
  @Roles(UserRole.ADMIN)
  @UseGuards(RolesGuard)
  @HttpCode(200)
  async anonymize(
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
  ) {
    await this.leads.anonymize(id, user.id);
    return { success: true };
  }

  @Post("bulk-upload")
  bulkUpload(@Body() dto: BulkUploadDto) {
    return this.leads.bulkUpload(dto);
  }
}
