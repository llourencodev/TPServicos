import { ValidationPipe } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { randomUUID } from "node:crypto";
import type { NextFunction, Request, Response } from "express";
import helmet from "helmet";
import { AppModule } from "./app.module";
import { MetricsService } from "./metrics/metrics.service";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.use(helmet());
  app.setGlobalPrefix("api");
  app
    .getHttpAdapter()
    .getInstance()
    .set("trust proxy", Number(process.env.API_TRUST_PROXY_HOPS ?? 1));
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  const webOrigin = new URL(process.env.WEB_ORIGIN ?? "http://localhost:5180")
    .origin;
  app.enableCors({
    origin: webOrigin,
    credentials: true,
    exposedHeaders: ["X-Request-ID"],
  });
  const metrics = app.get(MetricsService);
  app.use((request: Request, response: Response, next: NextFunction) => {
    const startedAt = process.hrtime.bigint();
    const requestId = randomUUID();
    const shouldTrack = request.path !== "/api/metrics";
    let finished = false;
    if (shouldTrack) metrics.beginRequest();
    response.setHeader("X-Request-ID", requestId);
    const record = () => {
      if (finished) return;
      finished = true;
      const routePath = request.route?.path;
      const route = typeof routePath === "string" ? routePath : "unmatched";
      const statusCode = response.writableFinished ? response.statusCode : 499;
      const elapsedSeconds =
        Number(process.hrtime.bigint() - startedAt) / 1_000_000_000;
      if (shouldTrack)
        metrics.finishRequest(
          request.method,
          route,
          statusCode,
          elapsedSeconds,
        );
    };
    response.once("finish", record);
    response.once("close", record);
    next();
  });
  app.enableShutdownHooks();
  await app.listen(Number(process.env.API_PORT ?? 3100), "0.0.0.0");
}

void bootstrap();
