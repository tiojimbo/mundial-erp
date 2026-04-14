# 06 — Banco de Dados: PostgreSQL + Prisma

Tudo que voce precisa saber para modelar, migrar, consultar e otimizar o banco de dados nos projetos Bravy.

---

## 6.1 — O que e o Prisma?

**Analogia simples:** O Prisma e o tradutor entre o TypeScript e o PostgreSQL. Voce escreve TypeScript, ele converte para SQL. Voce nunca precisa escrever SQL na mao (mas pode, quando quiser).

```
Voce escreve:          prisma.user.findMany({ where: { active: true } })
Prisma converte para:  SELECT * FROM users WHERE active = true
PostgreSQL executa:    Retorna os dados
Prisma devolve:        Array de objetos TypeScript tipados
```

### Por que usamos Prisma?

| Beneficio | O que significa na pratica |
|-----------|--------------------------|
| **Type-safe** | Se o campo nao existe no schema, o TypeScript reclama antes de rodar |
| **Auto-complete** | O editor sugere campos, relacoes e filtros enquanto voce digita |
| **Migrations automaticas** | Mudou o schema? Um comando gera o SQL de migracao |
| **Introspection** | Tem um banco existente? O Prisma gera o schema a partir dele |
| **Prisma Studio** | Interface visual para ver e editar dados (`npx prisma studio`) |

### Arquivos importantes

```
prisma/
├── schema.prisma          # Definicao de todos os models, enums e relacoes
├── migrations/            # Historico de migracoes (versionamento do banco)
│   ├── 20240101_init/
│   │   └── migration.sql
│   └── 20240115_add_products/
│       └── migration.sql
└── seed.ts                # Script para popular o banco com dados iniciais
```

---

## 6.2 — Schema: como modelar dados

O `schema.prisma` e a fonte de verdade do seu banco. Tudo comeca aqui.

### Regras obrigatorias de modelagem

| Regra | Exemplo |
|-------|---------|
| Models em **PascalCase singular** | `User`, `Product`, `Organization` |
| Campos `id`, `createdAt`, `updatedAt` em **todo** model | Veja template abaixo |
| Soft delete com `deletedAt` | `deletedAt DateTime?` |
| `@@map` para snake_case no banco | `@@map("users")` |
| `@map` para campos snake_case | `createdAt @map("created_at")` |
| Relacoes explicitas com `@relation` | Sempre nomeie relacoes ambiguas |
| Enums para valores fixos | `Role`, `Status`, `PaymentMethod` |

### Template base de model

Todo model novo deve seguir este template:

```prisma
model NomeDoModel {
  id        String   @id @default(cuid())
  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")
  deletedAt DateTime? @map("deleted_at")

  // ... campos especificos aqui

  @@map("nome_da_tabela")
}
```

### Schema COMPLETO de exemplo

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// ─── Enums ────────────────────────────────────────────

enum Role {
  ADMIN
  MANAGER
  MEMBER
  VIEWER
}

enum ProductStatus {
  DRAFT
  ACTIVE
  ARCHIVED
}

enum InviteStatus {
  PENDING
  ACCEPTED
  EXPIRED
}

// ─── Organization ─────────────────────────────────────

model Organization {
  id        String   @id @default(cuid())
  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")
  deletedAt DateTime? @map("deleted_at")

  name    String
  slug    String  @unique
  logoUrl String? @map("logo_url")

  members  OrganizationMember[]
  products Product[]
  invites  Invite[]
  categories Category[]

  @@map("organizations")
}

// ─── User ─────────────────────────────────────────────

model User {
  id        String   @id @default(cuid())
  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")
  deletedAt DateTime? @map("deleted_at")

  email        String  @unique
  name         String
  passwordHash String  @map("password_hash")
  avatarUrl    String? @map("avatar_url")

  memberships OrganizationMember[]
  invites     Invite[]

  @@map("users")
}

// ─── OrganizationMember (tabela N:N com dados extras) ─

model OrganizationMember {
  id        String   @id @default(cuid())
  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")

  role Role @default(MEMBER)

  userId         String       @map("user_id")
  organizationId String       @map("organization_id")
  user           User         @relation(fields: [userId], references: [id])
  organization   Organization @relation(fields: [organizationId], references: [id])

  @@unique([userId, organizationId])
  @@map("organization_members")
}

// ─── Category ─────────────────────────────────────────

