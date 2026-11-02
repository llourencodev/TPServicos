import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { RequestsModule } from "../requests/requests.module";
import { ProvidersController } from "./providers.controller";
import { ProvidersService } from "./providers.service";

@Module({
  imports: [AuthModule, RequestsModule],
  controllers: [ProvidersController],
  providers: [ProvidersService],
})
export class ProvidersModule {}
