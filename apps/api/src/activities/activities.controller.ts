import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
} from "@nestjs/common";
import { ActivitiesService, type TimelineKind } from "./activities.service";
import { CreateActivityDto } from "./dto/activity.dto";
import {
  CurrentUser,
  type AuthenticatedUser,
} from "../common/decorators/current-user.decorator";

@Controller()
export class ActivitiesController {
  constructor(private readonly activities: ActivitiesService) {}

  @Get("leads/:id/timeline")
  timeline(
    @Param("id") id: string,
    @Query("types") typesParam?: string,
    @Query("since") sinceParam?: string,
  ) {
    const types = typesParam
      ? (typesParam
          .split(",")
          .map((s) => s.trim())
          .filter((s): s is TimelineKind =>
            ["activity", "message", "stage_change"].includes(s),
          ) as TimelineKind[])
      : undefined;
    const since = sinceParam ? new Date(sinceParam) : undefined;
    return this.activities.timeline(id, { types, since });
  }

  @Post("activities")
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateActivityDto,
  ) {
    return this.activities.create(user.id, dto);
  }
}