model Category {
  id        String   @id @default(cuid())
  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")
  deletedAt DateTime? @map("deleted_at")

  name String
  slug String

  organizationId String       @map("organization_id")
  organization   Organization @relation(fields: [organizationId], references: [id])

  products ProductCategory[]

  @@unique([slug, organizationId])
  @@map("categories")
}

// ─── Product ──────────────────────────────────────────

model Product {
  id        String   @id @default(cuid())
  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")
  deletedAt DateTime? @map("deleted_at")

  name        String
  description String?
  sku         String?
  priceInCents Int           @map("price_in_cents")
  status      ProductStatus @default(DRAFT)
  imageUrl    String?       @map("image_url")

  organizationId String       @map("organization_id")
  organization   Organization @relation(fields: [organizationId], references: [id])

  categories ProductCategory[]

  @@unique([sku, organizationId])
  @@index([organizationId, status])
  @@index([organizationId, createdAt])
  @@map("products")
}

// ─── ProductCategory (tabela pivô N:N) ────────────────

model ProductCategory {
  id        String   @id @default(cuid())
  createdAt DateTime @default(now()) @map("created_at")

  productId  String   @map("product_id")
  categoryId String   @map("category_id")
  product    Product  @relation(fields: [productId], references: [id])
  category   Category @relation(fields: [categoryId], references: [id])

  @@unique([productId, categoryId])
  @@map("product_categories")
}

// ─── Invite ───────────────────────────────────────────

model Invite {
  id        String   @id @default(cuid())
  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")

  email     String
  role      Role         @default(MEMBER)
  status    InviteStatus @default(PENDING)
  expiresAt DateTime     @map("expires_at")

  organizationId String       @map("organization_id")
  organization   Organization @relation(fields: [organizationId], references: [id])

  invitedById String @map("invited_by_id")
  invitedBy   User   @relation(fields: [invitedById], references: [id])

  @@unique([email, organizationId])
  @@map("invites")
}
```

### Mapa de relacoes

```
Organization 1 ──── N OrganizationMember N ──── 1 User
Organization 1 ──── N Product
Organization 1 ──── N Category
Organization 1 ──── N Invite
Product      N ──── N Category  (via ProductCategory)
User         1 ──── N Invite    (quem convidou)
```

---

## 6.3 — Migrations

Migrations sao o versionamento do banco de dados. Cada alteracao no schema gera um arquivo SQL que pode ser aplicado (ou revertido) de forma controlada.

### Comandos essenciais

| Comando | Quando usar |
|---------|------------|
| `npx prisma migrate dev --name nome-da-migration` | Desenvolvimento: cria e aplica a migration |
| `npx prisma migrate deploy` | Producao: aplica migrations pendentes |
| `npx prisma migrate reset` | Dev: destroi e recria o banco do zero + seed |
| `npx prisma db push` | Prototipacao rapida (sem gerar migration) |
| `npx prisma generate` | Regenera o Prisma Client apos mudar o schema |
| `npx prisma studio` | Abre interface visual para ver/editar dados |

### Fluxo completo de uma migration

```mermaid
graph TD
    A[Editar schema.prisma] --> B[npx prisma migrate dev --name descricao]
    B --> C{Migration gerada com sucesso?}
    C -->|Sim| D[Prisma cria arquivo SQL em prisma/migrations/]
    C -->|Nao| E[Corrigir schema e tentar novamente]
    D --> F[Prisma aplica SQL no banco local]
    F --> G[Prisma regenera o Client]
    G --> H[Testar codigo]
    H --> I[Commitar migration junto com schema]
    I --> J[Em producao: npx prisma migrate deploy]
```

### Exemplo pratico: adicionar campo ao Product

1. Edite o `schema.prisma`:

```prisma
model Product {
  // ... campos existentes
  weight  Float? @map("weight")
  // ...
}
```

2. Gere a migration:

```bash
npx prisma migrate dev --name add-weight-to-product
```

3. Verifique o SQL gerado em `prisma/migrations/YYYYMMDD_add_weight_to_product/migration.sql`:

```sql
ALTER TABLE "products" ADD COLUMN "weight" DOUBLE PRECISION;
```

4. Commite tudo junto:

```bash
git add prisma/schema.prisma prisma/migrations/
git commit -m "feat(db): add weight field to products"
```

### Resolvendo conflitos de migration

Quando dois devs criam migrations ao mesmo tempo:

```bash
# 1. Puxe as migrations do colega
git pull origin develop

# 2. Resete o banco local (dados de dev sao descartaveis)
npx prisma migrate reset

# 3. Se houver conflito no schema.prisma, resolva manualmente
# (merge as alteracoes dos dois devs)

