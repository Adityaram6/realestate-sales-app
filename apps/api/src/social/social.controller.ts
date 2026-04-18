import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import { UserRole } from "@prisma/client";
import { SocialService } from "./social.service";
import {
  ConnectSocialAccountDto,
  CreateSocialPostDto,
  SocialPostListFiltersDto,
} from "./dto/social.dto";
import { Roles } from "../common/decorators/roles.decorator";
import { RolesGuard } from "../common/guards/roles.guard";
import {
  CurrentUser,
  type AuthenticatedUser,
} from "../common/decorators/current-user.decorator";

@Controller()
@UseGuards(RolesGuard)
export class SocialController {
  constructor(private readonly social: SocialService) {}

  @Get("social/accounts")
  listAccounts() {
    return this.social.listAccounts();
  }

  @Post("social/accounts")
  @Roles(UserRole.ADMIN)
  connect(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: ConnectSocialAccountDto,
  ) {
    return this.social.connect(user.id, dto);
  }

  @Delete("social/accounts/:id")
  @Roles(UserRole.ADMIN)
  @HttpCode(200)
  async disconnect(@Param("id") id: string) {
    await this.social.disconnect(id);
    return { success: true };
  }

  @Get("social/posts")
  listPosts(@Query() filters: SocialPostListFiltersDto) {
    return this.social.listPosts(filters);
  }

  @Post("social/posts")
  createPost(@Body() dto: CreateSocialPostDto) {
    return this.social.createPost(dto);
  }

  @Post("social/posts/:id/publish")
  publish(@Param("id") id: string) {
    return this.social.publish(id);
  }

  @Delete("social/posts/:id")
  @HttpCode(200)
  async deletePost(@Param("id") id: string) {
    await this.social.deletePost(id);
    return { success: true };
  }
}
