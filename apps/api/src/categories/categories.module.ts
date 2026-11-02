import { Controller, Get, Module } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

@Controller("categories")
class CategoriesController {
  constructor(private readonly db: PrismaService) {}
  @Get() list() {
    return this.db.serviceCategory.findMany({
      where: { active: true },
      select: { id: true, name: true, slug: true, description: true },
      orderBy: { name: "asc" },
    });
  }

  @Get("highlights")
  async highlights() {
    const categories = await this.db.serviceCategory.findMany({
      where: { active: true },
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        _count: { select: { requests: true } },
      },
      orderBy: [{ requests: { _count: "desc" } }, { name: "asc" }],
      take: 6,
    });
    return categories.map(({ _count, ...category }) => ({
      ...category,
      requestCount: _count.requests,
    }));
  }
}

@Module({ controllers: [CategoriesController] })
export class CategoriesModule {}