# 4. Se necessario, gere uma nova migration de reconciliacao
npx prisma migrate dev --name reconcile-schema
```

**Regra de ouro:** nunca edite uma migration ja aplicada em producao. Sempre crie uma nova migration para corrigir.

---

## 6.4 — Seed

O seed popula o banco com dados iniciais para desenvolvimento e testes.

### Configuracao no package.json

```json
{
  "prisma": {
    "seed": "ts-node --compiler-options {\"module\":\"CommonJS\"} prisma/seed.ts"
  }
}
```

### Script de seed COMPLETO

```typescript
// prisma/seed.ts
import { PrismaClient, Role, ProductStatus } from "@prisma/client";
import * as bcrypt from "bcrypt";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Starting seed...");

  // ─── 1. Criar Organization ──────────────────────────
  const org = await prisma.organization.upsert({
    where: { slug: "bravy-demo" },
    update: {},
    create: {
      name: "Bravy Demo",
      slug: "bravy-demo",
      logoUrl: "https://placehold.co/200x200?text=Bravy",
    },
  });

  console.log(`✅ Organization: ${org.name} (${org.id})`);

  // ─── 2. Criar Users ────────────────────────────────
  const passwordHash = await bcrypt.hash("senha123", 10);

  const admin = await prisma.user.upsert({
    where: { email: "admin@bravy.com.br" },
    update: {},
    create: {
      email: "admin@bravy.com.br",
      name: "Admin Bravy",
      passwordHash,
    },
  });

  const manager = await prisma.user.upsert({
    where: { email: "gerente@bravy.com.br" },
    update: {},
    create: {
      email: "gerente@bravy.com.br",
      name: "Gerente Silva",
      passwordHash,
    },
  });

  const member = await prisma.user.upsert({
    where: { email: "membro@bravy.com.br" },
    update: {},
    create: {
      email: "membro@bravy.com.br",
      name: "Membro Junior",
      passwordHash,
    },
  });

  console.log(`✅ Users: ${admin.name}, ${manager.name}, ${member.name}`);

  // ─── 3. Vincular Users a Organization com Roles ────
  const memberships = [
    { userId: admin.id, organizationId: org.id, role: Role.ADMIN },
    { userId: manager.id, organizationId: org.id, role: Role.MANAGER },
    { userId: member.id, organizationId: org.id, role: Role.MEMBER },
  ];

  for (const m of memberships) {
    await prisma.organizationMember.upsert({
      where: {
        userId_organizationId: {
          userId: m.userId,
          organizationId: m.organizationId,
        },
      },
      update: { role: m.role },
      create: m,
    });
  }

  console.log(`✅ Memberships: 3 members linked`);

  // ─── 4. Criar Categories ───────────────────────────
  const categoriesData = [
    { name: "Eletronicos", slug: "eletronicos" },
    { name: "Roupas", slug: "roupas" },
    { name: "Alimentos", slug: "alimentos" },
    { name: "Livros", slug: "livros" },
  ];

  const categories = [];
  for (const c of categoriesData) {
    const cat = await prisma.category.upsert({
      where: {
        slug_organizationId: {
          slug: c.slug,
          organizationId: org.id,
        },
      },
      update: {},
      create: { ...c, organizationId: org.id },
    });
    categories.push(cat);
  }

  console.log(`✅ Categories: ${categories.map((c) => c.name).join(", ")}`);

  // ─── 5. Criar Products ─────────────────────────────
  const productsData = [
    {
      name: "Notebook Pro 15",
      description: "Notebook de alta performance para desenvolvedores",
      sku: "NB-PRO-15",
      priceInCents: 899900,
      status: ProductStatus.ACTIVE,
      categorySlug: "eletronicos",
    },
    {
      name: "Mouse Ergonomico",
      description: "Mouse vertical para prevenir LER",
      sku: "MS-ERGO-01",
      priceInCents: 24900,
      status: ProductStatus.ACTIVE,
      categorySlug: "eletronicos",
    },
    {
      name: "Camiseta Dev",
      description: "Camiseta preta com estampa de codigo",
      sku: "CM-DEV-PP",
      priceInCents: 7990,
      status: ProductStatus.ACTIVE,
      categorySlug: "roupas",
    },
    {
      name: "Cafe Especial 250g",
      description: "Cafe torrado artesanal para aquele deploy de sexta",
      sku: "CF-ESP-250",
      priceInCents: 3490,
      status: ProductStatus.DRAFT,
      categorySlug: "alimentos",
    },
    {
      name: "Clean Code - Robert C. Martin",
      description: "O livro essencial sobre codigo limpo",
      sku: "LV-CC-001",
      priceInCents: 8990,
      status: ProductStatus.ACTIVE,
      categorySlug: "livros",
    },
  ];

  for (const p of productsData) {
    const { categorySlug, ...productData } = p;
    const category = categories.find((c) => c.slug === categorySlug);

    const product = await prisma.product.upsert({
      where: {
        sku_organizationId: {
          sku: productData.sku!,
          organizationId: org.id,
        },
      },
      update: {},
      create: {
        ...productData,
        organizationId: org.id,
      },
    });

    if (category) {
      await prisma.productCategory.upsert({
        where: {
          productId_categoryId: {
            productId: product.id,
            categoryId: category.id,
          },
        },
        update: {},
        create: {
          productId: product.id,
          categoryId: category.id,
        },
      });
    }
  }

  console.log(`✅ Products: ${productsData.length} created with categories`);

  console.log("\n🎉 Seed completed successfully!");
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
```

### Executar o seed

```bash
# Roda o seed (tambem roda automaticamente apos migrate reset)
npx prisma db seed

