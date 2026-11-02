import { Body, Controller, Get, Post } from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import { CreateAdvertisementDto } from "./advertising.dto";
import { AdvertisingService } from "./advertising.service";

@Controller("advertisements")
export class AdvertisingController {
  constructor(private readonly advertising: AdvertisingService) {}

  @Get("active") active() {
    return this.advertising.activeAdvertisements();
  }

  @Get("packages") packages() {
    return this.advertising.publicPackages();
  }

  @Post("requests")
  @Throttle({ default: { limit: 3, ttl: 60_000 } })
  request(@Body() dto: CreateAdvertisementDto) {
    return this.advertising.requestAdvertisement(dto);
  }
}
