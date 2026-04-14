# 03 — Nomenclatura e Padrões

> **A lei sagrada dos nomes.**
> Nomes errados geram bugs silenciosos, imports quebrados e PRs intermináveis.
> Este guia é prescritivo — sem "depende do caso". Siga ou justifique em PR.

---

## 3.1 — Arquivos e Pastas

### Regra 3.1.1 — **Arquivos TypeScript usam `kebab-case.ts`**

| ✅ CERTO | ❌ ERRADO |
|---|---|
| `payment-gateway.service.ts` | `PaymentGateway.service.ts` |
| `create-order.dto.ts` | `createOrder.dto.ts` |
| `user-profile.utils.ts` | `userProfile.utils.ts` |

```typescript
// ✅ src/modules/billing/services/payment-gateway.service.ts
export class PaymentGatewayService { ... }
```

**Por quê?** macOS ignora maiúsculas/minúsculas em nomes de arquivo. Um `import` de `PaymentGateway.service` funciona local mas quebra no Linux do CI/CD. `kebab-case` elimina esse risco.

---

### Regra 3.1.2 — **Componentes React: arquivo `kebab-case.tsx`, export `PascalCase`**

| ✅ CERTO | ❌ ERRADO |
|---|---|
| `user-avatar.tsx` → `export function UserAvatar` | `UserAvatar.tsx` |
| `sidebar-nav.tsx` → `export function SidebarNav` | `SidebarNav.tsx` |
| `pricing-card.tsx` → `export function PricingCard` | `pricingCard.tsx` |

```tsx
// ✅ src/components/ui/pricing-card.tsx
export function PricingCard({ plan, price }: PricingCardProps) {
  return (
    <div className="rounded-xl border p-6">
      <h3>{plan}</h3>
      <span>{price}</span>
    </div>
  );
}
```

**Por quê?** Arquivo em `kebab-case` mantém consistência com o restante do projeto e evita problemas de case-sensitivity. O `PascalCase` no export é obrigatório pelo JSX — `<PricingCard />` precisa começar com maiúscula.

---

### Regra 3.1.3 — **Testes unitários usam `.spec.ts`**

| ✅ CERTO | ❌ ERRADO |
|---|---|
| `payment-gateway.service.spec.ts` | `payment-gateway.service.test.ts` |
| `create-order.dto.spec.ts` | `create-order.dto-test.ts` |
| `pricing-card.spec.tsx` | `pricing-card.tests.tsx` |

```typescript
// ✅ src/modules/billing/services/payment-gateway.service.spec.ts
describe('PaymentGatewayService', () => {
  it('should process a valid credit card payment', async () => {
    const result = await service.processPayment(validPaymentDto);
    expect(result.status).toBe('approved');
  });
});
```

**Por quê?** O Jest e o Vitest reconhecem `.spec.ts` por padrão. Padrão NestJS oficial. Um único sufixo evita configs extras no `jest.config`.

---

### Regra 3.1.4 — **Testes e2e usam `.e2e-spec.ts`**

| ✅ CERTO | ❌ ERRADO |
|---|---|
| `auth.e2e-spec.ts` | `auth.e2e.test.ts` |
| `orders.e2e-spec.ts` | `orders-e2e.spec.ts` |

```typescript
// ✅ test/auth.e2e-spec.ts
describe('Auth (e2e)', () => {
  it('POST /api/v1/auth/login → 200', () => {
    return request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'admin@bravy.com', password: 'secret' })
      .expect(200);
  });
});
```

**Por quê?** Separa e2e dos unitários no glob pattern. O NestJS CLI já gera nesse formato. O CI pode rodar `*.e2e-spec.ts` em pipeline separada.

---

### Regra 3.1.5 — **Pastas sempre em `kebab-case`**

| ✅ CERTO | ❌ ERRADO |
|---|---|
| `user-management/` | `userManagement/` |
| `payment-gateway/` | `PaymentGateway/` |
| `order-items/` | `order_items/` |

**Por quê?** Mesma razão do 3.1.1 — consistência e segurança cross-OS. URLs do Next.js mapeiam pastas diretamente, então `kebab-case` vira slug limpo automaticamente.

---

### Regra 3.1.6 — **Módulos NestJS: sufixo `.module.ts`**

| ✅ CERTO | ❌ ERRADO |
|---|---|
| `billing.module.ts` | `billing-module.ts` |
| `auth.module.ts` | `auth.mod.ts` |

```typescript
// ✅ src/modules/billing/billing.module.ts
@Module({
  imports: [PrismaModule],
  controllers: [BillingController],
  providers: [BillingService, StripeProvider],
  exports: [BillingService],
})
export class BillingModule {}
```

**Por quê?** O NestJS CLI reconhece o sufixo para scaffolding. IDE auto-importa corretamente. Grep por `*.module.ts` lista todos os módulos instantaneamente.

