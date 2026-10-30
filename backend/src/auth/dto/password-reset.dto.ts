import { IsEmail, IsString, MaxLength, MinLength } from 'class-validator';

export class ForgotPasswordDto {
  @IsEmail()
  email: string;
}

export class ResetPasswordDto {
  @IsString()
  @MinLength(20)
  @MaxLength(200)
  token: string;

  // bcrypt ignores everything after 72 bytes
  @IsString()
  @MinLength(8)
  @MaxLength(72)
  password: string;
}
