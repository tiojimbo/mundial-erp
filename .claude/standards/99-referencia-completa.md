# Referência Completa Bravy — Base de Conhecimento para Projetos

> **Versão:** Março 2026 | **Como usar:** Anexe este arquivo ao iniciar qualquer conversa com uma LLM (Claude, Cursor, etc.) antes de começar um projeto.

---

## Modo de Operação

Ao receber este arquivo, você deve seguir este fluxo OBRIGATÓRIO:

### 1. Ativar modo planejamento

NÃO comece a gerar código imediatamente. Primeiro, entenda o que o usuário quer construir.

### 2. Fazer as perguntas de descoberta

Diga ao usuário que você leu os padrões da Bravy e que antes de construir, precisa entender o projeto. Faça estas perguntas UMA POR VEZ (espere a resposta antes da próxima):

1. **"Qual problema você quer resolver?"** — Entenda a dor real. Ex: "Meus clientes esquecem de pagar"
2. **"Pra quem é esse sistema?"** — Quem vai usar. Ex: "Pra mim e minha equipe de 3 pessoas"
3. **"Qual o resultado mínimo que já resolve o problema?"** — O MVP mais enxuto possível
4. **"O que NÃO precisa ter agora?"** — Ajude o usuário a cortar escopo. Sugira o que pode ficar pra depois.
5. **"Como você vai saber se funcionou?"** — Métrica de sucesso

### 3. Criar o plano do projeto

Com base nas respostas, gere um plano COMPLETO seguindo os padrões Bravy abaixo. O plano deve conter:

**A. Resumo do projeto** (2-3 frases)

**B. Módulos do backend** — Lista de cada módulo NestJS com:
- Nome do módulo
- Endpoints (verbo + rota)
- O que cada endpoint faz (1 frase)

**C. Tabelas do banco** — Schema Prisma completo com:
- Cada model com todos os campos, tipos e relações
- Enums necessários

**D. Telas do frontend** — Lista de cada página com:
- Rota (ex: /clients, /clients/new)
- O que aparece na tela
- Se tem formulário, tabela, dashboard, etc.

**E. Ordem de construção** — Camada por camada:
1. Infraestrutura (Docker, NestJS base, Prisma)
2. Autenticação (register, login, JWT, guards)
3. Módulos de negócio (um por vez, na ordem de dependência)
4. Frontend base (Next.js, layout, login)
5. Features frontend (uma por vez)
6. Polish (loading, erros, responsivo)

### 4. Validar com o usuário

Depois de apresentar o plano, pergunte:
- "Esse plano faz sentido?"
- "Quer adicionar ou remover alguma coisa?"
- "Posso começar a construir pela Camada 1?"

### 5. Construir camada por camada

Quando o usuário aprovar, construa UMA camada por vez. Depois de cada camada, pare e pergunte se quer testar antes de avançar.

---

## Regras Invioláveis

1. **Padronização > velocidade** — código fora do padrão será rejeitado
2. **Cada camada no seu quadrado** — Controller recebe, Service pensa, Repository persiste
3. **Zero `any`** — sempre tipar explicitamente
4. **Zero `console.log`** — usar Logger do NestJS
5. **Zero lógica no Controller** — apenas delegação
6. **Zero Prisma direto no Service** — sempre via Repository
7. **Zero query sem paginação** — sempre skip/take com limite máximo 100
8. **Zero senha em plaintext** — sempre bcrypt (12 rounds)
9. **Zero `process.env` direto** — sempre ConfigService
10. **Soft delete por padrão** — campo `deletedAt`, nunca DELETE físico
11. **Envelope obrigatório** — toda response: `{ data, meta }`
12. **Validação obrigatória** — DTOs com class-validator (backend), Zod (frontend)
13. **Named exports** — nunca `export default` em componentes
14. **Server Components por padrão** — `'use client'` somente quando necessário

---

## Stack

