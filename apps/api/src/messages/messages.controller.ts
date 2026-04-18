import { Body, Controller, Get, Param, Post } from "@nestjs/common";
import { MessagesService } from "./messages.service";
import { SendMessageDto } from "./dto/message.dto";
import {
  CurrentUser,
  type AuthenticatedUser,
} from "../common/decorators/current-user.decorator";

@Controller()
export class MessagesController {
  constructor(private readonly messages: MessagesService) {}

  @Get("leads/:id/messages")
  list(@Param("id") id: string) {
    return this.messages.listForLead(id);
  }

  @Post("messages/send")
  send(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: SendMessageDto,
  ) {
    return this.messages.send(user.id, dto);
  }
}
