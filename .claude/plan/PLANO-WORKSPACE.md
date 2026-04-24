# Plano de Implementacao — Workspace (Multi-Tenancy)

## Contexto

O Mundial ERP e hoje single-tenant: nao existe conceito de organizacao/workspace. Todos os dados (Users, Departments, Orders, Clients, Products, etc.) vivem no mesmo espaco sem isolamento. O objetivo e introduzir um **Workspace** como container raiz (root tenant) seguindo o modelo ClickUp, onde tudo pertence a um Workspace e nenhum dado cruza fronteiras de tenant.

**Hierarquia alvo:**
```
Workspace (root, tenant)
 └── Department (= Space)
      └── Area (= Folder, opcional)
           └── Process (= List)
                └── WorkItem (= Task)
                     └── WorkItem children (= Subtask, self-ref)
```

**Decisao arquitetural:** Manter os nomes existentes (Department, Area, Process, WorkItem) — nao renomear. Adicionar Workspace como camada acima de Department. O mapeamento conceitual para ClickUp fica: Department=Space, Area=Folder, Process=List, WorkItem=Task.

---

## Fase 1 — Workspace Foundation (sem quebrar nada)

### 1.1 Prisma Schema — Novos Models

**Arquivo:** `mundial-erp-api/prisma/schema.prisma`

```prisma
enum WorkspaceMemberRole {
  OWNER
  ADMIN
  MEMBER
  GUEST
}

enum WorkspacePlan {
  FREE
  PRO
  ENTERPRISE
}

enum InviteStatus {
  PENDING
  ACCEPTED
  EXPIRED
  REVOKED
}

model Workspace {
  id        String         @id @default(cuid())
  name      String
  slug      String         @unique
  logoUrl   String?        @map("logo_url")
  color     String?
  plan      WorkspacePlan  @default(FREE)
  ownerId   String         @map("owner_id")
  createdAt DateTime       @default(now()) @map("created_at")
  updatedAt DateTime       @updatedAt @map("updated_at")
  deletedAt DateTime?      @map("deleted_at")

  owner   User              @relation("WorkspaceOwner", fields: [ownerId], references: [id])
  members WorkspaceMember[]
  invites WorkspaceInvite[]

  // Entidades raiz do workspace
  departments        Department[]
  clients            Client[]
  orders             Order[]
  products           Product[]
  suppliers          Supplier[]
  companies          Company[]
  dashboards         Dashboard[]
  chatChannels       ChatChannel[]
  auditLogs          AuditLog[]
  carriers           Carrier[]
  paymentMethods     PaymentMethod[]
  clientClassifications ClientClassification[]
  deliveryRoutes     DeliveryRoute[]
  orderTypes         OrderType[]
  orderFlows         OrderFlow[]
  orderModels        OrderModel[]
  productTypes       ProductType[]
  brands             Brand[]
  productDepartments ProductDepartment[]
  unitMeasures       UnitMeasure[]
  financialCategories FinancialCategory[]
  statusTemplates    StatusTemplate[]
  priceTables        PriceTable[]

  @@map("workspaces")
}

model WorkspaceMember {
  id          String              @id @default(cuid())
  workspaceId String              @map("workspace_id")
  userId      String              @map("user_id")
  role        WorkspaceMemberRole @default(MEMBER)
  joinedAt    DateTime            @default(now()) @map("joined_at")
  createdAt   DateTime            @default(now()) @map("created_at")
  updatedAt   DateTime            @updatedAt @map("updated_at")

  workspace Workspace @relation(fields: [workspaceId], references: [id])
  user      User      @relation(fields: [userId], references: [id])

  @@unique([workspaceId, userId])
  @@index([userId], name: "idx_ws_members_user")
  @@index([workspaceId, role], name: "idx_ws_members_ws_role")
  @@map("workspace_members")
}

model WorkspaceInvite {
  id          String              @id @default(cuid())
  workspaceId String              @map("workspace_id")
  email       String
  role        WorkspaceMemberRole @default(MEMBER)
  token       String              @unique
  status      InviteStatus        @default(PENDING)
  expiresAt   DateTime            @map("expires_at")
  invitedById String              @map("invited_by_id")
  createdAt   DateTime            @default(now()) @map("created_at")
  updatedAt   DateTime            @updatedAt @map("updated_at")

  workspace Workspace @relation(fields: [workspaceId], references: [id])
  invitedBy User      @relation("InvitedBy", fields: [invitedById], references: [id])

  @@index([email, workspaceId], name: "idx_ws_invites_email_ws")
  @@map("workspace_invites")
}
```

### 1.2 Prisma Schema — Adicionar `workspaceId` em Models Existentes

**Modelos com `workspaceId` direto (nullable inicialmente, required apos migracao de dados):**

| Model | Justificativa |
|-------|--------------|
| `Department` | Topo da hierarquia BPM — filhos herdam transitivamente |
| `Client` | Entidade raiz de negocio |
| `Order` | Entidade raiz de negocio |
| `Product` | Entidade raiz de negocio |
| `Supplier` | Entidade raiz de negocio |
| `Company` | Config por workspace |
| `Dashboard` | Por workspace |
| `ChatChannel` | Por workspace |
| `AuditLog` | Por workspace |
| `Carrier` | Referencia por workspace |
| `PaymentMethod` | Referencia por workspace |
| `ClientClassification` | Referencia por workspace |
| `DeliveryRoute` | Referencia por workspace |
| `OrderType` | Referencia por workspace |
| `OrderFlow` | Referencia por workspace |
| `OrderModel` | Referencia por workspace |
| `ProductType` | Referencia por workspace |
| `Brand` | Referencia por workspace |
| `ProductDepartment` | Referencia por workspace |
| `UnitMeasure` | Referencia por workspace |
| `FinancialCategory` | Referencia por workspace |
| `StatusTemplate` | Referencia por workspace |
| `PriceTable` | Referencia por workspace |

