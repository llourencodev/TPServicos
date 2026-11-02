import {
  ConflictException,
  Injectable,
  Logger,
  UnauthorizedException,
} from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { SecurityTokenKind, User, UserRole } from "@prisma/client";
import * as argon2 from "argon2";
import { randomBytes, randomUUID } from "crypto";
import { PrismaService } from "../prisma/prisma.service";
import { LoginDto, PasswordResetConfirmDto, RegisterDto } from "./auth.dto";

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly db: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  async register(dto: RegisterDto) {
    const email = dto.email.trim().toLowerCase();
    const passwordHash = await argon2.hash(dto.password, {
      type: argon2.argon2id,
    });
    try {
      const user = await this.db.user.create({
        data: {
          name: dto.name.trim(),
          email,
          phone: dto.phone?.trim() || null,
          passwordHash,
          role: dto.role,
          termsAcceptedAt: new Date(),
          privacyAcceptedAt: new Date(),
          ...(dto.role === "PROVIDER"
            ? { provider: { create: {} }, creditAccount: { create: {} } }
            : {}),
        },
      });
      const session = await this.issue(user);
      await this.sendEmailVerification(user.id, user.email);
      return session;
    } catch (error) {
      if (this.isUniqueConflict(error))
        throw new ConflictException("Este e-mail já está cadastrado");
      throw error;
    }
  }

  async login(dto: LoginDto) {
    const user = await this.db.user.findUnique({
      where: { email: dto.email.trim().toLowerCase() },
    });
    if (
      !user?.active ||
      !(await argon2.verify(user.passwordHash, dto.password))
    )
      throw new UnauthorizedException("E-mail ou senha inválidos");
    return this.issue(user);
  }

  async refresh(raw: string) {
    let payload: { sub: string; jti: string };
    try {
      payload = await this.jwt.verifyAsync(raw, {
        secret: process.env.JWT_REFRESH_SECRET,
      });
    } catch {
      throw new UnauthorizedException("Sessão expirada");
    }
    const session = await this.db.refreshSession.findUnique({
      where: { id: payload.jti },
      include: { user: true },
    });
    if (
      !session ||
      session.revokedAt ||
      session.expiresAt <= new Date() ||
      !(await argon2.verify(session.tokenHash, raw)) ||
      !session.user.active
    ) {
      throw new UnauthorizedException("Sessão expirada");
    }
    const revoked = await this.db.refreshSession.updateMany({
      where: { id: session.id, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    if (revoked.count !== 1)
      throw new UnauthorizedException("Sessão já utilizada");
    return this.issue(session.user);
  }

  async logout(raw?: string) {
    if (!raw) return;
    try {
      const payload = await this.jwt.verifyAsync<{ jti: string }>(raw, {
        secret: process.env.JWT_REFRESH_SECRET,
      });
      await this.db.refreshSession.updateMany({
        where: { id: payload.jti, revokedAt: null },
        data: { revokedAt: new Date() },
      });
    } catch {
      /* Logout remains idempotent for expired cookies. */
    }
  }

  async requestPasswordReset(emailInput: string) {
    const user = await this.db.user.findUnique({
      where: { email: emailInput.trim().toLowerCase() },
      select: { id: true, email: true, active: true },
    });
    if (user?.active) {
      const rawToken = await this.createSecurityToken(
        user.id,
        SecurityTokenKind.PASSWORD_RESET,
        30,
      );
      await this.sendTransactionalEmail({
        to: user.email,
        subject: "Redefina sua senha TPServiços",
        text: `Recebemos um pedido para redefinir sua senha. Use este link em até 30 minutos: ${this.publicUrl(`/recuperar-senha?token=${encodeURIComponent(rawToken)}`)}\n\nSe não foi você, ignore esta mensagem.`,
      });
    }
    // Always return the same response to avoid revealing registered accounts.
    return {
      accepted: true,
      deliveryConfigured: this.emailDeliveryConfigured(),
    };
  }

  async resetPassword(dto: PasswordResetConfirmDto) {
    const userId = await this.consumeSecurityToken(
      dto.token,
      SecurityTokenKind.PASSWORD_RESET,
    );
    const passwordHash = await argon2.hash(dto.password, {
      type: argon2.argon2id,
    });
    await this.db.$transaction([
      this.db.user.update({
        where: { id: userId },
        data: { passwordHash, passwordChangedAt: new Date() },
      }),
      this.db.refreshSession.updateMany({
        where: { userId, revokedAt: null },
        data: { revokedAt: new Date() },
      }),
    ]);
    return { ok: true };
  }

  async requestEmailVerification(userId: string) {
    const user = await this.db.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, emailVerifiedAt: true, active: true },
    });
    if (!user?.active) throw new UnauthorizedException("Conta indisponível");
    if (user.emailVerifiedAt)
      return { ok: true, alreadyVerified: true, deliveryConfigured: true };
    await this.sendEmailVerification(user.id, user.email);
    return {
      ok: true,
      alreadyVerified: false,
      deliveryConfigured: this.emailDeliveryConfigured(),
    };
  }

  async confirmEmailVerification(rawToken: string) {
    const userId = await this.consumeSecurityToken(
      rawToken,
      SecurityTokenKind.EMAIL_VERIFICATION,
    );
    await this.db.user.update({
      where: { id: userId },
      data: { emailVerifiedAt: new Date() },
    });
    return { ok: true };
  }

  private async issue(
    user: Pick<User, "id" | "name" | "email" | "role" | "emailVerifiedAt">,
  ) {
    const accessToken = await this.jwt.signAsync(
      { sub: user.id, email: user.email, role: user.role },
      { secret: process.env.JWT_ACCESS_SECRET, expiresIn: "15m" },
    );
    const id = randomUUID();
    const days = 30;
    const refreshToken = await this.jwt.signAsync(
      { sub: user.id, jti: id },
      { secret: process.env.JWT_REFRESH_SECRET, expiresIn: `${days}d` },
    );
    await this.db.refreshSession.create({
      data: {
        id,
        userId: user.id,
        tokenHash: await argon2.hash(refreshToken, { type: argon2.argon2id }),
        expiresAt: new Date(Date.now() + days * 86_400_000),
      },
    });
    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role as UserRole,
        emailVerified: Boolean(user.emailVerifiedAt),
      },
    };
  }

  private async sendEmailVerification(userId: string, email: string) {
    const rawToken = await this.createSecurityToken(
      userId,
      SecurityTokenKind.EMAIL_VERIFICATION,
      24 * 60,
    );
    await this.sendTransactionalEmail({
      to: email,
      subject: "Confirme seu e-mail no TPServiços",
      text: `Confirme seu e-mail para fortalecer a segurança da sua conta: ${this.publicUrl(`/confirmar-email?token=${encodeURIComponent(rawToken)}`)}\n\nEste link expira em 24 horas.`,
    });
  }

  private async createSecurityToken(
    userId: string,
    kind: SecurityTokenKind,
    expiresInMinutes: number,
  ) {
    await this.db.securityToken.updateMany({
      where: { userId, kind, consumedAt: null },
      data: { consumedAt: new Date() },
    });
    const rawToken = randomBytes(32).toString("base64url");
    const token = await this.db.securityToken.create({
      data: {
        userId,
        kind,
        tokenHash: await argon2.hash(rawToken, { type: argon2.argon2id }),
        expiresAt: new Date(Date.now() + expiresInMinutes * 60_000),
      },
    });
    return `${token.id}.${rawToken}`;
  }

  private async consumeSecurityToken(
    rawToken: string,
    kind: SecurityTokenKind,
  ) {
    const separator = rawToken.indexOf(".");
    if (separator < 1 || separator === rawToken.length - 1)
      throw new UnauthorizedException("Link inválido ou expirado");
    const tokenId = rawToken.slice(0, separator);
    const secret = rawToken.slice(separator + 1);
    const token = await this.db.securityToken.findFirst({
      where: {
        id: tokenId,
        kind,
        consumedAt: null,
        expiresAt: { gt: new Date() },
      },
    });
    if (!token || !(await argon2.verify(token.tokenHash, secret)))
      throw new UnauthorizedException("Link inválido ou expirado");
    const consumed = await this.db.securityToken.updateMany({
      where: {
        id: token.id,
        consumedAt: null,
        expiresAt: { gt: new Date() },
      },
      data: { consumedAt: new Date() },
    });
    if (consumed.count !== 1)
      throw new UnauthorizedException("Link inválido ou expirado");
    return token.userId;
  }

  private emailDeliveryConfigured() {
    return Boolean(process.env.RESEND_API_KEY && process.env.EMAIL_FROM);
  }

  private publicUrl(path: string) {
    const base =
      process.env.APP_PUBLIC_URL ??
      process.env.WEB_ORIGIN ??
      "http://localhost:5180";
    return new URL(path, base).toString();
  }

  private async sendTransactionalEmail({
    to,
    subject,
    text,
  }: {
    to: string;
    subject: string;
    text: string;
  }) {
    if (!this.emailDeliveryConfigured()) {
      this.logger.warn(
        "E-mail transacional não enviado: configure RESEND_API_KEY e EMAIL_FROM antes de publicar.",
      );
      return false;
    }
    try {
      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.RESEND_API_KEY!}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: process.env.EMAIL_FROM,
          to,
          subject,
          text,
        }),
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return true;
    } catch (error) {
      this.logger.error(
        `Falha ao enviar e-mail transacional: ${error instanceof Error ? error.message : "erro desconhecido"}`,
      );
      return false;
    }
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