---

### Regra 3.1.7 — **Controllers: sufixo `.controller.ts`**

| ✅ CERTO | ❌ ERRADO |
|---|---|
| `orders.controller.ts` | `orders-ctrl.ts` |
| `users.controller.ts` | `users.ctrl.ts` |

---

### Regra 3.1.8 — **Services: sufixo `.service.ts`**

| ✅ CERTO | ❌ ERRADO |
|---|---|
| `orders.service.ts` | `orders-service.ts` |
| `email-notification.service.ts` | `emailNotification.svc.ts` |

---

### Regra 3.1.9 — **Guards, Pipes, Interceptors, Filters, Decorators: sufixo correspondente**

| Artefato | ✅ CERTO | ❌ ERRADO |
|---|---|---|
| Guard | `jwt-auth.guard.ts` | `jwtAuthGuard.ts` |
| Pipe | `parse-uuid.pipe.ts` | `parseUuid-pipe.ts` |
| Interceptor | `logging.interceptor.ts` | `logging-interceptor.ts` |
| Filter | `http-exception.filter.ts` | `httpExceptionFilter.ts` |
| Decorator | `current-user.decorator.ts` | `CurrentUser.decorator.ts` |

```typescript
// ✅ src/common/guards/jwt-auth.guard.ts
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  canActivate(context: ExecutionContext) {
    return super.canActivate(context);
  }
}
```

**Por quê?** O sufixo explicita o papel do artefato sem abrir o arquivo. `grep "*.guard.ts"` retorna todos os guards do projeto.

---

### Regra 3.1.10 — **DTOs: sufixo `.dto.ts`**

| ✅ CERTO | ❌ ERRADO |
|---|---|
| `create-order.dto.ts` | `createOrderDto.ts` |
| `update-user.dto.ts` | `update-user-request.ts` |

```typescript
// ✅ src/modules/orders/dto/create-order.dto.ts
export class CreateOrderDto {
  @IsNotEmpty()
  @IsUUID()
  customerId: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OrderItemDto)
  items: OrderItemDto[];
}
```

**Por quê?** DTOs são objetos de transporte com validação. O sufixo `.dto.ts` deixa claro que não é uma entidade de domínio.

---

### Regra 3.1.11 — **Arquivos especiais do Next.js seguem a convenção do framework**

| ✅ CERTO | ❌ ERRADO |
|---|---|
| `page.tsx` | `index.tsx` (App Router) |
| `layout.tsx` | `_layout.tsx` |
| `loading.tsx` | `loader.tsx` |
| `error.tsx` | `error-boundary.tsx` |
| `not-found.tsx` | `404.tsx` |

**Por quê?** São nomes reservados do App Router. Renomear quebra o roteamento.

---

### Regra 3.1.12 — **Custom Hooks: prefixo `use-` no arquivo**

| ✅ CERTO | ❌ ERRADO |
|---|---|
| `use-debounce.ts` | `debounce-hook.ts` |
| `use-auth.ts` | `auth-hook.ts` |
| `use-pagination.ts` | `pagination.ts` |

```typescript
// ✅ src/hooks/use-debounce.ts
export function useDebounce<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);

  return debounced;
}
```

**Por quê?** O ESLint plugin `react-hooks` exige que hooks comecem com `use`. O prefixo no arquivo permite identificar hooks em listagem de diretório.

---

### Regra 3.1.13 — **Contextos React: sufixo `.context.tsx`**

| ✅ CERTO | ❌ ERRADO |
|---|---|
| `auth.context.tsx` | `auth-context.tsx` |
| `theme.context.tsx` | `ThemeContext.tsx` |

```tsx
// ✅ src/contexts/auth.context.tsx
const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  return (
    <AuthContext.Provider value={{ user, setUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
```

**Por quê?** Separa contextos de componentes visuais. O export do hook `useAuth` junto do provider mantém tudo coeso.

---

### Regra 3.1.14 — **Tipos compartilhados: sufixo `.types.ts`**

| ✅ CERTO | ❌ ERRADO |
|---|---|
| `order.types.ts` | `order-types.ts` |
| `api.types.ts` | `types.ts` (genérico demais) |

---

### Regra 3.1.15 — **Constantes: `.constants.ts` / Utilitários: `.utils.ts`**

| ✅ CERTO | ❌ ERRADO |
|---|---|
| `billing.constants.ts` | `billing-consts.ts` |
| `date.utils.ts` | `date-helpers.ts` |
| `string.utils.ts` | `stringUtils.ts` |

```typescript
// ✅ src/common/constants/billing.constants.ts
export const MAX_INSTALLMENTS = 12;
export const DEFAULT_CURRENCY = 'BRL';
export const PAYMENT_METHODS = ['credit_card', 'pix', 'boleto'] as const;
```