| Camada | Tecnologia | Papel |
|--------|-----------|-------|
| Linguagem | TypeScript | Front e back, tipagem estática end-to-end |
| Backend | NestJS | Framework opinado com DI, decorators, módulos |
| Frontend | Next.js (App Router) | SSR/SSG, Server Components, file-based routing |
| Banco | PostgreSQL 16 | Relacional, robusto, JSON, full-text search |
| ORM | Prisma | Schema declarativo, migrations, type-safe |
| Estilo | Tailwind CSS | Utility-first, sem conflitos CSS |
| Componentes UI | shadcn/ui | Copiados no projeto, baseados em Radix UI |
| Auth | JWT | Access token 15min + refresh token 7d, bcrypt |
| Validação back | class-validator + class-transformer | Decorators nos DTOs |
| Validação front | Zod + React Hook Form | Schema → resolver → FormField |
| Server state | React Query (TanStack) | Cache, refetch, mutations |
| Client state | Zustand | Apenas estado de UI (sidebar, tema) |
| HTTP client | Axios | Interceptors para auth, baseURL centralizada |
| Testes back | Jest | Unitários (service) + E2E (supertest) |
| Containers | Docker + docker-compose | Dev e produção idênticos |
| CI/CD | GitHub Actions | Lint → Test → Build → Deploy |
| Proxy | Nginx | SSL, gzip, rate limiting, CORS |

---

## Nomenclatura — Cheat Sheet Completo

| Elemento | Convenção | Exemplo |
|----------|-----------|---------|
| Arquivo TS | `kebab-case.sufixo.ts` | `payment-gateway.service.ts` |
| Componente React (arquivo) | `kebab-case.tsx` | `pricing-card.tsx` |
| Componente React (export) | `PascalCase` named export | `export function PricingCard` |
| Props | `{Nome}Props` | `PricingCardProps` |
| Hook (arquivo) | `use-*.ts` | `use-debounce.ts` |
| Hook (export) | `camelCase` com `use` | `useDebounce` |
| Contexto | `*.context.tsx` | `auth.context.tsx` |
| Teste unitário | `*.spec.ts` | `billing.service.spec.ts` |
| Teste e2e | `*.e2e-spec.ts` | `auth.e2e-spec.ts` |
| Pasta | `kebab-case/` | `order-items/` |
| Classe / Interface | `PascalCase` + sufixo papel | `BillingService`, `PaymentProvider` |
| Interface | SEM prefixo `I` | `PaymentProvider` (não `IPaymentProvider`) |
| Enum (nome) | `PascalCase` | `OrderStatus` |
| Enum (valor) | `UPPER_SNAKE_CASE` | `PENDING_PAYMENT` |
| Variável / Parâmetro | `camelCase` | `orderTotal` |
| Constante de módulo | `UPPER_SNAKE_CASE` | `MAX_RETRY_ATTEMPTS` |
| Booleano | `is/has/can/should` + `camelCase` | `isActive`, `hasPermission` |
| Função / Método | `camelCase` verbo no início | `calculateTotal()`, `fetchOrders()` |
| Event handler (interno) | `handle` + evento | `handleSubmit` |
| Event handler (prop) | `on` + evento | `onSubmit` |
| Model Prisma | `PascalCase` singular | `model Order` |
| Tabela SQL (via `@@map`) | `snake_case` plural | `@@map("orders")` |
| Coluna SQL (via `@map`) | `snake_case` | `@map("created_at")` |
| Endpoint API | `/api/v1/` + `kebab-case` plural | `/api/v1/order-items` |
| Query param | `camelCase` | `?pageSize=20&sortBy=createdAt` |
| Branch Git | `tipo/descricao-kebab` | `feat/order-cancellation` |
| Commit | Conventional Commits | `feat(billing): add PIX payment` |
| Env var | `UPPER_SNAKE_CASE` | `DATABASE_URL` |
| Module NestJS | `*.module.ts` | `billing.module.ts` |
| Controller | `*.controller.ts` | `orders.controller.ts` |
| Service | `*.service.ts` | `orders.service.ts` |
| Repository | `*.repository.ts` | `orders.repository.ts` |
| DTO | `*.dto.ts` | `create-order.dto.ts` |
| Guard | `*.guard.ts` | `jwt-auth.guard.ts` |
| Pipe | `*.pipe.ts` | `parse-uuid.pipe.ts` |
| Interceptor | `*.interceptor.ts` | `logging.interceptor.ts` |
| Filter | `*.filter.ts` | `http-exception.filter.ts` |
| Decorator | `*.decorator.ts` | `current-user.decorator.ts` |

