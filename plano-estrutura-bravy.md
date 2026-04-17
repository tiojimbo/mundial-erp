# Plano de Implementacao — Estrutura Bravy no Mundial ERP

> **Versao:** 1.0 | **Data:** 2026-04-16 | **Status:** Aprovado para implementacao
>
> **Referencias:**
> - `.claude/plan/PLANO.md` — Fonte de verdade sobre specs, models, endpoints
> - `.claude/standards/99-referencia-completa.md` — Padroes Bravy de codigo e arquitetura
> - `estrutura-bravy.md` — Analise tecnica da Bravy (referencia de UX)
> - `.claude/skills/squads-map.mdc` — Mapa de squads e responsabilidades

---

## 1. Contexto e Problema

O Mundial ERP ja possui a hierarquia **Departamento -> Area -> Processo** implementada no schema Prisma, backend NestJS e sidebar do frontend. Porem, hoje:

- Departamentos, areas e processos sao geridos apenas via sidebar (inputs inline) ou via tela de configuracoes admin
- **Nao existem paginas de visualizacao** para cada nivel da hierarquia — ao clicar num departamento na sidebar, nada acontece; ao clicar numa area, nada acontece. So processos tem pagina
- A criacao de areas e processos e simplificada demais (nome apenas), diferente da Bravy que oferece modal completo com descricao, privacidade, heranca de status e templates
- Novos departamentos podem surgir a qualquer momento pela gestao, e o sistema precisa acomodar isso com a mesma riqueza dos departamentos pre-definidos no PLANO.md (secao "Departamentos, Setores e Processos")

A Bravy resolve isso com **3 niveis de visualizacao identicos em estrutura** (Espaco, Pasta, Lista), onde cada nivel agrega e exibe o conteudo dos niveis abaixo. O objetivo e replicar essa logica **adaptada ao modelo dual do Mundial ERP** (processos LIST + processos BPM).

---

## 2. Mapeamento Conceitual — Bravy vs Mundial ERP

### 2.1 Entidades

| Bravy | Mundial ERP | Model Prisma | Observacao |
|---|---|---|---|
| Space (Espaco) | Departamento | `Department` | Ja existe — `schema.prisma` linha ~296 |
| Folder (Pasta) | Area | `Area` | Ja existe — `schema.prisma` linha ~335. Faltam campos |
| List (Lista) | Processo | `Process` | Ja existe — `schema.prisma` linha ~353. Dual: `processType = LIST` ou `BPM` |
| Task (Tarefa) | **WorkItem** (se LIST) ou **ActivityInstance** (se BPM) | `WorkItem` / `ActivityInstance` | Diferenca fundamental — ver 2.2 |
| Status | WorkflowStatus | `WorkflowStatus` | Ja existe — vinculado ao departamento, 4 categorias |
| View | ProcessView | `ProcessView` | Ja existe: LIST, BOARD, CALENDAR, GANTT |

### 2.2 A diferenca fundamental: "Tarefa" no Mundial ERP

Na Bravy, toda Lista contem Tasks simples (nome, responsavel, datas, status). No Mundial ERP, o conteudo de um Processo depende do seu `processType`:

**Processo tipo LIST** — Contem **WorkItems** (`mundial-erp-api/src/modules/work-items/`). Funciona exatamente como a Bravy: itens genericos com titulo, responsavel, prioridade, datas, agrupados por WorkflowStatus. Usado para gestao de tarefas, backlogs, acompanhamentos. **E aqui que a paridade com a Bravy se aplica.**

**Processo tipo BPM** — Nao contem WorkItems. E um processo dirigido pela maquina de estados do pedido (PLANO.md secao 3.1). Seu conteudo sao **ProcessInstances -> ActivityInstances -> TaskInstances** (`mundial-erp-api/src/modules/bpm/`). Tem rota dedicada (`featureRoute`: `/comercial/pedidos`, `/producao/ordens`, etc.). **Nao se aplica o modelo Bravy de tarefas.**

### 2.3 Consequencia para a exibicao

Quando uma pagina de Departamento ou Area precisa exibir todos os seus processos em cards (padrao Bravy), cada card se comporta diferente:

- **Card de processo LIST** -> mostra WorkItems agrupados por status (StatusGroups + rows), com input "Nova tarefa" — identico a Bravy
- **Card de processo BPM** -> mostra um **resumo compacto** do pipeline (contagem de orders por status, atividades pendentes, handoffs aguardando) com link para a rota dedicada — adaptacao propria do Mundial

---

## 3. Exibicao em Cada Nivel — Detalhamento

### 3.1 Nivel Departamento (Pagina `/d/[deptSlug]`)

