import {
  Controller,
  Get,
  NotFoundException,
  Req,
  Res,
  UnauthorizedException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { timingSafeEqual } from "node:crypto";
import type { Request, Response } from "express";
import { MetricsService } from "./metrics.service";

@Controller()
export class MetricsController {
  constructor(
    private readonly config: ConfigService,
    private readonly metrics: MetricsService,
  ) {}

  @Get("metrics")
  scrape(@Req() request: Request, @Res() response: Response) {
    const expected = this.config.get<string>("METRICS_TOKEN");
    if (!expected) throw new NotFoundException();

    const authorization = request.headers.authorization ?? "";
    const match = /^Bearer ([^\s]+)$/.exec(authorization);
    const provided = match?.[1] ?? "";
    const expectedBytes = Buffer.from(expected, "utf8");
    const providedBytes = Buffer.from(provided, "utf8");
    if (
      providedBytes.length !== expectedBytes.length ||
      !timingSafeEqual(providedBytes, expectedBytes)
    ) {
      throw new UnauthorizedException();
    }

    response
      .status(200)
      .setHeader("Content-Type", "text/plain; version=0.0.4; charset=utf-8")
      .setHeader("Cache-Control", "no-store")
      .send(this.metrics.renderPrometheus());
  }
}
