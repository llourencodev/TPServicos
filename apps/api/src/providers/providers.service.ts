import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { Prisma, VerificationStatus } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import {
  SearchProvidersDto,
  SubmitVerificationDto,
  UpdateProviderProfileDto,
} from "./providers.dto";

@Injectable()
export class ProvidersService {
  constructor(private readonly db: PrismaService) {}

  async highlights() {
    const activeProfiles: Prisma.ProviderProfileWhereInput = {
      active: true,
      city: { not: "" },
      user: { is: { active: true } },
      categories: { some: {} },
    };
    const [recommended, ratingRows] = await Promise.all([
      this.db.providerProfile.findMany({
        where: activeProfiles,
        select: {
          id: true,
          userId: true,
          bio: true,
          city: true,
          availability: true,
          priceFromCents: true,
          portfolioUrls: true,
          avatarUrl: true,
          verifiedAt: true,
          user: { select: { id: true, name: true } },
          categories: {
            select: { category: { select: { id: true, name: true } } },
          },
        },
        orderBy: [{ verifiedAt: "desc" }, { createdAt: "desc" }],
        take: 3,
      }),
      this.db.rating.groupBy({
        by: ["providerId"],
        _avg: { score: true },
        _count: { score: true },
        orderBy: [{ _avg: { score: "desc" } }, { _count: { score: "desc" } }],
        take: 12,
      }),
    ]);

    const ratedIds = ratingRows.map((rating) => rating.providerId);
    const ratedProfiles = ratedIds.length
      ? await this.db.providerProfile.findMany({
          where: { ...activeProfiles, userId: { in: ratedIds } },
          select: {
            id: true,
            userId: true,
            bio: true,
            city: true,
            availability: true,
            priceFromCents: true,
            portfolioUrls: true,
            avatarUrl: true,
            verifiedAt: true,
            user: { select: { id: true, name: true } },
            categories: {
              select: { category: { select: { id: true, name: true } } },
            },
          },
        })
      : [];
    const profilesByUser = new Map(
      ratedProfiles.map((profile) => [profile.userId, profile]),
    );
    const topRated = ratingRows
      .map((rating) => {
        const profile = profilesByUser.get(rating.providerId);
        if (!profile || rating._avg.score === null) return null;
        return {
          ...profile,
          averageScore: Number(rating._avg.score.toFixed(1)),
          ratingCount: rating._count.score,
        };
      })
      .filter(
        (profile): profile is NonNullable<typeof profile> => profile !== null,
      )
      .slice(0, 3);

    return {
      recommended: recommended.map((profile) => ({
        ...profile,
        averageScore: null,
      })),
      topRated,
    };
  }

  async profile(userId: string) {
    return this.db.providerProfile.findUnique({
      where: { userId },
      include: {
        user: { select: { id: true, name: true, email: true, phone: true } },
        categories: {
          include: {
            category: { select: { id: true, name: true, slug: true } },
          },
        },
      },
    });
  }

  async publicProfile(id: string) {
    const profile = await this.db.providerProfile.findFirst({
      where: {
        id,
        active: true,
        city: { not: "" },
        user: { is: { active: true } },
        categories: { some: {} },
      },
      select: {
        id: true,
        userId: true,
        bio: true,
        city: true,
        serviceAreas: true,
        availability: true,
        priceFromCents: true,
        serviceRadiusKm: true,
        portfolioUrls: true,
        avatarUrl: true,
        verifiedAt: true,
        createdAt: true,
        user: {
          select: {
            id: true,
            name: true,
            ratingsReceived: {
              select: {
                id: true,
                score: true,
                comment: true,
                createdAt: true,
                author: { select: { name: true } },
              },
              orderBy: { createdAt: "desc" },
              take: 6,
            },
          },
        },
        categories: {
          select: {
            category: { select: { id: true, name: true, slug: true } },
          },
        },
      },
    });
    if (!profile) throw new NotFoundException("Profissional não encontrado");
    const ratings = await this.db.rating.aggregate({
      where: { providerId: profile.userId },
      _avg: { score: true },
      _count: { score: true },
    });
    return {
      ...profile,
      user: { id: profile.user.id, name: profile.user.name },
      reviews: profile.user.ratingsReceived,
      averageScore:
        ratings._avg.score === null
          ? null
          : Number(ratings._avg.score.toFixed(1)),
      ratingCount: ratings._count.score,
    };
  }

