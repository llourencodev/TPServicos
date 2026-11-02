import { Body, Controller, Get, Post, UseGuards } from "@nestjs/common";
import { UserRole } from "@prisma/client";
import { AuthUser, CurrentUser } from "../auth/current-user.decorator";
import { JwtAuthGuard, Roles, RolesGuard } from "../auth/auth.guards";
import { CreatePurchaseDto, CreateRefundRequestDto } from "./wallet.dto";
import { WalletService } from "./wallet.service";

@Controller("wallet")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.PROVIDER)
export class WalletController {
  constructor(private readonly wallet: WalletService) {}
  @Get() overview(@CurrentUser() user: AuthUser) {
    return this.wallet.overview(user.id);
  }
  @Get("packages") packages() {
    return this.wallet.packages();
  }
  @Post("purchases") purchase(
    @CurrentUser() user: AuthUser,
    @Body() dto: CreatePurchaseDto,
  ) {
    return this.wallet.createPurchase(user.id, dto);
  }
  @Post("refund-requests") refund(
    @CurrentUser() user: AuthUser,
    @Body() dto: CreateRefundRequestDto,
  ) {
    return this.wallet.requestRefund(user.id, dto);
  }
}