---

## Arquitetura

### Fluxo de uma Request (clique → banco → tela)

```
Frontend                              Backend                              Banco
─────────                             ───────                              ─────
1. Usuário clica "Salvar"
2. React Hook Form valida (Zod)
3. useMutation dispara
4. Service HTTP monta request
5. Axios envia com Bearer token ──→ 6. Request chega no NestJS
                                    7. ValidationPipe valida body (DTO)
                                    8. JwtAuthGuard verifica token
                                    9. Controller delega → Service
                                   10. Service aplica lógica
                                   11. Repository executa ──────────→ 12. PostgreSQL retorna
                                   13. Response envelopada ←──────── { data, meta }
14. React Query atualiza cache ←── Response volta
15. UI re-renderiza
```

### Repositórios separados

```
bravy-{projeto}-api    → Backend NestJS
bravy-{projeto}-web    → Frontend Next.js
```

Comunicação exclusiva via API REST. Frontend nunca acessa o banco.

### Ambientes

| Ambiente | Web | API | Banco |
|----------|-----|-----|-------|
| Local | `localhost:3000` | `localhost:3001` | Docker `localhost:5432` |
| Staging | `staging.bravy.com.br` | `api-staging.bravy.com.br` | PostgreSQL isolado |
| Produção | `app.bravy.com.br` | `api.bravy.com.br` | PostgreSQL + backup diário |

---

## Backend NestJS

### Estrutura de pastas

```
src/
├── main.ts                          # Bootstrap: pipes, filters, interceptors, CORS, Swagger
├── app.module.ts                    # Módulo raiz
├── common/
│   ├── constants/                   # UPPER_SNAKE constantes
│   ├── decorators/                  # @CurrentUser(), @Roles(), @Auth()
│   ├── dtos/pagination.dto.ts       # PaginationDto reutilizável
│   ├── enums/role.enum.ts
│   ├── filters/http-exception.filter.ts
│   ├── guards/{jwt-auth,roles}.guard.ts
│   ├── interceptors/{logging,transform}.interceptor.ts
│   ├── pipes/parse-uuid.pipe.ts
│   └── types/
├── config/                          # registerAs() configs tipadas
├── database/
│   ├── prisma.module.ts             # @Global, exports PrismaService
│   └── prisma.service.ts            # extends PrismaClient, onModuleInit
└── modules/
    └── {nome}/
        ├── {nome}.module.ts
        ├── {nome}.controller.ts
        ├── {nome}.service.ts
        ├── {nome}.repository.ts
        └── dtos/
            ├── create-{nome}.dto.ts
            ├── update-{nome}.dto.ts
            └── {nome}-response.dto.ts
```

### Responsabilidades por camada

| Camada | FAZ | NÃO FAZ |
|--------|-----|---------|
| **Controller** | Recebe request, delega para service, retorna response | Lógica de negócio, acesso a banco, try/catch manual |
| **Service** | Lógica de negócio, validações, orquestração | Acessar request/response HTTP, chamar Prisma direto |
| **Repository** | Queries Prisma, CRUD no banco | Lógica de negócio, lançar HttpException |
| **DTO** | Validação de entrada/saída, documentação Swagger | Lógica, acesso a banco |
| **Guard** | Autenticação/autorização, retorna true ou lança exceção | Modificar body, lógica de negócio |
| **Pipe** | Validar/transformar dados antes do controller | Acessar banco, lógica de negócio |
| **Interceptor** | Transformar response, logging, cache | Barrar requests (Guard faz isso) |
| **Filter** | Capturar exceções, formatar resposta de erro | Prevenir erros (Pipe/Guard fazem isso) |