**O que a Bravy faz:** Ao acessar `/space/{id}`, busca TODAS as listas de TODAS as pastas daquele espaco e renderiza cada uma como um card colapsavel separado. Cada card tem header (nome do espaco em texto pequeno + nome da lista em negrito + contagem + collapse), e dentro, os StatusGroups com TaskRows.

**O que o Mundial ERP fara:**

Ao clicar num departamento na sidebar (ou acessar `/d/[deptSlug]`), exibe uma pagina com:

1. **Header:** Icone + Nome do departamento + descricao + acoes (Editar, Gerenciar Status)
2. **Breadcrumb:** Home > [Departamento] — componente Breadcrumbs do Align UI (node `447:8760`)
3. **TabBar:** Abas de visualizacao (Lista, Board — futuro: Calendar, Gantt)
4. **Toolbar:** Agrupar por Status, Filtros, Mostrar Fechadas, Busca, botao "+ Tarefa"
5. **Corpo:** Lista vertical de **ProcessCards** — um card para cada processo do departamento (incluindo processos diretos sem area e processos dentro de areas)

**Cada ProcessCard (processo LIST):**
- Header: texto pequeno "[Area pai]" (ou nome do dept se direto) + nome do processo em negrito + contagem de WorkItems + botao collapse + menu "..."
- Corpo (quando expandido): StatusGroups com WorkItemRows identicos ao que ja existe em `mundial-erp-web/src/features/work-items/components/work-item-list-view.tsx`
- No final de cada StatusGroup: input inline "Nova tarefa" que cria WorkItem via `POST /api/v1/work-items`

**Cada ProcessCard (processo BPM):**
- Header: mesmo layout do LIST, mas contagem mostra "X pedidos" ao inves de "X itens"
- Corpo (quando expandido): resumo do pipeline — badges com contagem por OrderStatus (EM_ORCAMENTO: 12, FATURAR: 8, etc.), contagem de atividades pendentes, contagem de handoffs aguardando
- Link "Ver detalhes" que navega para a `featureRoute` do processo

**Query de dados:** A pagina faz UMA chamada para buscar o departamento com todos seus processos e um resumo de cada (contagem por status). O frontend nao faz N requests — o backend entrega tudo consolidado via endpoint batch.

### 3.2 Nivel Area (Pagina `/d/[deptSlug]/a/[areaSlug]`)

**O que a Bravy faz:** Identico ao nivel Departamento, mas filtrado para as listas daquela pasta.

**O que o Mundial ERP fara:**

Layout 100% identico ao nivel Departamento, com estas diferencas:
- **Breadcrumb:** Home > [Departamento] > [Area]
- **Processos exibidos:** Apenas os processos daquela area (nao todos do departamento)
- **Header:** Nome da area + descricao da area + acoes

O componente de pagina reutiliza os mesmos ProcessCards — a diferenca e apenas no escopo da query.

### 3.3 Nivel Processo LIST (Pagina `/d/[deptSlug]/p/[processSlug]`)

**O que a Bravy faz:** Sem card wrapper. StatusGroups e TaskRows aparecem diretamente no tabpanel.

**O que o Mundial ERP ja faz:** Esta pagina **ja existe** em `mundial-erp-web/src/app/(dashboard)/d/[deptSlug]/p/[processSlug]/page.tsx`. Renderiza `WorkItemListView` ou `WorkItemBoardView` conforme a aba ativa. **Ja funciona e mantem como esta.**

A unica adicao e o **Breadcrumb** no topo:
- Se o processo esta numa area: Home > [Departamento] > [Area] > [Processo]
- Se o processo e direto no dept: Home > [Departamento] > [Processo]

### 3.4 Nivel Processo BPM (Rotas dedicadas)

Processos BPM tem `featureRoute` que aponta para rotas especificas como `/comercial/pedidos`, `/producao/ordens`, etc. Estas rotas ja existem ou estao planejadas nas fases F7B-F7C do PLANO.md. **Nao mudam com esta implementacao.**

O card de resumo BPM nos niveis Departamento/Area apenas linka para essas rotas.

### 3.5 Resumo visual das diferencas entre niveis

| Aspecto | Departamento | Area | Processo LIST | Processo BPM |
|---|---|---|---|---|
| Card wrapper por processo | Sim | Sim | Nao | N/A (rota propria) |
| StatusGroups + WorkItemRows | Dentro do card | Dentro do card | Direto no tabpanel | N/A |
| Resumo BPM | Card compacto | Card compacto | N/A | Pagina dedicada |
| Toolbar (filtros, busca) | Sim | Sim | Sim (existente) | Propria |
| TabBar (Lista/Board) | Sim | Sim | Sim (existente) | Propria |
| Input "Nova tarefa" | Por StatusGroup | Por StatusGroup | Sim (existente) | N/A |
| Breadcrumb | Home > Dept | Home > Dept > Area | Home > Dept > [Area] > Proc | Proprio |

