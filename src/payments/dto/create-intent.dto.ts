import { IsOptional, IsString } from 'class-validator';

export class CreatePaymentIntentDto {
  @IsString()
  orderId: string;

  @IsOptional()
  @IsString()
  provider?: 'SIMULATED' | 'DATAFAST' | 'PAYPHONE' | 'STRIPE';
}