### Template: main.ts

```typescript
import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters/http-exception.filter';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const config = app.get(ConfigService);

  app.use(helmet());
  app.setGlobalPrefix('api/v1');
  app.enableCors({
    origin: config.get<string>('CORS_ORIGIN', 'http://localhost:3000'),
    credentials: true,
  });
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
    transformOptions: { enableImplicitConversion: true },
  }));
  app.useGlobalFilters(new AllExceptionsFilter());
  app.useGlobalInterceptors(new TransformInterceptor());

  const swagger = new DocumentBuilder()
    .setTitle('API').setVersion('1.0').addBearerAuth().build();
  SwaggerModule.setup('docs', app, SwaggerModule.createDocument(app, swagger));

  const port = config.get<number>('PORT', 3000);
  await app.listen(port);
  new Logger('Bootstrap').log(`Rodando em http://localhost:${port}`);
}
bootstrap();
```

### Template: Controller

```typescript
@ApiTags('Recursos')
@Controller('recursos')
export class RecursosController {
  constructor(private readonly recursosService: RecursosService) {}

  @Post()
  async create(@Body() dto: CreateRecursoDto) {
    return this.recursosService.create(dto);
  }

  @Get()
  async findAll(@Query() pagination: PaginationDto) {
    return this.recursosService.findAll(pagination);
  }

  @Get(':id')
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.recursosService.findOne(id);
  }

  @Patch(':id')
  async update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateRecursoDto) {
    return this.recursosService.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.recursosService.remove(id);
  }
}
```

### Template: Service

```typescript
@Injectable()
export class RecursosService {
  constructor(private readonly recursosRepository: RecursosRepository) {}

  async create(dto: CreateRecursoDto): Promise<RecursoResponseDto> {
    const entity = await this.recursosRepository.create(dto);
    return RecursoResponseDto.fromEntity(entity);
  }

  async findAll(pagination: PaginationDto) {
    const { items, total } = await this.recursosRepository.findAll({
      skip: pagination.skip, take: pagination.limit, where: { deletedAt: null },
    });
    return { items: items.map(RecursoResponseDto.fromEntity), total, page: pagination.page, limit: pagination.limit };
  }

  async findOne(id: string): Promise<RecursoResponseDto> {
    const entity = await this.recursosRepository.findById(id);
    if (!entity) throw new NotFoundException(`Recurso "${id}" não encontrado`);
    return RecursoResponseDto.fromEntity(entity);
  }

  async update(id: string, dto: UpdateRecursoDto): Promise<RecursoResponseDto> {
    await this.findOne(id);
    const updated = await this.recursosRepository.update(id, dto);
    return RecursoResponseDto.fromEntity(updated);
  }

  async remove(id: string): Promise<void> {
    await this.findOne(id);
    await this.recursosRepository.softDelete(id);
  }
}
```

### Template: Repository

```typescript
@Injectable()
export class RecursosRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: Prisma.RecursoCreateInput) {
    return this.prisma.recurso.create({ data });
  }

  async findAll(params: { skip?: number; take?: number; where?: Prisma.RecursoWhereInput }) {
    const { skip, take, where } = params;
    const [items, total] = await Promise.all([
      this.prisma.recurso.findMany({ skip, take, where, orderBy: { createdAt: 'desc' } }),
      this.prisma.recurso.count({ where }),
    ]);
    return { items, total };
  }

  async findById(id: string) {
    return this.prisma.recurso.findFirst({ where: { id, deletedAt: null } });
  }

  async update(id: string, data: Prisma.RecursoUpdateInput) {
    return this.prisma.recurso.update({ where: { id }, data });
  }

  async softDelete(id: string) {
    return this.prisma.recurso.update({ where: { id }, data: { deletedAt: new Date() } });
  }
}
```

### Template: DTOs

```typescript
// create-recurso.dto.ts
export class CreateRecursoDto {
  @ApiProperty({ example: 'Nome' })
  @IsString() @IsNotEmpty() @MaxLength(255)
  name: string;

