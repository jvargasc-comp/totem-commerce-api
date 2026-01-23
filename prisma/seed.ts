import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Limpieza (en orden por FK)
  await prisma.delivery.deleteMany().catch(() => {});
  await prisma.deliveryWindow.deleteMany().catch(() => {});
  await prisma.orderItem.deleteMany().catch(() => {});
  await prisma.address.deleteMany().catch(() => {});
  await prisma.order.deleteMany().catch(() => {});
  await prisma.productImage.deleteMany().catch(() => {});
  await prisma.product.deleteMany().catch(() => {});
  await prisma.category.deleteMany().catch(() => {});

  // Categorías
  const categories = await prisma.category.createMany({
    data: [
      { name: 'Analgésicos' },
      { name: 'Vitaminas y suplementos' },
      { name: 'Cuidado personal' },
      { name: 'Bebés' },
      { name: 'Dermocosmética' },
    ],
  });

  // Necesitamos los IDs para relacionar productos
  const cats = await prisma.category.findMany();
  const byName = new Map(cats.map(c => [c.name, c.id]));

  // Productos (precio en centavos)
  const products = await prisma.product.createMany({
    data: [
      {
        name: 'Paracetamol 500mg (10 tabs)',
        sku: 'FAR-AN-0001',
        brand: 'Genérico',
        priceCents: 250,
        categoryId: byName.get('Analgésicos'),
      },
      {
        name: 'Ibuprofeno 400mg (10 tabs)',
        sku: 'FAR-AN-0002',
        brand: 'Genérico',
        priceCents: 380,
        categoryId: byName.get('Analgésicos'),
      },
      {
        name: 'Vitamina C 1g (10 efervescentes)',
        sku: 'FAR-VI-0001',
        brand: 'Genérico',
        priceCents: 690,
        categoryId: byName.get('Vitaminas y suplementos'),
      },
      {
        name: 'Multivitamínico Adulto (30 tabs)',
        sku: 'FAR-VI-0002',
        brand: 'Genérico',
        priceCents: 1490,
        categoryId: byName.get('Vitaminas y suplementos'),
      },
      {
        name: 'Shampoo Anticaspa 400ml',
        sku: 'FAR-CP-0001',
        brand: 'Genérico',
        priceCents: 850,
        categoryId: byName.get('Cuidado personal'),
      },
      {
        name: 'Pasta dental 90g',
        sku: 'FAR-CP-0002',
        brand: 'Genérico',
        priceCents: 320,
        categoryId: byName.get('Cuidado personal'),
      },
      {
        name: 'Pañales talla M (20)',
        sku: 'FAR-BE-0001',
        brand: 'Genérico',
        priceCents: 1890,
        categoryId: byName.get('Bebés'),
      },
      {
        name: 'Toallitas húmedas (80)',
        sku: 'FAR-BE-0002',
        brand: 'Genérico',
        priceCents: 540,
        categoryId: byName.get('Bebés'),
      },
      {
        name: 'Protector solar FPS 50 (50ml)',
        sku: 'FAR-DE-0001',
        brand: 'Genérico',
        priceCents: 2290,
        categoryId: byName.get('Dermocosmética'),
      },
      {
        name: 'Crema hidratante (200ml)',
        sku: 'FAR-DE-0002',
        brand: 'Genérico',
        priceCents: 990,
        categoryId: byName.get('Dermocosmética'),
      },
    ].map(p => ({
      ...p,
      // por si algún categoryId no se resolvió
      categoryId: p.categoryId ?? null,
    })),
  });

  // Crear algunos slots de entrega (para hoy y mañana)
  const today = new Date();
  const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);

  await prisma.deliveryWindow.createMany({
    data: [
      {
        date: new Date(today.toDateString()),
        startTime: '09:00',
        endTime: '11:00',
        capacity: 10,
      },
      {
        date: new Date(today.toDateString()),
        startTime: '11:00',
        endTime: '13:00',
        capacity: 10,
      },
      {
        date: new Date(tomorrow.toDateString()),
        startTime: '09:00',
        endTime: '11:00',
        capacity: 10,
      },
      {
        date: new Date(tomorrow.toDateString()),
        startTime: '11:00',
        endTime: '13:00',
        capacity: 10,
      },
    ],
  });

  console.log(
    '✅ Seed completado: categorías, productos y ventanas de entrega creadas.',
  );
}

main()
  .catch((e) => {
    console.error('❌ Error en seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