---

## 4. Alteracoes no Schema (Prisma)

> Referencia: PLANO.md secao 1.10 — Regras de Schema: todos os campos com `@map("snake_case")`, indices nomeados, soft delete.
>
> Arquivo alvo: `mundial-erp-api/prisma/schema.prisma`

### 4.1 Campos novos em Area (linha ~335 do schema)

| Campo | Tipo | Default | Map | Proposito |
|---|---|---|---|---|
| `description` | `String?` | null | — | Descricao da area (modal de criacao) |
| `isPrivate` | `Boolean` | false | `@map("is_private")` | Restringe acesso a membros convidados |
| `icon` | `String?` | null | — | Icone visual (emoji ou remixicon) |
| `color` | `String?` | null | — | Cor do badge na sidebar |
| `useSpaceStatuses` | `Boolean` | true | `@map("use_space_statuses")` | Se true, herda statuses do departamento. Se false, usa statuses proprios |

### 4.2 Campos novos em Process (linha ~353 do schema)

| Campo | Tipo | Default | Map | Proposito |
|---|---|---|---|---|
| `description` | `String?` | null | — | Descricao do processo |
| `isPrivate` | `Boolean` | false | `@map("is_private")` | Restringe acesso a membros convidados |

### 4.3 Campo novo em WorkflowStatus (linha ~531 do schema)

| Campo | Tipo | Default | Map | Proposito |
|---|---|---|---|---|
| `areaId` | `String?` | null | `@map("area_id")` | Vincula status a uma area especifica (quando `Area.useSpaceStatuses = false`) |

Relacao: `area Area? @relation(fields: [areaId], references: [id])`
Indice: `@@index([areaId, sortOrder], name: "idx_wf_statuses_area_sort")`

### 4.4 Tipo de migration

Migration aditiva (apenas `ADD COLUMN`). Zero downtime, zero breaking change — todos os campos sao nullable ou com default.

---

## 5. Alteracoes e Novos Endpoints da API

> Referencia: 99-referencia-completa.md — Controller delega, Service pensa, Repository persiste. DTOs com `fromEntity()`. Envelope `{data, meta}`. Soft delete. Paginacao skip/take max 100. Validacao via class-validator nos DTOs. Named exports obrigatorio.
>
> Prefixo de todos os endpoints: `/api/v1/`

### 5.1 Alteracao: `POST /areas` — CreateAreaDto

**Arquivo:** `mundial-erp-api/src/modules/bpm/definitions/areas/dto/create-area.dto.ts`

Campos adicionais no DTO de criacao (alem dos existentes `name`, `departmentId`, `sortOrder`):

| Campo | Tipo | Validacao | Obrigatorio |
|---|---|---|---|
| `description` | string | `@IsOptional()` `@IsString()` | Nao |
| `isPrivate` | boolean | `@IsOptional()` `@IsBoolean()` | Nao (default false) |
| `icon` | string | `@IsOptional()` `@IsString()` | Nao |
| `color` | string | `@IsOptional()` `@Matches(hex regex)` | Nao |
| `useSpaceStatuses` | boolean | `@IsOptional()` `@IsBoolean()` | Nao (default true) |

**Logica no Service ao criar com `useSpaceStatuses = false`:** Copia os WorkflowStatuses do departamento pai como ponto de partida para a area (cria novos registros com `areaId` preenchido).

**AreaResponseDto:** Adiciona `description`, `isPrivate`, `icon`, `color`, `useSpaceStatuses` ao `fromEntity()`.

### 5.2 Alteracao: `POST /processes` — CreateProcessDto

**Arquivo:** `mundial-erp-api/src/modules/bpm/definitions/processes/dto/create-process.dto.ts`

Campos adicionais/alterados:

| Campo | Tipo | Validacao | Obrigatorio |
|---|---|---|---|
| `areaId` | string | `@IsOptional()` `@IsString()` | Nao |
| `departmentId` | string | `@IsOptional()` `@IsString()` | Nao |
| `description` | string | `@IsOptional()` `@IsString()` | Nao |
| `isPrivate` | boolean | `@IsOptional()` `@IsBoolean()` | Nao (default false) |
| `processType` | ProcessType | `@IsOptional()` `@IsEnum(ProcessType)` | Nao (default LIST) |

**Validacao no Service:**
- Deve ter `areaId` OU `departmentId` (pelo menos um). Sem ambos: `BadRequestException`
- Se `areaId` fornecido, service busca area e preenche `departmentId` automaticamente
- Campo `sectorId` torna-se opcional (processos novos criados pela gestao nao precisam de setor)

