import { IsEnum, IsOptional, IsString } from "class-validator";

export const AiIntent = {
  FOLLOW_UP: "follow_up",
  SITE_VISIT: "site_visit",
  NEGOTIATION: "negotiation",
  CLOSING: "closing",
  RE_ENGAGEMENT: "re_engagement",
  CROSS_SELL: "cross_sell",
} as const;
export type AiIntent = (typeof AiIntent)[keyof typeof AiIntent];

export const AiTone = {
  PROFESSIONAL: "professional",
  FRIENDLY: "friendly",
  AGGRESSIVE: "aggressive",
} as const;
export type AiTone = (typeof AiTone)[keyof typeof AiTone];

export class GenerateMessageDto {
  @IsString() leadId!: string;
  @IsOptional() @IsString() opportunityId?: string;

  @IsEnum(AiIntent)
  intent!: AiIntent;

  @IsEnum(AiTone)
  tone!: AiTone;
}

export class StrategyDto {
  @IsString() leadId!: string;
  @IsOptional() @IsString() opportunityId?: string;
}

export class ScoreDto {
  @IsString() leadId!: string;
}

export const MarketingPlatform = {
  FACEBOOK: "facebook",
  INSTAGRAM: "instagram",
  LINKEDIN: "linkedin",
  WHATSAPP_BLAST: "whatsapp_blast",
  EMAIL_BLAST: "email_blast",
} as const;
export type MarketingPlatform =
  (typeof MarketingPlatform)[keyof typeof MarketingPlatform];

export class GenerateContentDto {
  @IsString() projectId!: string;

  @IsEnum(MarketingPlatform)
  platform!: MarketingPlatform;

  @IsOptional() @IsString() targetAudience?: string;

  @IsOptional()
  @IsEnum(AiTone)
  tone?: AiTone;
}