  async update(userId: string, dto: UpdateProviderProfileDto) {
    const categories = await this.db.serviceCategory.findMany({
      where: { id: { in: [...new Set(dto.categoryIds)] }, active: true },
      select: { id: true },
    });
    if (
      !categories.length ||
      categories.length !== new Set(dto.categoryIds).size
    )
      throw new BadRequestException("Selecione ao menos uma categoria válida");
    const profile = await this.db.providerProfile.findUnique({
      where: { userId },
    });
    if (!profile)
      throw new NotFoundException("Perfil de prestador não encontrado");
    const hasLatitude = dto.latitude !== undefined;
    const hasLongitude = dto.longitude !== undefined;
    if (hasLatitude !== hasLongitude)
      throw new BadRequestException(
        "Informe latitude e longitude juntas para definir sua área de atendimento",
      );
    if ((hasLatitude || hasLongitude) && dto.locationConsent !== true)
      throw new BadRequestException(
        "Autorize o uso da região aproximada antes de salvar a localização",
      );
    return this.db.$transaction(async (tx) => {
      await tx.providerCategory.deleteMany({
        where: { providerId: profile.id },
      });
      const updated = await tx.providerProfile.update({
        where: { id: profile.id },
        data: {
          city: this.normalize(dto.city),
          bio: dto.bio?.trim() ?? "",
          serviceAreas: [
            ...new Set(
              (dto.serviceAreas ?? [])
                .map((area) => this.normalize(area))
                .filter(Boolean),
            ),
          ],
          ...(dto.availability !== undefined
            ? {
                availability:
                  dto.availability.trim() || "Disponível para novos serviços",
              }
            : {}),
          ...(dto.priceFromCents !== undefined
            ? { priceFromCents: dto.priceFromCents }
            : {}),
          ...(dto.serviceRadiusKm !== undefined
            ? { serviceRadiusKm: dto.serviceRadiusKm }
            : {}),
          ...(dto.portfolioUrls !== undefined
            ? {
                portfolioUrls: [
                  ...new Set(dto.portfolioUrls.map((url) => url.trim())),
                ],
              }
            : {}),
          ...(dto.avatarUrl !== undefined
            ? { avatarUrl: dto.avatarUrl.trim() || null }
            : {}),
          ...(hasLatitude && hasLongitude
            ? { latitude: dto.latitude, longitude: dto.longitude }
            : {}),
          categories: {
            createMany: {
              data: categories.map((category) => ({ categoryId: category.id })),
            },
          },
        },
        include: {
          categories: {
            include: {
              category: { select: { id: true, name: true, slug: true } },
            },
          },
          user: { select: { id: true, name: true, phone: true } },
        },
      });
      return updated;
    });
  }

  async requestVerification(userId: string, dto: SubmitVerificationDto) {
    const profile = await this.db.providerProfile.findUnique({
      where: { userId },
      include: { categories: { select: { categoryId: true } } },
    });
    if (!profile || !profile.city || !profile.categories.length)
      throw new BadRequestException(
        "Complete cidade e especialidades antes de solicitar verificação",
      );
    if (profile.verificationStatus === VerificationStatus.VERIFIED)
      throw new BadRequestException("Seu perfil já foi verificado");
    return this.db.providerProfile.update({
      where: { id: profile.id },
      data: {
        verificationStatus: VerificationStatus.PENDING,
        verificationNote: dto.statement.trim(),
        verificationDocumentUrls: [
          ...new Set((dto.documentUrls ?? []).map((url) => url.trim())),
        ],
        verificationRequestedAt: new Date(),
        verificationReviewedAt: null,
        verificationReviewerId: null,
      },
      select: {
        id: true,
        verificationStatus: true,
        verificationNote: true,
        verificationRequestedAt: true,
      },
    });
  }

