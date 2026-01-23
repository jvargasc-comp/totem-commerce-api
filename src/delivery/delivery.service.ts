import { Injectable } from '@nestjs/common';
import { PrismaService } from 'nestjs-prisma';
import { DeliveryWindowsQueryDto } from './dto/delivery-windows-query.dto';

@Injectable()
export class DeliveryService {
  constructor(private readonly prisma: PrismaService) {}

  async getWindows(q: DeliveryWindowsQueryDto) {
    // q.date viene YYYY-MM-DD
    const start = new Date(`${q.date}T00:00:00.000Z`);
    const end = new Date(`${q.date}T23:59:59.999Z`);

    const windows = await this.prisma.deliveryWindow.findMany({
      where: {
        date: { gte: start, lte: end },
      },
      orderBy: [{ startTime: 'asc' }],
      select: {
        id: true,
        date: true,
        startTime: true,
        endTime: true,
        capacity: true,
      },
    });

    return windows;
  }
}
