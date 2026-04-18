import {
  Controller,
  Get,
  HttpCode,
  HttpException,
  HttpStatus,
  Logger,
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { Public } from "../common/decorators/public.decorator";

/**
 * Railway healthcheck target. Must return 2xx for the instance to stay
 * in-rotation. Returns 503 if the DB ping fails so Railway restarts the
 * container on hard outages.
 */
@Controller("health")
export class HealthController {
  private readonly logger = new Logger(HealthController.name);
  private readonly startedAt = Date.now();

  constructor(private readonly prisma: PrismaService) {}

  @Public()
  @Get()
  @HttpCode(200)
  async check() {
    const uptimeSeconds = Math.floor((Date.now() - this.startedAt) / 1000);
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return {
        status: "ok",
        db: "up",
        uptimeSeconds,
        timestamp: new Date().toISOString(),
      };
    } catch (err) {
      this.logger.error(`Health check failed: ${(err as Error).message}`);
      throw new HttpException(
        {
          status: "degraded",
          db: "down",
          error: (err as Error).message,
          uptimeSeconds,
          timestamp: new Date().toISOString(),
        },
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }
  }
}