**Efeito automatico na criacao:**
- Cria automaticamente `ProcessView` padrao (name: "Lista", viewType: LIST, isPinned: true) — mesmo comportamento da Bravy onde toda lista nasce com uma view default

### 5.3 Novo: `GET /departments/by-slug/:slug`

**Arquivo:** `mundial-erp-api/src/modules/bpm/definitions/departments/departments.controller.ts`
**Proposito:** Pagina do departamento precisa buscar dados completos por slug (a rota usa slug, nao id)
**Roles:** ADMIN, MANAGER, OPERATOR, VIEWER

**Response `{data, meta}`:**
- Todos os campos do DepartmentResponseDto existente
- `areas` — array de areas com: id, name, slug, description, isPrivate, processCount
- `directProcesses` — array de processos sem area com: id, name, slug, processType, featureRoute, description, isPrivate

### 5.4 Novo: `GET /areas/by-slug/:slug`

**Arquivo:** `mundial-erp-api/src/modules/bpm/definitions/areas/areas.controller.ts`
**Proposito:** Pagina da area precisa buscar dados completos por slug
**Roles:** ADMIN, MANAGER, OPERATOR, VIEWER

**Response `{data, meta}`:**
- Todos os campos do AreaResponseDto atualizado
- `departmentName`, `departmentSlug` — para montar breadcrumb
- `processes` — array de processos da area com: id, name, slug, processType, featureRoute, description, isPrivate

### 5.5 Novo: `GET /departments/:id/process-summaries`

**Arquivo:** `mundial-erp-api/src/modules/bpm/definitions/departments/departments.controller.ts`
**Proposito:** Pagina do departamento precisa exibir cada processo como card com resumo. Para evitar N+1 (uma chamada por processo), este endpoint retorna o resumo de TODOS os processos do departamento de uma vez
**Roles:** ADMIN, MANAGER, OPERATOR, VIEWER
**Query params:** `showClosed` (boolean, default false)

**Response `{data, meta}` — `data` e array onde cada item tem:**
- `id`, `name`, `slug`, `processType`, `featureRoute`, `description`, `isPrivate`
- `areaId`, `areaName` — para o header do card ("Comercial > Vendas > Pedidos")
- Se `processType = LIST`:
  - `totalItems` — contagem total de WorkItems
  - `groups` — array por WorkflowStatus: `{statusId, statusName, statusColor, statusCategory, count, items}` onde `items` sao os WorkItems daquele status (paginados, max 50 por grupo)
- Se `processType = BPM`:
  - `totalOrders` — contagem total de orders vinculadas
  - `ordersByStatus` — objeto com contagem por OrderStatus
  - `pendingActivities` — contagem de ActivityInstances com status PENDING ou IN_PROGRESS
  - `pendingHandoffs` — contagem de HandoffInstances com status PENDING

**Performance:** Cache curto (30s) via header `Cache-Control`. Items dentro dos groups limitados (top 50 por status).

### 5.6 Novo: `GET /areas/:id/process-summaries`

Identico ao 5.5, mas filtrado apenas para processos daquela area. Mesma estrutura de response.

### 5.7 Alteracao: `GET /departments/sidebar` (getSidebarTree)

**Arquivo:** `mundial-erp-api/src/modules/bpm/definitions/departments/departments.repository.ts`

O SidebarDepartmentDto ganha:
- Campo `description` em cada nivel (departamento, area, processo) — para tooltips
- Campo `isPrivate` em area e processo — para icone de cadeado na sidebar
- Novo array `directProcesses` no departamento — processos onde `areaId IS NULL AND departmentId = X`

### 5.8 Alteracao: `GET /workflow-statuses`

**Arquivo:** `mundial-erp-api/src/modules/bpm/definitions/workflow-statuses/workflow-statuses.controller.ts`

Novo query param opcional: `areaId`. Logica no service:
- Se `areaId` fornecido, busca a area
- Se `area.useSpaceStatuses = true`: retorna statuses do departamento pai (comportamento atual)
- Se `area.useSpaceStatuses = false`: retorna statuses onde `areaId = X`

---

## 6. Frontend — Componentes Novos

> Referencia: 99-referencia-completa.md — arquivo `kebab-case.tsx`, export `PascalCase` named, hooks com prefixo `use-`, services HTTP via Axios + React Query, Zod para validacao de forms. Todos os elementos visuais do Align UI conforme PLANO.md secao "Regra: Todo UI vem do Design System".

### 6.1 ProcessCard

**Arquivo:** `mundial-erp-web/src/features/work-items/components/process-card.tsx`
**Export:** `export function ProcessCard`

