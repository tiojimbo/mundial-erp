/**
 * Admin User Seed Script
 *
 * Creates the initial admin user for system access.
 *
 * Idempotent — uses upsert with email as identifier.
 * Run: npx ts-node prisma/seed-admin.ts
 */

import 'dotenv/config';
import { PrismaClient, Role } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import * as bcrypt from 'bcrypt';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

const BCRYPT_ROUNDS = 12;

async function main() {
  console.log('🔐 Seeding admin user …');

  const email = 'isamuelmacedo0@gmail.com';
  const password = '123456';
  const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);

  const admin = await prisma.user.upsert({
    where: { email },
    update: {
      name: 'Admin',
      passwordHash,
      role: Role.ADMIN,
      isActive: true,
      deletedAt: null,
    },
    create: {
      email,
      name: 'Admin',
      passwordHash,
      role: Role.ADMIN,
      isActive: true,
    },
  });

  console.log(`  ✔ Admin user: ${admin.email} (id: ${admin.id}, role: ${admin.role})`);
  console.log('✅ Admin seed complete.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
