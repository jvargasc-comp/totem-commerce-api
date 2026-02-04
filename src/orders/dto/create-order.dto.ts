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

  // ✅ USA: State obligatorio (ej: "FL" o "Florida")
  @IsString()
  @MinLength(2)
  state!: string;

  // ✅ USA: Zipcode obligatorio (5 o 9 digits con guión)
  @IsString()
  @Matches(/^\d{5}(-\d{4})?$/, {
    message: 'postalCode must be US ZIP (12345 or 12345-6789)',
  })
  postalCode!: string;

  // ✅ Teléfono del receptor/dirección (flexible)
  @IsString()
  @Matches(/^[+]?[\d\s().-]{7,20}$/, {
    message:
      'phone must look like a valid phone (7-20 chars: digits/spaces/()+.-)',
  })
  phone!: string;

  // (opcional) si aún quieres mantenerlo, por ejemplo "Apt/Suite" o "Neighborhood"
  @IsOptional()
  @IsString()
  zone?: string;

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

  // ✅ USA phone (flexible). Si quieres estrictamente E.164, dime y lo cierro.
  @IsString()
  @Matches(/^[+]?[\d\s().-]{7,20}$/, {
    message:
      'customerPhone must look like a valid phone (7-20 chars: digits/spaces/()+.-)',
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

  // sigue opcional: el backend igual lo recalcula
  @IsOptional()
  @IsInt()
  @Min(0)
  shippingCents?: number;

  @IsOptional()
  @IsString()
  shippingProvider?: string;
}
