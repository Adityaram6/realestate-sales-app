import { Type } from "class-transformer";
import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from "class-validator";
import {
  FlowStepType,
  FlowTriggerType,
  OpportunityStage,
} from "@prisma/client";

export class FlowStepDto {
  @IsEnum(FlowStepType)
  type!: FlowStepType;

  @IsObject()
  config!: Record<string, unknown>;
}

export class CreateFlowDto {
  @IsString() @MinLength(2) @MaxLength(200) name!: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsString() campaignId?: string;

  @IsEnum(FlowTriggerType)
  trigger!: FlowTriggerType;

  @IsOptional()
  @IsObject()
  triggerConfig?: {
    fromStage?: OpportunityStage;
    toStage?: OpportunityStage;
    scheduledAt?: string;
  };

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => FlowStepDto)
  steps!: FlowStepDto[];
}

export class UpdateFlowDto {
  @IsOptional() @IsString() name?: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsBoolean() isActive?: boolean;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => FlowStepDto)
  steps?: FlowStepDto[];
}

export class TriggerFlowManualDto {
  @IsString() leadId!: string;
}

export class FlowListFiltersDto {
  @IsOptional() @IsEnum(FlowTriggerType) trigger?: FlowTriggerType;
  @IsOptional() @IsBoolean() @Type(() => Boolean) isActive?: boolean;
  @IsOptional() @IsString() campaignId?: string;
}

export class FlowExecutionListFiltersDto {
  @IsOptional() @IsString() flowId?: string;
  @IsOptional() @IsString() leadId?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  take?: number;
}