**Por quê?** Sufixos padronizados permitem buscar `*.constants.ts` ou `*.utils.ts` globalmente. Evita sinônimos (`helpers`, `lib`, `consts`) que fragmentam o projeto.

---

## 3.2 — Classes, Interfaces, Types, Enums

### Regra 3.2.1 — **Classes e Interfaces usam `PascalCase` com sufixo do papel**

| ✅ CERTO | ❌ ERRADO |
|---|---|
| `CreateOrderDto` | `createOrderDTO` |
| `BillingService` | `billingService` |
| `JwtAuthGuard` | `JWTAuthGuard` |
| `OrderResponse` | `IOrderResponse` |

```typescript
// ✅ Sufixo explicita o papel
export class PaymentGatewayService { }
export class CreateSubscriptionDto { }
export class RateLimitGuard { }
```

**Por quê?** O sufixo funciona como documentação embutida — ao ler `PaymentGatewayService`, o papel é óbvio sem abrir o arquivo.

---

### Regra 3.2.2 — **Interfaces NÃO usam prefixo `I`**

| ✅ CERTO | ❌ ERRADO |
|---|---|
| `PaymentProvider` | `IPaymentProvider` |
| `CacheStrategy` | `ICacheStrategy` |
| `UserRepository` | `IUserRepository` |

```typescript
// ✅ src/modules/payments/interfaces/payment-provider.ts
export interface PaymentProvider {
  charge(amount: number, currency: string): Promise<ChargeResult>;
  refund(chargeId: string): Promise<RefundResult>;
}
```

**Por quê?** TypeScript não distingue `interface` de `type` em runtime. O prefixo `I` é herança de C#/Java e adiciona ruído visual. O time do TypeScript [desaconselha oficialmente](https://www.typescriptlang.org/docs/handbook/declaration-files/do-s-and-don-ts.html).

---

### Regra 3.2.3 — **Types usam `PascalCase`**

| ✅ CERTO | ❌ ERRADO |
|---|---|
| `PaymentStatus` | `paymentStatus` |
| `OrderWithItems` | `orderWithItems` |
| `ApiResponse<T>` | `apiResponse<T>` |

```typescript
// ✅
type PaymentStatus = 'pending' | 'approved' | 'rejected' | 'refunded';

type OrderWithItems = Order & {
  items: OrderItem[];
  customer: Customer;
};
```

**Por quê?** `PascalCase` para types segue a mesma convenção de classes e interfaces — são todos "tipos" no TypeScript.

---

### Regra 3.2.4 — **Enums usam `PascalCase` no nome e `UPPER_SNAKE_CASE` nos valores**

| ✅ CERTO | ❌ ERRADO |
|---|---|
| `OrderStatus.PENDING_PAYMENT` | `OrderStatus.pendingPayment` |
| `UserRole.SUPER_ADMIN` | `UserRole.superAdmin` |
| `PaymentMethod.CREDIT_CARD` | `PaymentMethod.CreditCard` |

```typescript
// ✅
export enum OrderStatus {
  PENDING_PAYMENT = 'PENDING_PAYMENT',
  PROCESSING = 'PROCESSING',
  SHIPPED = 'SHIPPED',
  DELIVERED = 'DELIVERED',
  CANCELLED = 'CANCELLED',
}

export enum UserRole {
  SUPER_ADMIN = 'SUPER_ADMIN',
  ADMIN = 'ADMIN',
  MEMBER = 'MEMBER',
  VIEWER = 'VIEWER',
}
```

**Por quê?** `UPPER_SNAKE` para valores de enum é convenção universal (Java, Python, Rust). Valores em string mantêm compatibilidade com banco e API.

---

### Regra 3.2.5 — **Generics usam letras descritivas quando o contexto exige**

| ✅ CERTO | ❌ ERRADO |
|---|---|
| `<T>` (tipo genérico simples) | `<Type>` |
| `<TEntity>` (entidade genérica) | `<entity>` |
| `<TKey, TValue>` | `<key, value>` |

```typescript
// ✅ Genérico simples → T basta
export function paginate<T>(items: T[], page: number, limit: number): PaginatedResult<T> { ... }

// ✅ Múltiplos generics → prefixo T + nome descritivo
export class Repository<TEntity extends BaseEntity> {
  findById(id: string): Promise<TEntity | null> { ... }
}
```

**Por quê?** `T` é universalmente entendido. Quando há múltiplos generics, o prefixo `T` diferencia de parâmetros comuns.

---

## 3.3 — Variáveis, Funções, Métodos

### Regra 3.3.1 — **Variáveis e parâmetros usam `camelCase`**

| ✅ CERTO | ❌ ERRADO |
|---|---|
| `orderTotal` | `order_total` |
| `userId` | `user_id` |
| `isActive` | `is_active` |
| `createdAt` | `created_at` |

**Por quê?** `camelCase` é o padrão do ecossistema TypeScript/JavaScript. Misturar `snake_case` gera inconsistência visual.

