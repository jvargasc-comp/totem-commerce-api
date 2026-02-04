import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

function atMidnightLocal(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
}

function addDays(d: Date, days: number) {
  const x = new Date(d);
  x.setDate(x.getDate() + days);
  return x;
}

/**
 * ✅ Verifica si una imagen responde (HEAD).
 * Si falla, retorna fallback.
 *
 * Requisitos:
 * - Node 18+ (fetch global) o habilitar polyfill.
 */
async function ensureImageUrl(url: string, fallback: string) {
  try {
    const res = await fetch(url, { method: 'HEAD' });
    if (res.ok) return url;
    return fallback;
  } catch {
    return fallback;
  }
}

/**
 * ✅ Fallback seguro
 * Recomendación: reemplázalo por una URL tuya (CDN/S3) o una imagen local servida por tu frontend.
 */
const FALLBACK_IMG =
  'https://images.unsplash.com/photo-1583947215259-38e31be8751f?auto=format&fit=crop&w=800&q=80';

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
  await prisma.category.createMany({
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
  const byName = new Map(cats.map((c) => [c.name, c.id]));

  // Productos base + meta (deliverable + imagen)
  // Regla demo:
  // - Algunos productos 'solo retiro' (isDeliverable = false) para probar el bloqueo de DELIVERY.
  const productsSeed = [
    {
      name: 'Paracetamol 500mg (10 tabs)',
      sku: 'FAR-AN-0001',
      brand: 'Genérico',
      priceCents: 250,
      categoryName: 'Analgésicos',
      isDeliverable: true,
      imageUrl:
        'https://images.unsplash.com/photo-1622896784083-cc051313db9c?auto=format&fit=crop&w=800&q=80',
    },
    {
      name: 'Ibuprofeno 400mg (10 tabs)',
      sku: 'FAR-AN-0002',
      brand: 'Genérico',
      priceCents: 380,
      categoryName: 'Analgésicos',
      isDeliverable: true,
      imageUrl:
        'https://images.unsplash.com/photo-1583947215259-38e31be8751f?auto=format&fit=crop&w=800&q=80',
    },
    {
      name: 'Vitamina C 1g (10 efervescentes)',
      sku: 'FAR-VI-0001',
      brand: 'Genérico',
      priceCents: 690,
      categoryName: 'Vitaminas y suplementos',
      isDeliverable: true,
      imageUrl:
        'https://images.unsplash.com/photo-1615486511484-92e172aff8a5?auto=format&fit=crop&w=800&q=80',
    },
    {
      name: 'Multivitamínico Adulto (30 tabs)',
      sku: 'FAR-VI-0002',
      brand: 'Genérico',
      priceCents: 1490,
      categoryName: 'Vitaminas y suplementos',
      isDeliverable: true,
      imageUrl:
        'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?auto=format&fit=crop&w=800&q=80',
    },
    {
      name: 'Shampoo Anticaspa 400ml',
      sku: 'FAR-CP-0001',
      brand: 'Genérico',
      priceCents: 850,
      categoryName: 'Cuidado personal',
      isDeliverable: true,
      imageUrl:
        'https://images.unsplash.com/photo-1617897903246-719242758050?auto=format&fit=crop&w=800&q=80',
    },
    {
      name: 'Pasta dental 90g',
      sku: 'FAR-CP-0002',
      brand: 'Genérico',
      priceCents: 320,
      categoryName: 'Cuidado personal',
      isDeliverable: true,
      imageUrl:
        'https://images.unsplash.com/photo-1611095566888-f1446042a55c?auto=format&fit=crop&w=800&q=80',
    },
    {
      name: 'Pañales talla M (20)',
      sku: 'FAR-BE-0001',
      brand: 'Genérico',
      priceCents: 1890,
      categoryName: 'Bebés',
      isDeliverable: true,
      imageUrl:
        'https://images.unsplash.com/photo-1607619056574-7b8d3ee536b2?auto=format&fit=crop&w=800&q=80',
    },
    {
      name: 'Toallitas húmedas (80)',
      sku: 'FAR-BE-0002',
      brand: 'Genérico',
      priceCents: 540,
      categoryName: 'Bebés',
      isDeliverable: true,
      imageUrl:
        'https://images.unsplash.com/photo-1583947581924-860bda6a26df?auto=format&fit=crop&w=800&q=80',
    },
    {
      name: 'Protector solar FPS 50 (50ml)',
      sku: 'FAR-DE-0001',
      brand: 'Genérico',
      priceCents: 2290,
      categoryName: 'Dermocosmética',
      isDeliverable: true,
      imageUrl:
        'https://images.unsplash.com/photo-1598440947619-2c35fc9aa908?auto=format&fit=crop&w=800&q=80',
    },
    {
      name: 'Crema hidratante (200ml)',
      sku: 'FAR-DE-0002',
      brand: 'Genérico',
      priceCents: 990,
      categoryName: 'Dermocosmética',
      isDeliverable: true,
      imageUrl:
        'https://images.unsplash.com/photo-1611930022073-b7a4ba5fcccd?auto=format&fit=crop&w=800&q=80',
    },

    // --- Extras demo: NO deliverables (solo retiro) ---
    {
      name: 'Insulina (cadena de frío) 10ml',
      sku: 'FAR-RX-0001',
      brand: 'Genérico',
      priceCents: 1590,
      categoryName: 'Analgésicos',
      isDeliverable: false,
      imageUrl:
        'https://images.unsplash.com/photo-1618939304347-e91b1c98e65e?auto=format&fit=crop&w=800&q=80',
    },
    {
      name: 'Medicamento controlado (solo receta)',
      sku: 'FAR-RX-0002',
      brand: 'Genérico',
      priceCents: 2190,
      categoryName: 'Analgésicos',
      isDeliverable: false,
      imageUrl:
        'https://images.unsplash.com/photo-1587854692152-cbe660dbde88?auto=format&fit=crop&w=800&q=80',
    },
  ] as const;

  // Crear productos + su imagen (1 por producto)
  // (createMany no permite nested create, por eso usamos create en loop)
  for (const p of productsSeed) {
    const categoryId = byName.get(p.categoryName) ?? null;

    // ✅ Asegura URL de imagen (si falla, usa fallback)
    const safeUrl = await ensureImageUrl(p.imageUrl, FALLBACK_IMG);

    await prisma.product.create({
      data: {
        name: p.name,
        sku: p.sku,
        brand: p.brand,
        priceCents: p.priceCents,
        categoryId,
        isDeliverable: p.isDeliverable,
        images: {
          create: [{ url: safeUrl, sortOrder: 0 }],
        },
      },
    });
  }

  // ✅ Ventanas de entrega: 3 por día
  const DAYS_AHEAD = 7; // hoy + próximos 6 días
  const slots = [
    { startTime: '09:00', endTime: '11:00', capacity: 10 },
    { startTime: '11:00', endTime: '13:00', capacity: 10 },
    { startTime: '15:00', endTime: '17:00', capacity: 8 },
  ];

  const today = atMidnightLocal(new Date());

  const windowsData: {
    date: Date;
    startTime: string;
    endTime: string;
    capacity: number;
  }[] = [];

  for (let i = 0; i < DAYS_AHEAD; i++) {
    const date = addDays(today, i);
    for (const s of slots) {
      windowsData.push({
        date,
        startTime: s.startTime,
        endTime: s.endTime,
        capacity: s.capacity,
      });
    }
  }

  await prisma.deliveryWindow.createMany({
    data: windowsData,
  });

  console.log(
    '✅ Seed completado: categorías, productos (con imágenes + deliverable) y ventanas de entrega (3 por día).'
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