Wrapper card (rounded-xl border bg-bg-white-0, padrao Bravy `estrutura-bravy.md` linha ~531). Header com:
- Botao collapse (`RiArrowDownSLine` do `@remixicon/react`)
- Texto do contexto pai em `text-subheading-2xs text-text-sub-600`
- Nome do processo em `text-label-md text-text-strong-950`
- Contagem tabular
- Menu dropdown "..." (Dropdown do Align UI, node `166999:140904`)

Corpo condicional:
- Se `processType = LIST` -> renderiza `ProcessCardListBody`
- Se `processType = BPM` -> renderiza `ProcessCardBpmBody`

### 6.2 ProcessCardListBody

**Arquivo:** `mundial-erp-web/src/features/work-items/components/process-card-list-body.tsx`
**Export:** `export function ProcessCardListBody`

Reutiliza a logica de StatusGroups e WorkItemRows que ja existem em `work-item-list-view.tsx`. Cada StatusGroup:
- Header sticky com badge colorido do status (padrao Bravy: `backgroundColor: rgba(cor, 0.125)`, `color: rgb(cor)`)
- Contagem de items
- Collapse independente
- Headers de colunas: Nome, Responsavel, Inicio, Prazo, Prioridade
- WorkItemRows com hover actions (drag handle, checkbox, botoes inline)
- Input "Nova tarefa" ao final de cada grupo -> cria WorkItem via `POST /api/v1/work-items`

### 6.3 ProcessCardBpmBody

**Arquivo:** `mundial-erp-web/src/features/work-items/components/process-card-bpm-body.tsx`
**Export:** `export function ProcessCardBpmBody`

Exibicao compacta do pipeline BPM:
- Badges em sequencia com contagem por OrderStatus — Tag do Align UI (node `417:12348`)
- Linha de metricas: "Atividades pendentes: X" + "Handoffs aguardando: Y"
- Botao "Ver detalhes" que navega para `featureRoute` — Button do Align UI (node `129:605`)

### 6.4 ProcessToolbar

**Arquivo:** `mundial-erp-web/src/features/work-items/components/process-toolbar.tsx`
**Export:** `export function ProcessToolbar`

Barra de filtros usada nas paginas de Departamento e Area (identica a Bravy):
- Botao "Agrupar: Status" — Filter do Align UI (node `3880:66172`)
- Botao "Filtros"
- Botao "Fechadas" (toggle showClosed)
- Campo de busca com debounce 300ms (padrao CTO) — Text Input do Align UI (node `266:5230`)
- Botao "+ Tarefa" — Button primary do Align UI (node `129:605`)

### 6.5 Breadcrumb

**Arquivo:** `mundial-erp-web/src/components/layout/breadcrumb.tsx`
**Export:** `export function Breadcrumb`

Usa Breadcrumbs do Align UI (node `447:8760`). Recebe array de `{label, href?}`. Monta dinamicamente baseado na rota:
- `/d/comercial` -> Home > Comercial
- `/d/comercial/a/vendas` -> Home > Comercial > Vendas
- `/d/comercial/p/pedidos` -> Home > Comercial > Pedidos
- `/d/comercial/a/vendas/p/cotacoes` -> Home > Comercial > Vendas > Cotacoes

### 6.6 CreateAreaDialog

**Arquivo:** `mundial-erp-web/src/features/work-items/components/create-area-dialog.tsx`
**Export:** `export function CreateAreaDialog`

Modal completo no padrao Bravy "Criar Pasta" (`estrutura-bravy.md` linhas 17-31):
- Campo nome (obrigatorio)
- Campo descricao (opcional)
- Configuracao de status: radio "Herdar do departamento" (default) ou "Personalizar"
- Toggle privacidade com label explicativo
- Color picker (paleta existente DEPT_COLORS)
- Footer: Cancelar + Criar

Props: `departmentId`, `departmentName`, `open`, `onOpenChange`
Usa: Modal do Align UI (node `4096:21398`), Switch (node `379:6649`), Text Input (node `266:5230`)

### 6.7 CreateProcessDialog

**Arquivo:** `mundial-erp-web/src/features/work-items/components/create-process-dialog.tsx`
**Export:** `export function CreateProcessDialog`

Modal completo no padrao Bravy "Criar Lista" (`estrutura-bravy.md` linhas 36-49):
- Campo nome (obrigatorio)
- Campo descricao (opcional)
- Seletor de tipo: "Lista" (LIST, default) ou "BPM" (com tooltip explicando a diferenca)
- Indicacao visual "Sera criada em: [Dept > Area]" (texto informativo)
- Toggle privacidade
- Footer: Cancelar + Criar

