import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // ─── MATTRESS MODELS ─────────────────────────────────────
  const models = await Promise.all([
    prisma.mattressModel.upsert({
      where: { slug: 'komfy-classic' },
      update: {},
      create: {
        name: 'Komfy Classic',
        slug: 'komfy-classic',
        description: 'Our signature mattress with premium pocket springs and memory foam layers.',
        warrantyMonths: 120,
        releasedAt: new Date('2022-01-01'),
      },
    }),
    prisma.mattressModel.upsert({
      where: { slug: 'komfy-premium' },
      update: {},
      create: {
        name: 'Komfy Premium',
        slug: 'komfy-premium',
        description: 'Luxury mattress with natural latex and cooling gel technology.',
        warrantyMonths: 120,
        releasedAt: new Date('2022-06-01'),
      },
    }),
    prisma.mattressModel.upsert({
      where: { slug: 'komfy-ortho' },
      update: {},
      create: {
        name: 'Komfy Ortho',
        slug: 'komfy-ortho',
        description: 'Orthopedic mattress with firm support for back health.',
        warrantyMonths: 120,
        releasedAt: new Date('2023-01-01'),
      },
    }),
    prisma.mattressModel.upsert({
      where: { slug: 'komfy-kids' },
      update: {},
      create: {
        name: 'Komfy Kids',
        slug: 'komfy-kids',
        description: 'Safe and comfortable mattress designed for children.',
        warrantyMonths: 60,
        releasedAt: new Date('2023-06-01'),
      },
    }),
    prisma.mattressModel.upsert({
      where: { slug: 'komfy-hybrid' },
      update: {},
      create: {
        name: 'Komfy Hybrid',
        slug: 'komfy-hybrid',
        description: 'Best of both worlds — springs and foam in perfect harmony.',
        warrantyMonths: 120,
        releasedAt: new Date('2024-01-01'),
      },
    }),
  ]);

  console.log(`Seeded ${models.length} mattress models`);

  // ─── PURCHASE SOURCES ────────────────────────────────────
  const sources = await Promise.all([
    prisma.purchaseSource.upsert({
      where: { name: 'KomfyAz Online Store' },
      update: {},
      create: { name: 'KomfyAz Online Store', type: 'online' },
    }),
    prisma.purchaseSource.upsert({
      where: { name: 'KomfyAz Flagship Store - Baku' },
      update: {},
      create: { name: 'KomfyAz Flagship Store - Baku', type: 'store' },
    }),
    prisma.purchaseSource.upsert({
      where: { name: 'KomfyAz Showroom - Ganja' },
      update: {},
      create: { name: 'KomfyAz Showroom - Ganja', type: 'store' },
    }),
    prisma.purchaseSource.upsert({
      where: { name: 'Sleep Well Dealer' },
      update: {},
      create: { name: 'Sleep Well Dealer', type: 'dealer' },
    }),
    prisma.purchaseSource.upsert({
      where: { name: 'Home Comfort Dealer' },
      update: {},
      create: { name: 'Home Comfort Dealer', type: 'dealer' },
    }),
    prisma.purchaseSource.upsert({
      where: { name: 'Tap.az' },
      update: {},
      create: { name: 'Tap.az', type: 'online' },
    }),
  ]);

  console.log(`Seeded ${sources.length} purchase sources`);

  // ─── ADMIN USER ──────────────────────────────────────────
  const adminPassword = await bcrypt.hash('Admin123!', 12);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@komfyaz.com' },
    update: {},
    create: {
      email: 'admin@komfyaz.com',
      passwordHash: adminPassword,
      role: 'ADMIN',
      firstName: 'System',
      lastName: 'Admin',
      isVerified: true,
      consentAt: new Date(),
    },
  });

  console.log(`Admin user seeded: ${admin.email}`);
  console.log('Seeding complete.');
}

main()
  .catch((e) => {
    console.error('Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