  @ApiPropertyOptional()
  @IsOptional() @IsString() @MaxLength(1000)
  description?: string;

  @ApiProperty({ example: 79.9 })
  @IsNumber({ maxDecimalPlaces: 2 }) @IsPositive()
  price: number;
}

// update-recurso.dto.ts
export class UpdateRecursoDto extends PartialType(CreateRecursoDto) {}

// recurso-response.dto.ts
export class RecursoResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() name: string;
  @ApiProperty() createdAt: Date;

  static fromEntity(entity: any): RecursoResponseDto {
    const dto = new RecursoResponseDto();
    Object.assign(dto, { id: entity.id, name: entity.name, createdAt: entity.createdAt });
    return dto;
  }
}
```

### Template: Module

```typescript
@Module({
  imports: [DatabaseModule],
  controllers: [RecursosController],
  providers: [RecursosService, RecursosRepository],
  exports: [RecursosService],
})
export class RecursosModule {}
```

### Template: PaginationDto

```typescript
export class PaginationDto {
  @IsOptional() @Type(() => Number) @IsInt() @Min(1)
  page: number = 1;

  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100)
  limit: number = 20;

  get skip(): number { return (this.page - 1) * this.limit; }
}
```

---

## Frontend Next.js

### Estrutura de pastas

```
src/
├── app/                              # Rotas (App Router)
│   ├── layout.tsx                    # Providers, fontes, metadata global
│   ├── (auth)/login/page.tsx         # Rotas públicas
│   └── (dashboard)/
│       ├── layout.tsx                # Sidebar + header
│       └── products/page.tsx         # Listagem
├── components/
│   ├── ui/                           # shadcn/ui (não editar)
│   ├── layout/                       # sidebar, header, breadcrumbs
│   └── shared/                       # data-table, confirm-dialog, page-header
├── features/{nome}/
│   ├── components/                   # Componentes da feature
│   ├── hooks/                        # useProducts, useCreateProduct
│   ├── services/                     # HTTP calls via Axios
│   ├── schemas/                      # Zod schemas
│   └── types/                        # Interfaces TypeScript
├── hooks/                            # Hooks globais (useDebounce, useAuth)
├── lib/
│   ├── api.ts                        # Axios instance + interceptors
│   ├── utils.ts                      # cn() helper
│   └── query-client.ts              # React Query config
├── providers/                        # QueryProvider, AuthProvider
├── stores/                           # Zustand (sidebar, tema)
├── types/                            # Tipos compartilhados
└── middleware.ts                      # Auth redirect no edge
```

### Server vs Client Component

| Critério | Server Component | Client Component |
|----------|-----------------|------------------|
| Diretiva | Nenhuma (padrão) | `'use client'` no topo |
| Onde executa | Servidor | Navegador |
| useState/useEffect | Não | Sim |
| onClick/onChange | Não | Sim |
| fetch direto com await | Sim | Não |
| JS enviado ao browser | Zero | Sim |
| Quando usar | Páginas, layouts, data fetching | Formulários, modais, interação |

### Template: Service HTTP

```typescript
import { api } from '@/lib/api';
import type { Product, CreateProductPayload, ProductsResponse } from '../types/product.types';

export const productService = {
  async getAll(filters?: ProductFilters): Promise<ProductsResponse> {
    const { data } = await api.get<ProductsResponse>('/products', { params: filters });
    return data;
  },
  async getById(id: string): Promise<Product> {
    const { data } = await api.get<Product>(`/products/${id}`);
    return data;
  },
  async create(payload: CreateProductPayload): Promise<Product> {
    const { data } = await api.post<Product>('/products', payload);
    return data;
  },
  async update({ id, ...payload }: UpdateProductPayload): Promise<Product> {
    const { data } = await api.patch<Product>(`/products/${id}`, payload);
    return data;
  },
  async remove(id: string): Promise<void> {
    await api.delete(`/products/${id}`);
  },
};
```

### Template: Hooks React Query

```typescript
export const PRODUCTS_QUERY_KEY = ['products'];