---

### Regra 3.3.2 — **Constantes em escopo de módulo usam `UPPER_SNAKE_CASE`**

| ✅ CERTO | ❌ ERRADO |
|---|---|
| `MAX_RETRY_ATTEMPTS` | `maxRetryAttempts` |
| `DEFAULT_PAGE_SIZE` | `defaultPageSize` |
| `API_BASE_URL` | `apiBaseUrl` |

```typescript
// ✅ Constantes no topo do módulo
const MAX_RETRY_ATTEMPTS = 3;
const DEFAULT_PAGE_SIZE = 20;
const CACHE_TTL_SECONDS = 300;

// ✅ Constante local dentro de função → camelCase é aceitável
function processOrders(orders: Order[]) {
  const batchSize = 50;
  // ...
}
```

**Por quê?** `UPPER_SNAKE` sinaliza "valor imutável definido em tempo de compilação". Diferencia de variáveis calculadas em runtime.

---

### Regra 3.3.3 — **Funções e métodos começam com verbo**

| ✅ CERTO | ❌ ERRADO |
|---|---|
| `calculateTotal()` | `total()` |
| `fetchOrders()` | `orders()` |
| `validateEmail()` | `emailValidation()` |
| `sendNotification()` | `notification()` |
| `formatCurrency()` | `currency()` |

```typescript
// ✅ Verbos claros
async function fetchOrdersByCustomer(customerId: string): Promise<Order[]> { ... }
function calculateOrderTotal(items: OrderItem[]): number { ... }
function formatCurrency(amount: number, locale = 'pt-BR'): string { ... }
```

**Por quê?** Funções fazem coisas — o verbo no início comunica a ação instantaneamente. `calculateTotal` é auto-documentado; `total` pode ser uma variável.

---

### Regra 3.3.4 — **Booleanos usam prefixo `is`, `has`, `can`, `should`**

| ✅ CERTO | ❌ ERRADO |
|---|---|
| `isActive` | `active` |
| `hasPermission` | `permission` |
| `canEdit` | `editable` |
| `shouldRetry` | `retry` |
| `isLoading` | `loading` |

```typescript
// ✅
const isAuthenticated = !!session?.user;
const hasAdminRole = user.roles.includes(UserRole.ADMIN);
const canDeleteOrder = hasAdminRole && order.status === OrderStatus.PENDING_PAYMENT;
const shouldShowBanner = !user.hasCompletedOnboarding;
```

**Por quê?** O prefixo transforma a variável em pergunta — `if (isActive)` lê como inglês natural. `if (active)` é ambíguo (variável? substantivo?).

---

### Regra 3.3.5 — **Event handlers React: `handle` no componente, `on` na prop**

| ✅ CERTO | ❌ ERRADO |
|---|---|
| `onSubmit` (prop) | `submitCallback` |
| `handleSubmit` (handler interno) | `onSubmitHandler` |
| `onClick` (prop) | `clickAction` |
| `handleClick` (handler interno) | `doClick` |

```tsx
// ✅
interface ButtonProps {
  onClick: (event: MouseEvent) => void;
  onHover?: () => void;
}

function OrderForm({ onSubmit }: OrderFormProps) {
  function handleSubmit(data: FormData) {
    const validated = validateOrder(data);
    onSubmit(validated);
  }

  return <form onSubmit={handleSubmit}>...</form>;
}
```

**Por quê?** `on` indica "evento que sai do componente" (callback para o pai). `handle` indica "função que trata o evento internamente". A distinção clarifica o fluxo de dados.

---

### Regra 3.3.6 — **Funções async que acessam I/O usam verbos que indicam operação externa**

| ✅ CERTO | ❌ ERRADO |
|---|---|
| `fetchUsers()` | `getUsers()` (ambíguo) |
| `createOrder()` | `makeOrder()` |
| `updateProfile()` | `saveProfile()` (ambíguo) |
| `deleteComment()` | `removeComment()` |
| `sendEmail()` | `email()` |

```typescript
// ✅ Verbos CRUD alinhados com operação real
async function fetchUsers(filters: UserFilters): Promise<User[]> { ... }
async function createOrder(dto: CreateOrderDto): Promise<Order> { ... }
async function updateOrderStatus(orderId: string, status: OrderStatus): Promise<void> { ... }
async function deleteExpiredSessions(): Promise<number> { ... }
```

**Por quê?** Verbos CRUD (`fetch`, `create`, `update`, `delete`) alinham com operações HTTP e de banco. `get` é reservado para computações síncronas sem I/O.

---

## 3.4 — Componentes React

### Regra 3.4.1 — **Arquivo `kebab-case.tsx`, export `PascalCase`, named export**

| ✅ CERTO | ❌ ERRADO |
|---|---|
| `export function UserCard` | `export default function UserCard` |
| `export function SidebarNav` | `module.exports = SidebarNav` |

