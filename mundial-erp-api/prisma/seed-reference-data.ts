/**
 * Reference Data Seed Script
 *
 * Populates: ProductTypes, Brands, UnitMeasures, ProductDepartments,
 * 27 Brazilian states, and the main company (Mundial Telhas).
 *
 * Idempotent — safe to run multiple times.
 * Run: npx ts-node prisma/seed-reference-data.ts
 */

import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL!,
});
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('🏗️  Seeding reference data …');

  // =========================================================================
  // 1. PRODUCT TYPES (10 tipos da Mundial Telhas — PLANO seção 1.5b)
  // =========================================================================
  const productTypes = [
    { prefix: 'TT', name: 'Telhas Térmicas', eanDeptCode: '0001' },
    { prefix: 'TG', name: 'Telhas Galvalume', eanDeptCode: '0001' },
    { prefix: 'PT', name: 'Painel Térmico', eanDeptCode: '0004' },
    { prefix: 'PF', name: 'Parafusos', eanDeptCode: '0002' },
    { prefix: 'AC', name: 'Acabamentos', eanDeptCode: '0010' },
    { prefix: 'AX', name: 'Acessório', eanDeptCode: '0003' },
    { prefix: 'MP', name: 'Matéria Prima', eanDeptCode: '0005' },
    { prefix: 'IN', name: 'Insumos', eanDeptCode: '0006' },
    { prefix: 'IM', name: 'Imobilizado', eanDeptCode: '0007' },
    { prefix: 'OT', name: 'Outros', eanDeptCode: '0008' },
  ];

  for (const pt of productTypes) {
    await prisma.productType.upsert({
      where: { prefix: pt.prefix },
      update: { name: pt.name, eanDeptCode: pt.eanDeptCode },
      create: { prefix: pt.prefix, name: pt.name, eanDeptCode: pt.eanDeptCode },
    });
  }
  console.log(`  ✔ ${productTypes.length} product types`);

  // =========================================================================
  // 1b. PRODUCT DEPARTMENTS (departamentos da Mundial Telhas — PLANO 1.5b)
  // =========================================================================
  const productDepartments = [
    'Telhas e Coberturas',
    'Painéis e Fechamentos',
    'Parafusos e Fixadores',
    'Acabamentos',
    'Acessórios',
    'Matéria Prima',
    'Insumos',
    'Imobilizado',
  ];

  for (const name of productDepartments) {
    const exists = await prisma.productDepartment.findFirst({
      where: { name, deletedAt: null },
    });
    if (!exists) {
      await prisma.productDepartment.create({ data: { name } });
    }
  }
  console.log(`  ✔ ${productDepartments.length} product departments`);

  // =========================================================================
  // 1c. BRANDS (marcas — PLANO seção 1.5b)
  // =========================================================================
  const brandNames = [
    'Mundial Telhas',
    'Brasilit',
    'Eternit',
  ];

  for (const name of brandNames) {
    const exists = await prisma.brand.findFirst({
      where: { name, deletedAt: null },
    });
    if (!exists) {
      await prisma.brand.create({ data: { name } });
    }
  }
  console.log(`  ✔ ${brandNames.length} brands`);

  // =========================================================================
  // 1d. UNIT MEASURES (unidades de medida — PLANO seção 1.5b)
  // =========================================================================
  const unitMeasureNames = [
    'UN',  // unidade
    'CX',  // caixa
    'M2',  // metro quadrado
    'KG',  // quilograma
    'ML',  // metro linear
    'PC',  // peça
  ];

  for (const name of unitMeasureNames) {
    const exists = await prisma.unitMeasure.findFirst({
      where: { name, deletedAt: null },
    });
    if (!exists) {
      await prisma.unitMeasure.create({ data: { name } });
    }
  }
  console.log(`  ✔ ${unitMeasureNames.length} unit measures`);

  // =========================================================================
  // 2. STATES (27 estados brasileiros)
  // =========================================================================
  const states = [
    { uf: 'AC', name: 'Acre' },
    { uf: 'AL', name: 'Alagoas' },
    { uf: 'AP', name: 'Amapá' },
    { uf: 'AM', name: 'Amazonas' },
    { uf: 'BA', name: 'Bahia' },
    { uf: 'CE', name: 'Ceará' },
    { uf: 'DF', name: 'Distrito Federal' },
    { uf: 'ES', name: 'Espírito Santo' },
    { uf: 'GO', name: 'Goiás' },
    { uf: 'MA', name: 'Maranhão' },
    { uf: 'MT', name: 'Mato Grosso' },
    { uf: 'MS', name: 'Mato Grosso do Sul' },
    { uf: 'MG', name: 'Minas Gerais' },
    { uf: 'PA', name: 'Pará' },
    { uf: 'PB', name: 'Paraíba' },
    { uf: 'PR', name: 'Paraná' },
    { uf: 'PE', name: 'Pernambuco' },
    { uf: 'PI', name: 'Piauí' },
    { uf: 'RJ', name: 'Rio de Janeiro' },
    { uf: 'RN', name: 'Rio Grande do Norte' },
    { uf: 'RS', name: 'Rio Grande do Sul' },
    { uf: 'RO', name: 'Rondônia' },
    { uf: 'RR', name: 'Roraima' },
    { uf: 'SC', name: 'Santa Catarina' },
    { uf: 'SP', name: 'São Paulo' },
    { uf: 'SE', name: 'Sergipe' },
    { uf: 'TO', name: 'Tocantins' },
  ];

  for (const s of states) {
    await prisma.state.upsert({
      where: { uf: s.uf },
      update: { name: s.name },
      create: { uf: s.uf, name: s.name },
    });
  }
  console.log(`  ✔ ${states.length} states`);

  // =========================================================================
  // 3. MAIN COMPANY (Mundial Telhas)
  // =========================================================================
  const company = await prisma.company.upsert({
    where: { cnpj: '00000000000100' },
    update: {
      name: 'Mundial Telhas',
      tradeName: 'Mundial Telhas',
    },
    create: {
      name: 'Mundial Telhas',
      tradeName: 'Mundial Telhas',
      cnpj: '00000000000100',
    },
  });
  console.log(`  ✔ Main company: ${company.name} (id: ${company.id})`);

  console.log('✅ Reference data seed complete.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
