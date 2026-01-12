import { IsOptional, IsString } from 'class-validator';

export class ConfirmPaymentDto {
  @IsString()
  paymentId: string;

  // Para cuando tengas pasarela real
  @IsOptional()
  @IsString()
  externalRef?: string;
}