```tsx
// ✅ src/components/ui/user-card.tsx
export function UserCard({ user, onSelect }: UserCardProps) {
  return (
    <div onClick={() => onSelect(user.id)}>
      <Avatar src={user.avatarUrl} />
      <span>{user.name}</span>
    </div>
  );
}
```

**Por quê?** Named exports permitem auto-import confiável e refactoring seguro. Default exports dificultam rename global e permitem nomes inconsistentes.

---

### Regra 3.4.2 — **Props tipadas como `{NomeComponente}Props`**

| ✅ CERTO | ❌ ERRADO |
|---|---|
| `UserCardProps` | `Props` |
| `PricingTableProps` | `IPricingTableProps` |
| `SidebarNavProps` | `SidebarProps` (abreviado) |

```tsx
// ✅
interface UserCardProps {
  user: User;
  onSelect: (userId: string) => void;
  isHighlighted?: boolean;
}

export function UserCard({ user, onSelect, isHighlighted = false }: UserCardProps) { ... }
```

**Por quê?** `{Nome}Props` cria relação explícita entre tipo e componente. `Props` genérico é ambíguo quando há múltiplos componentes no mesmo escopo.

---

### Regra 3.4.3 — **Um componente exportado por arquivo**

| ✅ CERTO | ❌ ERRADO |
|---|---|
| `user-card.tsx` → `UserCard` | `cards.tsx` → `UserCard`, `ProductCard`, `OrderCard` |
| `sidebar-nav.tsx` → `SidebarNav` | `navigation.tsx` → `Sidebar`, `Topbar`, `Footer` |

**Exceção:** Componentes internos auxiliares (não exportados) podem coexistir no mesmo arquivo.

```tsx
// ✅ Componente auxiliar privado no mesmo arquivo
function AvatarBadge({ status }: { status: string }) {
  return <span className={`badge-${status}`} />;
}

export function UserCard({ user }: UserCardProps) {
  return (
    <div>
      <AvatarBadge status={user.status} />
      <span>{user.name}</span>
    </div>
  );
}
```

**Por quê?** Um arquivo = uma responsabilidade. Facilita code splitting, tree shaking e localização no projeto.

---

### Regra 3.4.4 — **Server Components e Client Components: separar explicitamente**

| ✅ CERTO | ❌ ERRADO |
|---|---|
| Arquivo sem diretiva → Server Component | `'use client'` desnecessário |
| `'use client'` somente quando usa hooks/eventos | `'use client'` em todo componente |

```tsx
// ✅ Server Component (padrão) — sem diretiva
// src/app/orders/page.tsx
export default async function OrdersPage() {
  const orders = await fetchOrders();
  return <OrderList orders={orders} />;
}

// ✅ Client Component — usa hooks
// src/components/orders/order-filters.tsx
'use client';

export function OrderFilters({ onFilter }: OrderFiltersProps) {
  const [search, setSearch] = useState('');
  return <input value={search} onChange={(e) => setSearch(e.target.value)} />;
}
```

**Por quê?** Server Components não enviam JavaScript ao browser. Marcar tudo como `'use client'` anula o benefício do App Router.

---

### Regra 3.4.5 — **Composição via children, não via props de renderização**

| ✅ CERTO | ❌ ERRADO |
|---|---|
| `<Card><CardHeader /><CardBody /></Card>` | `<Card renderHeader={() => ...} />` |
| `<Dialog><DialogContent /></Dialog>` | `<Dialog content={<Content />} />` |

```tsx
// ✅ Composição com children
export function Card({ children, className }: CardProps) {
  return <div className={cn('rounded-xl border', className)}>{children}</div>;
}

export function CardHeader({ children }: { children: ReactNode }) {
  return <div className="border-b px-6 py-4">{children}</div>;
}

// Uso
<Card>
  <CardHeader>Detalhes do Pedido</CardHeader>
  <CardBody>...</CardBody>
</Card>
```

**Por quê?** Composição é mais legível, testável e alinhada com o modelo mental do React. Render props são aceitáveis apenas em casos de inversão de controle complexa.

---

## 3.5 — Banco de Dados / Prisma Schema

### Regra 3.5.1 — **Models Prisma em `PascalCase` singular**

| ✅ CERTO | ❌ ERRADO |
|---|---|
| `model Order` | `model Orders` |
| `model UserProfile` | `model user_profile` |
| `model OrderItem` | `model orderItems` |

**Por quê?** O Prisma Client gera `prisma.order.findMany()` — singular é mais natural. `PascalCase` alinha com classes TypeScript geradas.

---

### Regra 3.5.2 — **Colunas em `camelCase` no schema, `snake_case` no banco via `@map`**

