import { Type } from "class-transformer";
import {
  IsArray,
  IsBoolean,
  IsEmail,
  IsEnum,
  IsInt,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from "class-validator";
import { LeadStatus } from "@prisma/client";

const PHONE_REGEX = /^[+\d\s-]{7,}$/;

export class CreateLeadDto {
  @IsString() @MinLength(2) @MaxLength(200) name!: string;

  @IsString()
  @Matches(PHONE_REGEX, { message: "Enter a valid phone number" })
  phone!: string;

  @IsOptional() @IsEmail() email?: string;
  @IsOptional() @IsString() source?: string;
  @IsOptional() @IsNumber() @Min(0) budgetMin?: number;
  @IsOptional() @IsNumber() @Min(0) budgetMax?: number;
  @IsOptional() @IsString() locationPreference?: string;
  @IsOptional() @IsArray() @IsString({ each: true }) tags?: string[];
  @IsOptional() @IsEnum(LeadStatus) status?: LeadStatus;
  @IsOptional() @IsString() assignedToId?: string;

  @IsBoolean()
  consentGiven!: boolean;

  @IsOptional()
  @IsObject()
  customFields?: Record<string, string>;
}

export class UpdateLeadDto {
  @IsOptional() @IsString() @MinLength(2) name?: string;
  @IsOptional() @IsString() @Matches(PHONE_REGEX) phone?: string;
  @IsOptional() @IsEmail() email?: string;
  @IsOptional() @IsString() source?: string;
  @IsOptional() @IsNumber() @Min(0) budgetMin?: number;
  @IsOptional() @IsNumber() @Min(0) budgetMax?: number;
  @IsOptional() @IsString() locationPreference?: string;
  @IsOptional() @IsArray() @IsString({ each: true }) tags?: string[];
  @IsOptional() @IsEnum(LeadStatus) status?: LeadStatus;
  @IsOptional() @IsInt() @Min(0) @Max(100) score?: number;
  @IsOptional() @IsString() assignedToId?: string;
  @IsOptional() @IsBoolean() consentGiven?: boolean;
  @IsOptional() @IsObject() customFields?: Record<string, string>;
}

export class LeadListFiltersDto {
  @IsOptional() @IsString() search?: string;
  @IsOptional() @IsEnum(LeadStatus) status?: LeadStatus;
  @IsOptional() @IsString() location?: string;
  @IsOptional() @IsString() assignedTo?: string;

  @IsOptional() @Type(() => Number) @IsInt() @Min(0) budgetMin?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) budgetMax?: number;

  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(200) pageSize?: number;
}

export class DuplicateCheckQueryDto {
  @IsString() phone!: string;
  @IsOptional() @IsEmail() email?: string;
}

export class BulkUploadRowDto {
  @IsString() name!: string;
  @IsString() phone!: string;
  @IsOptional() @IsEmail() email?: string;
  @IsOptional() @IsString() source?: string;
  @IsOptional() @IsNumber() budgetMin?: number;
  @IsOptional() @IsNumber() budgetMax?: number;
  @IsOptional() @IsString() locationPreference?: string;
  @IsOptional() @IsArray() @IsString({ each: true }) tags?: string[];
  @IsOptional() @IsObject() customFields?: Record<string, string>;

  @IsEnum(["skip", "merge", "create_new"])
  action!: "skip" | "merge" | "create_new";
}

export class BulkUploadDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BulkUploadRowDto)
  rows!: BulkUploadRowDto[];
}
