import { Injectable, Logger, OnApplicationShutdown } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { ThrottlerStorage, ThrottlerStorageService } from "@nestjs/throttler";
import Redis from "ioredis";
import { MetricsService } from "../metrics/metrics.service";

const incrementScript = `
local blockTtl = redis.call('PTTL', KEYS[2])
local hits = tonumber(redis.call('GET', KEYS[1]) or '0')
local ttl = redis.call('PTTL', KEYS[1])
if blockTtl > 0 then
  return { hits, math.max(ttl, 0), 1, blockTtl }
end
hits = redis.call('INCR', KEYS[1])
ttl = redis.call('PTTL', KEYS[1])
if hits == 1 or ttl < 0 then
  redis.call('PEXPIRE', KEYS[1], ARGV[1])
  ttl = tonumber(ARGV[1])
end
local blocked = 0
local blockExpiry = 0
if hits > tonumber(ARGV[2]) and tonumber(ARGV[3]) > 0 then
  redis.call('SET', KEYS[2], '1', 'PX', ARGV[3])
  blocked = 1
  blockExpiry = tonumber(ARGV[3])
end
return { hits, math.max(ttl, 0), blocked, blockExpiry }
`;

type ThrottlerRecord = {
  totalHits: number;
  timeToExpire: number;
  isBlocked: boolean;
  timeToBlockExpire: number;
};

@Injectable()
export class RedisThrottlerStorage
  implements ThrottlerStorage, OnApplicationShutdown
{
  private readonly logger = new Logger(RedisThrottlerStorage.name);
  private readonly redis: Redis;
  private readonly localFallback = new ThrottlerStorageService();
  private warnedAboutFallback = false;

  constructor(
    config: ConfigService,
    private readonly metrics: MetricsService,
  ) {
    this.redis = new Redis(
      config.get<string>("REDIS_URL") ?? "redis://127.0.0.1:6379",
      {
        lazyConnect: true,
        connectTimeout: 1_000,
        commandTimeout: 1_000,
        maxRetriesPerRequest: 1,
        enableOfflineQueue: false,
        retryStrategy: (attempt) => Math.min(attempt * 250, 2_500),
      },
    );
    this.redis.on("error", () => this.noteFallback());
    this.redis.on("ready", () => {
      this.warnedAboutFallback = false;
    });
  }

  async increment(
    key: string,
    ttl: number,
    limit: number,
    blockDuration: number,
    throttlerName: string,
  ): Promise<ThrottlerRecord> {
    try {
      const suffix = `${key}:${throttlerName}`;
      const result = (await this.redis.eval(
        incrementScript,
        2,
        `tp:throttle:${suffix}:hits`,
        `tp:throttle:${suffix}:blocked`,
        String(ttl),
        String(limit),
        String(blockDuration),
      )) as [number, number, number, number];
      return {
        totalHits: Number(result[0]),
        timeToExpire: Number(result[1]),
        isBlocked: Number(result[2]) === 1,
        timeToBlockExpire: Number(result[3]),
      };
    } catch {
      this.metrics.recordRateLimitFallback();
      this.noteFallback();
      return this.localFallback.increment(
        key,
        ttl,
        limit,
        blockDuration,
        throttlerName,
      );
    }
  }

  onApplicationShutdown() {
    this.localFallback.onApplicationShutdown();
    this.redis.disconnect();
  }

  private noteFallback() {
    if (this.warnedAboutFallback) return;
    this.warnedAboutFallback = true;
    this.logger.warn(
      "Redis indisponível; limite de requisições temporariamente local a este processo.",
    );
  }
}
