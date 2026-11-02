import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { ProposalStatus, RequestStatus, UserRole } from "@prisma/client";
import { AuthUser } from "../auth/current-user.decorator";
import { PrismaService } from "../prisma/prisma.service";
import { isPrismaErrorCode } from "../prisma/prisma-errors";
import { withSerializableRetry } from "../prisma/transactions";
import {
  CreateMessageDto,
  CreateProposalDto,
  CreateRequestDto,
  RateProviderDto,
} from "./requests.dto";

@Injectable()
export class RequestsService {
  constructor(private readonly db: PrismaService) {}

  async create(customer: AuthUser, dto: CreateRequestDto) {
    const [category, account] = await Promise.all([
      this.db.serviceCategory.findFirst({
        where: { id: dto.categoryId, active: true },
      }),
      this.db.user.findUnique({
        where: { id: customer.id },
        select: { phone: true },
      }),
    ]);
    if (!category) throw new BadRequestException("Categoria inválida");
    if (dto.contactConsent !== true)
      throw new BadRequestException(
        "Autorize o compartilhamento de contato para publicar o pedido",
      );
    if (!account?.phone)
      throw new BadRequestException(
        "Cadastre um telefone antes de publicar um pedido",
      );
    if (dto.expiresAt && new Date(dto.expiresAt) <= new Date())
      throw new BadRequestException("O prazo precisa estar no futuro");
    return this.db.serviceRequest.create({
      data: {
        customerId: customer.id,
        categoryId: category.id,
        title: dto.title.trim(),
        description: dto.description.trim(),
        city: this.normalize(dto.city),
        neighborhood: dto.neighborhood.trim(),
        photoUrls: dto.photoUrls ?? [],
        contactConsentAt: new Date(),
        leadCreditCost: category.leadCost,
        statusHistory: {
          create: { status: RequestStatus.OPEN, actorId: customer.id },
        },
        ...(dto.expiresAt ? { expiresAt: new Date(dto.expiresAt) } : {}),
      },
      include: { category: { select: { id: true, name: true, slug: true } } },
    });
  }

  mine(customerId: string) {
    return this.db.serviceRequest.findMany({
      where: { customerId },
      include: {
        category: { select: { id: true, name: true } },
        unlocks: {
          where: { refundedAt: null },
          select: {
            id: true,
            providerId: true,
            provider: { select: { id: true, name: true } },
          },
        },
        rating: { select: { score: true, comment: true, providerId: true } },
        acceptedProvider: { select: { id: true, name: true } },
        statusHistory: {
          select: {
            id: true,
            previousStatus: true,
            status: true,
            createdAt: true,
            actor: { select: { name: true } },
          },
          orderBy: { createdAt: "asc" },
        },
      },
      orderBy: { createdAt: "desc" },
    });
  }

  async cancel(customerId: string, requestId: string) {
    return withSerializableRetry(this.db, async (tx) => {
      const request = await tx.serviceRequest.findUnique({
        where: { id: requestId },
      });
      if (!request) throw new NotFoundException("Pedido não encontrado");
      if (request.customerId !== customerId)
        throw new ForbiddenException("Este pedido pertence a outro cliente");
      if (request.status !== RequestStatus.OPEN)
        throw new BadRequestException(
          "Somente pedidos abertos podem ser cancelados",
        );
      const changed = await tx.serviceRequest.updateMany({
        where: {
          id: requestId,
          customerId,
          status: RequestStatus.OPEN,
        },
        data: { status: RequestStatus.CANCELLED, cancelledAt: new Date() },
      });
      if (changed.count !== 1)
        throw new ConflictException("O pedido foi alterado por outra operação");
      await tx.serviceRequestStatusHistory.create({
        data: {
          requestId,
          previousStatus: RequestStatus.OPEN,
          status: RequestStatus.CANCELLED,
          actorId: customerId,
        },
      });
      await tx.auditLog.create({
        data: {
          actorId: customerId,
          action: "REQUEST_CANCELLED",
          entityType: "ServiceRequest",
          entityId: requestId,
        },
      });
      return tx.serviceRequest.findUniqueOrThrow({ where: { id: requestId } });
    });
  }

