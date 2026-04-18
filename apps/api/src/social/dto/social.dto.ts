import {
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from "class-validator";
import { SocialPlatform, SocialPostStatus } from "@prisma/client";

export class ConnectSocialAccountDto {
  @IsEnum(SocialPlatform)
  platform!: SocialPlatform;

  @IsString()
  @MinLength(1)
  accountName!: string;

  @IsString()
  @MinLength(10)
  accessToken!: string;

  @IsOptional() @IsString() refreshToken?: string;
}

export class CreateSocialPostDto {
  @IsEnum(SocialPlatform)
  platform!: SocialPlatform;

  @IsOptional() @IsString() campaignId?: string;
  @IsOptional() @IsString() socialAccountId?: string;

  @IsString()
  @MinLength(1)
  @MaxLength(4000)
  content!: string;

  @IsOptional() @IsString() mediaUrl?: string;
  @IsOptional() @IsDateString() scheduledAt?: string;
}

export class SocialPostListFiltersDto {
  @IsOptional() @IsEnum(SocialPlatform) platform?: SocialPlatform;
  @IsOptional() @IsEnum(SocialPostStatus) status?: SocialPostStatus;
  @IsOptional() @IsString() campaignId?: string;
}