export function useProducts(filters?: ProductFilters) {
  return useQuery({
    queryKey: [...PRODUCTS_QUERY_KEY, filters],
    queryFn: () => productService.getAll(filters),
    placeholderData: (prev) => prev,
  });
}

export function useCreateProduct() {
  const router = useRouter();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateProductPayload) => productService.create(payload),
    onSuccess: () => {
      toast.success('Produto criado!');
      qc.invalidateQueries({ queryKey: PRODUCTS_QUERY_KEY });
      router.push('/products');
    },
    onError: (err: Error) => { toast.error(err.message || 'Erro ao criar produto'); },
  });
}
```

### Template: Schema Zod + Formulário

```typescript
// schema
export const productSchema = z.object({
  name: z.string().min(3, 'Mínimo 3 caracteres').max(120),
  description: z.string().min(10).max(500),
  price: z.number().positive('Deve ser positivo').multipleOf(0.01),
  status: z.enum(['active', 'inactive', 'draft']),
});
export type ProductFormData = z.infer<typeof productSchema>;
```

```tsx
// formulário
'use client';
export function ProductForm({ defaultValues, onSubmit, isLoading }: ProductFormProps) {
  const form = useForm<ProductFormData>({
    resolver: zodResolver(productSchema),
    defaultValues: defaultValues ?? { name: '', description: '', price: 0, status: 'draft' },
  });
  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField control={form.control} name="name" render={({ field }) => (
          <FormItem><FormLabel>Nome</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
        )} />
        <Button type="submit" disabled={isLoading}>
          {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Salvar
        </Button>
      </form>
    </Form>
  );
}
```

### Template: Axios com interceptors

```typescript
export const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('access_token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    if (error.response?.status === 401) {
      // Tentar refresh ou redirecionar para /login
    }
    return Promise.reject(new Error(error.response?.data?.message || error.message));
  },
);
```

---

## Banco de Dados (Prisma)

### Regras de modelagem

| Regra | Exemplo |
|-------|---------|
| Models em PascalCase singular | `model Order` |
| Campos `id`, `createdAt`, `updatedAt`, `deletedAt` em todo model | Template abaixo |
| `@@map` para snake_case plural | `@@map("orders")` |
| `@map` para colunas snake_case | `createdAt @map("created_at")` |
| Relações explícitas com `@relation` | `@relation(fields: [customerId], references: [id])` |
| Índices nomeados | `@@index([field], name: "idx_table_field")` |
| IDs com UUID | `@id @default(cuid())` ou `@default(uuid())` |

### Template: Model Prisma

```prisma
model NomeDoModel {
  id        String   @id @default(cuid())
  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")
  deletedAt DateTime? @map("deleted_at")

  name    String
  // ... campos específicos

  @@map("nome_da_tabela_plural")
}
```

### Comandos essenciais

| Comando | Quando |
|---------|--------|
| `npx prisma migrate dev --name descricao` | Dev: cria e aplica migration |
| `npx prisma migrate deploy` | Produção: aplica pendentes |
| `npx prisma migrate reset` | Dev: destrói e recria + seed |
| `npx prisma generate` | Regenera Client após mudar schema |
| `npx prisma studio` | Interface visual do banco |
| `npx prisma db seed` | Popula dados iniciais |

### Patterns de query

```typescript
// Paginação
const [items, total] = await Promise.all([
  prisma.product.findMany({ where: { deletedAt: null }, skip, take, orderBy: { createdAt: 'desc' } }),
  prisma.product.count({ where: { deletedAt: null } }),
]);

// Transação atômica
return prisma.$transaction(async (tx) => {
  const order = await tx.order.create({ data: orderData });
  await tx.product.update({ where: { id: productId }, data: { stock: { decrement: qty } } });
  return order;
});

