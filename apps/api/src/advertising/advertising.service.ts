import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { AdvertisementStatus } from "@prisma/client";
import { withSerializableRetry } from "../prisma/transactions";
import { PrismaService } from "../prisma/prisma.service";
import {
  AdvertisementReviewDto,
  CreateAdvertisementDto,
  CreateAdvertisingPackageDto,
  UpdateAdvertisingPackageDto,
} from "./advertising.dto";

function safeWebUrl(value?: string) {
  if (!value) return value;
  try {
    const url = new URL(value);
    return ["https:", "http:"].includes(url.protocol) ? url.toString() : null;
  } catch {
    return null;
  }
}

@Injectable()
export class AdvertisingService {
  constructor(private readonly db: PrismaService) {}

  publicPackages() {
    return this.db.advertisingPackage.findMany({
      where: { active: true },
      select: {
        id: true,
        name: true,
        description: true,
        durationDays: true,
        amountInCents: true,
      },
      orderBy: [{ amountInCents: "asc" }, { createdAt: "asc" }],
    });
  }

  activeAdvertisements() {
    return this.db.sponsoredAdvertisement.findMany({
      where: {
        status: AdvertisementStatus.APPROVED,
        endsAt: { gt: new Date() },
      },
      select: {
        id: true,
        companyName: true,
        description: true,
        city: true,
        category: true,
        logoUrl: true,
        websiteUrl: true,
        endsAt: true,
        package: { select: { name: true } },
      },
      orderBy: [{ startsAt: "desc" }, { id: "asc" }],
      take: 12,
    });
  }

  async requestAdvertisement(dto: CreateAdvertisementDto) {
    const pkg = await this.db.advertisingPackage.findFirst({
      where: { id: dto.packageId, active: true },
      select: { id: true, amountInCents: true },
    });
    if (!pkg)
      throw new BadRequestException(
        "Este plano de divulgação não está disponível",
      );

    const logoUrl = safeWebUrl(dto.logoUrl);
    const websiteUrl = safeWebUrl(dto.websiteUrl);
    if ((dto.logoUrl && !logoUrl) || (dto.websiteUrl && !websiteUrl)) {
      throw new BadRequestException(
        "Use um endereço de site HTTP ou HTTPS válido",
      );
    }

    const ad = await this.db.sponsoredAdvertisement.create({
      data: {
        packageId: pkg.id,
        companyName: dto.companyName.trim(),
        description: dto.description.trim(),
        city: dto.city.trim(),
        category: dto.category.trim(),
        logoUrl: logoUrl ?? null,
        websiteUrl: websiteUrl ?? null,
        contactName: dto.contactName.trim(),
        contactEmail: dto.contactEmail.trim().toLowerCase(),
        contactPhone: dto.contactPhone.trim(),
        contactConsentAt: new Date(),
        amountInCents: pkg.amountInCents,
      },
      select: {
        id: true,
        amountInCents: true,
        package: { select: { name: true, durationDays: true } },
      },
    });
    return ad;
  }

  adminPackages() {
    return this.db.advertisingPackage.findMany({
      orderBy: [{ active: "desc" }, { amountInCents: "asc" }],
    });
  }

  createPackage(dto: CreateAdvertisingPackageDto) {
    return this.db.advertisingPackage.create({
      data: {
        name: dto.name.trim(),
        description: dto.description?.trim() || null,
        durationDays: dto.durationDays,
        amountInCents: dto.amountInCents,
      },
    });
  }

  async updatePackage(id: string, dto: UpdateAdvertisingPackageDto) {
    const current = await this.db.advertisingPackage.findUnique({
      where: { id },
    });
    if (!current)
      throw new NotFoundException("Plano de divulgação não encontrado");
    return this.db.advertisingPackage.update({
      where: { id },
      data: {
        ...dto,
        ...(dto.name ? { name: dto.name.trim() } : {}),
        ...(dto.description !== undefined
          ? { description: dto.description.trim() || null }
          : {}),
      },
    });
  }

  pendingAdvertisements() {
    return this.db.sponsoredAdvertisement.findMany({
      where: { status: AdvertisementStatus.PENDING },
      include: {
        package: { select: { name: true, durationDays: true } },
      },
      orderBy: { createdAt: "asc" },
    });
  }

  async approveAdvertisement(
    id: string,
    adminId: string,
    dto: AdvertisementReviewDto,
  ) {
    return withSerializableRetry(this.db, async (tx) => {
      const ad = await tx.sponsoredAdvertisement.findUnique({
        where: { id },
        include: { package: { select: { durationDays: true } } },
      });
      if (!ad)
        throw new NotFoundException("Pedido de divulgação não encontrado");
      if (ad.status !== AdvertisementStatus.PENDING)
        throw new BadRequestException("Este pedido já foi analisado");

      const startsAt = new Date();
      const endsAt = new Date(
        startsAt.getTime() + ad.package.durationDays * 24 * 60 * 60 * 1000,
      );
      const updated = await tx.sponsoredAdvertisement.updateMany({
        where: { id, status: AdvertisementStatus.PENDING },
        data: {
          status: AdvertisementStatus.APPROVED,
          reviewNote: dto.note.trim(),
          reviewedById: adminId,
          reviewedAt: startsAt,
          startsAt,
          endsAt,
        },
      });
      if (updated.count !== 1)
        throw new BadRequestException("Este pedido já foi analisado");
      return tx.sponsoredAdvertisement.findUnique({ where: { id } });
    });
  }

  async rejectAdvertisement(
    id: string,
    adminId: string,
    dto: AdvertisementReviewDto,
  ) {
    const updated = await this.db.sponsoredAdvertisement.updateMany({
      where: { id, status: AdvertisementStatus.PENDING },
      data: {
        status: AdvertisementStatus.REJECTED,
        reviewNote: dto.note.trim(),
        reviewedById: adminId,
        reviewedAt: new Date(),
      },
    });
    if (updated.count !== 1)
      throw new NotFoundException(
        "Pedido de divulgação pendente não encontrado",
      );
    return this.db.sponsoredAdvertisement.findUnique({ where: { id } });
  }
}
