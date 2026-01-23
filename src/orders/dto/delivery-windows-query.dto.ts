import { IsNotEmpty, IsOptional, IsString, Matches } from 'class-validator';

export class DeliveryWindowsQueryDto {
  @IsString()
  @IsNotEmpty()
  storeId!: string;

  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'date must be YYYY-MM-DD' })
  date!: string;

  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsString()
  zone?: string;

  @IsOptional()
  @IsString()
  postalCode?: string;
}