// Filtros dinâmicos
const where: Prisma.ProductWhereInput = { organizationId: orgId, deletedAt: null };
if (search) where.OR = [
  { name: { contains: search, mode: 'insensitive' } },
  { description: { contains: search, mode: 'insensitive' } },
];
```

---

## Autenticação

### Fluxo JWT

```
Registro/Login → Backend gera accessToken (15min) + refreshToken (7d)
                 refreshToken salvo hasheado (bcrypt) no banco
Request autenticado → Header: Authorization: Bearer <accessToken>
                      JwtAuthGuard valida → JwtStrategy extrai user
Token expirado → 401 → Frontend POST /auth/refresh { refreshToken }
                       → Novo par de tokens (rotation)
Logout → Remove refreshToken do banco + limpa client
```

### Guards globais (secure by default)

```typescript
{ provide: APP_GUARD, useClass: JwtAuthGuard },   // Toda rota protegida
{ provide: APP_GUARD, useClass: RolesGuard },      // Verifica @Roles()
```

Rotas públicas usam `@Public()` para desativar JwtAuthGuard.

### RBAC

```typescript
@Roles(Role.ADMIN, Role.MANAGER)
@Post()
async create(@Body() dto: CreateDto) { ... }

// Frontend: esconder UI por role
<RoleGate allowedRoles={['ADMIN']}><AdminPanel /></RoleGate>
```

---

## API REST

### Verbos e Status Codes

| Método | Rota | Ação | Status sucesso |
|--------|------|------|---------------|
| GET | `/resources` | Listar | 200 |
| GET | `/resources/:id` | Buscar um | 200 |
| POST | `/resources` | Criar | 201 |
| PATCH | `/resources/:id` | Atualizar parcial | 200 |
| DELETE | `/resources/:id` | Remover | 204 |

### Envelope de response

```json
{ "data": { "id": "...", "name": "..." }, "meta": { "timestamp": "...", "requestId": "..." } }

{ "data": [...], "meta": { "pagination": { "page": 1, "limit": 20, "total": 142, "totalPages": 8 } } }

{ "statusCode": 404, "message": "Recurso não encontrado", "error": "Not Found", "timestamp": "...", "path": "/api/v1/..." }
```

---

## DevOps

### Dockerfile NestJS (multi-stage)

```dockerfile
FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json prisma/ ./
RUN npm ci --ignore-scripts && npx prisma generate

FROM node:20-alpine AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM node:20-alpine AS production
WORKDIR /app
ENV NODE_ENV=production
RUN addgroup --system --gid 1001 nestjs && adduser --system --uid 1001 nestjs
COPY --from=build /app/dist ./dist
COPY --from=deps /app/node_modules ./node_modules
COPY --from=build /app/prisma ./prisma
USER nestjs
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s CMD wget --spider http://localhost:3000/health || exit 1
CMD ["node", "dist/main.js"]
```

### Dockerfile Next.js (standalone)

```dockerfile
FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts

FROM node:20-alpine AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM node:20-alpine AS production
WORKDIR /app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1
RUN addgroup --system --gid 1001 nextjs && adduser --system --uid 1001 nextjs
COPY --from=build /app/public ./public
COPY --from=build --chown=nextjs:nextjs /app/.next/standalone ./
COPY --from=build --chown=nextjs:nextjs /app/.next/static ./.next/static
USER nextjs
EXPOSE 3001
CMD ["node", "server.js"]
```

### docker-compose.yml (dev)

```yaml
services:
  postgres:
    image: postgres:16-alpine
    ports: ["5432:5432"]
    environment:
      POSTGRES_USER: bravy
      POSTGRES_PASSWORD: bravy_dev
      POSTGRES_DB: bravy_dev
    volumes: [pg_data:/var/lib/postgresql/data]
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U bravy"]
      interval: 10s
  redis:
    image: redis:7-alpine
    ports: ["6379:6379"]
