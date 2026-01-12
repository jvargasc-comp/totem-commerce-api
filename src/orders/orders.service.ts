import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'nestjs-prisma';
import { CreateOrderDto } from './dto/create-order.dto';

@Injectable()
export class OrdersService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateOrderDto) {
    if (!dto.items?.length) {
      throw new BadRequestException('items is required');
    }

    // 1) Validar ventana de entrega existe
    const window = await this.prisma.deliveryWindow.findUnique({
      where: { id: dto.deliveryWindowId },
      include: { _count: { select: { deliveries: true } } },
    });
    if (!window) throw new NotFoundException('DeliveryWindow not found');

    // 2) Validar capacidad (simple)
    if (window._count.deliveries >= window.capacity) {
      throw new ConflictException('DeliveryWindow is full');
    }

    // 3) Traer productos y validar existencia/activos
    const productIds = [...new Set(dto.items.map((i) => i.productId))];
    const products = await this.prisma.product.findMany({
      where: { id: { in: productIds }, isActive: true },
      select: { id: true, priceCents: true, name: true, isActive: true },
    });

    if (products.length !== productIds.length) {
      throw new BadRequestException('Some products are invalid or inactive');
    }

    const priceById = new Map(products.map((p) => [p.id, p.priceCents]));

    // 4) Calcular totales en backend
    const itemsComputed = dto.items.map((i) => {
      const unitCents = priceById.get(i.productId);
      if (unitCents == null) throw new BadRequestException('Invalid product');

      const qty = Number(i.qty);
      if (!Number.isInteger(qty) || qty < 1) {
        throw new BadRequestException('Invalid qty');
      }

      const lineCents = unitCents * qty;
      return { productId: i.productId, qty, unitCents, lineCents };
    });

    const subtotalCents = itemsComputed.reduce(
      (acc, x) => acc + x.lineCents,
      0,
    );

    // Delivery cost simple (puedes poner lógica por zona luego)
    const deliveryCents = 0;
    const totalCents = subtotalCents + deliveryCents;

    // 5) Crear todo en una transacción
    const result = await this.prisma.$transaction(async (tx) => {
      const order = await tx.order.create({
        data: {
          customerName: dto.customerName,
          customerPhone: dto.customerPhone,
          subtotalCents,
          deliveryCents,
          totalCents,
          items: {
            create: itemsComputed.map((i) => ({
              productId: i.productId,
              qty: i.qty,
              unitCents: i.unitCents,
              lineCents: i.lineCents,
            })),
          },
          address: {
            create: {
              line1: dto.address.line1,
              reference: dto.address.reference,
              city: dto.address.city,
              zone: dto.address.zone,
              lat: dto.address.lat,
              lng: dto.address.lng,
            },
          },
          delivery: {
            create: {
              windowId: window.id,
            },
          },
        },
        include: {
          items: true,
          address: true,
          delivery: true,
        },
      });

      return order;
    });

    return result;
  }

  async findById(id: string) {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: {
        items: { include: { product: true } },
        address: true,
        delivery: { include: { window: true } },
      },
    });
    if (!order) throw new NotFoundException('Order not found');
    return order;
  }
  async getById(orderId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        items: { include: { product: true } },
        address: true,
        delivery: { include: { window: true } },
      },
    });
    if (!order) throw new NotFoundException('Order not found');

    const payments = await this.prisma.payment.findMany({
      where: { orderId },
      orderBy: { createdAt: 'desc' },
    });

    return { ...order, payments };
  }

  async getReceipt(orderId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        items: { include: { product: true } },
        address: true,
        delivery: { include: { window: true } },
      },
    });
    if (!order) throw new NotFoundException('Order not found');

    const lastConfirmedPayment = await this.prisma.payment.findFirst({
      where: { orderId, status: 'CONFIRMED' },
      orderBy: { createdAt: 'desc' },
    });

    return {
      orderId: order.id,
      createdAt: order.createdAt,
      status: order.status,
      customerName: order.customerName,
      customerPhone: order.customerPhone,
      items: order.items.map((it) => ({
        productId: it.productId,
        name: it.product.name,
        qty: it.qty,
        unitCents: it.unitCents,
        lineCents: it.lineCents,
      })),
      subtotalCents: order.subtotalCents,
      deliveryCents: order.deliveryCents,
      totalCents: order.totalCents,
      payment: lastConfirmedPayment
        ? {
            id: lastConfirmedPayment.id,
            provider: lastConfirmedPayment.provider,
            status: lastConfirmedPayment.status,
            amountCents: lastConfirmedPayment.amountCents,
            currency: lastConfirmedPayment.currency,
            externalRef: lastConfirmedPayment.externalRef,
          }
        : null,
      qrString: `ORDER:${order.id}`,
    };
  }
  async getStatus(orderId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      select: { id: true, status: true },
    });
    if (!order) throw new NotFoundException('Order not found');
    return { orderId: order.id, status: order.status };
  }
  async cancel(orderId: string) {
    return this.prisma.order.update({
      where: { id: orderId },
      data: { status: 'CANCELLED' },
    });
  }
}
