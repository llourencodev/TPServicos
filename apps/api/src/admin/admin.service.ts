import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import {
  CreditPurchaseStatus,
  ReportStatus,
  RefundRequestStatus,
  UserRole,
  VerificationStatus,
} from "@prisma/client";
import * as argon2 from "argon2";
import { PrismaService } from "../prisma/prisma.service";
import { withSerializableRetry } from "../prisma/transactions";
import {
  CreateCategoryDto,
  CreatePackageDto,
  CreateUserDto,
  PurchaseDecisionDto,
  ReportDecisionDto,
  RefundDecisionDto,
  UpdateCategoryDto,
  UpdatePackageDto,
  VerificationDecisionDto,
} from "./admin.dto";

@Injectable()
export class AdminService {
  constructor(private readonly db: PrismaService) {}

  users() {
    return this.db.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        active: true,
        createdAt: true,
        provider: { select: { city: true, verifiedAt: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
  }

  activity() {
    return this.db.auditLog.findMany({
      select: {
        id: true,
        action: true,
        entityType: true,
        entityId: true,
        metadata: true,
        createdAt: true,
        actor: { select: { name: true, role: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
  }

  async createUser(dto: CreateUserDto) {
    const email = dto.email.trim().toLowerCase();
    const passwordHash = await argon2.hash(dto.password, {
      type: argon2.argon2id,
    });
    try {
      return await this.db.user.create({
        data: {
          name: dto.name.trim(),
          email,
          phone: dto.phone?.trim() || null,
          passwordHash,
          role: dto.role,
          ...(dto.role === UserRole.PROVIDER
            ? { provider: { create: {} }, creditAccount: { create: {} } }
            : {}),
        },
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          role: true,
          active: true,
          createdAt: true,
          provider: { select: { city: true, verifiedAt: true } },
        },
      });
    } catch (error) {
      if (this.isUniqueConflict(error))
        throw new ConflictException("Este e-mail já está cadastrado");
      throw error;
    }
  }

  async summary() {
    const [
      customers,
      providers,
      requests,
      openRequests,
      pendingPurchases,
      creditAccounts,
      openReports,
      pendingVerifications,
    ] = await Promise.all([
      this.db.user.count({ where: { role: UserRole.CUSTOMER, active: true } }),
      this.db.user.count({ where: { role: UserRole.PROVIDER, active: true } }),
      this.db.serviceRequest.count(),
      this.db.serviceRequest.count({ where: { status: "OPEN" } }),
      this.db.creditPurchase.count({
        where: { status: CreditPurchaseStatus.PENDING },
      }),
      this.db.creditAccount.aggregate({ _sum: { balance: true } }),
      this.db.platformReport.count({ where: { status: ReportStatus.OPEN } }),
      this.db.providerProfile.count({
        where: { verificationStatus: VerificationStatus.PENDING },
      }),
    ]);
    return {
      customers,
      providers,
      requests,
      openRequests,
      pendingPurchases,
      creditsInCirculation: creditAccounts._sum.balance ?? 0,
      openReports,
      pendingVerifications,
    };
  }

  categories() {
    return this.db.serviceCategory.findMany({ orderBy: { name: "asc" } });
  }
  async createCategory(dto: CreateCategoryDto) {
    return this.db.serviceCategory.create({
      data: {
        name: dto.name.trim(),
        slug: dto.slug.trim().toLowerCase(),
        description: dto.description?.trim() || null,
        leadCost: dto.leadCost,
      },
    });
  }
  async updateCategory(id: string, dto: UpdateCategoryDto) {
    const current = await this.db.serviceCategory.findUnique({ where: { id } });
    if (!current) throw new NotFoundException("Categoria não encontrada");
    return this.db.serviceCategory.update({
      where: { id },
      data: {
        ...dto,
        ...(dto.name ? { name: dto.name.trim() } : {}),
        ...(dto.slug ? { slug: dto.slug.trim().toLowerCase() } : {}),
        ...(dto.description !== undefined
          ? { description: dto.description.trim() || null }
          : {}),
      },
    });
  }
  packages() {
    return this.db.creditPackage.findMany({ orderBy: { createdAt: "desc" } });
  }
  async createPackage(dto: CreatePackageDto) {
    return this.db.creditPackage.create({
      data: {
        name: dto.name.trim(),
        credits: dto.credits,
        amountInCents: dto.amountInCents,
      },
    });
  }
  async updatePackage(id: string, dto: UpdatePackageDto) {
    const current = await this.db.creditPackage.findUnique({ where: { id } });
    if (!current) throw new NotFoundException("Pacote não encontrado");
    return this.db.creditPackage.update({
      where: { id },
      data: { ...dto, ...(dto.name ? { name: dto.name.trim() } : {}) },
    });
  }

  pendingPurchases() {
    return this.db.creditPurchase.findMany({
      where: { status: CreditPurchaseStatus.PENDING },
      include: {
        provider: {
          select: { id: true, name: true, email: true, phone: true },
        },
        package: { select: { name: true } },
      },
      orderBy: { createdAt: "asc" },
    });
  }
  refundRequests() {
    return this.db.leadRefundRequest.findMany({
      where: { status: RefundRequestStatus.PENDING },
      include: {
        provider: { select: { id: true, name: true, email: true } },
        unlock: {
          include: {
            request: {
              select: { id: true, title: true, city: true, neighborhood: true },
            },
          },
        },
      },
      orderBy: { createdAt: "asc" },
    });
  }

  async approvePurchase(
    purchaseId: string,
    adminId: string,
    dto: PurchaseDecisionDto,
  ) {
    return withSerializableRetry(this.db, async (tx) => {
      const purchase = await tx.creditPurchase.findUnique({
        where: { id: purchaseId },
      });
      if (!purchase) throw new NotFoundException("Compra não encontrada");
      if (purchase.status !== CreditPurchaseStatus.PENDING)
        throw new BadRequestException("Esta compra já foi analisada");
      const changed = await tx.creditPurchase.updateMany({
        where: { id: purchase.id, status: CreditPurchaseStatus.PENDING },
        data: {
          status: CreditPurchaseStatus.APPROVED,
          reviewedById: adminId,
          reviewedAt: new Date(),
          rejectionReason: dto.note?.trim() || null,
        },
      });
      if (changed.count !== 1)
        throw new BadRequestException("Esta compra já foi analisada");
      const account = await tx.creditAccount.update({
        where: { userId: purchase.providerId },
        data: { balance: { increment: purchase.credits } },
      });
      await tx.creditLedgerEntry.create({
        data: {
          accountId: account.id,
          type: "PURCHASE",
          amount: purchase.credits,
          balanceAfter: account.balance,
          description: `Compra aprovada (${purchase.credits} créditos)`,
          referenceId: purchase.id,
        },
      });
      await tx.auditLog.create({
        data: {
          actorId: adminId,
          action: "CREDIT_PURCHASE_APPROVED",
          entityType: "CreditPurchase",
          entityId: purchase.id,
          metadata: {
            providerId: purchase.providerId,
            credits: purchase.credits,
          },
        },
      });
      return tx.creditPurchase.findUnique({ where: { id: purchaseId } });
    });
  }

  async rejectPurchase(
    purchaseId: string,
    adminId: string,
    dto: PurchaseDecisionDto,
  ) {
    if (!dto.note?.trim())
      throw new BadRequestException("Informe o motivo da rejeição");
    const result = await this.db.creditPurchase.updateMany({
      where: { id: purchaseId, status: CreditPurchaseStatus.PENDING },
      data: {
        status: CreditPurchaseStatus.REJECTED,
        reviewedById: adminId,
        reviewedAt: new Date(),
        rejectionReason: dto.note.trim(),
      },
    });
    if (!result.count)
      throw new NotFoundException("Compra pendente não encontrada");
    await this.db.auditLog.create({
      data: {
        actorId: adminId,
        action: "CREDIT_PURCHASE_REJECTED",
        entityType: "CreditPurchase",
        entityId: purchaseId,
      },
    });
    return this.db.creditPurchase.findUnique({ where: { id: purchaseId } });
  }

  async decideRefund(
    refundId: string,
    adminId: string,
    dto: RefundDecisionDto,
  ) {
    return withSerializableRetry(this.db, async (tx) => {
      const refund = await tx.leadRefundRequest.findUnique({
        where: { id: refundId },
        include: { unlock: true },
      });
      if (!refund)
        throw new NotFoundException("Solicitação de estorno não encontrada");
      if (refund.status !== RefundRequestStatus.PENDING)
        throw new BadRequestException("Esta solicitação já foi analisada");
      const status =
        dto.decision === "APPROVED"
          ? RefundRequestStatus.APPROVED
          : RefundRequestStatus.REJECTED;
      const changed = await tx.leadRefundRequest.updateMany({
        where: { id: refundId, status: RefundRequestStatus.PENDING },
        data: {
          status,
          reviewerId: adminId,
          reviewedAt: new Date(),
          resolutionNote: dto.note.trim(),
        },
      });
      if (changed.count !== 1)
        throw new BadRequestException("Esta solicitação já foi analisada");
      if (status === RefundRequestStatus.APPROVED) {
        await tx.leadUnlock.update({
          where: { id: refund.unlockId },
          data: { refundedAt: new Date() },
        });
        await tx.serviceRequest.update({
          where: { id: refund.unlock.requestId },
          data: { unlockedCount: { decrement: 1 } },
        });
        const account = await tx.creditAccount.update({
          where: { userId: refund.providerId },
          data: { balance: { increment: refund.unlock.creditsCharged } },
        });
        await tx.creditLedgerEntry.create({
          data: {
            accountId: account.id,
            type: "REFUND",
            amount: refund.unlock.creditsCharged,
            balanceAfter: account.balance,
            description: `Estorno aprovado: ${refund.reason.slice(0, 180)}`,
            referenceId: refund.id,
          },
        });
      }
      await tx.auditLog.create({
        data: {
          actorId: adminId,
          action:
            status === RefundRequestStatus.APPROVED
              ? "LEAD_REFUND_APPROVED"
              : "LEAD_REFUND_REJECTED",
          entityType: "LeadRefundRequest",
          entityId: refund.id,
          metadata: { providerId: refund.providerId },
        },
      });
      return tx.leadRefundRequest.findUnique({ where: { id: refundId } });
    });
  }

  reports() {
    return this.db.platformReport.findMany({
      where: { status: ReportStatus.OPEN },
      include: {
        author: { select: { id: true, name: true, email: true, role: true } },
      },
      orderBy: { createdAt: "asc" },
      take: 100,
    });
  }

  async decideReport(
    reportId: string,
    adminId: string,
    dto: ReportDecisionDto,
  ) {
    const status =
      dto.decision === "RESOLVED"
        ? ReportStatus.RESOLVED
        : ReportStatus.DISMISSED;
    const updated = await this.db.platformReport.updateMany({
      where: { id: reportId, status: ReportStatus.OPEN },
      data: {
        status,
        reviewerId: adminId,
        reviewNote: dto.note.trim(),
        reviewedAt: new Date(),
      },
    });
    if (!updated.count)
      throw new NotFoundException("Denúncia pendente não encontrada");
    await this.db.auditLog.create({
      data: {
        actorId: adminId,
        action:
          status === ReportStatus.RESOLVED
            ? "REPORT_RESOLVED"
            : "REPORT_DISMISSED",
        entityType: "PlatformReport",
        entityId: reportId,
      },
    });
    return this.db.platformReport.findUniqueOrThrow({
      where: { id: reportId },
    });
  }

  verifications() {
    return this.db.providerProfile.findMany({
      where: { verificationStatus: VerificationStatus.PENDING },
      select: {
        id: true,
        city: true,
        bio: true,
        verificationNote: true,
        verificationDocumentUrls: true,
        verificationRequestedAt: true,
        user: { select: { id: true, name: true, email: true, phone: true } },
        categories: { select: { category: { select: { name: true } } } },
      },
      orderBy: { verificationRequestedAt: "asc" },
      take: 100,
    });
  }

  async decideVerification(
    profileId: string,
    adminId: string,
    dto: VerificationDecisionDto,
  ) {
    const profile = await this.db.providerProfile.findUnique({
      where: { id: profileId },
      select: { id: true, userId: true, verificationStatus: true },
    });
    if (!profile || profile.verificationStatus !== VerificationStatus.PENDING)
      throw new NotFoundException(
        "Solicitação de verificação pendente não encontrada",
      );
    const approved = dto.decision === "VERIFIED";
    const result = await this.db.$transaction(async (tx) => {
      const updated = await tx.providerProfile.update({
        where: { id: profileId },
        data: {
          verificationStatus: approved
            ? VerificationStatus.VERIFIED
            : VerificationStatus.REJECTED,
          verificationNote: dto.note.trim(),
          verificationReviewedAt: new Date(),
          verificationReviewerId: adminId,
          verifiedAt: approved ? new Date() : null,
        },
      });
      await tx.appNotification.create({
        data: {
          userId: profile.userId,
          kind: "VERIFICATION",
          title: approved
            ? "Perfil verificado"
            : "Verificação precisa de ajustes",
          body: approved
            ? "Seu perfil recebeu o selo de verificação TPServiços."
            : dto.note.trim(),
          href: "/",
        },
      });
      await tx.auditLog.create({
        data: {
          actorId: adminId,
          action: approved
            ? "PROVIDER_VERIFIED"
            : "PROVIDER_VERIFICATION_REJECTED",
          entityType: "ProviderProfile",
          entityId: profileId,
          metadata: { providerId: profile.userId },
        },
      });
      return updated;
    });
    return result;
  }

  private isUniqueConflict(error: unknown): boolean {
    return (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      (error as { code?: string }).code === "P2002"
    );
  }
}
