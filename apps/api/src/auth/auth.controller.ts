import {
  Body,
  Controller,
  ForbiddenException,
  Post,
  Req,
  Res,
  UnauthorizedException,
  UseGuards,
} from "@nestjs/common";
import { Request, Response } from "express";
import { Throttle } from "@nestjs/throttler";
import { AuthService } from "./auth.service";
import {
  EmailVerificationConfirmDto,
  LoginDto,
  PasswordResetConfirmDto,
  PasswordResetRequestDto,
  RegisterDto,
} from "./auth.dto";
import { JwtAuthGuard } from "./auth.guards";
import { AuthUser, CurrentUser } from "./current-user.decorator";
import { isTrustedBrowserOrigin } from "./origin-policy";

function refreshCookie(request: Request) {
  const cookie = request.headers.cookie
    ?.split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith("tp_refresh="));
  return cookie
    ? decodeURIComponent(cookie.slice("tp_refresh=".length))
    : undefined;
}

@Controller("auth")
export class AuthController {
  constructor(private readonly auth: AuthService) {}
  private options() {
    return {
      httpOnly: true,
      secure: process.env.COOKIE_SECURE === "true",
      sameSite: "lax" as const,
      path: "/api/auth",
      maxAge: 30 * 24 * 60 * 60 * 1000,
    };
  }
  private response(
    response: Response,
    result: Awaited<ReturnType<AuthService["login"]>>,
  ) {
    response.setHeader("Cache-Control", "no-store");
    response.cookie("tp_refresh", result.refreshToken, this.options());
    const { refreshToken: _refreshToken, ...publicResult } = result;
    return publicResult;
  }

  private requireTrustedOrigin(request: Request) {
    if (!isTrustedBrowserOrigin(request.headers.origin)) {
      throw new ForbiddenException("Origem da requisição não permitida");
    }
  }

  @Post("register")
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  async register(
    @Body() dto: RegisterDto,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    this.requireTrustedOrigin(request);
    return this.response(response, await this.auth.register(dto));
  }

  @Post("login")
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  async login(
    @Body() dto: LoginDto,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    this.requireTrustedOrigin(request);
    return this.response(response, await this.auth.login(dto));
  }

  @Post("refresh")
  @Throttle({ default: { limit: 15, ttl: 60_000 } })
  async refresh(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    this.requireTrustedOrigin(request);
    const token = refreshCookie(request);
    if (!token) throw new UnauthorizedException("Sessão expirada");
    return this.response(response, await this.auth.refresh(token));
  }

  @Post("logout")
  @Throttle({ default: { limit: 15, ttl: 60_000 } })
  async logout(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    this.requireTrustedOrigin(request);
    await this.auth.logout(refreshCookie(request));
    response.clearCookie("tp_refresh", {
      ...this.options(),
      maxAge: undefined,
    });
    response.setHeader("Cache-Control", "no-store");
    return { ok: true };
  }

  @Post("password-reset/request")
  @Throttle({ default: { limit: 3, ttl: 60_000 } })
  async requestPasswordReset(
    @Body() dto: PasswordResetRequestDto,
    @Req() request: Request,
  ) {
    this.requireTrustedOrigin(request);
    return this.auth.requestPasswordReset(dto.email);
  }

  @Post("password-reset/confirm")
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  async confirmPasswordReset(
    @Body() dto: PasswordResetConfirmDto,
    @Req() request: Request,
  ) {
    this.requireTrustedOrigin(request);
    return this.auth.resetPassword(dto);
  }

  @Post("email-verification/request")
  @UseGuards(JwtAuthGuard)
  @Throttle({ default: { limit: 3, ttl: 60_000 } })
  async requestEmailVerification(
    @CurrentUser() user: AuthUser,
    @Req() request: Request,
  ) {
    this.requireTrustedOrigin(request);
    return this.auth.requestEmailVerification(user.id);
  }

  @Post("email-verification/confirm")
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  async confirmEmailVerification(
    @Body() dto: EmailVerificationConfirmDto,
    @Req() request: Request,
  ) {
    this.requireTrustedOrigin(request);
    return this.auth.confirmEmailVerification(dto.token);
  }
}
