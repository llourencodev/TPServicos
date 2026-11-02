import {
  IsBoolean,
  IsEmail,
  IsInt,
  IsIn,
  Matches,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from "class-validator";

export class CreateUserDto {
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  @Matches(/\S/)
  name!: string;
  @IsEmail() @MaxLength(254) email!: string;
  @IsOptional()
  @IsString()
  @Matches(/^\+?(?=(?:\D*\d){10,15}\D*$)[0-9()\s.-]{10,30}$/)
  phone?: string;
  @IsIn(["CUSTOMER", "PROVIDER"])
  role!: "CUSTOMER" | "PROVIDER";
  @IsString()
  @MinLength(10)
  @MaxLength(128)
  @Matches(/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, {
    message:
      "A senha precisa ter letras maiúsculas, minúsculas e pelo menos um número",
  })
  password!: string;
}

export class CreateCategoryDto {
  @IsString() @MinLength(2) @MaxLength(100) name!: string;
  @IsString() @MinLength(2) @MaxLength(120) slug!: string;
  @IsOptional() @IsString() @MaxLength(500) description?: string;
  @IsInt() @Min(1) @Max(1000) leadCost!: number;
}

export class UpdateCategoryDto {
  @IsOptional() @IsString() @MinLength(2) @MaxLength(100) name?: string;
  @IsOptional() @IsString() @MinLength(2) @MaxLength(120) slug?: string;
  @IsOptional() @IsString() @MaxLength(500) description?: string;
  @IsOptional() @IsInt() @Min(1) @Max(1000) leadCost?: number;
  @IsOptional() @IsBoolean() active?: boolean;
}

export class CreatePackageDto {
  @IsString() @MinLength(2) @MaxLength(100) name!: string;
  @IsInt() @Min(1) @Max(100_000) credits!: number;
  @IsInt() @Min(1) @Max(100_000_000) amountInCents!: number;
}

export class UpdatePackageDto {
  @IsOptional() @IsString() @MinLength(2) @MaxLength(100) name?: string;
  @IsOptional() @IsInt() @Min(1) @Max(100_000) credits?: number;
  @IsOptional() @IsInt() @Min(1) @Max(100_000_000) amountInCents?: number;
  @IsOptional() @IsBoolean() active?: boolean;
}

export class PurchaseDecisionDto {
  @IsOptional() @IsString() @MaxLength(500) note?: string;
}

export class RefundDecisionDto {
  @IsIn(["APPROVED", "REJECTED"]) decision!: "APPROVED" | "REJECTED";
  @IsString() @MinLength(3) @MaxLength(500) note!: string;
}

export class ReportDecisionDto {
  @IsIn(["RESOLVED", "DISMISSED"]) decision!: "RESOLVED" | "DISMISSED";
  @IsString() @MinLength(3) @MaxLength(1000) note!: string;
}

export class VerificationDecisionDto {
  @IsIn(["VERIFIED", "REJECTED"]) decision!: "VERIFIED" | "REJECTED";
  @IsString() @MinLength(3) @MaxLength(1000) note!: string;
}
