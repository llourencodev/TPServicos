import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { isPrismaErrorCode } from "../prisma/prisma-errors";
import { CreatePurchaseDto, CreateRefundRequestDto } from "./wallet.dto";

@Injectable()
export class WalletService {
  constructor(private readonly db: PrismaService) {}

  packages() {
    return this.db.creditPackage.findMany({
      where: { active: true },
      select: { id: true, name: true, credits: true, amountInCents: true },
      orderBy: { amountInCents: "asc" },
    });
  }

  async overview(userId: string) {
    const [account, purchases, refunds] = await Promise.all([
      this.db.creditAccount.findUnique({
        where: { userId },
        include: { ledger: { orderBy: { createdAt: "desc" }, take: 50 } },
      }),
      this.db.creditPurchase.findMany({
        where: { providerId: userId },
        orderBy: { createdAt: "desc" },
        take: 20,
      }),
      this.db.leadRefundRequest.findMany({
        where: { providerId: userId },
        include: {
          unlock: { select: { request: { select: { title: true } } } },
          reviewer: { select: { name: true } },
        },
        orderBy: { createdAt: "desc" },
        take: 20,
      }),
    ]);
    if (!account) throw new NotFoundException("Carteira não encontrada");
    return {
      balance: account.balance,
      ledger: account.ledger,
      purchases,
      refunds,
    };
  }

  async createPurchase(userId: string, dto: CreatePurchaseDto) {
    const bundle = await this.db.creditPackage.findFirst({
      where: { id: dto.packageId, active: true },
    });
    if (!bundle) throw new NotFoundException("Pacote de créditos indisponível");
    return this.db.creditPurchase.create({
      data: {
        providerId: userId,
        packageId: bundle.id,
        credits: bundle.credits,
        amountInCents: bundle.amountInCents,
        paymentReference: dto.paymentReference?.trim() || null,
      },
    });
  }

  async requestRefund(userId: string, dto: CreateRefundRequestDto) {
    const unlock = await this.db.leadUnlock.findFirst({
      where: { id: dto.unlockId, providerId: userId },
      include: { refundRequest: true },
    });
    if (!unlock) throw new NotFoundException("Desbloqueio não encontrado");
    if (unlock.refundedAt)
      throw new BadRequestException("Este desbloqueio já foi estornado");
    if (unlock.refundRequest)
      throw new BadRequestException(
        "Já existe uma solicitação para este desbloqueio",
      );
    try {
      return await this.db.leadRefundRequest.create({
        data: {
          unlockId: unlock.id,
          providerId: userId,
          reason: dto.reason.trim(),
        },
      });
    } catch (error) {
      if (isPrismaErrorCode(error, "P2002"))
        throw new ConflictException(
          "Já existe uma solicitação para este desbloqueio",
        );
      throw error;
    }
  }
}
