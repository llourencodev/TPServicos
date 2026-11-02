import { Module } from "@nestjs/common";
import { APP_GUARD } from "@nestjs/core";
import { ConfigModule } from "@nestjs/config";
import { ThrottlerGuard, ThrottlerModule } from "@nestjs/throttler";
import { AdminModule } from "./admin/admin.module";
import { AuthModule } from "./auth/auth.module";
import { CategoriesModule } from "./categories/categories.module";
import { PrismaModule } from "./prisma/prisma.module";
import { ProvidersModule } from "./providers/providers.module";
import { RequestsModule } from "./requests/requests.module";
import { WalletModule } from "./wallet/wallet.module";
import { HealthModule } from "./health/health.module";
import { MetricsModule } from "./metrics/metrics.module";
import { RateLimitModule } from "./rate-limit/rate-limit.module";
import { RedisThrottlerStorage } from "./rate-limit/redis-throttler-storage";
import { AdvertisingModule } from "./advertising/advertising.module";
import { NotificationsModule } from "./notifications/notifications.module";
import { ReportsModule } from "./reports/reports.module";

function validateEnvironment(values: Record<string, unknown>) {
  for (const name of [
    "DATABASE_URL",
    "JWT_ACCESS_SECRET",
    "JWT_REFRESH_SECRET",
  ]) {
    if (typeof values[name] !== "string" || !values[name]) {
      throw new Error(`A variável ${name} é obrigatória`);
    }
  }
  for (const name of ["JWT_ACCESS_SECRET", "JWT_REFRESH_SECRET"]) {
    const value = values[name] as string;
    if (value.length < 32 || value.startsWith("replace-")) {
      throw new Error(
        `${name} precisa ser substituída por um segredo aleatório de pelo menos 32 caracteres`,
      );
    }
  }
  const databaseUrl = new URL(values.DATABASE_URL as string);
  if (!["postgres:", "postgresql:"].includes(databaseUrl.protocol)) {
    throw new Error("DATABASE_URL precisa apontar para PostgreSQL");
  }
  const webOrigin = values.WEB_ORIGIN ?? "http://localhost:5180";
  let parsedWebOrigin: URL;
  try {
    parsedWebOrigin = new URL(webOrigin as string);
  } catch {
    throw new Error("WEB_ORIGIN precisa ser uma URL válida");
  }
  if (
    !["http:", "https:"].includes(parsedWebOrigin.protocol) ||
    parsedWebOrigin.pathname !== "/" ||
    parsedWebOrigin.search ||
    parsedWebOrigin.hash
  ) {
    throw new Error("WEB_ORIGIN precisa conter apenas uma origem HTTP(S)");
  }
  const defaultLeadCost = Number(values.DEFAULT_LEAD_CREDIT_COST ?? 5);
  if (
    !Number.isInteger(defaultLeadCost) ||
    defaultLeadCost < 1 ||
    defaultLeadCost > 1000
  ) {
    throw new Error(
      "DEFAULT_LEAD_CREDIT_COST precisa ser um inteiro entre 1 e 1000",
    );
  }
  const proxyHops = Number(values.API_TRUST_PROXY_HOPS ?? 1);
  if (!Number.isInteger(proxyHops) || proxyHops < 0 || proxyHops > 5) {
    throw new Error("API_TRUST_PROXY_HOPS precisa ser um inteiro entre 0 e 5");
  }
  if (
    values.METRICS_TOKEN &&
    (typeof values.METRICS_TOKEN !== "string" ||
      values.METRICS_TOKEN.length < 32)
  ) {
    throw new Error("METRICS_TOKEN precisa ter ao menos 32 caracteres");
  }
  if (values.REDIS_URL) {
    const redisUrl = new URL(values.REDIS_URL as string);
    if (!["redis:", "rediss:"].includes(redisUrl.protocol)) {
      throw new Error("REDIS_URL precisa apontar para Redis");
    }
  }
  return values;
}

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ["../../.env", ".env"],
      validate: validateEnvironment,
    }),
    RateLimitModule,
    MetricsModule,
    ThrottlerModule.forRootAsync({
      imports: [RateLimitModule],
      inject: [RedisThrottlerStorage],
      useFactory: (storage: RedisThrottlerStorage) => ({
        throttlers: [{ ttl: 60_000, limit: 120, blockDuration: 60_000 }],
        storage,
      }),
    }),
    PrismaModule,
    AuthModule,
    CategoriesModule,
    ProvidersModule,
    RequestsModule,
    WalletModule,
    AdminModule,
    AdvertisingModule,
    NotificationsModule,
    ReportsModule,
    HealthModule,
  ],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
