import { Type } from "class-transformer";
import {
  ArrayMaxSize,
  IsArray,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from "class-validator";
import { ProjectStatus, PropertyStatus } from "@prisma/client";

export class CreateProjectDto {
  @IsString()
  @MinLength(2)
  @MaxLength(200)
  name!: string;

  @IsString()
  @MinLength(2)
  locationText!: string;

  @IsOptional()
  @IsNumber()
  @Min(-90)
  @Max(90)
  latitude?: number;

  @IsOptional()
  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude?: number;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @IsString()
  propertyType!: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(30)
  @IsString({ each: true })
  tags?: string[];

  @IsOptional()
  @IsEnum(ProjectStatus)
  status?: ProjectStatus;
}

export class UpdateProjectDto {
  @IsOptional() @IsString() @MinLength(2) name?: string;
  @IsOptional() @IsString() @MinLength(2) locationText?: string;
  @IsOptional() @IsNumber() latitude?: number;
  @IsOptional() @IsNumber() longitude?: number;
  @IsOptional() @IsString() @MaxLength(2000) description?: string;
  @IsOptional() @IsString() propertyType?: string;
  @IsOptional() @IsArray() @IsString({ each: true }) tags?: string[];
  @IsOptional() @IsEnum(ProjectStatus) status?: ProjectStatus;
}

export class ProjectListFiltersDto {
  @IsOptional() @IsString() search?: string;
  @IsOptional() @IsString() location?: string;
  @IsOptional() @IsString() tag?: string;
  @IsOptional() @IsEnum(ProjectStatus) status?: ProjectStatus;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(200)
  pageSize?: number;
}

export class CreatePropertyDto {
  @IsString()
  @MinLength(1)
  unitNumber!: string;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  size!: number;

  @IsString()
  sizeUnit!: "sqft" | "sqyd";

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  price!: number;

  @IsOptional()
  @IsString()
  facing?: string;

  @IsOptional()
  @IsEnum(PropertyStatus)
  status?: PropertyStatus;
}

export class UpdatePropertyDto {
  @IsOptional() @IsString() unitNumber?: string;
  @IsOptional() @Type(() => Number) @IsNumber() size?: number;
  @IsOptional() @IsString() sizeUnit?: "sqft" | "sqyd";
  @IsOptional() @Type(() => Number) @IsNumber() price?: number;
  @IsOptional() @IsString() facing?: string;
  @IsOptional() @IsEnum(PropertyStatus) status?: PropertyStatus;
}

export class CreateDocumentDto {
  @IsString() fileName!: string;
  @IsString() fileType!: "brochure" | "layout" | "legal" | "media";
  @IsString() mimeType!: string;
  @Type(() => Number) @IsInt() @Min(0) fileSize!: number;

  @IsOptional()
  @IsString()
  fileUrl?: string; // signed URL from S3 upload; for mock we synthesise
}
