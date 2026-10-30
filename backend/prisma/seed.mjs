// Run after `npm run build`: node prisma/seed.mjs
import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import generated from '../dist/generated/prisma/client.js';

const { PrismaClient } = generated;

const CATEGORIES = ['T-Shirts', 'Hoodies', 'Pants', 'Jackets', 'Shoes'];
const BRANDS = ['Nike', 'Adidas', 'Puma', "Levi's", 'The North Face'];

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

// Idempotent: safe to run many times
async function main() {
  for (const name of CATEGORIES) {
    await prisma.category.upsert({ where: { name }, create: { name }, update: {} });
  }

  for (const name of BRANDS) {
    await prisma.brand.upsert({ where: { name }, create: { name }, update: {} });
  }

  console.log(`Seeded ${CATEGORIES.length} categories and ${BRANDS.length} brands`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