# Reseta o banco e roda o seed
npx prisma migrate reset
```

---

## 6.5 — Queries e patterns avancados

### CRUD basico

```typescript
// ─── CREATE ───────────────────────────────────────────
const product = await prisma.product.create({
  data: {
    name: "Teclado Mecanico",
    priceInCents: 45900,
    organizationId: orgId,
    status: "DRAFT",
  },
});

// ─── READ (um registro) ──────────────────────────────
const user = await prisma.user.findUnique({
  where: { email: "admin@bravy.com.br" },
});

// ─── READ (lista com filtros) ────────────────────────
const activeProducts = await prisma.product.findMany({
  where: {
    organizationId: orgId,
    status: "ACTIVE",
    deletedAt: null,
  },
  orderBy: { createdAt: "desc" },
});

// ─── UPDATE ──────────────────────────────────────────
const updated = await prisma.product.update({
  where: { id: productId },
  data: { name: "Teclado Mecanico RGB" },
});

// ─── SOFT DELETE ─────────────────────────────────────
const softDeleted = await prisma.product.update({
  where: { id: productId },
  data: { deletedAt: new Date() },
});
```

### Transacoes

Use `prisma.$transaction` quando varias operacoes precisam ser atomicas (tudo ou nada):

```typescript
async function transferMember(
  userId: string,
  fromOrgId: string,
  toOrgId: string,
) {
  return prisma.$transaction(async (tx) => {
    const existing = await tx.organizationMember.findUnique({
      where: {
        userId_organizationId: {
          userId,
          organizationId: fromOrgId,
        },
      },
    });

    if (!existing) {
      throw new Error("Member not found in source organization");
    }

    await tx.organizationMember.delete({
      where: { id: existing.id },
    });

    return tx.organizationMember.create({
      data: {
        userId,
        organizationId: toOrgId,
        role: existing.role,
      },
    });
  });
}
```

### Soft delete middleware

Aplique globalmente para que queries filtrem registros deletados automaticamente:

```typescript
// src/database/prisma.service.ts
import { Injectable, OnModuleInit } from "@nestjs/common";
import { PrismaClient } from "@prisma/client";

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  async onModuleInit() {
    await this.$connect();

    this.$use(async (params, next) => {
      const softDeleteModels = [
        "User",
        "Product",
        "Organization",
        "Category",
      ];

      if (!softDeleteModels.includes(params.model ?? "")) {
        return next(params);
      }

      if (params.action === "delete") {
        params.action = "update";
        params.args.data = { deletedAt: new Date() };
      }

      if (params.action === "deleteMany") {
        params.action = "updateMany";
        if (params.args.data !== undefined) {
          params.args.data.deletedAt = new Date();
        } else {
          params.args.data = { deletedAt: new Date() };
        }
      }

      if (params.action === "findUnique" || params.action === "findFirst") {
        params.action = "findFirst";
        params.args.where = { ...params.args.where, deletedAt: null };
      }

      if (params.action === "findMany") {
        if (params.args.where) {
          if (params.args.where.deletedAt === undefined) {
            params.args.where.deletedAt = null;
          }
        } else {
          params.args.where = { deletedAt: null };
        }
      }

      return next(params);
    });
  }
}
```

### Paginacao reutilizavel

**Offset-based** (mais simples, bom para tabelas com poucas paginas):

```typescript
// src/common/helpers/pagination.ts
export interface PaginationParams {
  page?: number;
  perPage?: number;
}