volumes:
  pg_data:
```

---

## Segurança — Checklist

| # | Item | Detalhe |
|---|------|---------|
| 1 | Helmet | Primeiro middleware, headers de segurança |
| 2 | CORS | Whitelist de origens, nunca `*` em prod |
| 3 | Rate limiting | `@nestjs/throttler` global + restritivo em login |
| 4 | ValidationPipe | `whitelist: true`, `forbidNonWhitelisted: true` |
| 5 | Secrets | Nunca no git, validar com Zod na inicialização |
| 6 | Bcrypt | 12 rounds, nunca plaintext |
| 7 | JWT secret | 64+ bytes, access 15min, refresh 7d com rotation |
| 8 | HTTPS | Obrigatório em produção |
| 9 | `npm audit` | Zero vulnerabilidades críticas |
| 10 | Queries parametrizadas | Nunca `$queryRawUnsafe` |
| 11 | Uploads | Validar tipo, tamanho, renomear com UUID |
| 12 | Logs | Nunca logar senhas/tokens |
| 13 | Login genérico | Sempre "Credenciais inválidas" |

---

## Anti-patterns comuns de LLMs

| Anti-pattern | Correção |
|-------------|----------|
| Lógica de negócio no Controller | Mover para Service |
| `any` no TypeScript | Tipar explicitamente ou `unknown` + narrowing |
| `console.log` | Logger do NestJS |
| Queries sem paginação | Sempre skip/take com limite máximo |
| Senhas em plaintext | bcrypt hash + compare |
| Prisma direto no Service | Usar Repository |
| Retornar entidade do banco direto | Mapear para ResponseDto |
| God components (500+ linhas) | Componentes de ~150 linhas |
| fetch direto no componente | Service HTTP + React Query hook |
| Estado do servidor no Zustand | React Query para server state |
| `process.env` direto | ConfigService do NestJS |
| Sem loading/error states | Sempre tratar isLoading, isError, empty state |

---

## Ordem para criar uma feature nova

| # | Etapa | Camada | Arquivo |
|---|-------|--------|---------|
| 1 | Model Prisma | Banco | `prisma/schema.prisma` |
| 2 | Migration | Banco | `npx prisma migrate dev --name ...` |
| 3 | Repository | Backend | `{nome}.repository.ts` |
| 4 | Service | Backend | `{nome}.service.ts` |
| 5 | DTOs | Backend | `create/update/response.dto.ts` |
| 6 | Controller | Backend | `{nome}.controller.ts` |
| 7 | Module | Backend | `{nome}.module.ts` + registrar no `app.module.ts` |
| 8 | Testar endpoints | Backend | curl/Postman |
| 9 | Types | Frontend | `{nome}.types.ts` |
| 10 | Service HTTP | Frontend | `{nome}.service.ts` |
| 11 | Hooks | Frontend | `use-{nome}.ts`, `use-create-{nome}.ts` |
| 12 | Schema Zod | Frontend | `{nome}.schema.ts` |
| 13 | Componentes | Frontend | `{nome}-table.tsx`, `{nome}-form.tsx` |
| 14 | Páginas | Frontend | `page.tsx`, `new/page.tsx`, `[id]/page.tsx` |

---

## Variáveis de Ambiente (.env.example)

```env
NODE_ENV=development
PORT=3000
CORS_ORIGIN=http://localhost:3001
DATABASE_URL=postgresql://bravy:bravy_dev@localhost:5432/bravy_dev
JWT_ACCESS_SECRET=<gere: node -e "console.log(require('crypto').randomBytes(64).toString('hex'))">
JWT_REFRESH_SECRET=<gere outro diferente>
REDIS_URL=redis://localhost:6379
NEXT_PUBLIC_API_URL=http://localhost:3000
```

---

> **Este arquivo é auto-contido.** Ao recebê-lo, entre em modo planejamento, faça as perguntas de descoberta, e monte o plano completo do projeto antes de escrever qualquer código.