| ✅ CERTO | ❌ ERRADO |
|---|---|
| `createdAt @map("created_at")` | `created_at` direto no schema |
| `firstName @map("first_name")` | `first_name` direto no schema |

```prisma
// ✅ schema.prisma
model Order {
  id          String      @id @default(uuid())
  orderNumber String      @unique @map("order_number")
  totalAmount Decimal     @map("total_amount") @db.Decimal(10, 2)
  status      OrderStatus @default(PENDING_PAYMENT)
  createdAt   DateTime    @default(now()) @map("created_at")
  updatedAt   DateTime    @updatedAt @map("updated_at")
  customerId  String      @map("customer_id")

  customer Customer    @relation(fields: [customerId], references: [id])
  items    OrderItem[]

  @@map("orders")
}
```

**Por quê?** O código TypeScript usa `order.createdAt` (camelCase). O banco usa `created_at` (snake_case, padrão SQL). `@map` faz a ponte sem comprometer nenhum lado.

---

### Regra 3.5.3 — **Tabela mapeada com `@@map` para `snake_case` plural**

| ✅ CERTO | ❌ ERRADO |
|---|---|
| `model Order { @@map("orders") }` | Sem `@@map` (tabela vira "Order") |
| `model UserProfile { @@map("user_profiles") }` | `@@map("UserProfiles")` |
| `model OrderItem { @@map("order_items") }` | `@@map("OrderItem")` |

**Por quê?** Convenção SQL universal é tabela plural em `snake_case`. DBAs, queries manuais e ferramentas externas esperam esse formato.

---

### Regra 3.5.4 — **Enums Prisma em `PascalCase`, valores em `UPPER_SNAKE_CASE`**

| ✅ CERTO | ❌ ERRADO |
|---|---|
| `enum OrderStatus { PENDING_PAYMENT }` | `enum orderStatus { pendingPayment }` |
| `enum UserRole { SUPER_ADMIN }` | `enum user_role { super_admin }` |

```prisma
// ✅
enum OrderStatus {
  PENDING_PAYMENT
  PROCESSING
  SHIPPED
  DELIVERED
  CANCELLED
  REFUNDED
}
```

**Por quê?** Alinha com os enums TypeScript (regra 3.2.4). Valores em `UPPER_SNAKE` são universais em SQL.

---

### Regra 3.5.5 — **Índices nomeados explicitamente**

| ✅ CERTO | ❌ ERRADO |
|---|---|
| `@@index([customerId, status], name: "idx_orders_customer_status")` | `@@index([customerId, status])` |
| `@@unique([email, tenantId], name: "uq_users_email_tenant")` | `@@unique([email, tenantId])` |

```prisma
// ✅
model Order {
  // ...campos...

  @@index([customerId, status], name: "idx_orders_customer_status")
  @@index([createdAt], name: "idx_orders_created_at")
  @@map("orders")
}
```

**Por quê?** Índices nomeados facilitam debug de queries lentas (`EXPLAIN ANALYZE`) e migrations. Nomes automáticos do Prisma são crípticos.

---

### Regra 3.5.6 — **Relações com campo e referência explícitos**

| ✅ CERTO | ❌ ERRADO |
|---|---|
| `@relation(fields: [customerId], references: [id])` | `@relation` sem campos |

```prisma
// ✅
model Order {
  customerId String   @map("customer_id")
  customer   Customer @relation(fields: [customerId], references: [id], onDelete: Cascade)
}
```

**Por quê?** Relações explícitas evitam ambiguidade quando há múltiplas relações entre os mesmos models. `onDelete` documentado previne dados órfãos.

---

## 3.6 — Endpoints de API

### Regra 3.6.1 — **Base path: `/api/v1/`**

| ✅ CERTO | ❌ ERRADO |
|---|---|
| `/api/v1/orders` | `/orders` |
| `/api/v1/users` | `/api/users` (sem versão) |

```typescript
// ✅ main.ts
app.setGlobalPrefix('api/v1');
```

**Por quê?** Versionamento na URL permite manter v1 e v2 simultaneamente durante migração. O prefixo `/api` separa rotas da API de assets estáticos.

---

### Regra 3.6.2 — **Recursos em `kebab-case` plural**

| ✅ CERTO | ❌ ERRADO |
|---|---|
| `/api/v1/order-items` | `/api/v1/orderItems` |
| `/api/v1/payment-methods` | `/api/v1/PaymentMethods` |
| `/api/v1/users` | `/api/v1/user` |

```typescript
// ✅
@Controller('order-items')
export class OrderItemsController {
  @Get()
  findAll() { ... }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) { ... }

  @Post()
  create(@Body() dto: CreateOrderItemDto) { ... }
}
```

**Por quê?** REST representa coleções — plural é semântico (`GET /users` retorna lista). `kebab-case` é padrão de URL (RFCs recomendam lowercase).

---

### Regra 3.6.3 — **Ações como sub-recurso, não como verbo na URL**