**Modelos que NAO recebem `workspaceId` (escopo transitivo ou global):**

| Model | Motivo |
|-------|--------|
| `Sector`, `Area`, `Process`, `WorkItem`, `WorkflowStatus`, `ProcessView` | Via Department |
| `Activity`, `Task`, `Handoff` | Via Process |
| `ProcessInstance`, `ActivityInstance`, `TaskInstance`, `HandoffInstance` | Via Order/Process |
| `OrderItem`, `OrderStatusHistory`, `OrderItemSupply` | Via Order |
| `ProductionOrder`, `SeparationOrder`, `StockRequisition` | Via Order |
| `AccountReceivable`, `AccountPayable`, `Invoice` | Via Order/Client |
| `PriceTableItem`, `ProductionFormula*`, `ProductImage` | Via Product/PriceTable |
| `State`, `City`, `Neighborhood` | Dados geograficos globais |
| `User` | Global — vinculo via WorkspaceMember |
| `Permission`, `RolePermission` | Sistema global de RBAC |
| `SyncLog`, `SyncMapping`, `IdempotencyRecord` | Infra tecnica |
| `CashRegister` | Via Company (transitivo) |

**User model — adicionar campo e relacoes:**
```prisma
// Adicionar ao User existente:
lastAccessedWorkspaceId String? @map("last_accessed_workspace_id")
lastAccessedWorkspace   Workspace? @relation("LastAccessedWorkspace", fields: [lastAccessedWorkspaceId], references: [id])

workspaceMembers    WorkspaceMember[]
ownedWorkspaces     Workspace[]        @relation("WorkspaceOwner")
workspaceInvites    WorkspaceInvite[]  @relation("InvitedBy")
```

O `lastAccessedWorkspaceId` e atualizado sempre que o usuario seleciona/entra em um workspace. Permite redirect automatico no proximo login.

### 1.3 Migracao de Dados (3 migrations)

**Migration 1 — Aditiva (zero downtime):**
- Criar tabelas `workspaces`, `workspace_members`, `workspace_invites`
- Adicionar coluna `workspace_id` nullable em todas as tabelas listadas acima
- Criar indices em `workspace_id`

**Migration 2 — Seed de dados (script em `prisma/seed-workspace.ts`):**
- Criar workspace default: `{ name: "Mundial Telhas", slug: "mundial-telhas" }`
- UPDATE em batch em cada tabela: `SET workspace_id = '<default-ws-id>' WHERE workspace_id IS NULL`
- INSERT em `workspace_members` para cada User existente, mapeando:
  - ADMIN → OWNER (primeiro) ou ADMIN
  - MANAGER → ADMIN
  - OPERATOR → MEMBER
  - VIEWER → GUEST

**Migration 3 — Tornar required:**
- ALTER cada coluna `workspace_id` para NOT NULL
- Adicionar FK constraints

### 1.4 Backend — Modulo `workspaces`

**Estrutura:**
```
src/modules/workspaces/
  workspaces.module.ts
  workspaces.controller.ts
  workspaces.service.ts
  workspaces.repository.ts
  dto/
    create-workspace.dto.ts
    update-workspace.dto.ts
    workspace-response.dto.ts
  members/
    members.controller.ts
    members.service.ts
    members.repository.ts
    dto/
      add-member.dto.ts
      update-member-role.dto.ts
      member-response.dto.ts
  invites/
    invites.controller.ts
    invites.service.ts
    invites.repository.ts
    dto/
      create-invite.dto.ts
      invite-response.dto.ts
  guards/
    workspace.guard.ts
  decorators/
    workspace-id.decorator.ts
```

**Endpoints (todos com `/api/v1/` global; listagens usam `PaginationDto` de `common/dtos/`):**

| Verbo | Rota | Query | Acao |
|-------|------|-------|------|
| POST | `/workspaces` | — | Criar workspace (criador vira Owner) |
| GET | `/workspaces` | `?page&limit&search` | Listar workspaces do usuario (paginado) |
| GET | `/workspaces/:id` | — | Detalhes do workspace |
| PATCH | `/workspaces/:id` | — | Atualizar workspace |
| DELETE | `/workspaces/:id` | — | Soft delete (Owner only) |
| POST | `/workspaces/:id/select` | — | Selecionar workspace (emite novos tokens) |
| GET | `/workspaces/:id/members` | `?page&limit&role` | Listar membros (paginado) |
| POST | `/workspaces/:id/members` | — | Adicionar membro |
| PATCH | `/workspaces/:id/members/:userId` | — | Alterar role |
| DELETE | `/workspaces/:id/members/:userId` | — | Remover membro |
| GET | `/workspaces/:id/invites` | `?page&limit&status` | Listar convites (paginado) |
| POST | `/workspaces/:id/invites` | — | Criar convite |
| POST | `/workspaces/join/:token` | — | Aceitar convite |
| GET | `/workspaces/:id/seats` | — | Info de billing/assentos |

