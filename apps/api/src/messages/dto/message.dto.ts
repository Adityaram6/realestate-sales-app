import { IsEnum, IsOptional, IsString, MaxLength, MinLength } from "class-validator";
import { MessageChannel } from "@prisma/client";

export class SendMessageDto {
  @IsString()
  leadId!: string;

  @IsOptional()
  @IsString()
  opportunityId?: string;

  @IsEnum(MessageChannel)
  channel!: MessageChannel;

  @IsString()
  @MinLength(1)
  @MaxLength(4000)
  messageText!: string;
}
