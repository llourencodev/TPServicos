import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from "@nestjs/common";
import { UserRole } from "@prisma/client";
import { AuthUser, CurrentUser } from "../auth/current-user.decorator";
import { JwtAuthGuard, Roles, RolesGuard } from "../auth/auth.guards";
import { AdminService } from "./admin.service";
import {
  CreateCategoryDto,
  CreatePackageDto,
  CreateUserDto,
  PurchaseDecisionDto,
  RefundDecisionDto,
  ReportDecisionDto,
  UpdateCategoryDto,
  UpdatePackageDto,
  VerificationDecisionDto,
} from "./admin.dto";

@Controller("admin")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class AdminController {
  constructor(private readonly admin: AdminService) {}
  @Get("summary") summary() {
    return this.admin.summary();
  }
  @Get("users") users() {
    return this.admin.users();
  }
  @Get("activity") activity() {
    return this.admin.activity();
  }
  @Post("users") createUser(@Body() dto: CreateUserDto) {
    return this.admin.createUser(dto);
  }
  @Get("categories") categories() {
    return this.admin.categories();
  }
  @Post("categories") createCategory(@Body() dto: CreateCategoryDto) {
    return this.admin.createCategory(dto);
  }
  @Patch("categories/:id") updateCategory(
    @Param("id") id: string,
    @Body() dto: UpdateCategoryDto,
  ) {
    return this.admin.updateCategory(id, dto);
  }
  @Get("credit-packages") packages() {
    return this.admin.packages();
  }
  @Post("credit-packages") createPackage(@Body() dto: CreatePackageDto) {
    return this.admin.createPackage(dto);
  }
  @Patch("credit-packages/:id") updatePackage(
    @Param("id") id: string,
    @Body() dto: UpdatePackageDto,
  ) {
    return this.admin.updatePackage(id, dto);
  }
  @Get("credit-purchases/pending") purchases() {
    return this.admin.pendingPurchases();
  }
  @Post("credit-purchases/:id/approve") approve(
    @Param("id") id: string,
    @CurrentUser() user: AuthUser,
    @Body() dto: PurchaseDecisionDto,
  ) {
    return this.admin.approvePurchase(id, user.id, dto);
  }
  @Post("credit-purchases/:id/reject") reject(
    @Param("id") id: string,
    @CurrentUser() user: AuthUser,
    @Body() dto: PurchaseDecisionDto,
  ) {
    return this.admin.rejectPurchase(id, user.id, dto);
  }
  @Get("refund-requests/pending") refunds() {
    return this.admin.refundRequests();
  }
  @Post("refund-requests/:id/decision") decideRefund(
    @Param("id") id: string,
    @CurrentUser() user: AuthUser,
    @Body() dto: RefundDecisionDto,
  ) {
    return this.admin.decideRefund(id, user.id, dto);
  }
  @Get("reports") reports() {
    return this.admin.reports();
  }
  @Post("reports/:id/decision") decideReport(
    @Param("id") id: string,
    @CurrentUser() user: AuthUser,
    @Body() dto: ReportDecisionDto,
  ) {
    return this.admin.decideReport(id, user.id, dto);
  }
  @Get("provider-verifications") verifications() {
    return this.admin.verifications();
  }
  @Post("provider-verifications/:id/decision") decideVerification(
    @Param("id") id: string,
    @CurrentUser() user: AuthUser,
    @Body() dto: VerificationDecisionDto,
  ) {
    return this.admin.decideVerification(id, user.id, dto);
  }
}
