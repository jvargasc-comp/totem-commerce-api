import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'nestjs-prisma';
import { CreateOrderDto, FulfillmentType } from './dto/create-order.dto';

function computeShippingCentsByItemsCount(itemsCount: number) {
  if (!Number.isInteger(itemsCount) || itemsCount < 1) return 0;

  // 1..10 => $10, 11+ => $10 + $1 por cada producto adicional desde el 11
  if (itemsCount <= 10) return 1000;
  return 1000 + (itemsCount - 10) * 100;
}

@Injectable()
export class OrdersService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateOrderDto) {
    if (!dto.items?.length) {
      throw new BadRequestException('items is required');
    }

    const fulfillment = dto.fulfillmentType ?? FulfillmentType.PICKUP;

    // 1) Validar productos y existencia/activos
    const productIds = [...new Set(dto.items.map((i) => i.productId))];
    const products = await this.prisma.product.findMany({
      where: { id: { in: productIds }, isActive: true },
      select: {
        id: true,
        priceCents: true,
        name: true,
        isActive: true,
        isDeliverable: true,
      },
    });

    if (products.length !== productIds.length) {
      throw new BadRequestException('Some products are invalid or inactive');
    }

    // ✅ Regla negocio: si es DELIVERY, todos deben ser deliverables
    if (fulfillment === FulfillmentType.DELIVERY) {
      const nonDeliverables = products.filter((p) => p.isDeliverable === false);
      if (nonDeliverables.length > 0) {
        throw new BadRequestException({
          message: 'Some items are not eligible for delivery',
          code: 'NON_DELIVERABLE_ITEMS',
          nonDeliverableProductIds: nonDeliverables.map((p) => p.id),
          nonDeliverableProductNames: nonDeliverables.map((p) => p.name),
        });
      }
    }

    const priceById = new Map(products.map((p) => [p.id, p.priceCents]));

    // 2) Calcular totales
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
    const itemsCount = itemsComputed.reduce((acc, x) => acc + x.qty, 0);

    // (legacy) deliveryCents lo dejamos para compat, por ahora 0
    let deliveryCents = 0;

    // 3) DELIVERY: validar ventana + capacidad + address
    let window: { id: string } | null = null;

    if (fulfillment === FulfillmentType.DELIVERY) {
      if (!dto.delivery) {
        throw new BadRequestException('delivery is required for DELIVERY');
      }

      // ✅ Validación mínima de address (USA)
      const a = dto.delivery.address;
      if (!a?.line1?.trim() || a.line1.trim().length < 5) {
        throw new BadRequestException('Invalid address.line1');
      }
      if (!a?.city?.trim() || a.city.trim().length < 2) {
        throw new BadRequestException('Invalid address.city');
      }
      if (!a?.state?.trim() || a.state.trim().length < 2) {
        throw new BadRequestException('Invalid address.state');
      }
      // zipcode típico: 5 o 9 con guión. Permitimos flexible pero mínimo 5.
      const zip = (a.postalCode ?? '').trim();
      if (zip.length < 5) {
        throw new BadRequestException('Invalid address.postalCode (zip)');
      }
      const phone = (a.phone ?? '').trim();
      if (phone.length < 7) {
        throw new BadRequestException('Invalid address.phone');
      }

      const { windowId } = dto.delivery;

      const foundWindow = await this.prisma.deliveryWindow.findUnique({
        where: { id: windowId },
        include: { _count: { select: { deliveries: true } } },
      });

      if (!foundWindow) throw new NotFoundException('DeliveryWindow not found');

      if (foundWindow._count.deliveries >= foundWindow.capacity) {
        throw new ConflictException('DeliveryWindow is full');
      }

      window = { id: foundWindow.id };
      deliveryCents = 0;
    }

    // ✅ Shipping: SIEMPRE se recalcula en backend
    const shippingCents =
      fulfillment === FulfillmentType.DELIVERY
        ? computeShippingCentsByItemsCount(itemsCount)
        : 0;

    const shippingProvider =
      fulfillment === FulfillmentType.DELIVERY ? 'USPS_SIMULATED' : null;

    // ✅ Total incluye shipping
    const totalCents = subtotalCents + shippingCents;

    // 4) Crear todo en transacción
    const result = await this.prisma.$transaction(async (tx) => {
      const order = await tx.order.create({
        data: {
          customerName: dto.customerName,
          customerPhone: dto.customerPhone,
          subtotalCents,
          deliveryCents,
          shippingCents,
          shippingProvider,
          totalCents,

          items: {
            create: itemsComputed.map((i) => ({
              productId: i.productId,
              qty: i.qty,
              unitCents: i.unitCents,
              lineCents: i.lineCents,
            })),
          },

          ...(fulfillment === FulfillmentType.DELIVERY
            ? {
                address: {
                  create: {
                    line1: dto.delivery.address.line1.trim(),
                    reference: dto.delivery.address.reference?.trim() || null,
                    city: dto.delivery.address.city.trim(),
                    state: dto.delivery.address.state?.trim(), // ✅ NUEVO
                    postalCode: dto.delivery.address.postalCode?.trim() || null,
                    phone: dto.delivery.address.phone?.trim(), // ✅ NUEVO
                    zone: dto.delivery.address.zone?.trim() || null,
                    notes: dto.delivery.address.notes?.trim() || null,
                    lat: dto.delivery.address.lat,
                    lng: dto.delivery.address.lng,
                  },
                },
                delivery: {
                  create: {
                    windowId: window!.id,
                  },
                },
              }
            : {}),
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

    const delivery = order.delivery?.window
      ? {
          windowId: order.delivery.window.id,
          date: order.delivery.window.date,
          startTime: order.delivery.window.startTime,
          endTime: order.delivery.window.endTime,
        }
      : null;

    const address = order.address
      ? {
          line1: order.address.line1,
          reference: order.address.reference ?? undefined,
          city: order.address.city,
          state: (order.address as any).state ?? undefined, // ✅ NUEVO (si ya migraste)
          postalCode: order.address.postalCode ?? undefined,
          phone: (order.address as any).phone ?? undefined, // ✅ NUEVO
          zone: order.address.zone ?? undefined,
          notes: order.address.notes ?? undefined,
          lat: order.address.lat ?? undefined,
          lng: order.address.lng ?? undefined,
        }
      : null;

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

      shippingCents: order.shippingCents,
      shippingProvider: order.shippingProvider ?? undefined,

      totalCents: order.totalCents,

      address,
      delivery,

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
