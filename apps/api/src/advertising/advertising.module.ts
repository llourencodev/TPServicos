import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { AdminAdvertisingController } from "./admin-advertising.controller";
import { AdvertisingController } from "./advertising.controller";
import { AdvertisingService } from "./advertising.service";

@Module({
  imports: [AuthModule],
  controllers: [AdvertisingController, AdminAdvertisingController],
  providers: [AdvertisingService],
})
export class AdvertisingModule {}