export interface PaginatedResult<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    perPage: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
}

export async function paginate<T>(
  model: any,
  params: PaginationParams,
  where: object = {},
  options: { orderBy?: object; include?: object; select?: object } = {},
): Promise<PaginatedResult<T>> {
  const page = Math.max(1, params.page ?? 1);
  const perPage = Math.min(100, Math.max(1, params.perPage ?? 20));
  const skip = (page - 1) * perPage;

  const [data, total] = await Promise.all([
    model.findMany({
      where,
      skip,
      take: perPage,
      ...options,
    }),
    model.count({ where }),
  ]);

  const totalPages = Math.ceil(total / perPage);

  return {
    data,
    meta: {
      total,
      page,
      perPage,
      totalPages,
      hasNextPage: page < totalPages,
      hasPreviousPage: page > 1,
    },
  };
}
```

Uso no service:

```typescript
// src/modules/products/products.service.ts
async findAll(orgId: string, params: PaginationParams) {
  return paginate<Product>(
    this.prisma.product,
    params,
    { organizationId: orgId, deletedAt: null },
    {
      orderBy: { createdAt: 'desc' },
      include: { categories: { include: { category: true } } },
    },
  );
}
```

**Cursor-based** (melhor performance para listas grandes ou scroll infinito):

```typescript
async function paginateByCursor<T>(
  model: any,
  cursor: string | undefined,
  take: number = 20,
  where: object = {},
  options: { orderBy?: object; include?: object } = {},
): Promise<{ data: T[]; nextCursor: string | null }> {
  const items = await model.findMany({
    where,
    take: take + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    orderBy: options.orderBy ?? { createdAt: "desc" },
    ...(options.include ? { include: options.include } : {}),
  });

  const hasMore = items.length > take;
  const data = hasMore ? items.slice(0, take) : items;
  const nextCursor = hasMore ? data[data.length - 1].id : null;

  return { data, nextCursor };
}
```

### Raw queries para casos complexos

Quando o Prisma nao da conta, use `$queryRaw`:

```typescript
const topProducts = await prisma.$queryRaw<
  { id: string; name: string; total_sold: number }[]
>`
  SELECT
    p.id,
    p.name,
    COALESCE(SUM(oi.quantity), 0)::int AS total_sold
  FROM products p
  LEFT JOIN order_items oi ON oi.product_id = p.id
  LEFT JOIN orders o ON o.id = oi.order_id
  WHERE p.organization_id = ${orgId}
    AND p.deleted_at IS NULL
    AND o.created_at >= ${startDate}
  GROUP BY p.id, p.name
  ORDER BY total_sold DESC
  LIMIT ${limit}
`;
```

**Atencao:** sempre use template literals com `$queryRaw` — o Prisma parametriza automaticamente para prevenir SQL injection. Nunca concatene strings.

### select vs include (performance)

```typescript
// ❌ RUIM — traz TODOS os campos de user + TODOS os campos de memberships
const user = await prisma.user.findUnique({
  where: { id: userId },
  include: { memberships: true },
});

