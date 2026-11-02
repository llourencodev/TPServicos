import {
  Equals,
  IsBoolean,
  IsEmail,
  IsInt,
  IsOptional,
  IsString,
  IsUrl,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
} from "class-validator";

export class CreateAdvertisingPackageDto {
  @IsString() @MinLength(2) @MaxLength(100) name!: string;
  @IsOptional() @IsString() @MaxLength(300) description?: string;
  @IsInt() @Min(1) @Max(365) durationDays!: number;
  @IsInt() @Min(100) @Max(100_000_000) amountInCents!: number;
}

export class UpdateAdvertisingPackageDto {
  @IsOptional() @IsString() @MinLength(2) @MaxLength(100) name?: string;
  @IsOptional() @IsString() @MaxLength(300) description?: string;
  @IsOptional() @IsInt() @Min(1) @Max(365) durationDays?: number;
  @IsOptional() @IsInt() @Min(100) @Max(100_000_000) amountInCents?: number;
  @IsOptional() @IsBoolean() active?: boolean;
}

export class CreateAdvertisementDto {
  @IsString() @MinLength(2) @MaxLength(120) companyName!: string;
  @IsString() @MinLength(12) @MaxLength(600) description!: string;
  @IsString() @MinLength(2) @MaxLength(100) city!: string;
  @IsString() @MinLength(2) @MaxLength(80) category!: string;
  @IsOptional()
  @IsUrl({ protocols: ["http", "https"], require_protocol: true })
  @MaxLength(500)
  logoUrl?: string;
  @IsOptional()
  @IsUrl({ protocols: ["http", "https"], require_protocol: true })
  @MaxLength(500)
  websiteUrl?: string;
  @IsString() @MinLength(2) @MaxLength(100) contactName!: string;
  @IsEmail() @MaxLength(254) contactEmail!: string;
  @Matches(/^[+()\d\s.-]{8,25}$/)
  contactPhone!: string;
  @IsString() @MinLength(1) @MaxLength(120) packageId!: string;
  @Equals(true, {
    message: "É necessário aceitar o uso dos dados para contato",
  })
  contactConsent!: boolean;
}

export class AdvertisementReviewDto {
  @IsString() @MinLength(3) @MaxLength(500) note!: string;
}
