import {
  Controller,
  Get,
  Module,
  ServiceUnavailableException,
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

@Controller("health")
class HealthController {
  constructor(private readonly db: PrismaService) {}
  @Get("live") live() {
    return { status: "ok" };
  }
  @Get("ready") async ready() {
    try {
      await this.db.$queryRaw`SELECT 1`;
      return { status: "ok" };
    } catch {
      throw new ServiceUnavailableException("Banco de dados indisponível");
    }
  }
}

@Module({ controllers: [HealthController] })
export class HealthModule {}