  async complete(customerId: string, requestId: string) {
    return withSerializableRetry(this.db, async (tx) => {
      const request = await tx.serviceRequest.findUnique({
        where: { id: requestId },
      });
      if (!request) throw new NotFoundException("Pedido não encontrado");
      if (request.customerId !== customerId)
        throw new ForbiddenException("Este pedido pertence a outro cliente");
      if (request.status !== RequestStatus.IN_PROGRESS)
        throw new BadRequestException("Este pedido não pode ser concluído");
      if (!request.acceptedProviderId)
        throw new BadRequestException(
          "Aceite uma proposta antes de concluir o serviço",
        );
      const changed = await tx.serviceRequest.updateMany({
        where: {
          id: requestId,
          customerId,
          status: request.status,
        },
        data: { status: RequestStatus.COMPLETED, completedAt: new Date() },
      });
      if (changed.count !== 1)
        throw new ConflictException("O pedido foi alterado por outra operação");
      await tx.serviceRequestStatusHistory.create({
        data: {
          requestId,
          previousStatus: request.status,
          status: RequestStatus.COMPLETED,
          actorId: customerId,
        },
      });
      await tx.auditLog.create({
        data: {
          actorId: customerId,
          action: "REQUEST_COMPLETED",
          entityType: "ServiceRequest",
          entityId: requestId,
          metadata: { acceptedProviderId: request.acceptedProviderId },
        },
      });
      return tx.serviceRequest.findUniqueOrThrow({ where: { id: requestId } });
    });
  }

  async unlock(providerId: string, requestId: string) {
    const existing = await this.db.leadUnlock.findUnique({
      where: { providerId_requestId: { providerId, requestId } },
    });
    if (existing)
      return {
        unlockId: existing.id,
        alreadyUnlocked: true,
        creditsCharged: existing.creditsCharged,
      };
    try {
      const result = await this.db.$transaction(async (tx) => {
        const provider = await tx.providerProfile.findUnique({
          where: { userId: providerId },
          include: { categories: true },
        });
        if (!provider?.active || !provider.city)
          throw new BadRequestException(
            "Complete seu perfil de prestador antes de desbloquear pedidos",
          );
        const request = await tx.serviceRequest.findUnique({
          where: { id: requestId },
        });
        if (!request) throw new NotFoundException("Pedido não encontrado");
        if (
          request.status !== RequestStatus.OPEN ||
          (request.expiresAt && request.expiresAt <= new Date())
        ) {
          throw new BadRequestException("Este pedido não está mais disponível");
        }
        if (request.customerId === providerId)
          throw new ForbiddenException(
            "Você não pode desbloquear seu próprio pedido",
          );
        const servesArea =
          this.normalize(provider.city) === request.city ||
          provider.serviceAreas
            .map((area) => this.normalize(area))
            .includes(request.city);
        if (
          !servesArea ||
          !provider.categories.some(
            (item) => item.categoryId === request.categoryId,
          )
        )
          throw new ForbiddenException(
            "Pedido fora da sua categoria ou região",
          );
        const reservedSlot = await tx.serviceRequest.updateMany({
          where: {
            id: requestId,
            status: RequestStatus.OPEN,
            unlockedCount: { lt: request.maxUnlocks },
            OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
          },
          data: { unlockedCount: { increment: 1 } },
        });
        if (reservedSlot.count !== 1)
          throw new BadRequestException("Este pedido não está mais disponível");
        const charged = await tx.creditAccount.updateMany({
          where: {
            userId: providerId,
            balance: { gte: request.leadCreditCost },
          },
          data: { balance: { decrement: request.leadCreditCost } },
        });
        if (charged.count !== 1)
          throw new BadRequestException("Saldo de créditos insuficiente");
        const account = await tx.creditAccount.findUniqueOrThrow({
          where: { userId: providerId },
        });
        const unlock = await tx.leadUnlock.create({
          data: {
            providerId,
            providerProfileId: provider.id,
            requestId,
            creditsCharged: request.leadCreditCost,
          },
        });
        await tx.creditLedgerEntry.create({
          data: {
            accountId: account.id,
            type: "LEAD_UNLOCK",
            amount: -request.leadCreditCost,
            balanceAfter: account.balance,
            description: `Contato desbloqueado: ${request.title}`,
            referenceId: unlock.id,
          },
        });
        return {
          unlockId: unlock.id,
          alreadyUnlocked: false,
          creditsCharged: request.leadCreditCost,
          balance: account.balance,
        };
      });
      return result;
    } catch (error) {
      if (isPrismaErrorCode(error, "P2002")) {
        const racedUnlock = await this.db.leadUnlock.findUnique({
          where: { providerId_requestId: { providerId, requestId } },
        });
        if (racedUnlock)
          return {
            unlockId: racedUnlock.id,
            alreadyUnlocked: true,
            creditsCharged: racedUnlock.creditsCharged,
          };
      }
      throw error;
    }
  }

  async contact(providerId: string, requestId: string) {
    const unlock = await this.db.leadUnlock.findUnique({
      where: { providerId_requestId: { providerId, requestId } },
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
    });
    if (!unlock || unlock.refundedAt)
      throw new ForbiddenException(
        "Desbloqueie este contato para visualizar os dados",
      );
    return {
      unlockId: unlock.id,
      requestId,
      title: unlock.request.title,
      neighborhood: unlock.request.neighborhood,
      customer: unlock.request.customer,
      category: unlock.request.category.name,
    };
  }