Props: `areaId?`, `departmentId?`, `parentName`, `open`, `onOpenChange`
Usa: Modal (node `4096:21398`), Radio (node `515:3884`), Switch (node `379:6649`)

### 6.8 Sidebar — Dropdown "+" contextual

**Arquivo:** `mundial-erp-web/src/components/layout/sidebar.tsx` (alteracao)

Alteracao no `DeptItem`: o botao "+" deixa de chamar `onStartAddArea` direto e abre um Dropdown com duas opcoes:
- "Area (Pasta)" -> abre CreateAreaDialog
- "Processo (Lista)" -> abre CreateProcessDialog com `departmentId` (processo direto)

Alteracao no `AreaItem`: o botao "+" continua abrindo CreateProcessDialog, mas agora com `areaId` (sem dropdown, pois area so contem processos — regra Bravy `estrutura-bravy.md` linha 64).

### 6.9 Sidebar — Processos diretos do departamento

**Arquivo:** `mundial-erp-web/src/components/layout/sidebar.tsx` (alteracao)

O `DeptItem`, no trecho expandido, renderiza `dept.directProcesses` antes das areas. Cada processo direto aparece como item de nivel 1 dentro do dept (mesma indentacao de uma area, mas sem chevron de expand — e link direto para `/d/{deptSlug}/p/{processSlug}`). Processos com `isPrivate = true` exibem icone `RiLockLine`.

### 6.10 Hooks e Services novos

| Hook | Service method | Endpoint | Arquivo hook |
|---|---|---|---|
| `useDepartmentBySlug(slug)` | `departmentService.getBySlug(slug)` | `GET /departments/by-slug/:slug` | `features/navigation/hooks/use-department-detail.ts` |
| `useAreaBySlug(slug)` | `areaService.getBySlug(slug)` | `GET /areas/by-slug/:slug` | `features/navigation/hooks/use-area-detail.ts` |
| `useDepartmentProcessSummaries(deptId)` | `departmentService.getProcessSummaries(id)` | `GET /departments/:id/process-summaries` | `features/navigation/hooks/use-department-summaries.ts` |
| `useAreaProcessSummaries(areaId)` | `areaService.getProcessSummaries(id)` | `GET /areas/:id/process-summaries` | `features/navigation/hooks/use-area-summaries.ts` |

Seguem padrao existente: React Query com queryKey, `placeholderData: (prev) => prev`, invalidacao na mutation.

### 6.11 Types atualizados

**Arquivo:** `mundial-erp-web/src/features/navigation/types/navigation.types.ts`

`SidebarDepartment` ganha:
- `description: string | null`
- `directProcesses: SidebarProcess[]`

`SidebarArea` ganha:
- `description: string | null`
- `isPrivate: boolean`

`SidebarProcess` ganha:
- `description: string | null`
- `isPrivate: boolean`

### 6.12 Paginas (App Router)

| Rota | Arquivo | Diretiva | Dados |
|---|---|---|---|
| `/d/[deptSlug]` | `mundial-erp-web/src/app/(dashboard)/d/[deptSlug]/page.tsx` | `'use client'` | `useDepartmentBySlug` + `useDepartmentProcessSummaries` |
| `/d/[deptSlug]/a/[areaSlug]` | `mundial-erp-web/src/app/(dashboard)/d/[deptSlug]/a/[areaSlug]/page.tsx` | `'use client'` | `useAreaBySlug` + `useAreaProcessSummaries` |

Ambas usam os mesmos componentes: Breadcrumb, TabBar, ProcessToolbar, lista de ProcessCards.

---

## 7. Heranca de Status — Regra completa

O WorkflowStatus no Mundial ERP e vinculado a departamento (PLANO.md secao 1.4b). A Bravy permite que Folders (Areas) herdem statuses do Space (Departamento) ou tenham os proprios (`estrutura-bravy.md` linha 26).

**Regra no Mundial ERP:**

1. **`Area.useSpaceStatuses = true` (default):** A area usa os mesmos WorkflowStatuses do seu departamento. WorkItems de processos desta area usam `WorkflowStatus WHERE departmentId = X AND areaId IS NULL`.

2. **`Area.useSpaceStatuses = false`:** A area tem statuses proprios. Ao mudar o toggle de true para false, o backend copia os statuses do departamento como ponto de partida (novos registros com `areaId` preenchido). WorkItems de processos desta area usam `WorkflowStatus WHERE areaId = Y`.

3. **Processos diretos no departamento** (sem area) sempre usam statuses do departamento.

4. O modal de gerenciamento de status (`StatusConfig` em `mundial-erp-web/src/features/settings/components/status-config.tsx`, ja existente) recebe um novo prop `areaId?` para gerenciar statuses de area quando `useSpaceStatuses = false`.

