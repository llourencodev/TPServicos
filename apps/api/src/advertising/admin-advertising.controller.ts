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
import {
  AdvertisementReviewDto,
  CreateAdvertisingPackageDto,
  UpdateAdvertisingPackageDto,
} from "./advertising.dto";
import { AdvertisingService } from "./advertising.service";

@Controller("admin/advertising")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class AdminAdvertisingController {
  constructor(private readonly advertising: AdvertisingService) {}

  @Get("packages") packages() {
    return this.advertising.adminPackages();
  }

  @Post("packages") createPackage(@Body() dto: CreateAdvertisingPackageDto) {
    return this.advertising.createPackage(dto);
  }

  @Patch("packages/:id") updatePackage(
    @Param("id") id: string,
    @Body() dto: UpdateAdvertisingPackageDto,
  ) {
    return this.advertising.updatePackage(id, dto);
  }

  @Get("requests/pending") pending() {
    return this.advertising.pendingAdvertisements();
  }

  @Post("requests/:id/approve") approve(
    @Param("id") id: string,
    @CurrentUser() user: AuthUser,
    @Body() dto: AdvertisementReviewDto,
  ) {
    return this.advertising.approveAdvertisement(id, user.id, dto);
  }

  @Post("requests/:id/reject") reject(
    @Param("id") id: string,
    @CurrentUser() user: AuthUser,
    @Body() dto: AdvertisementReviewDto,
  ) {
    return this.advertising.rejectAdvertisement(id, user.id, dto);
  }
}
