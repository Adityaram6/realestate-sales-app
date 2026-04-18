import { Type } from "class-transformer";
import {
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsEnum,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from "class-validator";
import {
  CampaignMessageStatus,
  CampaignStatus,
  CampaignType,
  LeadStatus,
  MessageChannel,
} from "@prisma/client";

export class AudienceFilterDto {
  @IsOptional() @IsEnum(LeadStatus) status?: LeadStatus;
  @IsOptional() @IsArray() @IsString({ each: true }) tags?: string[];
  @IsOptional() @IsString() projectId?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(100)
  minScore?: number;

  @IsOptional() @IsString() source?: string;
}

export class CreateCampaignDto {
  @IsString() @MinLength(2) @MaxLength(200) name!: string;
  @IsOptional() @IsString() @MaxLength(2000) description?: string;
  @IsOptional() @IsString() projectId?: string;

  @IsEnum(CampaignType)
  type!: CampaignType;

  @IsOptional()
  @ValidateNested()
  @Type(() => AudienceFilterDto)
  audienceFilter?: AudienceFilterDto;

  @IsOptional() @IsDateString() startDate?: string;
  @IsOptional() @IsDateString() endDate?: string;
}

export class UpdateCampaignDto {
  @IsOptional() @IsString() @MinLength(2) name?: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsString() projectId?: string;
  @IsOptional() @IsEnum(CampaignType) type?: CampaignType;
  @IsOptional() @IsEnum(CampaignStatus) status?: CampaignStatus;

  @IsOptional()
  @ValidateNested()
  @Type(() => AudienceFilterDto)
  audienceFilter?: AudienceFilterDto;

  @IsOptional() @IsDateString() startDate?: string;
  @IsOptional() @IsDateString() endDate?: string;
}

export class AssignAudienceDto {
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  leadIds?: string[];

  @IsOptional()
  @ValidateNested()
  @Type(() => AudienceFilterDto)
  filter?: AudienceFilterDto;
}

export class AddCampaignMessageDto {
  @IsEnum(MessageChannel)
  channel!: MessageChannel;

  @IsString() @MinLength(1) @MaxLength(4000) content!: string;
  @IsOptional() @IsString() mediaUrl?: string;
  @IsOptional() @IsDateString() scheduledAt?: string;
  @IsOptional() @IsEnum(CampaignMessageStatus) status?: CampaignMessageStatus;
}

export class ExecuteCampaignDto {
  // Dry-run returns what would be sent without writing Message rows or
  // marking audience entries sent. Useful for the review-before-launch UI.
  @IsOptional()
  @Type(() => Boolean)
  dryRun?: boolean;
}

export class CampaignListFiltersDto {
  @IsOptional() @IsEnum(CampaignStatus) status?: CampaignStatus;
  @IsOptional() @IsEnum(CampaignType) type?: CampaignType;
  @IsOptional() @IsString() projectId?: string;
  @IsOptional() @IsString() search?: string;
}