  async proposals(user: AuthUser, requestId: string) {
    const request = await this.requestWithParticipants(requestId);
    this.assertRequestParticipant(user, request);
    const where =
      user.role === UserRole.CUSTOMER
        ? { requestId }
        : { requestId, providerId: user.id };
    return this.db.proposal.findMany({
      where,
      select: {
        id: true,
        summary: true,
        priceCents: true,
        scheduledFor: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        provider: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: "desc" },
    });
  }

  async propose(providerId: string, requestId: string, dto: CreateProposalDto) {
    const request = await this.requestWithParticipants(requestId);
    if (request.status !== RequestStatus.OPEN)
      throw new BadRequestException(
        "Este pedido não está mais aceitando propostas",
      );
    if (!request.unlocks.some((unlock) => unlock.providerId === providerId))
      throw new ForbiddenException(
        "Desbloqueie o contato antes de enviar uma proposta",
      );
    if (dto.scheduledFor && new Date(dto.scheduledFor) <= new Date())
      throw new BadRequestException("A data sugerida precisa estar no futuro");

    const existing = await this.db.proposal.findUnique({
      where: { requestId_providerId: { requestId, providerId } },
    });
    if (existing?.status === ProposalStatus.ACCEPTED)
      throw new BadRequestException("Esta proposta já foi aceita");
    const proposal = await this.db.proposal.upsert({
      where: { requestId_providerId: { requestId, providerId } },
      create: {
        requestId,
        providerId,
        summary: dto.summary.trim(),
        ...(dto.priceCents !== undefined ? { priceCents: dto.priceCents } : {}),
        ...(dto.scheduledFor
          ? { scheduledFor: new Date(dto.scheduledFor) }
          : {}),
      },
      update: {
        summary: dto.summary.trim(),
        ...(dto.priceCents !== undefined ? { priceCents: dto.priceCents } : {}),
        ...(dto.scheduledFor
          ? { scheduledFor: new Date(dto.scheduledFor) }
          : {}),
        status: ProposalStatus.SENT,
      },
      include: { provider: { select: { id: true, name: true } } },
    });
    await this.notify(request.customerId, {
      kind: "PROPOSAL",
      title: "Você recebeu uma proposta",
      body: `${proposal.provider.name} enviou uma proposta para “${request.title}”.`,
      href: "/",
    });
    return proposal;
  }

  async acceptProposal(
    customerId: string,
    requestId: string,
    proposalId: string,
  ) {
    return withSerializableRetry(this.db, async (tx) => {
      const request = await tx.serviceRequest.findUnique({
        where: { id: requestId },
      });
      if (!request) throw new NotFoundException("Pedido não encontrado");
      if (request.customerId !== customerId)
        throw new ForbiddenException("Este pedido pertence a outro cliente");
      if (request.status !== RequestStatus.OPEN)
        throw new BadRequestException("Este pedido não aceita mais propostas");
      const proposal = await tx.proposal.findFirst({
        where: { id: proposalId, requestId, status: ProposalStatus.SENT },
        include: { provider: { select: { name: true } } },
      });
      if (!proposal)
        throw new NotFoundException("Proposta disponível não encontrada");
      const changed = await tx.proposal.updateMany({
        where: { id: proposal.id, status: ProposalStatus.SENT },
        data: { status: ProposalStatus.ACCEPTED },
      });
      if (changed.count !== 1)
        throw new ConflictException("A proposta foi atualizada por outra ação");
      await tx.proposal.updateMany({
        where: {
          requestId,
          id: { not: proposal.id },
          status: ProposalStatus.SENT,
        },
        data: { status: ProposalStatus.DECLINED },
      });
      await tx.serviceRequest.update({
        where: { id: requestId },
        data: {
          status: RequestStatus.IN_PROGRESS,
          acceptedProviderId: proposal.providerId,
        },
      });
      await tx.serviceRequestStatusHistory.create({
        data: {
          requestId,
          previousStatus: RequestStatus.OPEN,
          status: RequestStatus.IN_PROGRESS,
          actorId: customerId,
        },
      });
      await tx.auditLog.create({
        data: {
          actorId: customerId,
          action: "PROPOSAL_ACCEPTED",
          entityType: "ServiceRequest",
          entityId: requestId,
          metadata: {
            proposalId: proposal.id,
            providerId: proposal.providerId,
          },
        },
      });
      await tx.appNotification.create({
        data: {
          userId: proposal.providerId,
          kind: "PROPOSAL_ACCEPTED",
          title: "Sua proposta foi aceita",
          body: `Você foi escolhido para “${request.title}”.`,
          href: "/",
        },
      });
      return {
        id: proposal.id,
        status: ProposalStatus.ACCEPTED,
        provider: proposal.provider,
      };
    });
  }

