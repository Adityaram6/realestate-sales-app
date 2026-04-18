import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Redis } from "ioredis";
import type { AppConfig } from "../config/configuration";

export interface RateLimitSnapshot {
  requestsUsed: number;
  requestsRemaining: number;
  tokensUsed: number;
  tokensRemaining: number;
  resetsAt: string; // ISO
}

export class AiRateLimitExceededError extends Error {
  constructor(
    public readonly kind: "requests" | "tokens",
    public readonly snapshot: RateLimitSnapshot,
  ) {
    super(
      kind === "requests"
        ? `Daily AI request limit reached (${snapshot.requestsUsed}/${snapshot.requestsUsed + snapshot.requestsRemaining}). Resets at ${snapshot.resetsAt}.`
        : `Daily AI token budget exhausted (${snapshot.tokensUsed}/${snapshot.tokensUsed + snapshot.tokensRemaining}). Resets at ${snapshot.resetsAt}.`,
    );
  }
}

/**
 * Per-user-per-day counter-based rate limiter, backed by Redis. Keys expire
 * 24h after creation so stale counters self-clean. Counts:
 *   - requests (one per AI call — capped by AI_DAILY_REQUEST_LIMIT)
 *   - tokens (input + output from Claude response — capped by AI_DAILY_TOKEN_LIMIT)
 *
 * When USE_MOCK_AI=true, limits are still enforced so frontend testing
 * surfaces the 429 flow before flipping to real Claude.
 */
@Injectable()
export class AiRateLimitService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(AiRateLimitService.name);
  private redis: Redis | null = null;
  private readonly requestLimit: number;
  private readonly tokenLimit: number;
  private readonly redisHost: string;
  private readonly redisPort: number;
  private readonly redisPassword?: string;

  constructor(config: ConfigService<AppConfig, true>) {
    const limits = config.get("aiRateLimits", { infer: true });
    this.requestLimit = limits.dailyRequestLimit;
    this.tokenLimit = limits.dailyTokenLimit;
    const redis = config.get("redis", { infer: true });
    this.redisHost = redis.host;
    this.redisPort = redis.port;
    this.redisPassword = redis.password;
  }

  onModuleInit() {
    this.redis = new Redis({
      host: this.redisHost,
      port: this.redisPort,
      password: this.redisPassword,
      lazyConnect: true,
      maxRetriesPerRequest: 2,
    });
    this.redis.connect().catch((err) => {
      this.logger.warn(
        `Redis connect failed — rate limiter will fail-open: ${(err as Error).message}`,
      );
    });
  }

  onModuleDestroy() {
    this.redis?.disconnect();
  }

  async checkAndReserveRequest(userId: string): Promise<RateLimitSnapshot> {
    if (!this.redis) return this.failOpenSnapshot();

    const { requestsKey, tokensKey, resetsAt } = this.keysFor(userId);

    let requestsUsed: number;
    try {
      requestsUsed = await this.redis.incr(requestsKey);
      await this.redis.expireat(
        requestsKey,
        Math.floor(resetsAt.getTime() / 1000),
      );
    } catch (err) {
      this.logger.warn(
        `Redis incr failed — failing open: ${(err as Error).message}`,
      );
      return this.failOpenSnapshot();
    }

    const tokensUsed = Number((await this.redis.get(tokensKey)) ?? "0");

    const snapshot: RateLimitSnapshot = {
      requestsUsed,
      requestsRemaining: Math.max(0, this.requestLimit - requestsUsed),
      tokensUsed,
      tokensRemaining: Math.max(0, this.tokenLimit - tokensUsed),
      resetsAt: resetsAt.toISOString(),
    };

    if (requestsUsed > this.requestLimit) {
      // Undo the increment so the counter reflects actual usage when the user
      // retries tomorrow.
      await this.redis.decr(requestsKey).catch(() => undefined);
      snapshot.requestsUsed = requestsUsed - 1;
      snapshot.requestsRemaining = Math.max(
        0,
        this.requestLimit - snapshot.requestsUsed,
      );
      throw new AiRateLimitExceededError("requests", snapshot);
    }
    if (tokensUsed >= this.tokenLimit) {
      throw new AiRateLimitExceededError("tokens", snapshot);
    }
    return snapshot;
  }

  async recordTokens(userId: string, tokens: number): Promise<void> {
    if (!this.redis || tokens <= 0) return;
    const { tokensKey, resetsAt } = this.keysFor(userId);
    try {
      await this.redis.incrby(tokensKey, tokens);
      await this.redis.expireat(
        tokensKey,
        Math.floor(resetsAt.getTime() / 1000),
      );
    } catch (err) {
      this.logger.warn(
        `Redis token record failed: ${(err as Error).message}`,
      );
    }
  }

  async snapshot(userId: string): Promise<RateLimitSnapshot> {
    if (!this.redis) return this.failOpenSnapshot();
    const { requestsKey, tokensKey, resetsAt } = this.keysFor(userId);
    const [r, t] = await Promise.all([
      this.redis.get(requestsKey),
      this.redis.get(tokensKey),
    ]);
    const requestsUsed = Number(r ?? "0");
    const tokensUsed = Number(t ?? "0");
    return {
      requestsUsed,
      requestsRemaining: Math.max(0, this.requestLimit - requestsUsed),
      tokensUsed,
      tokensRemaining: Math.max(0, this.tokenLimit - tokensUsed),
      resetsAt: resetsAt.toISOString(),
    };
  }

  private keysFor(userId: string) {
    const date = new Date();
    const dayKey = `${date.getUTCFullYear()}-${date.getUTCMonth() + 1}-${date.getUTCDate()}`;
    const resetsAt = new Date(
      Date.UTC(
        date.getUTCFullYear(),
        date.getUTCMonth(),
        date.getUTCDate() + 1,
      ),
    );
    return {
      requestsKey: `ai:rl:req:${userId}:${dayKey}`,
      tokensKey: `ai:rl:tok:${userId}:${dayKey}`,
      resetsAt,
    };
  }

  private failOpenSnapshot(): RateLimitSnapshot {
    // When Redis is down, don't block the call. Operators see the warning log.
    return {
      requestsUsed: 0,
      requestsRemaining: this.requestLimit,
      tokensUsed: 0,
      tokensRemaining: this.tokenLimit,
      resetsAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    };
  }
}
