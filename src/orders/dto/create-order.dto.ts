import {
  ArrayMinSize,
  IsArray,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  Min,
  MinLength,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export enum FulfillmentType {
  PICKUP = 'PICKUP',
  DELIVERY = 'DELIVERY',
}

export class CreateOrderItemDto {
  @IsString()
  @IsNotEmpty()
  productId!: string;

  @IsInt()
  @Min(1)
  qty!: number;
}

export class DeliveryAddressDto {
  @IsString()
  @MinLength(5)
  line1!: string;

  @IsOptional()
  @IsString()
  reference?: string;

  @IsString()
  @MinLength(2)
  city!: string;

  @IsOptional()
  @IsString()
  zone?: string;

  @IsOptional()
  @IsString()
  postalCode?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  lat?: number;

  @IsOptional()
  lng?: number;
}

export class DeliveryInfoDto {
  @IsString()
  @IsNotEmpty()
  storeId!: string;

  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'date must be YYYY-MM-DD' })
  date!: string;

  @IsString()
  @IsNotEmpty()
  windowId!: string;

  @ValidateNested()
  @Type(() => DeliveryAddressDto)
  address!: DeliveryAddressDto;
}

export class CreateOrderDto {
  @IsString()
  @MinLength(2)
  customerName!: string;

  // Ecuador móvil: 09 + 8 dígitos
  @IsString()
  @Matches(/^09\d{8}$/, {
    message: 'customerPhone must be Ecuador mobile (09XXXXXXXX)',
  })
  customerPhone!: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateOrderItemDto)
  items!: CreateOrderItemDto[];

  @IsOptional()
  @IsEnum(FulfillmentType)
  fulfillmentType?: FulfillmentType;

  @ValidateIf(
    (o: CreateOrderDto) =>
      (o.fulfillmentType ?? FulfillmentType.PICKUP) ===
      FulfillmentType.DELIVERY,
  )
  @ValidateNested()
  @Type(() => DeliveryInfoDto)
  delivery!: DeliveryInfoDto;

  @IsOptional()
  @IsInt()
  @Min(0)
  shippingCents?: number;

  @IsOptional()
  @IsString()
  shippingProvider?: string;
}