| ✅ CERTO | ❌ ERRADO |
|---|---|
| `POST /api/v1/orders/:id/cancel` | `POST /api/v1/cancelOrder/:id` |
| `POST /api/v1/users/:id/deactivate` | `PUT /api/v1/users/:id/deactivate` |
| `POST /api/v1/orders/:id/items` | `POST /api/v1/addOrderItem` |

```typescript
// ✅
@Controller('orders')
export class OrdersController {
  @Post(':id/cancel')
  cancel(@Param('id', ParseUUIDPipe) id: string) {
    return this.ordersService.cancelOrder(id);
  }

  @Post(':id/refund')
  refund(@Param('id', ParseUUIDPipe) id: string, @Body() dto: RefundOrderDto) {
    return this.ordersService.refundOrder(id, dto);
  }
}
```

**Por quê?** Sub-recursos mantêm a estrutura REST hierárquica. Ações são `POST` porque causam side-effects.

---

### Regra 3.6.4 — **Query params em `camelCase`**

| ✅ CERTO | ❌ ERRADO |
|---|---|
| `?pageSize=20&sortBy=createdAt` | `?page_size=20&sort_by=created_at` |
| `?startDate=2025-01-01` | `?start-date=2025-01-01` |
| `?includeDeleted=true` | `?include_deleted=true` |

```typescript
// ✅
export class ListOrdersQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Max(100)
  pageSize?: number = 20;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsEnum(OrderStatus)
  status?: OrderStatus;
}
```

**Por quê?** Frontend TypeScript consome `camelCase` nativamente. Converte automaticamente para objetos JS sem transformação.

---

## 3.7 — Git: Branches, Commits, Tags

### Regra 3.7.1 — **Branches: `tipo/descricao-kebab-case`**

| ✅ CERTO | ❌ ERRADO |
|---|---|
| `feat/order-cancellation` | `feature_orderCancellation` |
| `fix/payment-timeout` | `bugfix/paymentTimeout` |
| `chore/upgrade-prisma-5` | `chore_upgrade_prisma` |
| `refactor/billing-module` | `refactoring/billing` |

**Tipos permitidos:**

| Tipo | Uso |
|---|---|
| `feat` | Nova funcionalidade |
| `fix` | Correção de bug |
| `refactor` | Refatoração sem mudança de comportamento |
| `chore` | Manutenção, deps, configs |
| `docs` | Documentação |
| `test` | Testes |
| `ci` | Pipeline CI/CD |

**Por quê?** Tipo no início facilita filtragem (`git branch --list 'feat/*'`). `kebab-case` é limpo em URLs de PR.

---

### Regra 3.7.2 — **Commits seguem Conventional Commits**

| ✅ CERTO | ❌ ERRADO |
|---|---|
| `feat(billing): add PIX payment method` | `added pix` |
| `fix(orders): prevent duplicate cancellation` | `fix bug` |
| `refactor(auth): extract JWT validation to guard` | `refactoring` |
| `chore(deps): upgrade prisma to 6.2` | `update deps` |

**Formato:**

```
tipo(escopo): descrição imperativa em inglês

Corpo opcional em português explicando o porquê.

Refs: #123
```

```bash
# ✅ Exemplos reais
git commit -m "feat(orders): add bulk status update endpoint"
git commit -m "fix(auth): handle expired refresh token gracefully"
git commit -m "refactor(prisma): split schema into per-module files"
```

**Por quê?** Conventional Commits alimentam changelog automático, semver bump e CI condicional. Escopo entre parênteses localiza a mudança.

---

### Regra 3.7.3 — **Tags seguem Semantic Versioning**

| ✅ CERTO | ❌ ERRADO |
|---|---|
| `v1.2.3` | `1.2.3` (sem prefixo) |
| `v2.0.0-beta.1` | `v2-beta` |
| `v1.0.0-rc.1` | `release-1.0` |

```bash
# ✅
git tag -a v1.3.0 -m "feat: order cancellation and refund flow"
git tag -a v2.0.0-beta.1 -m "feat!: new billing engine (breaking)"
```

**Por quê?** Semver comunica impacto da mudança: patch (fix), minor (feat), major (breaking). O prefixo `v` é convenção do ecossistema Node.js.

---

## 3.8 — Variáveis de Ambiente

### Regra 3.8.1 — **Todas em `UPPER_SNAKE_CASE`**

| ✅ CERTO | ❌ ERRADO |
|---|---|
| `DATABASE_URL` | `databaseUrl` |
| `JWT_SECRET` | `jwtSecret` |
| `REDIS_HOST` | `redisHost` |

---

### Regra 3.8.2 — **Variáveis expostas ao browser: prefixo `NEXT_PUBLIC_`**

