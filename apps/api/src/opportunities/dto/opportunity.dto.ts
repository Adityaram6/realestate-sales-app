import {
  ArrayMinSize,
  IsArray,
  IsEnum,
  IsOptional,
  IsString,
} from "class-validator";
import { OpportunityStage } from "@prisma/client";

export class OpportunityListFiltersDto {
  @IsOptional() @IsEnum(OpportunityStage) stage?: OpportunityStage;
  @IsOptional() @IsString() projectId?: string;
  @IsOptional() @IsString() leadId?: string;
  @IsOptional() @IsString() assignedTo?: string;
}

export class AttachProjectsDto {
  @IsString() leadId!: string;

  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  projectIds!: string[];
}

export class ChangeStageDto {
  @IsEnum(OpportunityStage)
  stage!: OpportunityStage;
}