---

## 8. Atribuicao de Squads

> Referencia: `.claude/skills/squads-map.mdc` — Mapa de squads por fase e dominio

### 8.1 Squad BPM (F3) — Backend

**Tech Lead:** Bruno Carvalho (Senior)
**Skill file:** `squad-bpm.mdc`

| Responsavel | Entregavel |
|---|---|
| Marina Silva (Pleno) | Migration schema (campos novos em Area, Process, WorkflowStatus) |
| Marina Silva (Pleno) | Atualizacao dos DTOs de Area e Process (Create, Update, Response, Sidebar) |
| Marina Silva (Pleno) | Atualizacao do `getSidebarTree()` (directProcesses, novos campos) |
| Marina Silva (Pleno) | Endpoints `GET /departments/by-slug/:slug` e `GET /areas/by-slug/:slug` |
| Felipe Andrade (Pleno) | Logica de heranca de status (useSpaceStatuses, copia de statuses para area) |
| Felipe Andrade (Pleno) | Alteracao no `GET /workflow-statuses` para suportar `areaId` |
| Carolina Dias (Pleno) | Endpoint `GET /departments/:id/process-summaries` (query consolidada LIST + BPM) |
| Carolina Dias (Pleno) | Endpoint `GET /areas/:id/process-summaries` |
| Gustavo Peixoto (Senior) | Testes de integracao de todos os endpoints novos e alterados |
| Bruno Carvalho (Senior) | Code review, validacao de performance das queries consolidadas |

### 8.2 Squad FE Sidebar (F6) — Frontend (Sidebar + Modais + Componentes)

**Tech Lead:** Rafael Monteiro (Senior)
**Skill file:** `squad-fe-sidebar.mdc`

| Responsavel | Entregavel |
|---|---|
| Rafael Monteiro (Senior) | Componente ProcessCard (wrapper com header, collapse, despacho LIST/BPM) |
| Juliana Campos (Pleno) | CreateAreaDialog (modal completo padrao Bravy) |
| Juliana Campos (Pleno) | CreateProcessDialog (modal com seletor de tipo LIST/BPM) |
| Andre Oliveira (Pleno) | Sidebar: dropdown "+" contextual no DeptItem (Area / Processo) |
| Andre Oliveira (Pleno) | Sidebar: renderizar directProcesses + icone cadeado para privados |
| Larissa Duarte (Pleno) | ProcessCardListBody (StatusGroups + WorkItemRows dentro do card) |
| Larissa Duarte (Pleno) | ProcessCardBpmBody (resumo pipeline + metricas + link) |
| Thiago Ramos (Junior) | ProcessToolbar (filtros, busca, toggle fechadas) |
| Thiago Ramos (Junior) | Input inline "Nova tarefa" dentro dos StatusGroups |

### 8.3 Squad Frontend Shell (F6) — Breadcrumb

**Skill file:** `squad-fe-shell.mdc`

| Responsavel | Entregavel |
|---|---|
| (Membro do squad) | Componente Breadcrumb reutilizavel baseado no Align UI (node `447:8760`) |

### 8.4 Squad FE Home + Clients (F7A) — Paginas de Departamento e Area

**Skill file:** `squad-fe-home-clients.mdc`

| Responsavel | Entregavel |
|---|---|
| (Membro do squad) | Hooks: `useDepartmentBySlug`, `useAreaBySlug`, `useDepartmentProcessSummaries`, `useAreaProcessSummaries` |
| (Membro do squad) | Services HTTP correspondentes |
| (Membro do squad) | Pagina `/d/[deptSlug]/page.tsx` (composicao: Breadcrumb + TabBar + Toolbar + ProcessCards) |
| (Membro do squad) | Pagina `/d/[deptSlug]/a/[areaSlug]/page.tsx` |

---

## 9. Ordem de Execucao e Dependencias

### Fase A — Backend (Squad BPM)

1. **A1:** Migration schema -> todos os endpoints novos dependem dos campos novos
2. **A2:** DTOs atualizados (Area, Process, Sidebar) -> frontend depende das interfaces
3. **A3:** `getSidebarTree()` atualizado -> sidebar depende
4. **A4:** Endpoints by-slug -> paginas dependem
5. **A5:** Endpoints process-summaries -> paginas dependem
6. **A6:** Logica de heranca de status -> modal de criacao de area depende
7. **A7:** Testes de integracao

### Fase B — Frontend Componentes (Squad FE Sidebar) — pode iniciar parcialmente em paralelo com A

