/**
 * Complete Demo Seed Script — Mundial Telhas Ltda
 *
 * Populates a full demo company with:
 *   - Company, Users (4), Reference data (brands, units, payment methods, etc.)
 *   - Clients (5), Suppliers (3), Products (10)
 *   - Orders (3) in different statuses with items
 *   - AccountsReceivable linked to orders
 *   - BPM ProcessInstances per order
 *
 * Idempotent — uses upsert where unique keys exist; findFirst + create otherwise.
 * Depends on BPM seed having run first (departments, sectors, processes).
 *
 * Run: npx ts-node prisma/seed.ts
 */

import { PrismaClient, Role, OrderStatus, ProcessStatus, PersonType, PaymentStatus, ProductClassification, ProductStatus, ActivityStatus, ProductionOrderStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();
const BCRYPT_ROUNDS = 12;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Find-or-create for tables without a unique-friendly column */
async function findOrCreate<T extends { id: string }>(
  findFn: () => Promise<T | null>,
  createFn: () => Promise<T>,
): Promise<T> {
  const existing = await findFn();
  if (existing) return existing;
  return createFn();
}

// ===========================================================================
// MAIN
// ===========================================================================
async function main() {
  console.log('='.repeat(60));
  console.log('  MUNDIAL ERP — Complete Demo Seed');
  console.log('='.repeat(60));

  // =========================================================================
  // 1. COMPANY
  // =========================================================================
  console.log('\n1. Company ...');

  const company = await prisma.company.upsert({
    where: { cnpj: '12345678000199' },
    update: {
      name: 'Mundial Telhas Ltda',
      tradeName: 'Mundial Telhas',
      ie: '0010000000012',
      phone: '(31) 3333-4444',
      email: 'contato@mundialtelhas.com.br',
      address: 'Rua das Indústrias, 500',
      city: 'Betim',
      state: 'MG',
      zipCode: '32600-000',
    },
    create: {
      name: 'Mundial Telhas Ltda',
      tradeName: 'Mundial Telhas',
      cnpj: '12345678000199',
      ie: '0010000000012',
      phone: '(31) 3333-4444',
      email: 'contato@mundialtelhas.com.br',
      address: 'Rua das Indústrias, 500',
      city: 'Betim',
      state: 'MG',
      zipCode: '32600-000',
    },
  });
  console.log(`  [ok] Company: ${company.name} (${company.id})`);

  // =========================================================================
  // 2. USERS
  // =========================================================================
  console.log('\n2. Users ...');

  const usersData = [
    { email: 'admin@mundial.com.br',      name: 'Administrador',      password: 'Admin@123',  role: Role.ADMIN },
    { email: 'vendedor@mundial.com.br',    name: 'Carlos Vendedor',    password: 'Vendas@123', role: Role.OPERATOR },
    { email: 'financeiro@mundial.com.br',  name: 'Ana Financeiro',     password: 'Finan@123',  role: Role.OPERATOR },
    { email: 'producao@mundial.com.br',    name: 'João Produção',      password: 'Prod@123',   role: Role.OPERATOR },
  ];

  const users: Record<string, string> = {};
  for (const u of usersData) {
    const hash = await bcrypt.hash(u.password, BCRYPT_ROUNDS);
    const user = await prisma.user.upsert({
      where: { email: u.email },
      update: { name: u.name, passwordHash: hash, role: u.role, isActive: true, deletedAt: null },
      create: { email: u.email, name: u.name, passwordHash: hash, role: u.role, isActive: true },
    });
    users[u.email] = user.id;
    console.log(`  [ok] ${u.role.padEnd(8)} ${u.email}`);
  }

  const adminId     = users['admin@mundial.com.br'];
  const vendedorId  = users['vendedor@mundial.com.br'];
  const financeiroId = users['financeiro@mundial.com.br'];
  const producaoId  = users['producao@mundial.com.br'];

  // =========================================================================
  // 3. REFERENCE DATA
  // =========================================================================
  console.log('\n3. Reference data ...');

  // --- 3a. Brands ---
  const brandsData = [
    'Mundial Telhas',
    'Brasilit',
    'Eternit',
  ];
  const brands: Record<string, string> = {};
  for (const name of brandsData) {
    const brand = await findOrCreate(
      () => prisma.brand.findFirst({ where: { name } }),
      () => prisma.brand.create({ data: { name } }),
    );
    brands[name] = brand.id;
  }
  console.log(`  [ok] ${Object.keys(brands).length} brands`);

  // --- 3b. Unit Measures ---
  const unitsData = [
    'UN',   // unidade
    'CX',   // caixa
    'M2',   // metro quadrado
    'KG',   // quilograma
    'ML',   // metro linear
    'PC',   // peça
  ];
  const units: Record<string, string> = {};
  for (const name of unitsData) {
    const unit = await findOrCreate(
      () => prisma.unitMeasure.findFirst({ where: { name } }),
      () => prisma.unitMeasure.create({ data: { name } }),
    );
    units[name] = unit.id;
  }
  console.log(`  [ok] ${Object.keys(units).length} unit measures`);

  // --- 3c. Payment Methods ---
  const paymentMethodsData = [
    'PIX',
    'Boleto Bancário',
    'Cartão de Crédito',
    'Cartão de Débito',
    'Dinheiro',
    'Transferência Bancária',
  ];
  const paymentMethods: Record<string, string> = {};
  for (const name of paymentMethodsData) {
    const pm = await findOrCreate(
      () => prisma.paymentMethod.findFirst({ where: { name } }),
      () => prisma.paymentMethod.create({ data: { name, isActive: true } }),
    );
    paymentMethods[name] = pm.id;
  }
  console.log(`  [ok] ${Object.keys(paymentMethods).length} payment methods`);

  // --- 3d. Financial Categories ---
  const categoriesData = [
    { name: 'Vendas de Produtos',        type: 'RECEITA' },
    { name: 'Serviços Prestados',        type: 'RECEITA' },
    { name: 'Matéria-Prima',             type: 'DESPESA' },
    { name: 'Salários e Encargos',       type: 'DESPESA' },
    { name: 'Frete e Logística',         type: 'DESPESA' },
    { name: 'Despesas Administrativas',  type: 'DESPESA' },
    { name: 'Impostos e Taxas',          type: 'DESPESA' },
  ];
  const categories: Record<string, string> = {};
  for (const cat of categoriesData) {
    const fc = await findOrCreate(
      () => prisma.financialCategory.findFirst({ where: { name: cat.name, type: cat.type } }),
      () => prisma.financialCategory.create({ data: { name: cat.name, type: cat.type } }),
    );
    categories[cat.name] = fc.id;
  }
  console.log(`  [ok] ${Object.keys(categories).length} financial categories`);

  // --- 3e. Delivery Routes ---
  const routesData = [
    'Betim / Contagem',
    'BH Centro / Pampulha',
    'Sete Lagoas / Pedro Leopoldo',
    'Divinópolis / Itaúna',
    'Interior Sul MG',
  ];
  const routes: Record<string, string> = {};
  for (const name of routesData) {
    const route = await findOrCreate(
      () => prisma.deliveryRoute.findFirst({ where: { name } }),
      () => prisma.deliveryRoute.create({ data: { name } }),
    );
    routes[name] = route.id;
  }
  console.log(`  [ok] ${Object.keys(routes).length} delivery routes`);

  // --- 3f. Client Classifications ---
  const classificationsData = ['Construtor', 'Revenda', 'Consumidor Final', 'Indústria'];
  const classifications: Record<string, string> = {};
  for (const name of classificationsData) {
    const cc = await findOrCreate(
      () => prisma.clientClassification.findFirst({ where: { name } }),
      () => prisma.clientClassification.create({ data: { name } }),
    );
    classifications[name] = cc.id;
  }
  console.log(`  [ok] ${Object.keys(classifications).length} client classifications`);

  // --- 3g. Price Table ---
  const priceTable = await findOrCreate(
    () => prisma.priceTable.findFirst({ where: { name: 'Tabela Padrão' } }),
    () => prisma.priceTable.create({ data: { name: 'Tabela Padrão', isDefault: true } }),
  );
  console.log(`  [ok] Price table: ${priceTable.name}`);

  // --- 3h. Carrier ---
  const carrier = await findOrCreate(
    () => prisma.carrier.findFirst({ where: { name: 'Transporte Próprio' } }),
    () => prisma.carrier.create({ data: { name: 'Transporte Próprio' } }),
  );
  console.log(`  [ok] Carrier: ${carrier.name}`);

  // --- 3i. Order Sequence ---
  await prisma.orderSequence.upsert({
    where: { id: 'singleton' },
    update: {},
    create: { id: 'singleton', lastNumber: 1000 },
  });
  console.log(`  [ok] Order sequence initialized`);

  // =========================================================================
  // 4. CLIENTS
  // =========================================================================
  console.log('\n4. Clients ...');

  const clientsData = [
    {
      cpfCnpj: '11222333000181',
      personType: PersonType.J,
      name: 'Construtora Horizonte Ltda',
      tradeName: 'Horizonte Construções',
      email: 'compras@horizonte.com.br',
      phone: '(31) 3555-1010',
      address: 'Av. Amazonas, 1200',
      addressNumber: '1200',
      neighborhood: 'Centro',
      city: 'Belo Horizonte',
      state: 'MG',
      zipCode: '30180-001',
      classificationKey: 'Construtor',
      routeKey: 'BH Centro / Pampulha',
    },
    {
      cpfCnpj: '44555666000122',
      personType: PersonType.J,
      name: 'Material de Construção São José',
      tradeName: 'Mat. São José',
      email: 'contato@matsaojose.com.br',
      phone: '(31) 3666-2020',
      address: 'Rua Padre Eustáquio, 350',
      addressNumber: '350',
      neighborhood: 'Padre Eustáquio',
      city: 'Belo Horizonte',
      state: 'MG',
      zipCode: '30720-060',
      classificationKey: 'Revenda',
      routeKey: 'BH Centro / Pampulha',
    },
    {
      cpfCnpj: '12345678901',
      personType: PersonType.F,
      name: 'José da Silva Oliveira',
      tradeName: null,
      email: 'jose.silva@email.com',
      phone: '(31) 99888-7766',
      address: 'Rua dos Ipês, 45',
      addressNumber: '45',
      neighborhood: 'Jardim América',
      city: 'Betim',
      state: 'MG',
      zipCode: '32600-100',
      classificationKey: 'Consumidor Final',
      routeKey: 'Betim / Contagem',
    },
    {
      cpfCnpj: '77888999000155',
      personType: PersonType.J,
      name: 'Galpões Industriais MG Ltda',
      tradeName: 'Galpões MG',
      email: 'engenharia@galpoesmg.com.br',
      phone: '(31) 3777-3030',
      address: 'Rod. BR-381, Km 42',
      addressNumber: 'Km 42',
      neighborhood: 'Distrito Industrial',
      city: 'Betim',
      state: 'MG',
      zipCode: '32530-000',
      classificationKey: 'Indústria',
      routeKey: 'Betim / Contagem',
    },
    {
      cpfCnpj: '98765432100',
      personType: PersonType.F,
      name: 'Maria Aparecida Santos',
      tradeName: null,
      email: 'maria.santos@email.com',
      phone: '(35) 99111-2233',
      address: 'Rua Minas Gerais, 112',
      addressNumber: '112',
      neighborhood: 'Centro',
      city: 'Divinópolis',
      state: 'MG',
      zipCode: '35500-005',
      classificationKey: 'Consumidor Final',
      routeKey: 'Divinópolis / Itaúna',
    },
  ];

  const clients: Record<string, string> = {};
  for (const c of clientsData) {
    const client = await prisma.client.upsert({
      where: { cpfCnpj: c.cpfCnpj },
      update: {
        name: c.name,
        tradeName: c.tradeName,
        personType: c.personType,
        email: c.email,
        phone: c.phone,
        address: c.address,
        addressNumber: c.addressNumber,
        neighborhood: c.neighborhood,
        city: c.city,
        state: c.state,
        zipCode: c.zipCode,
        classificationId: classifications[c.classificationKey],
        deliveryRouteId: routes[c.routeKey],
        defaultPriceTableId: priceTable.id,
        defaultPaymentMethodId: paymentMethods['Boleto Bancário'],
      },
      create: {
        cpfCnpj: c.cpfCnpj,
        personType: c.personType,
        name: c.name,
        tradeName: c.tradeName,
        email: c.email,
        phone: c.phone,
        address: c.address,
        addressNumber: c.addressNumber,
        neighborhood: c.neighborhood,
        city: c.city,
        state: c.state,
        zipCode: c.zipCode,
        classificationId: classifications[c.classificationKey],
        deliveryRouteId: routes[c.routeKey],
        defaultPriceTableId: priceTable.id,
        defaultPaymentMethodId: paymentMethods['Boleto Bancário'],
      },
    });
    clients[c.cpfCnpj] = client.id;
    console.log(`  [ok] ${c.personType === PersonType.J ? 'PJ' : 'PF'} ${c.name}`);
  }

  // =========================================================================
  // 5. SUPPLIERS
  // =========================================================================
  console.log('\n5. Suppliers ...');

  const suppliersData = [
    {
      cpfCnpj: '99888777000166',
      personType: PersonType.J,
      name: 'Aço Forte Distribuidora S/A',
      tradeName: 'Aço Forte',
      email: 'vendas@acoforte.com.br',
      phone: '(11) 4444-5555',
      address: 'Av. Industrial, 2000',
      city: 'Guarulhos',
      state: 'SP',
      zipCode: '07190-000',
    },
    {
      cpfCnpj: '55444333000188',
      personType: PersonType.J,
      name: 'Poliuretano Brasil Ltda',
      tradeName: 'PoliBrasil',
      email: 'comercial@polibrasil.com.br',
      phone: '(19) 3222-6666',
      address: 'Rua da Química, 800',
      city: 'Campinas',
      state: 'SP',
      zipCode: '13070-000',
    },
    {
      cpfCnpj: '22111000000144',
      personType: PersonType.J,
      name: 'Fixadores e Parafusos Central Ltda',
      tradeName: 'Fixa Central',
      email: 'pedidos@fixacentral.com.br',
      phone: '(31) 3111-7777',
      address: 'Rua dos Metalúrgicos, 150',
      city: 'Contagem',
      state: 'MG',
      zipCode: '32010-000',
    },
  ];

  const suppliers: Record<string, string> = {};
  for (const s of suppliersData) {
    const supplier = await prisma.supplier.upsert({
      where: { cpfCnpj: s.cpfCnpj },
      update: {
        name: s.name,
        tradeName: s.tradeName,
        personType: s.personType,
        email: s.email,
        phone: s.phone,
        address: s.address,
        city: s.city,
        state: s.state,
        zipCode: s.zipCode,
        isActive: true,
      },
      create: {
        cpfCnpj: s.cpfCnpj,
        personType: s.personType,
        name: s.name,
        tradeName: s.tradeName,
        email: s.email,
        phone: s.phone,
        address: s.address,
        city: s.city,
        state: s.state,
        zipCode: s.zipCode,
        isActive: true,
      },
    });
    suppliers[s.cpfCnpj] = supplier.id;
    console.log(`  [ok] ${s.tradeName ?? s.name}`);
  }

  // =========================================================================
  // 6. PRODUCT TYPES (ensure they exist — may already be seeded)
  // =========================================================================
  console.log('\n6. Product types (ensure) ...');

  const ptTT = await prisma.productType.upsert({
    where: { prefix: 'TT' },
    update: {},
    create: { prefix: 'TT', name: 'Telhas Térmicas', eanDeptCode: '0001' },
  });
  const ptTG = await prisma.productType.upsert({
    where: { prefix: 'TG' },
    update: {},
    create: { prefix: 'TG', name: 'Telhas Galvalume', eanDeptCode: '0001' },
  });
  const ptAC = await prisma.productType.upsert({
    where: { prefix: 'AC' },
    update: {},
    create: { prefix: 'AC', name: 'Acabamentos', eanDeptCode: '0010' },
  });
  const ptPF = await prisma.productType.upsert({
    where: { prefix: 'PF' },
    update: {},
    create: { prefix: 'PF', name: 'Parafusos', eanDeptCode: '0002' },
  });
  const ptAX = await prisma.productType.upsert({
    where: { prefix: 'AX' },
    update: {},
    create: { prefix: 'AX', name: 'Acessório', eanDeptCode: '0003' },
  });
  const ptMP = await prisma.productType.upsert({
    where: { prefix: 'MP' },
    update: {},
    create: { prefix: 'MP', name: 'Matéria Prima', eanDeptCode: '0005' },
  });
  const ptPT = await prisma.productType.upsert({
    where: { prefix: 'PT' },
    update: {},
    create: { prefix: 'PT', name: 'Painel Térmico', eanDeptCode: '0004' },
  });
  console.log(`  [ok] Product types ensured`);

  // =========================================================================
  // 7. PRODUCTS (10 products)
  // =========================================================================
  console.log('\n7. Products ...');

  const productsData = [
    {
      code: 'TT-0001',
      barcode: '7891234560011',
      name: 'Telha Térmica TT40 - 6m',
      productTypeId: ptTT.id,
      classification: ProductClassification.FABRICACAO_PROPRIA,
      unitMeasureKey: 'UN',
      brandKey: 'Mundial Telhas',
      costPrice: 8500,    // R$ 85,00
      salePrice: 14500,   // R$ 145,00
      minSalePrice: 12000,
      minStock: 50,
      currentStock: 200,
      weight: 12.5,
      width: 1.0,
      length: 6.0,
      ncmCode: '73089090',
    },
    {
      code: 'TT-0002',
      barcode: '7891234560028',
      name: 'Telha Térmica TT40 - 8m',
      productTypeId: ptTT.id,
      classification: ProductClassification.FABRICACAO_PROPRIA,
      unitMeasureKey: 'UN',
      brandKey: 'Mundial Telhas',
      costPrice: 11000,
      salePrice: 18900,
      minSalePrice: 16000,
      minStock: 30,
      currentStock: 120,
      weight: 16.5,
      width: 1.0,
      length: 8.0,
      ncmCode: '73089090',
    },
    {
      code: 'TT-0003',
      barcode: '7891234560035',
      name: 'Telha Térmica TT40 - 10m',
      productTypeId: ptTT.id,
      classification: ProductClassification.FABRICACAO_PROPRIA,
      unitMeasureKey: 'UN',
      brandKey: 'Mundial Telhas',
      costPrice: 13500,
      salePrice: 23500,
      minSalePrice: 20000,
      minStock: 20,
      currentStock: 80,
      weight: 20.5,
      width: 1.0,
      length: 10.0,
      ncmCode: '73089090',
    },
    {
      code: 'TG-0001',
      barcode: '7891234560042',
      name: 'Telha Galvalume TG25 - 6m',
      productTypeId: ptTG.id,
      classification: ProductClassification.FABRICACAO_PROPRIA,
      unitMeasureKey: 'UN',
      brandKey: 'Mundial Telhas',
      costPrice: 5500,
      salePrice: 9500,
      minSalePrice: 8000,
      minStock: 100,
      currentStock: 350,
      weight: 8.0,
      width: 1.0,
      length: 6.0,
      ncmCode: '73089090',
    },
    {
      code: 'PT-0001',
      barcode: '7891234560059',
      name: 'Painel Térmico PT50 - 6m',
      productTypeId: ptPT.id,
      classification: ProductClassification.FABRICACAO_PROPRIA,
      unitMeasureKey: 'UN',
      brandKey: 'Mundial Telhas',
      costPrice: 18000,
      salePrice: 29900,
      minSalePrice: 25000,
      minStock: 10,
      currentStock: 40,
      weight: 25.0,
      width: 1.0,
      length: 6.0,
      ncmCode: '73089090',
    },
    {
      code: 'AC-0001',
      barcode: '7891234560066',
      name: 'Cumeeira Térmica Lisa - 1m',
      productTypeId: ptAC.id,
      classification: ProductClassification.FABRICACAO_PROPRIA,
      unitMeasureKey: 'UN',
      brandKey: 'Mundial Telhas',
      costPrice: 2500,
      salePrice: 4500,
      minSalePrice: 3800,
      minStock: 100,
      currentStock: 500,
      weight: 2.0,
      width: 0.4,
      length: 1.0,
      ncmCode: '73089090',
    },
    {
      code: 'AC-0002',
      barcode: '7891234560073',
      name: 'Rufo Interno Galvalume - 2m',
      productTypeId: ptAC.id,
      classification: ProductClassification.FABRICACAO_PROPRIA,
      unitMeasureKey: 'UN',
      brandKey: 'Mundial Telhas',
      costPrice: 1800,
      salePrice: 3200,
      minSalePrice: 2700,
      minStock: 80,
      currentStock: 300,
      weight: 1.5,
      width: 0.3,
      length: 2.0,
      ncmCode: '73089090',
    },
    {
      code: 'PF-0001',
      barcode: '7891234560080',
      name: 'Parafuso Autobrocante 5/16 x 110mm c/ Arruela',
      productTypeId: ptPF.id,
      classification: ProductClassification.REVENDA,
      unitMeasureKey: 'UN',
      brandKey: 'Mundial Telhas',
      costPrice: 85,       // R$ 0,85
      salePrice: 150,      // R$ 1,50
      minSalePrice: 120,
      minStock: 5000,
      currentStock: 15000,
      weight: 0.035,
      width: null,
      length: null,
      ncmCode: '73181500',
    },
    {
      code: 'AX-0001',
      barcode: '7891234560097',
      name: 'Fita Vedação Asfáltica 30cm x 10m',
      productTypeId: ptAX.id,
      classification: ProductClassification.REVENDA,
      unitMeasureKey: 'UN',
      brandKey: 'Brasilit',
      costPrice: 3500,
      salePrice: 5900,
      minSalePrice: 5000,
      minStock: 50,
      currentStock: 150,
      weight: 3.0,
      width: 0.3,
      length: 10.0,
      ncmCode: '68071000',
    },
    {
      code: 'MP-0001',
      barcode: '7891234560104',
      name: 'Bobina Galvalume 0,43mm x 1200mm',
      productTypeId: ptMP.id,
      classification: ProductClassification.MATERIA_PRIMA,
      unitMeasureKey: 'KG',
      brandKey: 'Mundial Telhas',
      costPrice: 750,      // R$ 7,50 / kg
      salePrice: 0,        // not for sale
      minSalePrice: 0,
      minStock: 5000,
      currentStock: 12000,
      weight: 1.0,
      width: 1.2,
      length: null,
      ncmCode: '72107000',
    },
  ];

  const products: Record<string, { id: string; salePrice: number; name: string; classification: ProductClassification | null }> = {};
  for (const p of productsData) {
    const product = await prisma.product.upsert({
      where: { code: p.code },
      update: {
        name: p.name,
        barcode: p.barcode,
        productTypeId: p.productTypeId,
        classification: p.classification,
        unitMeasureId: units[p.unitMeasureKey],
        brandId: brands[p.brandKey],
        costPrice: p.costPrice,
        salePrice: p.salePrice,
        minSalePrice: p.minSalePrice,
        minStock: p.minStock,
        currentStock: p.currentStock,
        weight: p.weight,
        width: p.width,
        length: p.length,
        ncmCode: p.ncmCode,
        status: ProductStatus.ACTIVE,
        step1Complete: true,
        step2Complete: true,
        step3Complete: true,
        step4Complete: true,
        defaultPriceTableId: priceTable.id,
      },
      create: {
        code: p.code,
        barcode: p.barcode,
        name: p.name,
        productTypeId: p.productTypeId,
        classification: p.classification,
        unitMeasureId: units[p.unitMeasureKey],
        brandId: brands[p.brandKey],
        costPrice: p.costPrice,
        salePrice: p.salePrice,
        minSalePrice: p.minSalePrice,
        minStock: p.minStock,
        currentStock: p.currentStock,
        weight: p.weight,
        width: p.width,
        length: p.length,
        ncmCode: p.ncmCode,
        status: ProductStatus.ACTIVE,
        step1Complete: true,
        step2Complete: true,
        step3Complete: true,
        step4Complete: true,
        defaultPriceTableId: priceTable.id,
      },
    });
    products[p.code] = { id: product.id, salePrice: p.salePrice, name: p.name, classification: p.classification };
    console.log(`  [ok] ${p.code} — ${p.name} (R$ ${(p.salePrice / 100).toFixed(2)})`);
  }

  // --- Price Table Items ---
  console.log('\n  Price table items ...');
  for (const [code, prod] of Object.entries(products)) {
    if (prod.salePrice > 0) {
      const existing = await prisma.priceTableItem.findFirst({
        where: { priceTableId: priceTable.id, productId: prod.id },
      });
      if (!existing) {
        await prisma.priceTableItem.create({
          data: {
            priceTableId: priceTable.id,
            productId: prod.id,
            priceInCents: prod.salePrice,
          },
        });
      } else {
        await prisma.priceTableItem.update({
          where: { id: existing.id },
          data: { priceInCents: prod.salePrice },
        });
      }
    }
  }
  console.log(`  [ok] Price table items synced`);

  // =========================================================================
  // 8. ORDERS (3 orders in different statuses)
  // =========================================================================
  console.log('\n8. Orders ...');

  // Helper dates
  const now = new Date();
  const daysAgo = (n: number) => new Date(now.getTime() - n * 24 * 60 * 60 * 1000);
  const daysFromNow = (n: number) => new Date(now.getTime() + n * 24 * 60 * 60 * 1000);

  // --- Order 1: EM_ORCAMENTO (recent quote) ---
  const order1Items = [
    { productCode: 'TT-0001', quantity: 20, unitPriceCents: 14500 },
    { productCode: 'AC-0001', quantity: 10, unitPriceCents: 4500 },
    { productCode: 'PF-0001', quantity: 200, unitPriceCents: 150 },
  ];
  const order1Subtotal = order1Items.reduce((s, i) => s + i.quantity * i.unitPriceCents, 0);
  const order1Total = order1Subtotal + 150000; // + R$1500 freight

  const order1 = await prisma.order.upsert({
    where: { orderNumber: 'PED-1001' },
    update: {
      status: OrderStatus.EM_ORCAMENTO,
      clientId: clients['11222333000181'],
      companyId: company.id,
      paymentMethodId: paymentMethods['Boleto Bancário'],
      carrierId: carrier.id,
      priceTableId: priceTable.id,
      createdByUserId: vendedorId,
      assignedUserId: vendedorId,
      issueDate: daysAgo(2),
      deliveryDeadline: daysFromNow(15),
      deliveryAddress: 'Av. Amazonas, 1200',
      deliveryNeighborhood: 'Centro',
      deliveryCity: 'Belo Horizonte',
      deliveryState: 'MG',
      deliveryCep: '30180-001',
      contactName: 'Sr. Roberto — Eng. Civil',
      subtotalCents: order1Subtotal,
      freightCents: 150000,
      discountCents: 0,
      totalCents: order1Total,
      paidAmountCents: 0,
      shouldProduce: true,
      notes: 'Orçamento para cobertura de galpão industrial — 200m²',
    },
    create: {
      orderNumber: 'PED-1001',
      title: 'Cobertura Galpão Industrial',
      status: OrderStatus.EM_ORCAMENTO,
      clientId: clients['11222333000181'],
      companyId: company.id,
      paymentMethodId: paymentMethods['Boleto Bancário'],
      carrierId: carrier.id,
      priceTableId: priceTable.id,
      createdByUserId: vendedorId,
      assignedUserId: vendedorId,
      issueDate: daysAgo(2),
      deliveryDeadline: daysFromNow(15),
      deliveryAddress: 'Av. Amazonas, 1200',
      deliveryNeighborhood: 'Centro',
      deliveryCity: 'Belo Horizonte',
      deliveryState: 'MG',
      deliveryCep: '30180-001',
      contactName: 'Sr. Roberto — Eng. Civil',
      subtotalCents: order1Subtotal,
      freightCents: 150000,
      discountCents: 0,
      totalCents: order1Total,
      paidAmountCents: 0,
      shouldProduce: true,
      notes: 'Orçamento para cobertura de galpão industrial — 200m²',
    },
  });
  console.log(`  [ok] ${order1.orderNumber} — EM_ORCAMENTO (R$ ${(order1Total / 100).toFixed(2)})`);

  // --- Order 2: FATURADO (paid 50%, awaiting production) ---
  const order2Items = [
    { productCode: 'TT-0002', quantity: 15, unitPriceCents: 18900 },
    { productCode: 'AC-0001', quantity: 8, unitPriceCents: 4500 },
    { productCode: 'AC-0002', quantity: 12, unitPriceCents: 3200 },
    { productCode: 'PF-0001', quantity: 150, unitPriceCents: 150 },
  ];
  const order2Subtotal = order2Items.reduce((s, i) => s + i.quantity * i.unitPriceCents, 0);
  const order2Total = order2Subtotal + 120000; // + R$1200 freight

  const order2 = await prisma.order.upsert({
    where: { orderNumber: 'PED-1002' },
    update: {
      status: OrderStatus.FATURADO,
      clientId: clients['77888999000155'],
      companyId: company.id,
      paymentMethodId: paymentMethods['PIX'],
      carrierId: carrier.id,
      priceTableId: priceTable.id,
      createdByUserId: vendedorId,
      assignedUserId: financeiroId,
      issueDate: daysAgo(7),
      deliveryDeadline: daysFromNow(7),
      deliveryAddress: 'Rod. BR-381, Km 42',
      deliveryNeighborhood: 'Distrito Industrial',
      deliveryCity: 'Betim',
      deliveryState: 'MG',
      deliveryCep: '32530-000',
      contactName: 'Eng. Patricia — Gerente de Obras',
      subtotalCents: order2Subtotal,
      freightCents: 120000,
      discountCents: 0,
      totalCents: order2Total,
      paidAmountCents: Math.round(order2Total / 2),
      paymentProofUrl: '/uploads/comprovante-ped1002.pdf',
      shouldProduce: true,
      notes: 'Cobertura de barracão — prazo firme',
    },
    create: {
      orderNumber: 'PED-1002',
      title: 'Cobertura Barracão Logístico',
      status: OrderStatus.FATURADO,
      clientId: clients['77888999000155'],
      companyId: company.id,
      paymentMethodId: paymentMethods['PIX'],
      carrierId: carrier.id,
      priceTableId: priceTable.id,
      createdByUserId: vendedorId,
      assignedUserId: financeiroId,
      issueDate: daysAgo(7),
      deliveryDeadline: daysFromNow(7),
      deliveryAddress: 'Rod. BR-381, Km 42',
      deliveryNeighborhood: 'Distrito Industrial',
      deliveryCity: 'Betim',
      deliveryState: 'MG',
      deliveryCep: '32530-000',
      contactName: 'Eng. Patricia — Gerente de Obras',
      subtotalCents: order2Subtotal,
      freightCents: 120000,
      discountCents: 0,
      totalCents: order2Total,
      paidAmountCents: Math.round(order2Total / 2),
      paymentProofUrl: '/uploads/comprovante-ped1002.pdf',
      shouldProduce: true,
      notes: 'Cobertura de barracão — prazo firme',
    },
  });
  console.log(`  [ok] ${order2.orderNumber} — FATURADO (R$ ${(order2Total / 100).toFixed(2)})`);

  // --- Order 3: ENTREGUE (completed) ---
  const order3Items = [
    { productCode: 'TG-0001', quantity: 30, unitPriceCents: 9500 },
    { productCode: 'AX-0001', quantity: 5, unitPriceCents: 5900 },
    { productCode: 'PF-0001', quantity: 300, unitPriceCents: 150 },
  ];
  const order3Subtotal = order3Items.reduce((s, i) => s + i.quantity * i.unitPriceCents, 0);
  const order3Discount = 15000; // R$150 discount
  const order3Total = order3Subtotal + 80000 - order3Discount; // + R$800 freight - discount

  const order3 = await prisma.order.upsert({
    where: { orderNumber: 'PED-1003' },
    update: {
      status: OrderStatus.ENTREGUE,
      clientId: clients['12345678901'],
      companyId: company.id,
      paymentMethodId: paymentMethods['PIX'],
      carrierId: carrier.id,
      priceTableId: priceTable.id,
      createdByUserId: vendedorId,
      assignedUserId: vendedorId,
      issueDate: daysAgo(30),
      deliveryDeadline: daysAgo(10),
      deliveryAddress: 'Rua dos Ipês, 45',
      deliveryNeighborhood: 'Jardim América',
      deliveryCity: 'Betim',
      deliveryState: 'MG',
      deliveryCep: '32600-100',
      contactName: 'José da Silva',
      subtotalCents: order3Subtotal,
      freightCents: 80000,
      discountCents: order3Discount,
      totalCents: order3Total,
      paidAmountCents: order3Total,
      paymentProofUrl: '/uploads/comprovante-ped1003.pdf',
      shouldProduce: false,
      isResale: true,
      notes: 'Entrega realizada com sucesso',
    },
    create: {
      orderNumber: 'PED-1003',
      title: 'Telhas Galvalume — Residência',
      status: OrderStatus.ENTREGUE,
      clientId: clients['12345678901'],
      companyId: company.id,
      paymentMethodId: paymentMethods['PIX'],
      carrierId: carrier.id,
      priceTableId: priceTable.id,
      createdByUserId: vendedorId,
      assignedUserId: vendedorId,
      issueDate: daysAgo(30),
      deliveryDeadline: daysAgo(10),
      deliveryAddress: 'Rua dos Ipês, 45',
      deliveryNeighborhood: 'Jardim América',
      deliveryCity: 'Betim',
      deliveryState: 'MG',
      deliveryCep: '32600-100',
      contactName: 'José da Silva',
      subtotalCents: order3Subtotal,
      freightCents: 80000,
      discountCents: order3Discount,
      totalCents: order3Total,
      paidAmountCents: order3Total,
      paymentProofUrl: '/uploads/comprovante-ped1003.pdf',
      shouldProduce: false,
      isResale: true,
      notes: 'Entrega realizada com sucesso',
    },
  });
  console.log(`  [ok] ${order3.orderNumber} — ENTREGUE (R$ ${(order3Total / 100).toFixed(2)})`);

  // =========================================================================
  // 9. ORDER ITEMS
  // =========================================================================
  console.log('\n9. Order items ...');

  async function syncOrderItems(
    orderId: string,
    items: { productCode: string; quantity: number; unitPriceCents: number }[],
  ) {
    // Delete children referencing order items first (cascade)
    await prisma.orderItemSupply.deleteMany({ where: { orderItem: { orderId } } });
    await prisma.separationOrderItem.deleteMany({ where: { orderItem: { orderId } } });
    await prisma.productionOrderItem.deleteMany({ where: { orderItem: { orderId } } });
    // Now safe to delete order items
    await prisma.orderItem.deleteMany({ where: { orderId } });
    const createdItems: { id: string; productCode: string }[] = [];
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const prod = products[item.productCode];
      const totalCents = item.quantity * item.unitPriceCents;
      const created = await prisma.orderItem.create({
        data: {
          orderId,
          productId: prod.id,
          productName: prod.name,
          quantity: item.quantity,
          unitPriceCents: item.unitPriceCents,
          totalCents,
          sortOrder: i + 1,
          classificationSnapshot: prod.classification,
        },
      });
      createdItems.push({ id: created.id, productCode: item.productCode });
    }
    return createdItems;
  }

  const order1CreatedItems = await syncOrderItems(order1.id, order1Items);
  console.log(`  [ok] ${order1.orderNumber}: ${order1CreatedItems.length} items`);

  const order2CreatedItems = await syncOrderItems(order2.id, order2Items);
  console.log(`  [ok] ${order2.orderNumber}: ${order2CreatedItems.length} items`);

  const order3CreatedItems = await syncOrderItems(order3.id, order3Items);
  console.log(`  [ok] ${order3.orderNumber}: ${order3CreatedItems.length} items`);

  // =========================================================================
  // 10. ACCOUNTS RECEIVABLE
  // =========================================================================
  console.log('\n10. Accounts receivable ...');

  // Clean existing ARs for these orders for idempotency
  await prisma.accountReceivable.deleteMany({
    where: { orderId: { in: [order1.id, order2.id, order3.id] } },
  });

  // Order 2 — FATURADO: 2 parcelas (50/50), 1st PAID, 2nd PENDING
  const order2Half = Math.round(order2Total / 2);

  await prisma.accountReceivable.create({
    data: {
      orderId: order2.id,
      clientId: clients['77888999000155'],
      description: 'PED-1002 — Parcela 1/2 (entrada 50%)',
      amountCents: order2Half,
      paidAmountCents: order2Half,
      dueDate: daysAgo(7),
      paidDate: daysAgo(6),
      status: PaymentStatus.PAID,
    },
  });
  await prisma.accountReceivable.create({
    data: {
      orderId: order2.id,
      clientId: clients['77888999000155'],
      description: 'PED-1002 — Parcela 2/2 (entrega 50%)',
      amountCents: order2Total - order2Half,
      paidAmountCents: 0,
      dueDate: daysFromNow(7),
      status: PaymentStatus.PENDING,
    },
  });
  console.log(`  [ok] ${order2.orderNumber}: 2 parcelas (1 PAID, 1 PENDING)`);

  // Order 3 — ENTREGUE: 2 parcelas, both PAID
  const order3Half = Math.round(order3Total / 2);

  await prisma.accountReceivable.create({
    data: {
      orderId: order3.id,
      clientId: clients['12345678901'],
      description: 'PED-1003 — Parcela 1/2 (entrada 50%)',
      amountCents: order3Half,
      paidAmountCents: order3Half,
      dueDate: daysAgo(30),
      paidDate: daysAgo(29),
      status: PaymentStatus.PAID,
    },
  });
  await prisma.accountReceivable.create({
    data: {
      orderId: order3.id,
      clientId: clients['12345678901'],
      description: 'PED-1003 — Parcela 2/2 (entrega 50%)',
      amountCents: order3Total - order3Half,
      paidAmountCents: order3Total - order3Half,
      dueDate: daysAgo(10),
      paidDate: daysAgo(10),
      status: PaymentStatus.PAID,
    },
  });
  console.log(`  [ok] ${order3.orderNumber}: 2 parcelas (both PAID)`);

  // =========================================================================
  // 11. BPM — PROCESS INSTANCES
  // =========================================================================
  console.log('\n11. BPM Process instances ...');

  // Look up the process definitions seeded by seed-bpm.ts
  const processPedidos = await prisma.process.findFirst({ where: { slug: 'processo-pedidos' } });
  const processConc = await prisma.process.findFirst({ where: { slug: 'conciliacao-faturamento-processo' } });
  const processProducao = await prisma.process.findFirst({ where: { slug: 'producao-pedido-processo' } });
  const processConferencia = await prisma.process.findFirst({ where: { slug: 'conferencia-entrega-processo' } });

  if (!processPedidos || !processConc || !processProducao || !processConferencia) {
    console.log('  [WARN] BPM processes not found — run seed-bpm.ts first. Skipping BPM instances.');
  } else {
    // Clean existing process instances for these orders (cascade: task → activity → handoff → process)
    const orderIds = [order1.id, order2.id, order3.id];
    await prisma.taskInstance.deleteMany({
      where: { activityInstance: { processInstance: { orderId: { in: orderIds } } } },
    });
    await prisma.activityInstance.deleteMany({
      where: { processInstance: { orderId: { in: orderIds } } },
    });
    await prisma.handoffInstance.deleteMany({
      where: { orderId: { in: orderIds } },
    });
    await prisma.processInstance.deleteMany({
      where: { orderId: { in: orderIds } },
    });

    // --- Order 1 (EM_ORCAMENTO): process started, activity in progress ---
    const pi1 = await prisma.processInstance.create({
      data: {
        processId: processPedidos.id,
        orderId: order1.id,
        status: ProcessStatus.ACTIVE,
        startedAt: daysAgo(2),
      },
    });

    // Find first activity of the process
    const actCriarPedido = await prisma.activity.findFirst({
      where: { slug: 'criar-pedido-elaborar-orcamento' },
    });
    if (actCriarPedido) {
      await prisma.activityInstance.create({
        data: {
          activityId: actCriarPedido.id,
          processInstanceId: pi1.id,
          assignedUserId: vendedorId,
          status: ActivityStatus.IN_PROGRESS,
          startedAt: daysAgo(2),
        },
      });
    }
    console.log(`  [ok] ${order1.orderNumber}: ProcessInstance ACTIVE (Pedidos)`);

    // --- Order 2 (FATURADO): Pedidos COMPLETED, Conciliacao COMPLETED, Producao ACTIVE ---
    const pi2Ped = await prisma.processInstance.create({
      data: {
        processId: processPedidos.id,
        orderId: order2.id,
        status: ProcessStatus.COMPLETED,
        startedAt: daysAgo(10),
        completedAt: daysAgo(7),
      },
    });

    const actFechar = await prisma.activity.findFirst({
      where: { slug: 'fechar-negocio-enviar-faturamento' },
    });
    if (actCriarPedido) {
      await prisma.activityInstance.create({
        data: {
          activityId: actCriarPedido.id,
          processInstanceId: pi2Ped.id,
          assignedUserId: vendedorId,
          status: ActivityStatus.COMPLETED,
          startedAt: daysAgo(10),
          completedAt: daysAgo(8),
        },
      });
    }
    if (actFechar) {
      await prisma.activityInstance.create({
        data: {
          activityId: actFechar.id,
          processInstanceId: pi2Ped.id,
          assignedUserId: vendedorId,
          status: ActivityStatus.COMPLETED,
          startedAt: daysAgo(8),
          completedAt: daysAgo(7),
        },
      });
    }

    const pi2Conc = await prisma.processInstance.create({
      data: {
        processId: processConc.id,
        orderId: order2.id,
        status: ProcessStatus.COMPLETED,
        startedAt: daysAgo(7),
        completedAt: daysAgo(6),
      },
    });

    const actConciliar = await prisma.activity.findFirst({
      where: { slug: 'conciliar-pagamento' },
    });
    if (actConciliar) {
      await prisma.activityInstance.create({
        data: {
          activityId: actConciliar.id,
          processInstanceId: pi2Conc.id,
          assignedUserId: financeiroId,
          status: ActivityStatus.COMPLETED,
          startedAt: daysAgo(7),
          completedAt: daysAgo(6),
        },
      });
    }

    const pi2Prod = await prisma.processInstance.create({
      data: {
        processId: processProducao.id,
        orderId: order2.id,
        status: ProcessStatus.ACTIVE,
        startedAt: daysAgo(6),
      },
    });

    const actAceitar = await prisma.activity.findFirst({
      where: { slug: 'aceitar-pedido-iniciar-producao' },
    });
    if (actAceitar) {
      await prisma.activityInstance.create({
        data: {
          activityId: actAceitar.id,
          processInstanceId: pi2Prod.id,
          assignedUserId: producaoId,
          status: ActivityStatus.IN_PROGRESS,
          startedAt: daysAgo(6),
        },
      });
    }
    console.log(`  [ok] ${order2.orderNumber}: 3 ProcessInstances (Pedidos COMPLETED, Conciliação COMPLETED, Produção ACTIVE)`);

    // --- Order 3 (ENTREGUE): all processes COMPLETED ---
    const pi3Ped = await prisma.processInstance.create({
      data: {
        processId: processPedidos.id,
        orderId: order3.id,
        status: ProcessStatus.COMPLETED,
        startedAt: daysAgo(35),
        completedAt: daysAgo(30),
      },
    });
    if (actCriarPedido) {
      await prisma.activityInstance.create({
        data: {
          activityId: actCriarPedido.id,
          processInstanceId: pi3Ped.id,
          assignedUserId: vendedorId,
          status: ActivityStatus.COMPLETED,
          startedAt: daysAgo(35),
          completedAt: daysAgo(32),
        },
      });
    }
    if (actFechar) {
      await prisma.activityInstance.create({
        data: {
          activityId: actFechar.id,
          processInstanceId: pi3Ped.id,
          assignedUserId: vendedorId,
          status: ActivityStatus.COMPLETED,
          startedAt: daysAgo(32),
          completedAt: daysAgo(30),
        },
      });
    }

    const pi3Conc = await prisma.processInstance.create({
      data: {
        processId: processConc.id,
        orderId: order3.id,
        status: ProcessStatus.COMPLETED,
        startedAt: daysAgo(30),
        completedAt: daysAgo(28),
      },
    });
    if (actConciliar) {
      await prisma.activityInstance.create({
        data: {
          activityId: actConciliar.id,
          processInstanceId: pi3Conc.id,
          assignedUserId: financeiroId,
          status: ActivityStatus.COMPLETED,
          startedAt: daysAgo(30),
          completedAt: daysAgo(28),
        },
      });
    }

    const pi3Conf = await prisma.processInstance.create({
      data: {
        processId: processConferencia.id,
        orderId: order3.id,
        status: ProcessStatus.COMPLETED,
        startedAt: daysAgo(12),
        completedAt: daysAgo(10),
      },
    });

    const actConferir = await prisma.activity.findFirst({
      where: { slug: 'conferir-entregar-pedido' },
    });
    if (actConferir) {
      await prisma.activityInstance.create({
        data: {
          activityId: actConferir.id,
          processInstanceId: pi3Conf.id,
          assignedUserId: producaoId,
          status: ActivityStatus.COMPLETED,
          startedAt: daysAgo(12),
          completedAt: daysAgo(10),
        },
      });
    }
    console.log(`  [ok] ${order3.orderNumber}: 3 ProcessInstances (all COMPLETED)`);
  }

  // =========================================================================
  // 12. ORDER STATUS HISTORY
  // =========================================================================
  console.log('\n12. Order status history ...');

  // Clean existing history for these orders
  await prisma.orderStatusHistory.deleteMany({
    where: { orderId: { in: [order2.id, order3.id] } },
  });

  // Order 2 status transitions
  const order2Transitions = [
    { from: OrderStatus.EM_ORCAMENTO, to: OrderStatus.FATURAR, date: daysAgo(7) },
    { from: OrderStatus.FATURAR, to: OrderStatus.FATURADO, date: daysAgo(6) },
  ];
  for (const t of order2Transitions) {
    await prisma.orderStatusHistory.create({
      data: {
        orderId: order2.id,
        fromStatus: t.from,
        toStatus: t.to,
        changedByUserId: t.to === OrderStatus.FATURAR ? vendedorId : financeiroId,
        createdAt: t.date,
      },
    });
  }
  console.log(`  [ok] ${order2.orderNumber}: ${order2Transitions.length} transitions`);

  // Order 3 status transitions
  const order3Transitions = [
    { from: OrderStatus.EM_ORCAMENTO, to: OrderStatus.FATURAR, date: daysAgo(30), userId: vendedorId },
    { from: OrderStatus.FATURAR, to: OrderStatus.FATURADO, date: daysAgo(28), userId: financeiroId },
    { from: OrderStatus.FATURADO, to: OrderStatus.PRODUZIR, date: daysAgo(27), userId: producaoId },
    { from: OrderStatus.PRODUZIR, to: OrderStatus.EM_PRODUCAO, date: daysAgo(25), userId: producaoId },
    { from: OrderStatus.EM_PRODUCAO, to: OrderStatus.PRODUZIDO, date: daysAgo(15), userId: producaoId },
    { from: OrderStatus.PRODUZIDO, to: OrderStatus.ENTREGUE, date: daysAgo(10), userId: producaoId },
  ];
  for (const t of order3Transitions) {
    await prisma.orderStatusHistory.create({
      data: {
        orderId: order3.id,
        fromStatus: t.from,
        toStatus: t.to,
        changedByUserId: t.userId,
        createdAt: t.date,
      },
    });
  }
  console.log(`  [ok] ${order3.orderNumber}: ${order3Transitions.length} transitions`);

  // =========================================================================
  // 13. PRODUCTION ORDER (for Order 2 which is FATURADO/awaiting production)
  // =========================================================================
  console.log('\n13. Production orders ...');

  // Clean existing production orders for order 2 (cascade children first)
  await prisma.productionLoss.deleteMany({ where: { productionOrder: { orderId: order2.id } } });
  await prisma.productionOutput.deleteMany({ where: { productionOrder: { orderId: order2.id } } });
  await prisma.productionConsumption.deleteMany({ where: { productionOrder: { orderId: order2.id } } });
  await prisma.productionOrderItem.deleteMany({ where: { productionOrder: { orderId: order2.id } } });
  await prisma.productionOrder.deleteMany({ where: { orderId: order2.id } });

  const prodOrder2 = await prisma.productionOrder.create({
    data: {
      orderId: order2.id,
      code: 'OP-1002',
      status: ProductionOrderStatus.PENDING,
      type: 'SIM',
      scheduledDate: daysFromNow(1),
      assignedUserId: producaoId,
      notes: 'Produção de telhas térmicas 8m para PED-1002',
    },
  });

  // Add items that need production (FABRICACAO_PROPRIA only)
  for (const item of order2CreatedItems) {
    const prod = products[item.productCode];
    if (prod.classification === ProductClassification.FABRICACAO_PROPRIA) {
      const orderItem = order2Items.find(i => i.productCode === item.productCode);
      if (orderItem) {
        await prisma.productionOrderItem.create({
          data: {
            productionOrderId: prodOrder2.id,
            orderItemId: item.id,
            productId: prod.id,
            quantity: orderItem.quantity,
            unitMeasureId: units['UN'],
          },
        });
      }
    }
  }
  console.log(`  [ok] OP-1002 for ${order2.orderNumber} (PENDING)`);

  // =========================================================================
  // DONE
  // =========================================================================
  console.log('\n' + '='.repeat(60));
  console.log('  SEED COMPLETE');
  console.log('='.repeat(60));
  console.log(`
  Summary:
    Company:           Mundial Telhas Ltda
    Users:             4 (admin, vendedor, financeiro, producao)
    Brands:            ${Object.keys(brands).length}
    Unit Measures:     ${Object.keys(units).length}
    Payment Methods:   ${Object.keys(paymentMethods).length}
    Fin. Categories:   ${Object.keys(categories).length}
    Delivery Routes:   ${Object.keys(routes).length}
    Classifications:   ${Object.keys(classifications).length}
    Clients:           ${Object.keys(clients).length}
    Suppliers:         ${Object.keys(suppliers).length}
    Products:          ${Object.keys(products).length}
    Orders:            3 (EM_ORCAMENTO, FATURADO, ENTREGUE)
    Accounts Recv:     4 entries
    Process Instances: 7 (BPM workflow per order)
    Production Orders: 1

  Login credentials:
    admin@mundial.com.br     / Admin@123
    vendedor@mundial.com.br  / Vendas@123
    financeiro@mundial.com.br/ Finan@123
    producao@mundial.com.br  / Prod@123
  `);
}

// ---------------------------------------------------------------------------
// Run
// ---------------------------------------------------------------------------
main()
  .catch((e) => {
    console.error('SEED FAILED:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
