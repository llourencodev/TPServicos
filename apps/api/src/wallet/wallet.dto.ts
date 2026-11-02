import { IsOptional, IsString, MaxLength, MinLength } from "class-validator";

export class CreatePurchaseDto {
  @IsString() packageId!: string;
  @IsOptional() @IsString() @MaxLength(300) paymentReference?: string;
}
export class CreateRefundRequestDto {
  @IsString() unlockId!: string;
  @IsString() @MinLength(10) @MaxLength(1000) reason!: string;
}
