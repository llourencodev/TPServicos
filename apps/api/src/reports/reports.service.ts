import { BadRequestException, Injectable } from "@nestjs/common";
import { AuthUser } from "../auth/current-user.decorator";
import { PrismaService } from "../prisma/prisma.service";
import { CreateReportDto } from "./reports.dto";

@Injectable()
export class ReportsService {
  constructor(private readonly db: PrismaService) {}

  async create(author: AuthUser, dto: CreateReportDto) {
    if (dto.targetType === "USER" && dto.targetId === author.id)
      throw new BadRequestException(
        "Você não pode denunciar seu próprio perfil",
      );
    if (dto.targetType === "REQUEST") {
      const request = await this.db.serviceRequest.findUnique({
        where: { id: dto.targetId },
        select: { id: true },
      });
      if (!request)
        throw new BadRequestException("Pedido denunciado não encontrado");
    }
    if (dto.targetType === "MESSAGE") {
      const message = await this.db.directMessage.findFirst({
        where: {
          id: dto.targetId,
          OR: [{ senderId: author.id }, { recipientId: author.id }],
        },
        select: { id: true },
      });
      if (!message)
        throw new BadRequestException("Mensagem denunciada não encontrada");
    }
    return this.db.platformReport.create({
      data: {
        authorId: author.id,
        targetType: dto.targetType,
        targetId: dto.targetId,
        reason: dto.reason.trim(),
        details: dto.details?.trim() || null,
      },
      select: { id: true, status: true, createdAt: true },
    });
  }
}