| ✅ CERTO | ❌ ERRADO |
|---|---|
| `NEXT_PUBLIC_API_URL` | `API_URL` (no client) |
| `NEXT_PUBLIC_STRIPE_KEY` | `STRIPE_PUBLISHABLE_KEY` |
| `NEXT_PUBLIC_GA_ID` | `GA_TRACKING_ID` |

```env
# ✅ .env
# — Server-only (NUNCA expostas ao browser)
DATABASE_URL=postgresql://user:pass@localhost:5432/bravy
JWT_SECRET=super-secret-key
STRIPE_SECRET_KEY=sk_live_xxx

# — Client-safe (expostas ao browser via NEXT_PUBLIC_)
NEXT_PUBLIC_API_URL=https://api.bravy.com
NEXT_PUBLIC_STRIPE_KEY=pk_live_xxx
NEXT_PUBLIC_GA_ID=G-XXXXXXXXXX
```

**Por quê?** O Next.js só injeta variáveis com `NEXT_PUBLIC_` no bundle do browser. Sem o prefixo, a variável é `undefined` no client — bug silencioso.

---

### Regra 3.8.3 — **Agrupar por serviço com prefixo**

| ✅ CERTO | ❌ ERRADO |
|---|---|
| `STRIPE_SECRET_KEY` | `SECRET_KEY` |
| `STRIPE_WEBHOOK_SECRET` | `WEBHOOK_SECRET` |
| `REDIS_HOST` / `REDIS_PORT` | `CACHE_HOST` / `CACHE_PORT` |
| `SMTP_HOST` / `SMTP_PORT` | `EMAIL_HOST` / `MAIL_PORT` |

```env
# ✅ Agrupado por serviço
# — Database
DATABASE_URL=postgresql://...
DATABASE_POOL_SIZE=10

# — Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=secret

# — Stripe
STRIPE_SECRET_KEY=sk_live_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx

# — SMTP
SMTP_HOST=smtp.resend.com
SMTP_PORT=465
SMTP_FROM=noreply@bravy.com
```

**Por quê?** Prefixo por serviço evita colisão de nomes e facilita busca no `.env`. `SECRET_KEY` sozinho é ambíguo; `STRIPE_SECRET_KEY` é inequívoco.

---

## 3.9 — Cheat Sheet (Cola Rápida)

> Recorte e cole na parede. Consulte antes de cada PR.

| Elemento | Convenção | Exemplo |
|---|---|---|
| Arquivo TS | `kebab-case.ts` | `payment-gateway.service.ts` |
| Componente React (arquivo) | `kebab-case.tsx` | `pricing-card.tsx` |
| Componente React (export) | `PascalCase` | `export function PricingCard` |
| Props | `{Nome}Props` | `PricingCardProps` |
| Hook (arquivo) | `use-*.ts` | `use-debounce.ts` |
| Contexto | `*.context.tsx` | `auth.context.tsx` |
| Teste unitário | `*.spec.ts` | `billing.service.spec.ts` |
| Teste e2e | `*.e2e-spec.ts` | `auth.e2e-spec.ts` |
| Pasta | `kebab-case/` | `order-items/` |
| Classe / Interface | `PascalCase` + sufixo | `BillingService`, `PaymentProvider` |
| Enum (nome) | `PascalCase` | `OrderStatus` |
| Enum (valor) | `UPPER_SNAKE_CASE` | `PENDING_PAYMENT` |
| Variável / Parâmetro | `camelCase` | `orderTotal` |
| Constante de módulo | `UPPER_SNAKE_CASE` | `MAX_RETRY_ATTEMPTS` |
| Booleano | `is/has/can/should` + `camelCase` | `isActive`, `hasPermission` |
| Função / Método | `camelCase` com verbo | `calculateTotal()` |
| Event handler (interno) | `handle` + evento | `handleSubmit` |
| Event handler (prop) | `on` + evento | `onSubmit` |
| Model Prisma | `PascalCase` singular | `model Order` |
| Tabela SQL (via @@map) | `snake_case` plural | `@@map("orders")` |
| Coluna SQL (via @map) | `snake_case` | `@map("created_at")` |
| Endpoint API | `/api/v1/` + `kebab-case` plural | `/api/v1/order-items` |
| Query param | `camelCase` | `?pageSize=20` |
| Branch Git | `tipo/descricao-kebab` | `feat/order-cancellation` |
| Commit | Conventional Commits | `feat(billing): add PIX` |
| Tag | `vMAJOR.MINOR.PATCH` | `v1.3.0` |
| Env var | `UPPER_SNAKE_CASE` | `DATABASE_URL` |
| Env var (client) | `NEXT_PUBLIC_*` | `NEXT_PUBLIC_API_URL` |

---

> **Última atualização:** Março 2026
> **Mantenedor:** Time de Engenharia Bravy
> **Regra de ouro:** Na dúvida, consulte este documento. Se o documento não cobre, abra uma discussão no PR antes de inventar.
