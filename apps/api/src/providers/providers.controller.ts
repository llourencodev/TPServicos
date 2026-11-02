import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import { UserRole } from "@prisma/client";
import { AuthUser, CurrentUser } from "../auth/current-user.decorator";
import { JwtAuthGuard, Roles, RolesGuard } from "../auth/auth.guards";
import { RequestsService } from "../requests/requests.service";
import {
  SearchProvidersDto,
  SubmitVerificationDto,
  UpdateProviderProfileDto,
} from "./providers.dto";
import { ProvidersService } from "./providers.service";

@Controller("providers")
export class ProvidersController {
  constructor(
    private readonly providers: ProvidersService,
    private readonly requests: RequestsService,
  ) {}
  @Get("search")
  search(@Query() query: SearchProvidersDto) {
    return this.providers.search(query);
  }

  @Get("highlights")
  highlights() {
    return this.providers.highlights();
  }

  @Get("me")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.PROVIDER)
  profile(@CurrentUser() user: AuthUser) {
    return this.providers.profile(user.id);
  }
  @Patch("me")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.PROVIDER)
  update(@CurrentUser() user: AuthUser, @Body() dto: UpdateProviderProfileDto) {
    return this.providers.update(user.id, dto);
  }
  @Post("me/verification")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.PROVIDER)
  requestVerification(
    @CurrentUser() user: AuthUser,
    @Body() dto: SubmitVerificationDto,
  ) {
    return this.providers.requestVerification(user.id, dto);
  }
  @Get("opportunities")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.PROVIDER)
  opportunities(@CurrentUser() user: AuthUser) {
    return this.providers.opportunities(user.id);
  }
  @Get("contacts")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.PROVIDER)
  contacts(@CurrentUser() user: AuthUser) {
    return this.providers.contacts(user.id);
  }
  @Post("opportunities/:id/unlock")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.PROVIDER)
  unlock(@CurrentUser() user: AuthUser, @Param("id") requestId: string) {
    return this.requests.unlock(user.id, requestId);
  }
  @Get("opportunities/:id/contact")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.PROVIDER)
  contact(@CurrentUser() user: AuthUser, @Param("id") requestId: string) {
    return this.requests.contact(user.id, requestId);
  }

  @Get(":id")
  publicProfile(@Param("id") id: string) {
    return this.providers.publicProfile(id);
  }
}
