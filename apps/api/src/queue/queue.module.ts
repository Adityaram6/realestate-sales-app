import { Module } from "@nestjs/common";
import { BullModule } from "@nestjs/bullmq";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { Redis } from "ioredis";
import type { AppConfig } from "../config/configuration";
import { CampaignsQueueService } from "./campaigns-queue.service";
import { CampaignsProcessor } from "./campaigns.processor";
import { FlowsQueueService, FLOW_QUEUE } from "./flows-queue.service";
import { FlowsProcessor } from "./flows.processor";

export const CAMPAIGN_QUEUE = "campaigns";

/**
 * Queue module — explicitly imported by consuming modules (CampaignsModule,
 * FlowsModule) rather than global. Being @Global interacts badly with
 * @nestjs/bullmq's internal provider scan and triggers a false circular
 * dependency error during module bootstrap.
 *
 * Processors still use ModuleRef to fetch domain services at runtime —
 * that's what avoids the actual circular (QueueModule → service → QueueModule).
 */
@Module({
  imports: [
    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService<AppConfig, true>) => {
        const redis = config.get("redis", { infer: true });
        // If a full URL is provided (e.g. Upstash rediss://…) construct the
        // IORedis instance ourselves — ioredis picks up TLS from the rediss://
        // scheme. Otherwise fall back to discrete host/port/password.
        const connection = redis.url
          ? new Redis(redis.url, {
              maxRetriesPerRequest: null,
              enableReadyCheck: false,
            })
          : {
              host: redis.host,
              port: redis.port,
              password: redis.password,
            };
        return { connection };
      },
    }),
    BullModule.registerQueue({
      name: CAMPAIGN_QUEUE,
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: "exponential", delay: 5000 },
        removeOnComplete: { age: 60 * 60 * 24, count: 1000 },
        removeOnFail: { age: 60 * 60 * 24 * 7 },
      },
    }),
    BullModule.registerQueue({
      name: FLOW_QUEUE,
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: "exponential", delay: 10_000 },
        removeOnComplete: { age: 60 * 60 * 24 * 7, count: 5000 },
        removeOnFail: { age: 60 * 60 * 24 * 14 },
      },
    }),
  ],
  providers: [
    CampaignsQueueService,
    CampaignsProcessor,
    FlowsQueueService,
    FlowsProcessor,
  ],
  exports: [CampaignsQueueService, FlowsQueueService],
})
export class QueueModule {}
