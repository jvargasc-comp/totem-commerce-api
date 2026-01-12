import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  Prisma,
  PaymentStatus,
  PaymentProvider,
  OrderStatus,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePaymentIntentDto } from './dto/create-intent.dto';
import { ConfirmPaymentDto } from './dto/confirm-payment.dto';

@Injectable()
export class PaymentsService {
  constructor(private readonly prisma: PrismaService) {}

  async createIntent(dto: CreatePaymentIntentDto) {
    const order = await this.prisma.order.findUnique({
      where: { id: dto.orderId },
      include: { items: true },
    });

    if (!order) throw new NotFoundException('Order not found');

    if (order.status === OrderStatus.CANCELLED) {
      throw new BadRequestException('Order is cancelled');
    }

    // Si ya está confirmada/pagada, evita crear intent nuevo
    if (order.status === OrderStatus.CONFIRMED) {
      const lastPayment = await this.prisma.payment.findFirst({
        where: { orderId: order.id, status: PaymentStatus.CONFIRMED },
        orderBy: { createdAt: 'desc' },
      });

      return {
        orderId: order.id,
        alreadyPaid: true,
        payment: lastPayment ?? null,
      };
    }

    const provider =
      (dto.provider as PaymentProvider) ?? PaymentProvider.SIMULATED;

    // Permite reintentos: creamos un nuevo payment INITIATED
    const payment = await this.prisma.payment.create({
      data: {
        orderId: order.id,
        provider,
        status: PaymentStatus.INITIATED,
        amountCents: order.totalCents,
        currency: 'USD',
      },
    });

    return { orderId: order.id, payment };
  }

  async confirm(dto: ConfirmPaymentDto) {
    // Idempotencia: si ya está confirmado, solo devuélvelo
    const existing = await this.prisma.payment.findUnique({ where: { id: dto.paymentId } });
    if (!existing) throw new NotFoundException('Payment not found');

    if (existing.status === PaymentStatus.CONFIRMED) {
      const order = await this.prisma.order.findUnique({ where: { id: existing.orderId } });
      return { payment: existing, order };
    }

    if (existing.status === PaymentStatus.CANCELLED || existing.status === PaymentStatus.FAILED) {
      throw new BadRequestException(`Cannot confirm a ${existing.status} payment`);
    }

    // Transacción: confirmar pago + marcar orden como CONFIRMED
    const result = await this.prisma.$transaction(async (tx) => {
      const payment = await tx.payment.update({
        where: { id: dto.paymentId },
        data: {
          status: PaymentStatus.CONFIRMED,
          externalRef: dto.externalRef ?? null,
        },
      });

      const order = await tx.order.update({
        where: { id: payment.orderId },
        data: { status: OrderStatus.CONFIRMED },
      });

      return { payment, order };
    });

    return result;
  }

  async get(paymentId: string) {
    const payment = await this.prisma.payment.findUnique({
      where: { id: paymentId },
      include: { order: true },
    });
    if (!payment) throw new NotFoundException('Payment not found');
    return payment;
  }
}