  async messages(user: AuthUser, requestId: string) {
    const request = await this.requestWithParticipants(requestId);
    this.assertRequestParticipant(user, request);
    await this.db.directMessage.updateMany({
      where: { requestId, recipientId: user.id, readAt: null },
      data: { readAt: new Date() },
    });
    return this.db.directMessage.findMany({
      where: {
        requestId,
        OR: [{ senderId: user.id }, { recipientId: user.id }],
      },
      select: {
        id: true,
        body: true,
        attachmentUrls: true,
        readAt: true,
        createdAt: true,
        sender: { select: { id: true, name: true } },
        recipient: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: "asc" },
      take: 200,
    });
  }

  async message(user: AuthUser, requestId: string, dto: CreateMessageDto) {
    const request = await this.requestWithParticipants(requestId);
    this.assertRequestParticipant(user, request);
    this.assertValidRecipient(user, dto.recipientId, request);
    const message = await this.db.directMessage.create({
      data: {
        requestId,
        senderId: user.id,
        recipientId: dto.recipientId,
        body: dto.body.trim(),
        attachmentUrls: [
          ...new Set((dto.attachmentUrls ?? []).map((url) => url.trim())),
        ],
      },
      include: {
        sender: { select: { id: true, name: true } },
        recipient: { select: { id: true, name: true } },
      },
    });
    await this.notify(dto.recipientId, {
      kind: "MESSAGE",
      title: "Nova mensagem sobre um serviço",
      body: `${message.sender.name} enviou uma mensagem sobre “${request.title}”.`,
      href: "/",
    });
    return message;
  }

  async rate(customer: AuthUser, requestId: string, dto: RateProviderDto) {
    const request = await this.db.serviceRequest.findUnique({
      where: { id: requestId, customerId: customer.id },
      select: { status: true, acceptedProviderId: true },
    });
    if (!request) throw new NotFoundException("Pedido não encontrado");
    if (request.status !== RequestStatus.COMPLETED)
      throw new BadRequestException(
        "O pedido precisa estar concluído para receber uma avaliação",
      );
    if (request.acceptedProviderId !== dto.providerId)
      throw new BadRequestException(
        "A avaliação deve ser enviada para o profissional contratado",
      );
    try {
      const rating = await this.db.rating.create({
        data: {
          authorId: customer.id,
          providerId: dto.providerId,
          requestId,
          score: dto.score,
          comment: dto.comment?.trim() || null,
        },
      });
      await this.db.auditLog.create({
        data: {
          actorId: customer.id,
          action: "PROVIDER_RATED",
          entityType: "ServiceRequest",
          entityId: requestId,
          metadata: { providerId: dto.providerId, score: dto.score },
        },
      });
      return rating;
    } catch (error) {
      if (isPrismaErrorCode(error, "P2002"))
        throw new ConflictException("Este pedido já recebeu uma avaliação");
      throw error;
    }
  }

  private async requestWithParticipants(requestId: string) {
    const request = await this.db.serviceRequest.findUnique({
      where: { id: requestId },
      include: {
        unlocks: {
          where: { refundedAt: null },
          select: { providerId: true },
        },
      },
    });
    if (!request) throw new NotFoundException("Pedido não encontrado");
    return request;
  }

  private assertRequestParticipant(
    user: AuthUser,
    request: { customerId: string; unlocks: { providerId: string }[] },
  ) {
    const isCustomer =
      user.role === UserRole.CUSTOMER && request.customerId === user.id;
    const isUnlockedProvider =
      user.role === UserRole.PROVIDER &&
      request.unlocks.some((unlock) => unlock.providerId === user.id);
    if (!isCustomer && !isUnlockedProvider)
      throw new ForbiddenException("Você não participa desta conversa");
  }

  private assertValidRecipient(
    user: AuthUser,
    recipientId: string,
    request: { customerId: string; unlocks: { providerId: string }[] },
  ) {
    if (user.role === UserRole.CUSTOMER) {
      if (!request.unlocks.some((unlock) => unlock.providerId === recipientId))
        throw new ForbiddenException(
          "Escolha um profissional interessado neste pedido",
        );
      return;
    }
    if (recipientId !== request.customerId)
      throw new ForbiddenException(
        "Profissionais só podem conversar com o cliente do pedido",
      );
  }

  private notify(
    userId: string,
    notification: { kind: string; title: string; body: string; href?: string },
  ) {
    return this.db.appNotification.create({
      data: { userId, ...notification },
    });
  }

  private normalize(value: string) {
    return value
      .trim()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLocaleLowerCase("pt-BR");
  }
}
