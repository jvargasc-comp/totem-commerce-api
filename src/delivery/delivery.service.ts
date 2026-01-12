import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from 'nestjs-prisma';

@Injectable()
export class DeliveryService {
  constructor(private readonly prisma: PrismaService) {}

  async listWindows(dateISO: string) {
    // dateISO esperado: "2026-01-06"
    if (!dateISO || !/^\d{4}-\d{2}-\d{2}$/.test(dateISO)) {
      throw new BadRequestException('date must be YYYY-MM-DD');
    }

    // Guardamos ventanas por fecha (sin hora)
    const start = new Date(`${dateISO}T00:00:00.000Z`);
    const end = new Date(`${dateISO}T23:59:59.999Z`);

    const windows = await this.prisma.deliveryWindow.findMany({
      where: {
        date: {
          gte: start,
          lte: end,
        },
      },
      orderBy: [{ startTime: 'asc' }],
      include: {
        _count: { select: { deliveries: true } },
      },
    });

    return windows.map((w) => ({
      id: w.id,
      date: w.date,
      startTime: w.startTime,
      endTime: w.endTime,
      capacity: w.capacity,
      booked: w._count.deliveries,
      available: Math.max(0, w.capacity - w._count.deliveries),
    }));
  }
}