1. **B1:** Componente Breadcrumb (Shell) — sem dependencia de backend
2. **B2:** Componente ProcessToolbar — sem dependencia de backend
3. **B3:** Componente ProcessCard + ProcessCardListBody + ProcessCardBpmBody — pode iniciar com dados mock, integracao depende de A5
4. **B4:** CreateAreaDialog + CreateProcessDialog — depende de A2 (DTOs)
5. **B5:** Alteracoes na sidebar (dropdown "+", directProcesses) — depende de A3

### Fase C — Paginas (Squad FE Home) — depende de A e B

1. **C1:** Hooks e Services — depende de A4, A5
2. **C2:** Pagina do Departamento — depende de B1, B2, B3, C1
3. **C3:** Pagina da Area — depende de B1, B2, B3, C1

### Grafo de dependencias

```
A1 (migration) --> A2 (DTOs) --> A3 (sidebar tree) --> B5 (sidebar FE)
                             |-> A4 (by-slug) -------> C1 (hooks) --> C2, C3 (paginas)
                             |-> A5 (summaries) -----> B3 (cards) --> C2, C3
                             |-> A6 (heranca status) > B4 (modais)

B1 (breadcrumb) --+
B2 (toolbar) -----+--> C2 (pagina dept), C3 (pagina area)
B3 (cards) -------+
```

**Paralelismo possivel:**
- B1 + B2 podem comecar imediatamente (sem dependencia de backend)
- B3 pode iniciar layouts com dados mock enquanto A5 esta em progresso
- B4 pode iniciar layouts enquanto A2 esta em progresso

---

## 10. Decisoes Arquiteturais

### 10.1 REST, nao Server Actions

A Bravy usa Server Actions do Next.js (sem API REST). O Mundial ERP mantem **API REST via NestJS** porque:
- O mobile futuro (`mundial-erp-mobile/`) consumira a mesma API
- Os padroes Bravy (99-referencia-completa.md) definem Controller/Service/Repository como camada obrigatoria
- React Query + services HTTP e o padrao estabelecido em todo o frontend
- Envelope `{data, meta}` e obrigatorio (regra inviolavel #11 da referencia)

### 10.2 Endpoint batch, nao N+1

As paginas de Departamento e Area precisam dos dados de TODOS os processos. Em vez de fazer 1 request por processo (N+1 — red flag do agent-cto.md), os endpoints `process-summaries` retornam tudo consolidado. O custo e uma query mais pesada no backend, mitigada por cache curto (30s).

### 10.3 Componente dual, nao duas paginas

ProcessCard e um unico componente que despacha para body LIST ou body BPM internamente. A pagina de Departamento e de Area usam o mesmo componente — a diferenca e apenas no escopo da query. Isso evita duplicacao (principio de simplicidade radical do agent-cto.md).

### 10.4 WorkItem = Tarefa Bravy, ActivityInstance != Tarefa Bravy

Esta e a decisao mais importante: **nao forcar o modelo BPM dentro do padrao Bravy de tarefas**. Processos BPM tem complexidade propria (maquina de estados secao 3.1, guards secao 3.2, handoffs secao 3.3, checklist de insumos) que nao cabe numa TaskRow. O card BPM mostra um resumo e linka para a experiencia dedicada.

### 10.5 Processos diretos no departamento

A Bravy permite Lists diretamente no Space sem Folder intermediario (`estrutura-bravy.md` linha 63). O Mundial ERP ja suporta isso no schema (`Process.areaId` e nullable, `Process.departmentId` e preenchido diretamente). O que falta e:
- Backend: incluir esses processos no `getSidebarTree()` como array separado
- Frontend: renderizar na sidebar antes das areas

---

## 11. O que NAO esta neste plano (escopo futuro)

| Item | Motivo | Quando |
|---|---|---|
| Drag-and-drop reorder na sidebar | Melhoria de UX, nao bloqueia funcionalidade. `sortOrder` ja existe no schema | Apos implementacao base |
| Templates de criacao ("Usar modelos") | `StatusTemplate` ja existe no schema (linha ~551), mas UI pode vir depois | Fase de refinamento |
| Mover processo entre areas/departamentos | Requer modal de selecao de destino + validacao de status | Fase de refinamento |
| Board view na pagina de Departamento/Area | Foco inicial e List view (padrao Bravy). `ProcessView` com BOARD ja existe | Apos List view funcionar |
| Permissoes por nivel (quem ve o que baseado em isPrivate) | Requer middleware de autorizacao por entidade | Fase de seguranca |
| Channel (chat) por processo | A Bravy tem aba Channel por lista. Mundial ja tem chat, mas nao vinculado a processo | Fase de integracao |
| Subtasks dentro de WorkItems | `WorkItem.parentId` ja existe no schema. UI nao priorizada | Apos WorkItems base |