// ✅ BOM — traz so o que precisa
const user = await prisma.user.findUnique({
  where: { id: userId },
  select: {
    id: true,
    name: true,
    email: true,
    memberships: {
      select: {
        role: true,
        organization: {
          select: { id: true, name: true, slug: true },
        },
      },
    },
  },
});
```

| Situacao | Use |
|----------|-----|
| Precisa de poucos campos | `select` |
| Precisa de todos os campos + relacoes | `include` |
| API publica / response grande | Sempre `select` |
| Uso interno / logica de negocio | `include` e aceitavel |

### Filtros dinamicos

Construa `where` condicionalmente sem gambiarras:

```typescript
async findProducts(filters: {
  orgId: string;
  search?: string;
  status?: ProductStatus;
  categoryId?: string;
  minPrice?: number;
  maxPrice?: number;
}) {
  const where: Prisma.ProductWhereInput = {
    organizationId: filters.orgId,
    deletedAt: null,
  };

  if (filters.search) {
    where.OR = [
      { name: { contains: filters.search, mode: "insensitive" } },
      { description: { contains: filters.search, mode: "insensitive" } },
      { sku: { contains: filters.search, mode: "insensitive" } },
    ];
  }

  if (filters.status) {
    where.status = filters.status;
  }

  if (filters.categoryId) {
    where.categories = {
      some: { categoryId: filters.categoryId },
    };
  }

  if (filters.minPrice !== undefined || filters.maxPrice !== undefined) {
    where.priceInCents = {};
    if (filters.minPrice !== undefined) {
      where.priceInCents.gte = filters.minPrice;
    }
    if (filters.maxPrice !== undefined) {
      where.priceInCents.lte = filters.maxPrice;
    }
  }

  return prisma.product.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: {
      categories: {
        include: { category: true },
      },
    },
  });
}
```

---

## 6.6 — Performance

### Connection pooling com PgBouncer

Em producao, nunca conecte o Prisma diretamente ao PostgreSQL sem pooling. Use PgBouncer:

```
# .env (producao)
DATABASE_URL="postgresql://user:pass@pgbouncer-host:6432/mydb?pgbouncer=true&connection_limit=10"
DIRECT_URL="postgresql://user:pass@db-host:5432/mydb"
```

```prisma
datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")
  directUrl = env("DIRECT_URL")
}
```

| Variavel | Para que |
|----------|---------|
| `DATABASE_URL` | Conexao via PgBouncer (usada pelo app) |
| `DIRECT_URL` | Conexao direta (usada pelo Prisma para migrations) |

### Problema N+1 e como resolver

**O problema:** voce busca 50 produtos e para cada um faz uma query de categorias = 51 queries.

```typescript
// ❌ N+1 — 1 query para listar + N queries para categorias
const products = await prisma.product.findMany();
for (const product of products) {
  const categories = await prisma.productCategory.findMany({
    where: { productId: product.id },
  });
}

// ✅ CORRETO — 1 unica query com JOIN
const products = await prisma.product.findMany({
  include: {
    categories: {
      include: { category: true },
    },
  },
});
```

### Indices: quando e como criar

```prisma
model Product {
  // ... campos

  // Indice composto: busca por org + status (query mais comum)
  @@index([organizationId, status])

  // Indice composto: listagem ordenada por data dentro de uma org
  @@index([organizationId, createdAt])

  // Indice para busca textual (se nao usar full-text search)
  @@index([name])

  @@map("products")
}
```

**Quando criar indice:**

| Situacao | Criar indice? |
|----------|:------------:|
| Coluna usada em `WHERE` frequentemente | Sim |
| Coluna usada em `ORDER BY` com muitos registros | Sim |
| Chave estrangeira (FK) | Prisma ja cria |
| Coluna com poucos valores distintos (ex: `status` sozinho) | Geralmente nao |
| Tabela com menos de 1000 registros | Nao precisa |
| Combinacao de colunas usada em `WHERE` + `ORDER BY` | Sim (composto) |

### Prisma logging para debug

```typescript
// src/database/prisma.service.ts
const prisma = new PrismaClient({
  log: [
    { emit: "stdout", level: "query" },
    { emit: "stdout", level: "error" },
    { emit: "stdout", level: "warn" },
  ],
});
```

Em desenvolvimento, habilite para ver exatamente quais queries estao rodando:

```
prisma:query SELECT "products"."id", "products"."name" FROM "products" WHERE "products"."organization_id" = $1 AND "products"."deleted_at" IS NULL ORDER BY "products"."created_at" DESC LIMIT $2 OFFSET $3
prisma:query Duration: 3ms
```

### Query analysis

Para investigar queries lentas, use `EXPLAIN ANALYZE` via raw query:

```typescript
const analysis = await prisma.$queryRaw`
  EXPLAIN ANALYZE
  SELECT * FROM products
  WHERE organization_id = ${orgId}
    AND status = 'ACTIVE'
  ORDER BY created_at DESC
  LIMIT 20
`;

console.log(analysis);
```

Procure por:

| Indicador | Significa | Acao |
|-----------|-----------|------|
| `Seq Scan` | Leitura sequencial (sem indice) | Criar indice |
| `Index Scan` | Usando indice | Bom |
| `Nested Loop` com muitas rows | Possivel N+1 | Revisar query/include |
| `Sort` com alto custo | Ordenacao cara | Indice composto incluindo coluna do ORDER BY |
| Tempo > 100ms | Query lenta | Otimizar ou cachear |

---

## Proximos passos

- Precisa implementar autenticacao? -> [07-autenticacao.md](07-autenticacao.md)
- Precisa criar endpoints de API? -> [08-api.md](08-api.md)
- Precisa configurar Docker para o banco? -> [10-devops.md](10-devops.md)
- Voltar ao indice -> [00-indice.md](00-indice.md)
