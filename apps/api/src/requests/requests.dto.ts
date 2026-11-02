import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsDateString,
  IsInt,
  IsOptional,
  IsString,
  IsUrl,
  Max,
  MaxLength,
  Min,
  MinLength,
} from "class-validator";

export class CreateRequestDto {
  @IsString() @MinLength(3) @MaxLength(120) title!: string;
  @IsString() @MinLength(10) @MaxLength(3000) description!: string;
  @IsString() @MinLength(2) @MaxLength(100) city!: string;
  @IsString() @MinLength(2) @MaxLength(100) neighborhood!: string;
  @IsString() categoryId!: string;
  @IsBoolean() contactConsent!: boolean;
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(5)
  @IsUrl({}, { each: true })
  photoUrls?: string[];
  @IsOptional() @IsDateString() expiresAt?: string;
}

export class RateProviderDto {
  @IsString() providerId!: string;
  @IsInt() @Min(1) @Max(5) score!: number;
  @IsOptional() @IsString() @MaxLength(1000) comment?: string;
}

export class CreateProposalDto {
  @IsString() @MinLength(12) @MaxLength(2000) summary!: string;
  @IsOptional() @IsInt() @Min(0) @Max(100_000_000) priceCents?: number;
  @IsOptional() @IsDateString() scheduledFor?: string;
}

export class CreateMessageDto {
  @IsString() @MinLength(1) @MaxLength(2000) body!: string;
  @IsString() recipientId!: string;
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(4)
  @IsUrl({}, { each: true })
  attachmentUrls?: string[];
}
