import {
  IsOptional,
  IsString,
  Matches,
  MinLength,
  MaxLength,
} from 'class-validator';

export class DeliveryWindowsQueryDto {
  @IsOptional()
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'date must be in YYYY-MM-DD format',
  })
  date?: string;

  @IsOptional()
  @IsString()
  storeId?: string;

  // ✅ NUEVO: filtros opcionales (para que no falle forbidNonWhitelisted)
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(60)
  city?: string;

  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  zone?: string;

  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(12)
  postalCode?: string;
}