  async opportunities(userId: string) {
    const profile = await this.db.providerProfile.findUnique({
      where: { userId },
      include: { categories: true },
    });
    if (!profile?.active || !profile.city || !profile.categories.length)
      throw new BadRequestException(
        "Complete seu perfil para ver oportunidades",
      );
    const categories = profile.categories.map((item) => item.categoryId);
    const requests = await this.db.serviceRequest.findMany({
      where: {
        status: "OPEN",
        city: { in: [profile.city, ...profile.serviceAreas] },
        categoryId: { in: categories },
        OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
        unlocks: { none: { providerId: userId } },
      },
      include: { category: { select: { id: true, name: true } } },
      orderBy: [{ createdAt: "desc" }],
      take: 100,
    });
    const available = requests.filter(
      (request) => request.unlockedCount < request.maxUnlocks,
    );
    const account = await this.db.creditAccount.findUnique({
      where: { userId },
      select: { balance: true },
    });
    return {
      balance: account?.balance ?? 0,
      opportunities: available.map(
        ({ customerId: _customerId, ...request }) => request,
      ),
    };
  }

  async contacts(userId: string) {
    const unlocks = await this.db.leadUnlock.findMany({
      where: { providerId: userId, refundedAt: null },
      include: {
        request: {
          include: {
            customer: {
              select: { id: true, name: true, phone: true, email: true },
            },
            category: { select: { name: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });
    return unlocks.map((unlock) => ({
      unlockId: unlock.id,
      requestId: unlock.requestId,
      title: unlock.request.title,
      neighborhood: unlock.request.neighborhood,
      customer: unlock.request.customer,
      category: unlock.request.category.name,
    }));
  }

  async search(dto: SearchProvidersDto) {
    const filters: Prisma.ProviderProfileWhereInput[] = [
      { active: true, city: { not: "" }, user: { is: { active: true } } },
      { categories: { some: {} } },
    ];
    if (dto.categoryId)
      filters.push({ categories: { some: { categoryId: dto.categoryId } } });
    if (dto.city?.trim()) {
      const city = this.normalize(dto.city);
      filters.push({
        OR: [
          { city: { contains: city, mode: "insensitive" } },
          { serviceAreas: { has: city } },
        ],
      });
    }
    if (dto.maxPriceFromCents !== undefined) {
      filters.push({
        priceFromCents: { not: null, lte: dto.maxPriceFromCents },
      });
    }
    if (dto.verified) filters.push({ verifiedAt: { not: null } });
    const query = dto.query?.trim();
    if (query) {
      const normalizedQuery = this.normalize(query);
      filters.push({
        OR: [
          {
            user: {
              is: { name: { contains: query, mode: "insensitive" } },
            },
          },
          { bio: { contains: query, mode: "insensitive" } },
          { city: { contains: normalizedQuery, mode: "insensitive" } },
          {
            categories: {
              some: {
                category: {
                  name: { contains: query, mode: "insensitive" },
                },
              },
            },
          },
        ],
      });
    }
    const where: Prisma.ProviderProfileWhereInput = { AND: filters };
    const [total, page] = await Promise.all([
      this.db.providerProfile.count({ where }),
      this.db.providerProfile.findMany({
        where,
        select: {
          id: true,
          userId: true,
          bio: true,
          city: true,
          serviceAreas: true,
          availability: true,
          priceFromCents: true,
          serviceRadiusKm: true,
          latitude: true,
          longitude: true,
          portfolioUrls: true,
          avatarUrl: true,
          verifiedAt: true,
          user: {
            select: { id: true, name: true },
          },
          categories: {
            select: { category: { select: { id: true, name: true } } },
          },
        },
        ...(dto.cursor ? { cursor: { id: dto.cursor }, skip: 1 } : {}),
        take: dto.pageSize + 1,
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      }),
    ]);
    const hasNextPage = page.length > dto.pageSize;
    const providers = page.slice(0, dto.pageSize);
    const ratingAggregates = providers.length
      ? await this.db.rating.groupBy({
          by: ["providerId"],
          where: {
            providerId: { in: providers.map((provider) => provider.userId) },
          },
          _avg: { score: true },
        })
      : [];
    const averages = new Map(
      ratingAggregates.map((rating) => [
        rating.providerId,
        rating._avg.score === null
          ? null
          : Number(rating._avg.score.toFixed(1)),
      ]),
    );
    return {
      items: providers.map((provider) => ({
        ...provider,
        averageScore: averages.get(provider.userId) ?? null,
        user: { id: provider.user.id, name: provider.user.name },
      })),
      total,
      pageSize: dto.pageSize,
      hasNextPage,
      nextCursor: hasNextPage ? (providers.at(-1)?.id ?? null) : null,
    };
  }

  private normalize(value: string) {
    return value
      .trim()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLocaleLowerCase("pt-BR");
  }
}
