import { Module } from "@nestjs/common";
import { MessagesService } from "./messages.service";
import { MessagesController } from "./messages.controller";
import { SmsProvider } from "./providers/sms.provider";

@Module({
  controllers: [MessagesController],
  providers: [MessagesService, SmsProvider],
  exports: [MessagesService, SmsProvider],
})
export class MessagesModule {}
