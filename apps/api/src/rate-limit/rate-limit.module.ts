import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { MetricsModule } from "../metrics/metrics.module";
import { RedisThrottlerStorage } from "./redis-throttler-storage";

@Module({
  imports: [ConfigModule, MetricsModule],
  providers: [RedisThrottlerStorage],
  exports: [RedisThrottlerStorage],
})
export class RateLimitModule {}
