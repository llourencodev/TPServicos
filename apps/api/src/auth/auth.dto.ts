import {
  Equals,
  IsBoolean,
  IsEmail,
  IsIn,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from "class-validator";

export class RegisterDto {
  @IsString() @MinLength(2) @MaxLength(100) name!: string;
  @IsEmail() @MaxLength(254) email!: string;
  @IsString()
  @MinLength(10)
  @MaxLength(128)
  @Matches(/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, {
    message: "A senha precisa ter letra maiúscula, letra minúscula e número",
  })
  password!: string;
  @IsIn(["CUSTOMER", "PROVIDER"]) role!: "CUSTOMER" | "PROVIDER";
  @IsString()
  @Matches(/^\+?(?=(?:\D*\d){10,15}\D*$)[0-9()\s.-]{10,30}$/)
  phone!: string;
  @IsBoolean() @Equals(true) termsAccepted!: boolean;
  @IsBoolean() @Equals(true) privacyAccepted!: boolean;
}

export class LoginDto {
  @IsEmail() @MaxLength(254) email!: string;
  @IsString() @MinLength(1) @MaxLength(128) password!: string;
}

export class PasswordResetRequestDto {
  @IsEmail() @MaxLength(254) email!: string;
}

export class PasswordResetConfirmDto {
  @IsString() @MinLength(20) @MaxLength(512) token!: string;
  @IsString()
  @MinLength(10)
  @MaxLength(128)
  @Matches(/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, {
    message: "A senha precisa ter letra maiúscula, letra minúscula e número",
  })
  password!: string;
}

export class EmailVerificationConfirmDto {
  @IsString() @MinLength(20) @MaxLength(512) token!: string;
}
