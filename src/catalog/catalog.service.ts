import { Injectable } from '@nestjs/common';
import { PrismaService } from 'nestjs-prisma';

@Injectable()
export class CatalogService {
  constructor(private readonly prisma: PrismaService) {}

  listCategories() {
    return this.prisma.category.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
    });
  }

  listProducts(q?: string, categoryId?: string) {
    return this.prisma.product.findMany({
      where: {
        isActive: true,
        ...(q ? { name: { contains: q } } : {}),
        ...(categoryId ? { categoryId } : {}),
      },
      include: {
        category: true,
        images: { orderBy: { sortOrder: 'asc' } }, // ✅ portada estable
      },
      orderBy: { name: 'asc' },
      take: 100,
    });
  }
}
