import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  MinLength,
} from "class-validator";
import { ActivityType } from "@prisma/client";

export class CreateActivityDto {
  @IsString() leadId!: string;

  @IsOptional()
  @IsString()
  opportunityId?: string;

  @IsEnum(ActivityType)
  type!: ActivityType;

  @IsString()
  @MinLength(1)
  @MaxLength(200)
  title!: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  durationMinutes?: number;

  @IsOptional()
  @IsString()
  outcome?: string;
}
