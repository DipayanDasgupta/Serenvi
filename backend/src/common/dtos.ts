import { IsString, IsEmail, MinLength, IsOptional, IsNumber, Min, MaxLength, Matches, IsUUID } from 'class-validator';
import { Transform } from 'class-transformer';

// Auth DTOs
export class RegisterDto {
  @IsEmail()
  @Transform(({ value }: { value: any }) => value?.toLowerCase().trim())
  email!: string;

  @IsString()
  @MinLength(8)
  @MaxLength(128)
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[@$!%*?&])/, {
    message: 'Password must contain uppercase, lowercase, number, and special character',
  })
  password!: string;

  @IsString()
  @MinLength(2)
  @MaxLength(100)
  @Matches(/^[a-zA-Z\s'-]+$/, { message: 'Name can only contain letters, spaces, hyphens, and apostrophes' })
  @Transform(({ value }: { value: any }) => value?.trim())
  name!: string;

  @IsString()
  @Matches(/^[0-9]{10,15}$/, { message: 'Phone must be 10-15 digits' })
  phone!: string;

  @IsOptional()
  @IsString()
  @Matches(/^[A-Z0-9]{6}$/, { message: 'Referral code must be exactly 6 uppercase letters or numbers' })
  sponsorId?: string;
}

export class LoginDto {
  @IsEmail()
  @Transform(({ value }: { value: any }) => value?.toLowerCase().trim())
  email!: string;

  @IsString()
  @MinLength(6)
  @MaxLength(128)
  @Matches(/^(?=.*[a-zA-Z])(?=.*[0-9])/, {
    message: 'Password must contain letters and numbers',
  })
  password!: string;
}

export class ForgotPasswordDto {
  @IsEmail()
  @Transform(({ value }: { value: any }) => value?.toLowerCase().trim())
  email!: string;
}

export class ResetPasswordDto {
  @IsString()
  token!: string;

  @IsString()
  @MinLength(8)
  @MaxLength(128)
  password!: string;
}

// Product DTOs
export class CreateProductDto {
  @IsString()
  name!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsNumber()
  @Min(0)
  price!: number;

  @IsString()
  category!: string;

  @IsString()
  type!: string; // PHYSICAL or DIGITAL

  @IsOptional()
  @IsString()
  imageUrl?: string;

  @IsOptional()
  @IsNumber()
  stockQuantity?: number;

  @IsOptional()
  @IsString()
  gender?: string; // Male, Female, Kids (comma-separated if multiple)

  @IsOptional()
  @IsString()
  sizes?: string; // S, M, L, XL, etc (comma-separated available sizes)
}

export class UpdateProductDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  price?: number;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsString()
  type?: string;

  @IsOptional()
  @IsString()
  imageUrl?: string;

  @IsOptional()
  @IsNumber()
  stockQuantity?: number;

  @IsOptional()
  @IsString()
  gender?: string; // Male, Female, Kids (comma-separated if multiple)

  @IsOptional()
  @IsString()
  sizes?: string; // S, M, L, XL, etc (comma-separated available sizes)

  @IsOptional()
  isActive?: boolean;
}

// Sale DTOs
export class CreateSaleDto {
  @IsString()
  productId!: string;

  @IsNumber()
  @Min(1)
  quantity!: number;

  @IsString()
  paymentMethod!: string;
}

// Withdrawal DTOs
export class RequestWithdrawalDto {
  @IsNumber()
  @Min(500)
  amount!: number;

  @IsString()
  bankAccount!: string;

  @IsString()
  bankIFSC!: string;

  @IsString()
  accountHolder!: string;
}

// Distributor Update DTO
export class UpdateDistributorDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  bankAccount?: string;

  @IsOptional()
  @IsString()
  bankIFSC?: string;

  @IsOptional()
  @IsString()
  bankAccountHolder?: string;
}
