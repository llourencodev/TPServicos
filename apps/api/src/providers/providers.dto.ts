import { Transform, Type } from "class-transformer";
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsInt,
  IsLatitude,
  IsLongitude,
  IsOptional,
  IsString,
  IsUrl,
  Max,
  MaxLength,
  Min,
  MinLength,
} from "class-validator";

export class SearchProvidersDto {
  @IsOptional() @IsString() @MaxLength(120) query?: string;
  @IsOptional() @IsString() @MaxLength(100) categoryId?: string;
  @IsOptional() @IsString() @MaxLength(100) city?: string;
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  maxPriceFromCents?: number;
  @IsOptional()
  @Transform(({ value }) =>
    value === "true" ? true : value === "false" ? false : value,
  )
  @IsBoolean()
  verified?: boolean;
  @IsOptional() @IsString() @MaxLength(100) cursor?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(48) pageSize = 12;
}

export class UpdateProviderProfileDto {
  @IsString() @MinLength(2) @MaxLength(100) city!: string;
  @IsOptional() @IsString() @MaxLength(2000) bio?: string;
  @IsArray() @IsString({ each: true }) categoryIds!: string[];
  @IsOptional() @IsArray() @IsString({ each: true }) serviceAreas?: string[];
  @IsOptional() @IsString() @MaxLength(120) availability?: string;
  @IsOptional() @IsInt() @Min(0) @Max(100_000_000) priceFromCents?: number;
  @IsOptional() @IsInt() @Min(1) @Max(100) serviceRadiusKm?: number;
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(8)
  @IsUrl({}, { each: true })
  portfolioUrls?: string[];
  @IsOptional() @IsUrl() avatarUrl?: string;
  @IsOptional() @IsLatitude() latitude?: number;
  @IsOptional() @IsLongitude() longitude?: number;
  @IsOptional() @IsBoolean() locationConsent?: boolean;
}

export class SubmitVerificationDto {
  @IsString() @MinLength(12) @MaxLength(1000) statement!: string;
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(4)
  @IsUrl({}, { each: true })
  documentUrls?: string[];
}