Todas as listas respeitam a regra inviolavel #7 (`take <= 100`). O envelope `{ data, meta: { pagination } }` e aplicado automaticamente pelo `ResponseInterceptor` global — nao envelopar manualmente.

**DTOs (exemplo concreto com `class-validator`, regra #12):**

```typescript
// dto/create-workspace.dto.ts
export class CreateWorkspaceDto {
  @ApiProperty({ example: 'Mundial Telhas' })
  @IsString() @IsNotEmpty() @MaxLength(80)
  name: string;

  @ApiProperty({ example: 'mundial-telhas' })
  @IsString() @IsNotEmpty() @Matches(/^[a-z0-9-]+$/) @MinLength(3) @MaxLength(40)
  slug: string;

  @ApiPropertyOptional()
  @IsOptional() @IsUrl()
  logoUrl?: string;

  @ApiPropertyOptional({ example: '#D97706' })
  @IsOptional() @IsString() @Matches(/^#[0-9A-Fa-f]{6}$/)
  color?: string;
}

// dto/update-workspace.dto.ts
export class UpdateWorkspaceDto extends PartialType(CreateWorkspaceDto) {}

// dto/add-member.dto.ts
export class AddMemberDto {
  @ApiProperty()
  @IsString() @IsNotEmpty()
  userId: string;

  @ApiProperty({ enum: WorkspaceMemberRole })
  @IsEnum(WorkspaceMemberRole)
  role: WorkspaceMemberRole;
}

// dto/create-invite.dto.ts
export class CreateInviteDto {
  @ApiProperty({ example: 'user@example.com' })
  @IsEmail() @MaxLength(255)
  email: string;

  @ApiProperty({ enum: WorkspaceMemberRole })
  @IsEnum(WorkspaceMemberRole)
  role: WorkspaceMemberRole;
}

// dto/workspace-response.dto.ts
export class WorkspaceResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() name: string;
  @ApiProperty() slug: string;
  @ApiPropertyOptional() logoUrl?: string;
  @ApiPropertyOptional() color?: string;
  @ApiProperty({ enum: WorkspacePlan }) plan: WorkspacePlan;
  @ApiProperty() createdAt: Date;

  static fromEntity(entity: Workspace): WorkspaceResponseDto {
    const dto = new WorkspaceResponseDto();
    Object.assign(dto, {
      id: entity.id,
      name: entity.name,
      slug: entity.slug,
      logoUrl: entity.logoUrl,
      color: entity.color,
      plan: entity.plan,
      createdAt: entity.createdAt,
    });
    return dto;
  }
}
```

**Module (imports obrigatorios):**

```typescript
// workspaces.module.ts
@Module({
  imports: [DatabaseModule, AuthModule], // DatabaseModule expoe PrismaService via @Global
  controllers: [
    WorkspacesController,
    MembersController,
    InvitesController,
  ],
  providers: [
    WorkspacesService, WorkspacesRepository,
    MembersService, MembersRepository,
    InvitesService, InvitesRepository,
    WorkspaceGuard,
  ],
  exports: [WorkspacesService, WorkspaceGuard],
})
export class WorkspacesModule {}
```

### 1.5 Auth — Estender JWT com Workspace + Fluxo de Login

**Arquivo:** `mundial-erp-api/src/modules/auth/decorators/current-user.decorator.ts`

Estender `JwtPayload`:
```typescript
export interface JwtPayload {
  sub: string;
  email: string;
  role: string;              // manter para compat
  workspaceId?: string;      // NOVO — preenchido no login (auto) ou via select
  workspaceRole?: string;    // NOVO — role no workspace
}
```

**Fluxo de Login (auto-selecao de workspace):**

Ao fazer `POST /auth/login` ou `POST /auth/refresh`, o backend deve:

1. Autenticar credenciais (ja existe)
2. Buscar workspaces do user via `WorkspaceMember`
3. Determinar workspace inicial:
   - **Se user.lastAccessedWorkspaceId existe e ainda e membro ativo:** usar esse workspace
   - **Se nao, e user tem 1 unico workspace:** usar esse workspace
   - **Se nao, e user tem multiplos workspaces:** usar o de `joinedAt` mais antigo (ou primeiro criado)
   - **Se nao tem nenhum workspace:** emitir tokens sem `workspaceId` (fluxo de onboarding → criar workspace)
4. Emitir tokens com `workspaceId` e `workspaceRole` ja preenchidos
5. Response inclui dados do workspace selecionado (**dentro do envelope padrao `{ data, meta }` — aplicado pelo `ResponseInterceptor` global**):
   ```json
   {
     "data": {
       "accessToken": "...",
       "refreshToken": "...",
       "user": { ... },
       "workspace": { "id": "...", "name": "...", "slug": "..." },
       "availableWorkspaces": [ { "id", "name", "slug" }, ... ]
     },
     "meta": { "timestamp": "...", "requestId": "..." }
   }
   ```
   Service retorna apenas o objeto interno (`LoginResponseDto`) — envelopar e responsabilidade do interceptor.

**Novo metodo:** `authService.resolveInitialWorkspace(userId): Promise<WorkspaceMember | null>`

Retorna o workspace a ser usado no login, seguindo as regras acima.

**Metodo `selectWorkspace(userId, workspaceId)` (troca manual):**
1. Valida que user e membro do workspace
2. Atualiza `user.lastAccessedWorkspaceId = workspaceId`
3. Gera novos tokens com `workspaceId` e `workspaceRole`
4. Retorna `{ accessToken, refreshToken, workspace }`

**Arquivo:** `mundial-erp-api/src/modules/auth/strategies/jwt.strategy.ts`

Extrair `workspaceId` e `workspaceRole` do payload e incluir no request.

### 1.6 Guard Global — WorkspaceGuard

**Arquivo:** `mundial-erp-api/src/modules/workspaces/guards/workspace.guard.ts`

- Valida que JWT contem `workspaceId`
- Valida que user ainda e membro ativo
- Rotas do proprio modulo workspaces (listar, criar, selecionar) sao excecao via decorator `@SkipWorkspaceGuard()`
- Registrar em `app.module.ts` apos JwtAuthGuard:
  ```
  Guards: Throttler → JWT → Workspace → Roles
  ```

### 1.7 Decorator `@WorkspaceId()`

**Arquivo:** `mundial-erp-api/src/modules/workspaces/decorators/workspace-id.decorator.ts`

```typescript
export const WorkspaceId = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    return request.user?.workspaceId;
  },
);
```

Usado em controllers: `@WorkspaceId() workspaceId: string`

### 1.8 Frontend — Workspace Selector

**Nova feature:** `mundial-erp-web/src/features/workspaces/`
```
features/workspaces/
  components/
    workspace-switcher.tsx        // dropdown no header da sidebar
    create-workspace-dialog.tsx   // modal criar workspace
    workspace-form.tsx            // form reusavel (create/edit)
  hooks/
    use-workspaces.ts
    use-current-workspace.ts
    use-select-workspace.ts
    use-create-workspace.ts
  services/
    workspace.service.ts
  schemas/
    workspace.schema.ts           // Zod — regra inviolavel #12
  types/
    workspace.types.ts
  utils/
    workspace-color.ts            // hash(name) → cor + iniciais
```

**Schema Zod (regra #12 — validacao obrigatoria no frontend):**

```typescript
// schemas/workspace.schema.ts
import { z } from 'zod';

export const createWorkspaceSchema = z.object({
  name: z.string().min(1, 'Nome obrigatorio').max(80),
  slug: z
    .string()
    .min(3, 'Minimo 3 caracteres')
    .max(40)
    .regex(/^[a-z0-9-]+$/, 'Use apenas letras minusculas, numeros e hifen'),
  logoUrl: z.string().url('URL invalida').optional().or(z.literal('')),
  color: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/, 'Formato hex invalido (#RRGGBB)')
    .optional()
    .or(z.literal('')),
});

export type CreateWorkspaceFormData = z.infer<typeof createWorkspaceSchema>;

export const addMemberSchema = z.object({
  userId: z.string().min(1),
  role: z.enum(['OWNER', 'ADMIN', 'MEMBER', 'GUEST']),
});
export type AddMemberFormData = z.infer<typeof addMemberSchema>;

export const createInviteSchema = z.object({
  email: z.string().email('Email invalido').max(255),
  role: z.enum(['ADMIN', 'MEMBER', 'GUEST']),
});
export type CreateInviteFormData = z.infer<typeof createInviteSchema>;
```

Schemas consumidos por `React Hook Form` + `zodResolver` nos dialogs/forms. Ex:
```typescript
const form = useForm<CreateWorkspaceFormData>({
  resolver: zodResolver(createWorkspaceSchema),
  defaultValues: { name: '', slug: '', logoUrl: '', color: '' },
});
```

**Zustand store:** `mundial-erp-web/src/stores/workspace.store.ts`
- `currentWorkspaceId: string | null`
- `currentWorkspace: Workspace | null`
- `availableWorkspaces: Workspace[]`
- `setCurrentWorkspace(workspace: Workspace)`
- Persistir no `localStorage` como `current_workspace_id` (fallback caso resposta do /auth/me atrase)

**Fluxo de Login (frontend):**

1. User preenche credenciais e faz POST `/auth/login`
2. Backend retorna `{ accessToken, refreshToken, user, workspace, availableWorkspaces }` — workspace **ja resolvido** (lastAccessed OU unico OU primeiro)
3. Frontend armazena tokens e popula `workspace.store` com `currentWorkspace` e `availableWorkspaces`
4. Redirect direto para `/inicio` (ou rota padrao do workspace) — **sem passagem por tela de selecao**

**Edge case — user sem nenhum workspace:**
- Se `workspace === null` na response do login, redirect para `/workspaces/new` (onboarding: criar primeiro workspace)

**Middleware update:** `mundial-erp-web/src/middleware.ts`
- Continua simples: checar apenas `auth_token` (workspace ja vem resolvido do login)
- Nao precisa de pagina `/workspace-selector` — a troca de workspace e feita via dropdown na sidebar, sem sair do layout

**Sidebar update:** `mundial-erp-web/src/components/layout/sidebar.tsx`
- No topo da sidebar, antes do tree de departments, adicionar workspace selector dropdown (mostra `currentWorkspace` + lista `availableWorkspaces` + botao "Criar workspace")
- Ao trocar workspace: chamar `POST /workspaces/:id/select`, atualizar tokens, atualizar store, invalidar todo cache React Query, navegar para `/inicio` do workspace novo

**AuthProvider update:** `mundial-erp-web/src/providers/auth-provider.tsx`
- No login, popular `workspace.store` com `workspace` e `availableWorkspaces` da response
- No `authService.me()` (hidratacao apos F5), garantir que o backend retorna tambem `workspace` e `availableWorkspaces`

**React Query:** Incluir `workspaceId` em todas as query keys para invalidacao correta ao trocar workspace.

### 1.9 Componente `WorkspaceSwitcher` (Trigger no topo da Sidebar)

**Arquivo:** `mundial-erp-web/src/features/workspaces/components/workspace-switcher.tsx`

Gatilho de DropdownMenu que fica no `SidebarHeader`. Responsivo ao modo colapsado da sidebar (mostra apenas o avatar quando `collapsible="icon"` esta ativo). Construido sobre Radix UI primitives (DropdownMenu + Avatar), respeitando o padrao do projeto (Align UI / Tailwind).

**Anatomia (3 filhos visuais, ordem importa):**
1. Avatar (primeiro filho) — quadrado 24px com iniciais do workspace sobre fundo derivado do nome (hash → cor)
2. Label (segundo filho) — nome do workspace, truncado, `text-sm font-bold`
3. Chevron (svg) — `ChevronDown` do lucide-react, 16px, `text-muted-foreground/70`

**Comportamento de colapso:**
Quando `<Sidebar collapsible="icon">` esta em modo icon-only (gera `data-collapsible="icon"` + classe `group` no ancestral), as classes `group-data-[collapsible=icon]:*` transformam o trigger:
- Vira quadrado `size-8` sem padding
- `[&>span:nth-child(2)]:hidden` → esconde o label
- `[&>svg]:hidden` → esconde o chevron
- `[&>*:first-child]:size-8` → avatar cresce para preencher o botao

**Tipos:**
```typescript
// types/workspace.types.ts
export type WorkspaceUI = {
  id: string;
  name: string;
  slug: string;
  initials: string;   // derivado do name (ex: "Mundial Telhas" → "MT")
  bgColor: string;    // hash(name) → cor hex (ex: "#D97706")
  fgColor?: string;   // default "#FFFFFF"
};
```

**Helper:** `mundial-erp-web/src/features/workspaces/utils/workspace-color.ts`
```typescript
// Deriva iniciais e cor deterministicamente do nome
export function getWorkspaceInitials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('');
}

export function getWorkspaceColor(name: string): string {
  const palette = ['#D97706','#2563EB','#059669','#DC2626','#7C3AED','#DB2777','#0891B2','#CA8A04'];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) | 0;
  return palette[Math.abs(hash) % palette.length];
}
```

**Componente (referencia — usa imports do projeto: `@/components/ui/*` Align UI/shadcn):**
```tsx
'use client';

import { ChevronDown, Plus, Check } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useCurrentWorkspace } from '../hooks/use-current-workspace';
import { useSelectWorkspace } from '../hooks/use-select-workspace';
import { useWorkspaces } from '../hooks/use-workspaces';

export function WorkspaceSwitcher() {
  const current = useCurrentWorkspace();
  const { data: workspaces = [] } = useWorkspaces();
  const selectMutation = useSelectWorkspace();

  if (!current) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        type="button"
        className="
          bg-sidebar-accent text-sidebar-foreground hover:bg-sidebar-accent/90
          focus-visible:ring-sidebar-ring focus-visible:ring-2
          flex w-fit cursor-pointer items-center justify-center gap-2
          rounded-md px-1 py-1 transition-colors
          group-data-[collapsible=icon]:size-8
          group-data-[collapsible=icon]:w-8
          group-data-[collapsible=icon]:shrink-0
          group-data-[collapsible=icon]:p-0
          group-data-[collapsible=icon]:[&>span:nth-child(2)]:hidden
          group-data-[collapsible=icon]:[&>svg]:hidden
          group-data-[collapsible=icon]:[&>*:first-child]:size-8
        "
      >
        <Avatar className="relative flex size-6 shrink-0 overflow-hidden rounded-md">
          <AvatarFallback
            className="bg-muted flex size-full items-center justify-center rounded-md text-xs font-semibold"
            style={{ backgroundColor: current.bgColor, color: current.fgColor ?? '#FFFFFF' }}
          >
            {current.initials}
          </AvatarFallback>
        </Avatar>

        <span className="truncate text-sm font-bold">{current.name}</span>

        <ChevronDown
          className="text-muted-foreground/70 size-4 shrink-0 opacity-70"
          aria-hidden="true"
        />
      </DropdownMenuTrigger>

      <DropdownMenuContent align="start" className="w-64">
        <DropdownMenuLabel>Workspaces</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {workspaces.map((w) => (
          <DropdownMenuItem
            key={w.id}
            onClick={() => selectMutation.mutate(w.id)}
            className="flex items-center gap-2"
          >
            <Avatar className="size-5 rounded-md">
              <AvatarFallback
                className="rounded-md text-[10px] font-semibold"
                style={{ backgroundColor: w.bgColor, color: w.fgColor ?? '#FFFFFF' }}
              >
                {w.initials}
              </AvatarFallback>
            </Avatar>
            <span className="flex-1 truncate">{w.name}</span>
            {w.id === current.id && <Check className="size-4 text-muted-foreground" />}
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => { /* abrir CreateWorkspaceDialog */ }}>
          <Plus className="mr-2 size-4" />
          Criar workspace
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
```

**Integracao na sidebar:**

Arquivo: `mundial-erp-web/src/components/layout/sidebar.tsx`

- Envolver o sidebar atual com `<Sidebar collapsible="icon">` (se ainda nao usa esse prop — atualmente a sidebar tem largura resizable via Zustand)
- Inserir `<WorkspaceSwitcher />` como primeiro filho do `SidebarHeader`, antes do tree de departments
- Garantir que o ancestral tenha a classe `group` e `data-collapsible="icon"` para ativar as variantes responsivas (o `<Sidebar collapsible="icon">` do shadcn ja faz isso; se a sidebar do projeto e custom, adicionar manualmente)

**Pre-requisitos de estilo:**

As classes dependem de CSS variables do tema sidebar do shadcn (`--sidebar-accent`, `--sidebar-foreground`, `--sidebar-ring`, `--muted`, `--muted-foreground`). Verificar se ja estao definidas em `globals.css`. Se nao, adicionar:
```css
:root {
  --sidebar-accent: 240 4.8% 95.9%;
  --sidebar-foreground: 240 5.3% 26.1%;
  --sidebar-ring: 240 5% 64.9%;
}
.dark {
  --sidebar-accent: 240 3.7% 15.9%;
  --sidebar-foreground: 240 4.8% 95.9%;
  --sidebar-ring: 240 4.9% 83.9%;
}
```

**Componentes UI necessarios (instalar via `npx shadcn@latest add` se ainda nao presentes):**
- `dropdown-menu` (Radix DropdownMenu wrapped)
- `avatar` (Radix Avatar wrapped)
- `sidebar` (se for adotar a primitive do shadcn) — OU manter sidebar custom com `data-collapsible` + classe `group` manuais

**Hook `useSelectWorkspace`:** `mundial-erp-web/src/features/workspaces/hooks/use-select-workspace.ts`
```typescript
export function useSelectWorkspace() {
  const qc = useQueryClient();
  const router = useRouter();
  const setWorkspace = useWorkspaceStore((s) => s.setCurrentWorkspace);

  return useMutation({
    mutationFn: (workspaceId: string) => workspaceService.select(workspaceId),
    onSuccess: ({ accessToken, refreshToken, workspace }) => {
      localStorage.setItem('access_token', accessToken);
      localStorage.setItem('refresh_token', refreshToken);
      setWorkspace(workspace);
      qc.clear(); // invalidar TODO cache — dados do workspace anterior nao servem
      router.push('/inicio');
    },
  });
}
```

---

## Fase 2 — Workspace Scoping em Todas as Queries

### 2.1 Estrategia

Cada repository que consulta dados workspace-scoped deve incluir `workspaceId` no `where`. Dois padroes:

**Direto** (modelos com `workspaceId` proprio):
```typescript
async findAll(workspaceId: string, params: PaginationDto) {
  return this.prisma.client.findMany({
    where: { workspaceId, deletedAt: null },
    ...
  });
}
```

**Transitivo** (modelos sem `workspaceId`, escopo via parent):
```typescript
// WorkItem via Process → Department
async findAll(workspaceId: string, processId: string, ...) {
  return this.prisma.workItem.findMany({
    where: {
      processId,
      process: { department: { workspaceId } },
      deletedAt: null,
    },
    ...
  });
}
```

### 2.2 Ordem de Migracao dos Repositories

**Prioridade 1 — Hierarquia BPM (7 repos):**
- `departments.repository.ts` — filtrar por `workspaceId` direto
- `sectors.repository.ts` — via department
- `areas.repository.ts` — via department
- `processes.repository.ts` — via department
- `work-items.repository.ts` — via process→department
- `workflow-statuses.repository.ts` — via department
- `process-views.repository.ts` — via process→department

**Prioridade 2 — Entidades de negocio (10 repos):**
- `clients.repository.ts`
- `orders.repository.ts`
- `products.repository.ts`
- `suppliers.repository.ts`
- `companies.repository.ts`
- `dashboards.repository.ts`
- `price-tables.repository.ts`
- `financial-categories.repository.ts`
- `invoices.repository.ts` (via order/company)
- `cash-registers.repository.ts` (via company)

**Prioridade 3 — Referencia (12 repos):**
- carriers, payment-methods, client-classifications, delivery-routes
- order-types, order-flows, order-models
- product-types, brands, product-departments, unit-measures
- status-templates

**Prioridade 4 — Derivados (8 repos):**
- production-orders, separation-orders, stock-requisitions (via order)
- accounts-receivable, accounts-payable (via order/client)
- notifications (via user + workspace)
- chat (via workspace direto)
- audit-log (via workspace direto)

### 2.3 Sidebar Tree — Scoping

**Arquivo:** `mundial-erp-api/src/modules/bpm/definitions/departments/departments.repository.ts`

O endpoint que alimenta a sidebar (`GET /departments` com areas e processes) deve filtrar por `workspaceId`. Isso automaticamente escopa toda a arvore.

### 2.4 Row-Level Security (2a linha de defesa)

Conforme orientacao do agent-CTO (Escalabilidade → Multi-tenancy): filtrar por `workspaceId` no codigo e a **1a linha**. A **2a linha** e RLS no PostgreSQL — garante que mesmo um bug no repository nao vaza dados cross-tenant.

**Migration dedicada (apos Fase 2 estabilizar):**

```sql
-- Habilitar RLS nas tabelas workspace-scoped
ALTER TABLE departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
-- ... demais tabelas com workspace_id direto

-- Policy: so vê rows do workspace atual (via GUC)
CREATE POLICY workspace_isolation ON departments
  USING (workspace_id = current_setting('app.current_workspace_id', true));

-- Repetir para cada tabela workspace-scoped
```

**Injecao do GUC no PrismaService:**

Extender `PrismaService.onModuleInit` (ou usar middleware Prisma) para executar `SET LOCAL app.current_workspace_id = '<id>'` no inicio de cada transacao do request. Implementacao via interceptor que envolve o handler em `prisma.$transaction(async (tx) => { await tx.$executeRaw`SET LOCAL ...`; ... })`.

**Trade-off:** RLS adiciona overhead (~5-10% em queries) mas elimina classe inteira de bugs de tenant-leak. Recomendado apenas apos Fase 2 estar em producao e estavel. Pode ficar desabilitado em dev para facilitar debug via Prisma Studio.

---

## Fase 3 — Custom Roles e Permissoes

### 3.1 Novos Models

```prisma
model WorkspaceRole {
  id          String   @id @default(cuid())
  workspaceId String?  @map("workspace_id") // null = role padrao do sistema
  name        String
  description String?
  isSystem    Boolean  @default(false) @map("is_system")
  permissions Json     @default("[]") // array de strings: ["task:create", "order:view"]
  createdAt   DateTime @default(now()) @map("created_at")
  updatedAt   DateTime @updatedAt @map("updated_at")

  workspace Workspace? @relation(fields: [workspaceId], references: [id])
  members   WorkspaceMember[]

  @@map("workspace_roles")
}
```

### 3.2 Evolucao do WorkspaceMember

Trocar `role: WorkspaceMemberRole` (enum) por `roleId: String` (FK para WorkspaceRole). Manter o enum como fallback durante transicao.

### 3.3 Permissoes em Cascata

```
Workspace (WorkspaceRole.permissions)
  → Department (isPrivate → SpaceMember)
    → Area (isPrivate → FolderMember)
      → Process (isPrivate → ListMember)
```

Guests so veem entidades onde foram explicitamente adicionados.

### 3.4 Novo Guard: PermissionGuard

Substituir `RolesGuard` por `PermissionGuard` que:
1. Le `@RequirePermission('task:create')` do metadata
2. Resolve permissoes efetivas do user no workspace + entidade
3. Permite ou nega

---

## Fase 4 — Views Avancadas e Custom Fields

### 4.1 View como Entidade de Primeira Classe

Evoluir `ProcessView` para `View` com escopo em qualquer nivel:

```prisma
model View {
  id          String    @id @default(cuid())
  workspaceId String    @map("workspace_id")
  name        String
  viewType    ViewType  @map("view_type")
  scopeType   String    // 'workspace' | 'department' | 'area' | 'process'
  scopeId     String    @map("scope_id")
  creatorId   String    @map("creator_id")
  isPersonal  Boolean   @default(false) @map("is_personal")
  isPinned    Boolean   @default(false) @map("is_pinned")
  grouping    Json?
  sorting     Json?
  filters     Json?
  columns     Json?
  settings    Json?
  sortOrder   Int       @default(0) @map("sort_order")
  createdAt   DateTime  @default(now()) @map("created_at")
  updatedAt   DateTime  @updatedAt @map("updated_at")
  deletedAt   DateTime? @map("deleted_at")

  workspace Workspace @relation(fields: [workspaceId], references: [id])
  creator   User      @relation(fields: [creatorId], references: [id])

  @@index([scopeType, scopeId], name: "idx_views_scope")
  @@map("views")
}
```

**Migracao:** Copiar dados de `process_views` para `views` com `scopeType='process'`.

### 4.2 Custom Fields

```prisma
model CustomFieldDefinition {
  id          String    @id @default(cuid())
  workspaceId String    @map("workspace_id")
  name        String
  fieldType   String    // TEXT, NUMBER, DATE, SELECT, MULTISELECT, CHECKBOX, URL, EMAIL, PHONE
  scopeType   String    // 'workspace', 'department', 'area', 'process'
  scopeId     String    @map("scope_id")
  options     Json?     // para SELECT/MULTISELECT
  isRequired  Boolean   @default(false) @map("is_required")
  sortOrder   Int       @default(0) @map("sort_order")
  createdAt   DateTime  @default(now()) @map("created_at")
  updatedAt   DateTime  @updatedAt @map("updated_at")
  deletedAt   DateTime? @map("deleted_at")

  workspace Workspace          @relation(fields: [workspaceId], references: [id])
  values    CustomFieldValue[]

  @@index([scopeType, scopeId], name: "idx_cf_def_scope")
  @@map("custom_field_definitions")
}

model CustomFieldValue {
  id            String  @id @default(cuid())
  definitionId  String  @map("definition_id")
  entityType    String  // 'work_item', 'order', 'client'
  entityId      String  @map("entity_id")
  textValue     String?   @map("text_value")
  numberValue   Float?    @map("number_value")
  dateValue     DateTime? @map("date_value")
  jsonValue     Json?     @map("json_value")
  createdAt     DateTime  @default(now()) @map("created_at")
  updatedAt     DateTime  @updatedAt @map("updated_at")

  definition CustomFieldDefinition @relation(fields: [definitionId], references: [id])

  @@unique([definitionId, entityType, entityId])
  @@index([entityType, entityId], name: "idx_cf_val_entity")
  @@map("custom_field_values")
}
```

---

## Fase 5 — Real-time e Webhooks

### 5.1 WebSocket Workspace-Scoped

- Na conexao, autenticar e verificar `workspaceId` do token
- Auto-join room `workspace:{workspaceId}`
- Eventos de mutacao emitem para a room do workspace
- Chat channels ja usam rooms por channel — adicionar validacao de workspace

### 5.2 Webhooks

```prisma
model WebhookEndpoint {
  id          String   @id @default(cuid())
  workspaceId String   @map("workspace_id")
  url         String
  secret      String
  events      Json     // ["task.created", "order.updated"]
  isActive    Boolean  @default(true) @map("is_active")
  createdById String   @map("created_by_id")
  createdAt   DateTime @default(now()) @map("created_at")
  updatedAt   DateTime @updatedAt @map("updated_at")

  workspace Workspace @relation(fields: [workspaceId], references: [id])

  @@map("webhook_endpoints")
}
```

Usar BullMQ existente (`src/modules/queue/`) para delivery com retry exponencial.

---

## Fase 6 — Billing e Seats

Modelo simples para controlar limites:

- `GET /workspaces/:id/seats` retorna `{ membersUsed, membersTotal, guestsUsed, guestsTotal }`
- Guard de billing: checar limites ao adicionar membro/aceitar convite
- Planos (FREE/PRO/ENTERPRISE) definem limites de seats, storage, etc.

---

## Riscos e Mitigacoes

| Risco | Mitigacao |
|-------|----------|
| Quebrar funcionalidade existente | `workspaceId` nullable na Fase 1. Feature flag `MULTI_WORKSPACE_ENABLED` controla se validacao e enforced |
| N+1 em scoping transitivo | Indices compostos `(workspace_id, campo_freq)`. Para queries pesadas, joins explicitos |
| Leak de dados cross-workspace | Testes E2E que autenticam como workspace A e tentam acessar dados de workspace B |
| Performance da migracao de dados | UPDATEs em batch por tabela. Testar em clone de producao |
| Invalidacao de token ao trocar workspace | Access token curto (15min). Ao trocar workspace, client faz `POST /select` e recebe novos tokens |

---

## Arquivos Criticos a Modificar

| Arquivo | Mudanca |
|---------|---------|
| `mundial-erp-api/prisma/schema.prisma` | Novos models + workspaceId em ~25 tabelas |
| `mundial-erp-api/src/modules/auth/decorators/current-user.decorator.ts` | Estender JwtPayload com workspaceId |
| `mundial-erp-api/src/modules/auth/auth.service.ts` | Metodo selectWorkspace |
| `mundial-erp-api/src/modules/auth/strategies/jwt.strategy.ts` | Extrair workspaceId do token |
| `mundial-erp-api/src/app.module.ts` | Registrar WorkspacesModule + WorkspaceGuard |
| **Novo:** `mundial-erp-api/src/modules/workspaces/` | Modulo completo (CRUD + members + invites + guard) |
| `mundial-erp-web/src/middleware.ts` | Checar workspace selecionado |
| `mundial-erp-web/src/providers/auth-provider.tsx` | Incluir workspace no contexto |
| `mundial-erp-web/src/stores/auth.store.ts` | currentWorkspaceId |
| `mundial-erp-web/src/components/layout/sidebar.tsx` | Workspace selector no topo |
| `mundial-erp-web/src/types/auth.types.ts` | Estender User type |
| **Novo:** `mundial-erp-web/src/features/workspaces/` | Feature completa (selector, dialogs, hooks, services) |
| ~37 `*.repository.ts` | Adicionar workspaceId nos where clauses |

---

## Ordem de Execucao

```
Fase 1.1  → Schema Prisma (models + workspaceId nullable)
Fase 1.2  → Migration 1 (create tables + add columns)
Fase 1.3  → Backend module workspaces (CRUD + members + invites)
Fase 1.4  → Auth changes (JWT payload + selectWorkspace + WorkspaceGuard)
Fase 1.5  → Migration 2 (seed default workspace + populate workspaceId)
Fase 1.6  → Migration 3 (make workspaceId NOT NULL)
Fase 1.7  → Frontend (workspace selector + store + middleware)
Fase 2    → Scoping de queries (repository por repository)
Fase 3    → Custom Roles + PermissionGuard
Fase 4    → Views avancadas + Custom Fields
Fase 5    → WebSocket scoping + Webhooks
Fase 6    → Billing/Seats
```

## Verificacao

Para cada fase, validar:
1. `npx prisma migrate dev` sem erros
2. Todos os endpoints existentes continuam funcionando (regressao zero)
3. Backend compila sem erros (`npm run build`)
4. Frontend compila sem erros (`npm run build`)
5. Testes E2E de isolamento: workspace A nao ve dados de workspace B
6. Testar fluxo completo: login → selecionar workspace → navegar sidebar → CRUD em entidades
