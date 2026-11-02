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
  CreateMessageDto,
  CreateProposalDto,
  CreateRequestDto,
  RateProviderDto,
} from "./requests.dto";
import { RequestsService } from "./requests.service";

@Controller("requests")
@UseGuards(JwtAuthGuard, RolesGuard)
export class RequestsController {
  constructor(private readonly requests: RequestsService) {}
  @Post() @Roles(UserRole.CUSTOMER) create(
    @CurrentUser() user: AuthUser,
    @Body() dto: CreateRequestDto,
  ) {
    return this.requests.create(user, dto);
  }
  @Get("mine") @Roles(UserRole.CUSTOMER) mine(@CurrentUser() user: AuthUser) {
    return this.requests.mine(user.id);
  }
  @Patch(":id/cancel") @Roles(UserRole.CUSTOMER) cancel(
    @CurrentUser() user: AuthUser,
    @Param("id") id: string,
  ) {
    return this.requests.cancel(user.id, id);
  }
  @Post(":id/complete") @Roles(UserRole.CUSTOMER) complete(
    @CurrentUser() user: AuthUser,
    @Param("id") id: string,
  ) {
    return this.requests.complete(user.id, id);
  }
  @Post(":id/rating") @Roles(UserRole.CUSTOMER) rate(
    @CurrentUser() user: AuthUser,
    @Param("id") id: string,
    @Body() dto: RateProviderDto,
  ) {
    return this.requests.rate(user, id, dto);
  }
  @Get(":id/proposals")
  @Roles(UserRole.CUSTOMER, UserRole.PROVIDER)
  proposals(@CurrentUser() user: AuthUser, @Param("id") id: string) {
    return this.requests.proposals(user, id);
  }
  @Post(":id/proposals")
  @Roles(UserRole.PROVIDER)
  propose(
    @CurrentUser() user: AuthUser,
    @Param("id") id: string,
    @Body() dto: CreateProposalDto,
  ) {
    return this.requests.propose(user.id, id, dto);
  }
  @Post(":requestId/proposals/:proposalId/accept")
  @Roles(UserRole.CUSTOMER)
  acceptProposal(
    @CurrentUser() user: AuthUser,
    @Param("requestId") requestId: string,
    @Param("proposalId") proposalId: string,
  ) {
    return this.requests.acceptProposal(user.id, requestId, proposalId);
  }
  @Get(":id/messages")
  @Roles(UserRole.CUSTOMER, UserRole.PROVIDER)
  messages(@CurrentUser() user: AuthUser, @Param("id") id: string) {
    return this.requests.messages(user, id);
  }
  @Post(":id/messages")
  @Roles(UserRole.CUSTOMER, UserRole.PROVIDER)
  message(
    @CurrentUser() user: AuthUser,
    @Param("id") id: string,
    @Body() dto: CreateMessageDto,
  ) {
    return this.requests.message(user, id, dto);
  }
}
