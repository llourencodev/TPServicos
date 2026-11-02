import {
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from "class-validator";

export class CreateReportDto {
  @IsIn(["USER", "REQUEST", "MESSAGE"]) targetType!:
    "USER" | "REQUEST" | "MESSAGE";
  @IsString() @MinLength(1) @MaxLength(100) targetId!: string;
  @IsString() @MinLength(3) @MaxLength(300) reason!: string;
  @IsOptional() @IsString() @MaxLength(1500) details?: string;
}
