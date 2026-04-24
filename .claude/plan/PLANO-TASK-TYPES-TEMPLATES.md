# Plano — Adicionar Task Types Padrão (MVP: Pedido + Requisição)

## Contexto

Hoje `CustomTaskType` é **puramente cosmético** (ícone + nome + cor) com apenas dois builtins seedados: `builtin-task` e `builtin-milestone`. O usuário quer **adicionar novos task types padrão** seguindo exatamente esse mesmo formato de seed (nome + ícone visuais), **porém cada task type passa a ter um template funcional vinculado** que define os custom fields específicos, categorias de anexo, descrição default e regras de validação daquela feature de negócio — tudo baseado no catálogo de features por processo já descrito no `.claude/plan/PLANO.md`. **Checklist default por tipo fica fora deste MVP** — será trabalhado em RFC posterior.

**Restrições da direção (confirmadas nesta sessão):**

1. **A estrutura do model `CustomTaskType` permanece inalterada.** Nenhuma coluna nova no banco em `custom_task_types`. Novos seeds são adicionados à lista atual com os mesmos campos de sempre.
2. **Template de cada task type vai em tabela nova separada** (`TaskTypeTemplate`, 1:1 com `CustomTaskType`).
3. **Plano segue `.claude/standards/99-referencia-completa.md` à risca** (ordem canônica, Repository pattern, thin controller, envelope de response, paginação, soft delete, guards, Zod/class-validator, feature flag).
4. **MVP detalhado:** apenas **Pedido** e **Requisição**. Demais ficam em roadmap (salvar em memória pós-merge).
5. **Custom fields editáveis** (hoje read-only) entram no escopo — mas como **módulo autônomo** reutilizável fora de templates.
6. **Manutenibilidade + desacoplamento:** cada módulo deve poder ser desenvolvido/mergeado/revertido independentemente. Custom Fields será trabalhado solo em momentos distintos — logo NÃO PODE nascer acoplado ao Template.

**Fontes de verdade:**
- Standard: `.claude/standards/99-referencia-completa.md` (nomenclatura 109-151; ordem canônica 868-886; DTO 392-425; Controller guards 706-722; Repository 358-390; Service 229-240; Migration 623-687; anti-patterns 66-82, 849-865; segurança 829-846).
- Squad: `.claude/skills/squad-tasks.mdc` (Modo 3 pós-GA; princípios #3, #4, #5, #9, #13, #17, #21).
- Features: `.claude/plan/PLANO.md` (Pedido 418-1060; Requisição 506-564).

---

## Decisões-Chave

| # | Decisão | Escolha | Fundamento |
|---|---|---|---|
| D1 | Onde guardar template de cada tipo | Tabela `TaskTypeTemplate` 1:1 com `CustomTaskType` | Resposta do usuário |
| D2 | Mudança em `CustomTaskType` | **Zero** colunas/enum novas. Só lado reverso da relação Prisma declarado | Migração aditiva + instrução do usuário |
| D3 | Template editável via API? | **MVP: não.** Só leitura. Seeds imutáveis | Conservar escopo |
| D4 | **Custom Fields acoplado a Template?** | **NÃO.** Módulo autônomo. Template apenas CONSOME definições de custom field; custom field funciona sem template | Manutenibilidade (solicitação do usuário) |
| D5 | Custom Field Definition — onde mora | Tabela `CustomFieldDefinition` **própria** (não é JSON dentro do template). Template referencia via array de `definitionId`. Admin pode criar field definitions avulsas por workspace | Desacoplamento M1↔M2 |
| D6 | Custom Field Value | Tabela `CustomFieldValue` (`workItemId, definitionId`) com colunas tipadas | Performance + queries tipadas |
| D7 | Orders/StockRequisitions tables | **Intocadas.** Módulos paralelos; migração é RFC futura | Regressão zero |
| D8 | Rollout | Flag `FEATURE_TASK_TYPE_TEMPLATES_ENABLED` e flag separada `FEATURE_CUSTOM_FIELDS_WRITE_ENABLED` | Flags independentes por módulo = rollback granular |
| D9 | ADR novo? | Não. Apenas RFC `tasks-004-typed-task-templates.md` + RFC `tasks-005-custom-fields.md` (2 RFCs, uma por módulo) | Decisões não-irreversíveis + módulos independentes |

**Mudança importante vs. versão anterior:** Custom Fields agora é um módulo **standalone** (M1) com seu próprio schema persistido (`CustomFieldDefinition`), sua própria flag, seu próprio ciclo. Templates (M2) apenas referenciam definitions existentes. Isso permite que Custom Fields seja:
- Desenvolvido solo em sprint própria.
- Revertido independentemente.
- Usado em tasks SEM `customTypeId` (campos adicionais por workspace).
- Reutilizado por outros futuros consumidores (dashboards, automações, etc.).

---

## Arquitetura Modular (Boundaries e Interfaces)

Dependência estrita: `M1 → M2 → M3 → M4`. Nada cruza camadas de baixo para cima.

```
┌─────────────────────────────────────────────────────────────────┐
│  M4 — UI Integration (Task View + Create Dialog)                │
│  • Renderiza CustomFieldsSection, chips de categorias, preview  │
│  • Consome: hooks de M1 + hooks de M2                           │
└─────────────────────────────────────────────────────────────────┘
                          ▲ depende de M1 + M2
┌─────────────────────────────────────────────────────────────────┐
│  M3 — Task Type Templates (Seeds: Pedido + Requisição)          │
│  • 2 seeds idempotentes em seed-reference-data.ts               │
│  • Cada seed referencia definitionIds de M1                     │
│  • Consome: API de M1 + API de M2                               │
└─────────────────────────────────────────────────────────────────┘
                          ▲ depende de M1 + M2
┌─────────────────────────────────────────────────────────────────┐
│  M2 — TaskTypeTemplate Framework                                │
│  • Schema TaskTypeTemplate (FK para custom_task_types)          │
│  • Relação M:N TaskTypeTemplateField (templateId, definitionId) │
│  • Controller: GET /task-type-templates                         │
│  • Extensão tasks.service.create: se tem template → aplica      │
│    defaultDescriptionBlocks (attachmentCategories lidas no FE)  │
│  • Flag: FEATURE_TASK_TYPE_TEMPLATES_ENABLED                    │
└─────────────────────────────────────────────────────────────────┘
                          ▲ depende APENAS da interface de M1
┌─────────────────────────────────────────────────────────────────┐
│  M1 — Custom Fields (AUTÔNOMO)                                  │
│  • Schema CustomFieldDefinition (owned by workspace ou builtin) │
│  • Schema CustomFieldValue (por WorkItem)                       │
│  • CRUD definitions (POST/PATCH/DELETE) + GET/PATCH values      │
│  • 10 tipos: TEXT, NUMBER, CURRENCY, DATE, DROPDOWN,            │
│    CPF, CNPJ, URL, EMAIL, PHONE                                 │
│  • Frontend: editores por tipo + hooks + schemas Zod            │
│  • Flag: FEATURE_CUSTOM_FIELDS_WRITE_ENABLED                    │
│  • Funciona em QUALQUER task, com ou sem customTypeId           │
└─────────────────────────────────────────────────────────────────┘
```

### Interface contratual M1 ↔ M2

**M1 expõe (API estável):**
- `CustomFieldDefinition { id, workspaceId|null, key, label, type, required, config, sortOrder }`
- `CustomFieldValue { workItemId, definitionId, valueText|valueNumber|valueDate }`
- Endpoints:
  - `GET /custom-field-definitions?workspaceId=auto` — lista
  - `POST /custom-field-definitions` — cria (admin)
  - `GET /tasks/:id/custom-fields` — valores de uma task (join com definições visíveis)
  - `PATCH /tasks/:id/custom-fields/:definitionId` — grava valor
- Evento outbox: `CUSTOM_FIELD_VALUE_CHANGED`

**M2 consome de M1:**
- Só referencia `CustomFieldDefinition.id` via tabela join `TaskTypeTemplateField`.
- **Nunca** lê colunas internas de M1 — apenas seu contrato REST/tipos.
- Se M1 não estiver disponível (flag OFF), M2 ainda funciona parcialmente (template aplica descrição default + categorias de anexo; custom fields ficam read-only/vazios).

### Boundaries de módulo backend

```
mundial-erp-api/src/modules/
├── custom-fields/                          # M1 — autônomo
│   ├── custom-fields.module.ts
│   ├── custom-field-definitions.controller.ts
│   ├── custom-field-definitions.service.ts
│   ├── custom-field-definitions.repository.ts
│   ├── custom-field-values.controller.ts
│   ├── custom-field-values.service.ts
│   ├── custom-field-values.repository.ts
│   ├── dto/ …
│   └── validators/ (cpf, cnpj, email, phone, url, field-type-dispatch)
│
└── task-type-templates/                    # M2 — depende só da API de M1
    ├── task-type-templates.module.ts
    ├── task-type-templates.controller.ts
    ├── task-type-templates.service.ts
    ├── task-type-templates.repository.ts
    └── dto/ task-type-template-response.dto.ts
```

`custom-fields/` **não importa** nada de `task-type-templates/`. `task-type-templates/` só importa a interface pública de `custom-fields/` (service + types), nunca repository/schema direto.

### Boundaries de módulo frontend

```
mundial-erp-web/src/features/
├── custom-fields/                          # M1 — autônomo, reutilizável
│   ├── types/ custom-field.types.ts
│   ├── schemas/ custom-field.schema.ts
│   ├── services/ custom-field-definitions.service.ts, custom-field-values.service.ts
│   ├── hooks/ use-custom-field-definitions.ts, use-custom-field-values.ts
│   └── components/
│       ├── CustomFieldEditor.tsx           # dispatcher por tipo
│       ├── CustomFieldsSection.tsx         # seção genérica renderizável em qualquer contexto
│       └── fields/ TextField, NumberField, …, PhoneField
│
└── tasks/                                  # existe hoje
    ├── services/ task-type-templates.service.ts   # M2
    ├── hooks/ use-task-type-templates.ts          # M2
    └── components/task-view/ (integra M1 + M2)    # M4
```

`features/tasks/` importa de `features/custom-fields/`, nunca o contrário.

---

## Modelo de Dados (Prisma)

Arquivo: [mundial-erp-api/prisma/schema.prisma](../../mundial-erp-api/prisma/schema.prisma). Duas migrations separadas (aditivas) — uma por módulo, reflete desacoplamento.

### M1 — `custom-fields` (Migration A)

#### `CustomFieldDefinition`

Dono: workspace (ou global com `workspaceId=NULL` se `isBuiltin=true`). Define um campo reutilizável.

| Coluna | Tipo | Mapping | Relação | Índice | Motivo |
|---|---|---|---|---|---|
| `id` | String cuid | `id` | PK | — | Identidade |
| `workspaceId` | String? | `workspace_id` | FK `workspaces(id)` | `(workspace_id, deleted_at)` | Multi-tenant; NULL = builtin global |
| `key` | String | `key` | — | `(workspace_id, key)` unique | Slug semântico usado em UI/queries (ex: `client_cnpj`) |
| `label` | String | `label` | — | — | Exibição |
| `type` | enum CustomFieldType | `type` | — | — | Dispatcher para editor/validador |
| `required` | Boolean | `required` default false | — | — | Obrigatoriedade por field (pode ser override no template) |
| `config` | Json? | `config` | — | — | `{options, min, max, readOnly, hint, requiredWhen}` — tipo-dependente |
| `isBuiltin` | Boolean | `is_builtin` default false | — | — | Builtin (seed) vs. criado pelo workspace |
| `sortOrder` | Int | `sort_order` default 0 | — | — | Ordem em listagem cheia |
| `createdAt/updatedAt/deletedAt` | DateTime | — | — | `(deleted_at)` | Auditoria + soft delete |

Enum:
```prisma
enum CustomFieldType { TEXT NUMBER CURRENCY DATE DROPDOWN CPF CNPJ URL EMAIL PHONE }
```

#### `CustomFieldValue`

Valor persistido por `(workItem, definition)`.

| Coluna | Tipo | Mapping | Relação | Índice | Motivo |
|---|---|---|---|---|---|
| `id` | String cuid | — | PK | — | — |
| `workItemId` | String | `work_item_id` | FK `work_items(id)` ON DELETE CASCADE | `(work_item_id)` | Lookup por task |
| `definitionId` | String | `definition_id` | FK `custom_field_definitions(id)` | — | — |
| `valueText` | String? @db.Text | `value_text` | — | — | Para TEXT/DROPDOWN/CPF/CNPJ/URL/EMAIL/PHONE |
| `valueNumber` | Decimal? (18,4) | `value_number` | — | — | NUMBER/CURRENCY (centavos em CURRENCY) |
| `valueDate` | DateTime? | `value_date` | — | — | DATE |
| `createdAt/updatedAt` | DateTime | — | — | — | Auditoria |

Constraint: `@@unique([workItemId, definitionId])` — 1 valor por campo/task. Uma coluna valor preenchida por vez, dispatch pelo `type` da definição.

Rel. reversa em `WorkItem`: `customFieldValues CustomFieldValue[]`.

### M2 — `task-type-templates` (Migration B, aplicada DEPOIS de A)

#### `TaskTypeTemplate`

Template 1:1 com `CustomTaskType`.

| Coluna | Tipo | Mapping | Relação | Índice | Motivo |
|---|---|---|---|---|---|
| `id` | String cuid | — | PK | — | — |
| `customTaskTypeId` | String | `custom_task_type_id` | FK `custom_task_types(id)` ON DELETE CASCADE @unique | unique | 1:1 estrita |
| `attachmentCategories` | Json? | `attachment_categories` | — | — | `[{slug,label,required,mimeWhitelist}]` |
| `defaultDescriptionBlocks` | Json? | `default_description_blocks` | — | — | BlockNote AST |
| `createdAt/updatedAt/deletedAt` | DateTime | — | — | `(deleted_at)` | — |

Rel. reversa em `CustomTaskType`: `template TaskTypeTemplate?` (apenas sintaxe Prisma — **nenhuma coluna nova em `custom_task_types`**).

#### `TaskTypeTemplateField` (join M:N)

Vincula templates a CustomFieldDefinitions. **Esta é a integração M1↔M2 — tabela DE M2, referencia id DE M1.**

| Coluna | Tipo | Mapping | Relação | Índice | Motivo |
|---|---|---|---|---|---|
| `templateId` | String | `template_id` | FK `task_type_templates(id)` ON DELETE CASCADE | `(template_id, sort_order)` | Lista ordenada por template |
| `definitionId` | String | `definition_id` | FK `custom_field_definitions(id)` | — | Referência à definição |
| `sortOrder` | Int | `sort_order` default 0 | — | — | Ordem nos campos do template |
| `requiredOverride` | Boolean? | `required_override` | — | — | Permite template tornar campo obrigatório mesmo se definition.required=false |

PK composta: `@@id([templateId, definitionId])`.

---

## Plano de Sprints (Scrum)

Cinco sprints. Cada uma entregável ponta a ponta, flag gated, sem quebrar main. Entre parênteses: pontos relativos (Fibonacci 1-13). Owner = membro do `squad-tasks` (ver skill). Paralelismo dentro de cada sprint é máximo; entre sprints há dependência serial.

### **Sprint 0 — Governança (3 pts)**

**Goal:** alinhar direção via documentação antes de qualquer código, de modo que M1 e M2 possam ser trabalhados por squads/momentos diferentes sem retrabalho.

**Stories:**

- **TTT-001 (Mariana — 2 pts)** — Como Tech Lead, quero RFC `tasks-004-typed-task-templates.md` aprovada, para que o squad tenha fonte única sobre por quê/como construir templates de task type.
  - **AC:** documento em `.claude/rfc/`, seções Contexto/Problema/Opções A–C/Decisão/Impacto/Rollout/Riscos; referencia squad-tasks + 99-referencia; aprovada async por 3+ membros em 72h.
- **TTT-002 (Mariana — 1 pt)** — Como Tech Lead, quero RFC `tasks-005-custom-fields.md` separada, para deixar claro que Custom Fields é módulo autônomo.
  - **AC:** RFC própria com contrato de API, schema, dependências; referenciada em TTT-001 como dependência de escopo mas não de cronograma.

**Definition of Done:** ambas RFCs mergeadas em main; anotação na memória `project_task-types-semantics.md` atualizada com adendo de templates.

**Dependência:** nenhuma (arranca imediatamente).

---

### **Sprint 1 — M1 Custom Fields (Backend) (13 pts)**

**Goal:** entregar módulo `custom-fields/` **autônomo** no backend, com schema + CRUD definitions + GET/PATCH values, sob flag. Demonstrável: admin cria field definition via API e grava valor em task qualquer.

**Stories (executadas em paralelo):**

- **TTT-010 (Diego — 3 pts)** — Migration A: cria `custom_field_definitions`, `custom_field_values`, enum `CustomFieldType`.
  - **AC:** rollback SQL em `prisma/rollbacks/custom_fields.down.sql`; `prisma migrate deploy` funciona em clone de prod; índices criados; zero ALTER em tabelas existentes além de rel. reversa em `WorkItem`.
- **TTT-011 (Beatriz — 5 pts)** — Módulo backend `custom-fields/` completo (controllers, services, repositories, DTOs class-validator, módulo, registro em `app.module.ts`).
  - **AC:** 6 endpoints implementados (`GET/POST/PATCH/DELETE /custom-field-definitions`, `GET /tasks/:id/custom-fields`, `PATCH /tasks/:id/custom-fields/:definitionId`); guards `JwtAuthGuard + WorkspaceGuard + RolesGuard`; envelope `{data, meta}`; paginação ≤100; throttle 60/min em PATCH; cross-tenant → 404; budget queries ≤ 3 por request.
- **TTT-012 (Beatriz — 3 pts)** — Validators CPF, CNPJ, EMAIL, PHONE, URL + dispatcher por `type` no service.
  - **AC:** cada validator com unit tests (CPFs/CNPJs válidos e inválidos incluindo edge cases `000.000.000-00`, `111.111.111-11`); DROPDOWN verifica valor ∈ `config.options[].value`; NUMBER honra `config.min/max`; CURRENCY em centavos Int.
- **TTT-013 (Mariana — 1 pt)** — Feature flag `FEATURE_CUSTOM_FIELDS_WRITE_ENABLED` + env + guard transversal + métrica Grafana `custom_fields_written_total{field_type}`.
  - **AC:** flag OFF → todos endpoints retornam 404; `POST /custom-field-definitions` e `PATCH` values bloqueados; `GET` continua funcionando (leitura permitida mesmo com write OFF).
- **TTT-014 (Tatiana — em paralelo desde story TTT-011 — 1 pt)** — Suite E2E supertest.
  - **AC:** testes de cross-tenant (404), validações por tipo (422), idempotência PATCH, regressão em orders/stock-requisitions/work-items inalterada.

**Definition of Done (Sprint):**
- 6 endpoints documentados no Swagger.
- Unit ≥ 80% em `custom-fields/`; E2E happy path + falha cobertos.
- `pnpm lint + typecheck` zero warnings novos.
- Migration aplicada em staging; seed idempotente.
- Flag funciona em ambos estados.
- Zero regressão em suites existentes.
- RFC `tasks-005-custom-fields.md` atualizada se contrato mudou.

**Dependência:** Sprint 0 completa.

**Demonstração:** curl `POST /custom-field-definitions {key:"test_cnpj", type:"CNPJ", label:"CNPJ teste"}` → 201; `PATCH /tasks/:id/custom-fields/:definitionId {value:"12.345.678/0001-00"}` → 200.

---

### **Sprint 2 — M1 Custom Fields (Frontend) (8 pts)**

**Goal:** frontend reutilizável de Custom Fields — hooks, schemas Zod, editores por tipo e uma `CustomFieldsSection` genérica que funciona em qualquer contexto (não só Task View). **Pode ser desenvolvida parcialmente em paralelo à Sprint 1 a partir do momento que DTOs de M1 estejam congelados.**

**Stories:**

- **TTT-020 (Henrique — 2 pts)** — Types TS + schemas Zod por `CustomFieldType` + service HTTP + hooks React Query (`useCustomFieldDefinitions`, `useCustomFieldValues`, `usePatchCustomFieldValue` com optimistic/rollback).
  - **AC:** 10 schemas Zod (um por tipo) + função `schemaForField(definition)` que compõe; `queryKey` estável inclui workspaceId + taskId; stale time 30s; fail em 422 dispara rollback e toast.
- **TTT-021 (Juliana — 3 pts)** — 10 editores em `features/custom-fields/components/fields/` (TextField, NumberField, CurrencyField, DateField, DropdownField, CpfField, CnpjField, UrlField, EmailField, PhoneField) + dispatcher `CustomFieldEditor`.
  - **AC:** cada editor tem `<label htmlFor>`, `aria-invalid`, `aria-describedby`, focus ring WCAG AA; debounce 500ms interno por editor; erro inline com cor de token ERR; mascaras aplicadas (CPF/CNPJ/PHONE).
- **TTT-022 (Juliana — 2 pts)** — `CustomFieldsSection` componente genérico (renderiza lista + ordem + required star).
  - **AC:** prop `definitionIds: string[]` ou `definitions: Definition[]` (flexível para M2 filtrar); prop `taskId`; renderiza vazio se lista vazia (não quebra UI); Storybook 3+ stories (vazio, preenchido, erro).
- **TTT-023 (Henrique — 1 pt)** — Flag frontend `useFeatureFlag('custom_fields_write')`. OFF → editores ficam read-only (reusa mesmo componente com prop `readOnly`).
- **TTT-024 (Tatiana — em paralelo desde TTT-021 — comumente 0 pt extra, mas conta de Sprint) —** Vitest + Testing Library em todos editores + hook optimistic/rollback.

**Definition of Done:** Storybook publicado; Lighthouse A11y ≥ 95 nas stories; 10 editores com cobertura ≥ 80%; sem uso no Task View ainda (vai ser conectado só na Sprint 4).

**Dependência:** DTOs de Sprint 1 congelados (Sprint 1 não precisa estar 100% mergeada — basta contratos aprovados).

**Demonstração:** Storybook standalone com 3 scenarios por tipo (vazio, válido, inválido); form em página dummy `/dev/custom-fields-demo` (removida antes do merge final) grava e lê valores.

---

### **Sprint 3 — M2 Task Type Templates (Backend) (8 pts)**

**Goal:** framework de templates no backend, referenciando M1. Sem seeds ainda. Demonstrável: admin pode criar (via SQL/seed) um template, associá-lo a um customTaskType, e ao criar task daquele tipo o sistema aplica a descrição default + expõe as categorias de anexo definidas.

**Stories:**

- **TTT-030 (Diego — 2 pts)** — Migration B: cria `task_type_templates` + `task_type_template_fields` + rel. reversa Prisma em `CustomTaskType`.
  - **AC:** rollback SQL; migração aplicada em staging; índices; FK M:N com ON DELETE CASCADE no template.
- **TTT-031 (Felipe — 3 pts)** — Módulo `task-type-templates/` read-only: `GET /task-type-templates`, `GET /task-type-templates/:customTaskTypeId`.
  - **AC:** include de `TaskTypeTemplateField.definition` em uma query (budget ≤ 2); cache Redis 5min; cross-tenant 404.
- **TTT-032 (Felipe — 1 pt)** — Extensão de `tasks.service.create` em `$transaction`: se `customTypeId` tem template → aplica `defaultDescriptionBlocks` em `bodyBlocks` quando não fornecido pelo cliente + enfileira evento outbox `TASK_CREATED` com `customTypeId`. **Nenhuma criação automática de checklist nesta release.**
  - **AC:** task SEM template ou SEM `customTypeId` tem comportamento idêntico ao atual; test de regressão passa; rollback de transação se qualquer sub-operação falhar.
- **TTT-033 (Mariana — 1 pt)** — Feature flag `FEATURE_TASK_TYPE_TEMPLATES_ENABLED` + métrica `tasks_typed_templates_instantiated_total{custom_type_id}`.
  - **AC:** flag OFF → endpoints 404 + `tasks.service.create` ignora template.
- **TTT-034 (Tatiana — em paralelo — conta na Sprint)** — E2E: criar task com template aplica default description; criar sem template não afeta; cross-tenant 404; orders/stock-requisitions regressão.

**Definition of Done:** Swagger; E2E verde; custom-fields (M1) continua funcionando independentemente da flag de M2; custom fields em task criada com template aparecem corretamente SE M1 estiver ON — e aparecem como read-only SE M1 estiver OFF.

**Dependência:** Sprint 1 mergeada (precisa das definitions persistidas para M:N apontar).

**Demonstração:** seed de 1 template fake ("builtin-test") via SQL; `POST /tasks {customTypeId:"builtin-test", title:"Test"}` → task criada com checklist e description default.

---

### **Sprint 4 — M3 Seeds + M4 UI Integration (13 pts)**

**Goal:** 2 builtins (Pedido + Requisição) seedados, Task View integra `CustomFieldsSection` filtrada pelo template, modal de criar task com preview. Demonstrável: usuário cria task "Pedido" e vê os 17 campos + checklist + chips de anexo.

**Stories:**

- **TTT-040 (Diego — 3 pts)** — Seeds idempotentes em `seed-reference-data.ts`:
  - `builtin-order`: CustomTaskType (visual) + 17 CustomFieldDefinitions `isBuiltin=true workspaceId=NULL` + TaskTypeTemplate + 17 TaskTypeTemplateFields + checklistTemplate 11 itens + 3 attachmentCategories + defaultDescriptionBlocks.
  - `builtin-stock-request`: idem com 7 fields / 7 checklist / 2 categorias.
  - **AC:** `upsert` idempotente (rodar 3x seguidas = mesmo estado); Field definitions reutilizam um key comum quando possível (ex: `client_cnpj`, `client_name`); seed gera mesmo UUID estável (ex: `cfd-client-cnpj`) para evitar drift entre ambientes.
- **TTT-041 (Juliana — 3 pts)** — Integração na [task-view.tsx](../../mundial-erp-web/src/features/tasks/components/task-view/task-view.tsx): substitui seção read-only atual por `<CustomFieldsSection taskId={…} definitionIds={template?.fieldIds ?? []} />`.
  - **AC:** task sem template → seção some; task com template → 17 editores em ordem correta; fallback se M1 flag OFF = section read-only; responsividade 4 BPs; a11y axe zero violações.
- **TTT-042 (Juliana — 3 pts)** — Modal "Nova tarefa" com preview: ao escolher tipo, mostra quantidade de campos, título da checklist, chips de categorias com flag required.
  - **AC:** preview é lazy (só fetcha template ao selecionar tipo); descrição do tipo aparece abaixo; se tipo sem template → modal fica igual atual.
- **TTT-043 (Juliana — 2 pts)** — Chips de categorias de anexo na section de anexos do Task View.
  - **AC:** chip "Comprovante pagamento (obrigatório)" fica amber pendente, verde anexado; drop em chip associa categoria.
- **TTT-044 (Renato — 1 pt)** — Atualizar settings `/settings/custom-task-types` para mostrar "Com template" badge nos tipos que têm template associado.
  - **AC:** novos builtins aparecem no settings com ícone+nome+cor + badge "Template" se aplicável.
- **TTT-045 (Tatiana — 1 pt)** — Playwright jornada completa: login → criar Pedido → preencher todos 17 campos → anexar NF (simulada) → fechar. Repetir para Requisição com type=VENDA (espera linked_order_number obrigatório).
  - **AC:** Lighthouse Perf ≥ 85, A11y ≥ 95.

**Definition of Done:** builtins acessíveis via `/custom-task-types`; Task View renderiza UI completa; zero regressão em suites existentes; Storybook inclui stories de Task View com cada builtin.

**Dependência:** Sprints 1, 2, 3 mergeadas.

**Demonstração:** jornada completa em browser — criar Pedido, preencher CNPJ/CPF/valor/anexar NF/checklist → ver task 100% populada.

---

### **Sprint 5 — Rollout (5 pts)**

**Goal:** ativar em produção de forma segura via flag per-workspace.

**Stories:**

- **TTT-050 (Mariana — 2 pts)** — Dashboards Grafana `tasks-task-type-templates` + alertas (DLQ outbox, p95 GET /tasks/:id, erro 5xx endpoints novos > 1%).
- **TTT-051 (Mariana — 1 pt)** — Canary 48h: habilitar 2 flags (M1 + M2) em workspace interno; coletar SLIs.
- **TTT-052 (Mariana — 1 pt)** — Rollout escalonado 10% → 50% → 100% (7d por etapa). Rollback per-workspace testado (desligar → seção volta read-only, dados intactos).
- **TTT-053 (Mariana — 1 pt)** — Pós-rollout: atualizar memória `project_task-types-semantics.md`, criar `project_task-type-templates-roadmap.md` com os 11 builtins futuros.

**DoD:** 100% workspaces em produção por 7 dias sem alerta P1+; memória atualizada; postmortem zero.

**Dependência:** Sprint 4 mergeada.

---

## Definition of Done — Global (todas as sprints)

Critérios mínimos aplicados a TODA story. Se faltar qualquer item, PR não mergeia.

1. **Código e testes**
   - [ ] Lint + typecheck sem warnings novos
   - [ ] Unit tests cobertura ≥ 80% no código tocado
   - [ ] E2E para happy path + 1+ falhas
   - [ ] Nenhum `any`, `console.log`, `export default` (exceto `page.tsx`)
   - [ ] Budget queries ≤ 10 por endpoint (CI falha acima)
2. **Padrões de camada** (`99-referencia-completa.md`)
   - [ ] Controller thin (só delega + guards)
   - [ ] Service com regra de negócio
   - [ ] Repository isola Prisma
   - [ ] DTOs com class-validator + `@ApiProperty`
   - [ ] Envelope `{data, meta}`
   - [ ] Paginação ≤ 100 em listagens
   - [ ] Soft delete (`deletedAt`)
3. **Segurança e multi-tenant**
   - [ ] `WorkspaceGuard` + `@WorkspaceId()` em toda rota scoped
   - [ ] Cross-tenant → **404 nunca 403**
   - [ ] RBAC (`@Roles`) nas mutações
   - [ ] Rate limit nas rotas de escrita
   - [ ] Logs sem PII / sem body completo / sem tokens
4. **Migrações**
   - [ ] Aditiva (nullable, sem NOT NULL nesta release)
   - [ ] Rollback SQL em `prisma/rollbacks/`
   - [ ] Seed idempotente
   - [ ] Testada em clone staging
5. **Observabilidade**
   - [ ] Métricas Grafana declaradas
   - [ ] Logs estruturados com `requestId + workspaceId + userId`
   - [ ] Eventos outbox quando for side-effect
6. **Frontend**
   - [ ] Zod schemas alinhados com DTOs backend
   - [ ] Hooks React Query com queryKey estável
   - [ ] Optimistic + rollback nas mutations
   - [ ] Named exports, kebab-case em arquivos
   - [ ] WCAG AA (focus, aria, contraste), axe zero violações
   - [ ] Lighthouse Perf ≥ 85, A11y ≥ 95 na página tocada
   - [ ] BlockNote sempre `dynamic({ ssr:false })`
7. **Feature flag**
   - [ ] Flag OFF retorna 404 / UI esconde
   - [ ] Flag ON testada
   - [ ] Rollback per-workspace validado
8. **Documentação**
   - [ ] Swagger regenerado
   - [ ] README/Storybook atualizados
   - [ ] RFC atualizada se contrato mudou
9. **Regressão zero**
   - [ ] Suites orders/stock-requisitions/production-orders/invoices/accounts-*/work-items/bpm passam
   - [ ] Nenhum contrato público quebrado

---

## Regras de Negócio Explícitas

1. **Instanciação de template em `tasks.service.create`** ocorre em **uma única `$transaction`**. Se qualquer sub-operação falhar (checklist, outbox), rollback total — zero estado inconsistente.
2. **Idempotência PATCH value:** `PATCH` com mesmo valor 2x consecutivos = 200 ambos, sem duplicar evento outbox (dedup por `(workItemId, definitionId, value, window 5s)`).
3. **Cross-tenant em M1:** `CustomFieldDefinition.workspaceId` NULL → visível a todos (builtin); não-NULL → só visível ao próprio workspace. Query de `GET /custom-field-definitions` sempre aplica `WHERE (workspace_id IS NULL OR workspace_id = :current)`.
4. **DROPDOWN condicional (`requiredWhen`):** validação server-side lê `config.requiredWhen.{field, equals}` no template; se field=VENDA, `linked_order_number` vira obrigatório. Falha em 422 com campo + razão.
5. **Soft-delete de definition:** quando definition é soft-deleted, valores existentes NÃO são apagados; ficam "órfãos" e não aparecem na UI. Permite recuperação.
6. **Builtin definitions nunca são deletáveis** via API (`DELETE /custom-field-definitions/:id` → 403 quando `isBuiltin=true`).
7. **Sanitização:** TEXT é gravado como string pura (HTML stripado com DOMPurify-equivalente backend ou regex conservador); DROPDOWN valida contra `config.options[].value`; URL valida com `new URL()`; EMAIL com regex RFC simplificado.

---

## Seeds — Detalhe Técnico

> Movidos para o arquivo de seed em Sprint 4 story TTT-040. Dois blocos `upsert` seguindo o padrão atual de `builtin-task`/`builtin-milestone` + blocos correspondentes para `CustomFieldDefinition`, `TaskTypeTemplate` e `TaskTypeTemplateField`.

### Seed A — `builtin-order` (Pedido)

**CustomTaskType** (visual, mesmo formato dos seeds atuais):
- `id: builtin-order` | `workspaceId: NULL` | `name: Pedido` | `namePlural: Pedidos`
- `description: "Pedido de venda do processo Comercial — ciclo Orçamento → Faturamento → Produção → Entrega."`
- `icon: ShoppingCart` | `color: #2563eb` | `isBuiltin: true` | `sortOrder: 2`

**17 CustomFieldDefinitions** (`workspaceId: NULL`, `isBuiltin: true`, ids estáveis `cfd-order-<key>`):

| key | label | type | required | config |
|---|---|---|---|---|
| `order_number` | Número do pedido | TEXT | false | `{readOnly:true, hint:"Gerado ao mover para FATURAR"}` |
| `client_cnpj` | CNPJ do cliente | CNPJ | false | — |
| `client_cpf` | CPF do cliente | CPF | false | — |
| `client_name` | Nome/Razão social | TEXT | true | — |
| `client_email` | E-mail | EMAIL | false | — |
| `client_phone` | Telefone | PHONE | false | — |
| `delivery_address` | Endereço de entrega | TEXT | false | — |
| `delivery_deadline` | Prazo de entrega | DATE | false | — |
| `proposal_validity_days` | Validade da proposta (dias) | NUMBER | false | `{min:1, default:7}` |
| `subtotal` | Subtotal | CURRENCY | false | — |
| `freight` | Frete | CURRENCY | false | `{default:0}` |
| `discount` | Desconto | CURRENCY | false | `{default:0}` |
| `total` | Total | CURRENCY | true | — |
| `paid_amount` | Valor pago (entrada) | CURRENCY | false | `{hint:"Mínimo 50% do total para faturar"}` |
| `payment_method` | Forma de pagamento | DROPDOWN | false | `{options:[pix, dinheiro, cartao_credito, cartao_debito, boleto, transferencia]}` |
| `should_produce` | Contém itens de fabricação própria? | DROPDOWN | false | `{options:[{value:"true",label:"Sim"},{value:"false",label:"Não"}]}` |
| `is_resale` | Contém itens de revenda? | DROPDOWN | false | `{options:[...Sim/Não]}` |

**TaskTypeTemplate** para `builtin-order`:

- `checklistTemplate`: `{title:"Ciclo do pedido", items:[Elaborar orçamento*, Definir endereço e prazo*, Fechar negócio*, Registrar entrada 50%*, Anexar comprovante*, Conciliar pagamento*, Iniciar produção, Separar revenda, Conferir*, Registrar 50% restante*, Entregar*]}` (\* = required)
- `attachmentCategories`:
  - `proposta` — Proposta assinada (opcional, pdf)
  - `comprovante` — Comprovante pagamento (**obrigatório**, pdf/jpg/png)
  - `nota_fiscal` — Nota fiscal NF-e (opcional, pdf/xml)
- `defaultDescriptionBlocks`: BlockNote AST com headings "Itens do pedido", "Entrega", "Observações"

**17 TaskTypeTemplateFields** (M:N) apontando para cada `cfd-order-<key>` em ordem.

### Seed B — `builtin-stock-request` (Requisição)

**CustomTaskType:**
- `id: builtin-stock-request` | `name: Requisição de Estoque` | `namePlural: Requisições de Estoque`
- `description: "Requisição interna ou de venda do processo Compras/Suprimentos — fluxo Pendente → Aprovada → Processada via scanner."`
- `icon: PackageOpen` | `color: #059669` | `isBuiltin: true` | `sortOrder: 3`

**7 CustomFieldDefinitions** (ids `cfd-stockreq-<key>`):

| key | label | type | required | config |
|---|---|---|---|---|
| `requisition_code` | Código da requisição | TEXT | false | `{readOnly:true, hint:"Formato REQ-AAAAMMDD-NNN"}` |
| `type` | Tipo | DROPDOWN | true | `{options:[VENDA, INTERNO]}` |
| `linked_order_number` | Nº do pedido vinculado | TEXT | false | `{hint:"Obrigatório se tipo = Venda", requiredWhen:{field:"type", equals:"VENDA"}}` |
| `client_name` | Cliente vinculado | TEXT | false | — |
| `requester_area` | Área solicitante | TEXT | false | — |
| `requested_date` | Data de solicitação | DATE | true | — |
| `processed_date` | Data de processamento | DATE | false | — |

**TaskTypeTemplate:**
- `checklistTemplate`: 7 itens todos required (Registrar itens, Aprovar, Imprimir PDF Code-128, Separar, Processar via scanner EAN-13, Escanear Code-128 finalizar, Confirmar baixa).
- `attachmentCategories`: `requisicao_pdf` (opcional, pdf), `comprovante_separacao` (opcional, jpg/png/pdf).
- `defaultDescriptionBlocks`: sections "Itens solicitados", "Observações de separação".

---

## Testes (consolidado, execução por sprint)

| Tipo | Owner | Sprint | Arquivos |
|---|---|---|---|
| E2E supertest M1 | Tatiana | 1 | `test/custom-field-definitions.e2e-spec.ts`, `test/custom-field-values.e2e-spec.ts` |
| Unit validators CPF/CNPJ/EMAIL/PHONE/URL | Tatiana | 1 | `validators/*.spec.ts` |
| Unit services M1 | Tatiana | 1 | `custom-field-*.service.spec.ts` |
| Vitest editores | Tatiana | 2 | `fields/*.test.tsx` |
| Vitest hooks optimistic | Tatiana | 2 | `use-custom-field-values.test.ts` |
| Storybook visual | Tatiana | 2 | `custom-fields/*.stories.tsx` |
| E2E supertest M2 | Tatiana | 3 | `test/task-type-templates.e2e-spec.ts` |
| Unit service M2 (incluindo `tasks.service.create` extension) | Tatiana | 3 | `task-type-templates.service.spec.ts`, `tasks.service.spec.ts` (atualizado) |
| Playwright jornada full | Tatiana | 4 | `e2e/task-type-templates-pedido.spec.ts`, `e2e/task-type-templates-requisicao.spec.ts` |
| Lighthouse budget CI | Tatiana | 4 | — |
| Regressão (todas sprints) | Tatiana | 1-5 | suites existentes |

---

## Riscos e Mitigações

| Risco | Severidade | Mitigação |
|---|---|---|
| M1 e M2 forem mergeados fora de ordem (M2 antes de M1) | Alta | Dependency gate em CI: PR de M2 só mergeia se `custom-field-definitions` existir em schema atual |
| Seed de `CustomFieldDefinition` com id não estável → drift entre ambientes | Alta | ids fixos em seed (`cfd-order-client_cnpj`, …); test confere idempotência rodando seed 3x |
| Template com definitionId órfão (definition soft-deletada) | Média | Query de template filtra `deletedAt IS NULL` em `definition`; UI mostra "Campo indisponível" sem quebrar |
| Flag M1 OFF durante Sprint 4 = campos vazios no Pedido | Média | Sprint 4 só desbloqueia rollout se M1 flag ligada em canary; docs de rollout exigem liga M1 antes de M2 |
| Performance: 17 fields em Task View = 17 PATCH | Média | Debounce 500ms por field + batching no client (enviar ao blur em vez de por keystroke); budget queries monitorado |
| CPF/CNPJ validator aceita falso positivo | Alta | Testes extensivos com casos reais; dígito verificador obrigatório; edge cases `000.000.000-00` e `111.111.111-11` rejeitados |
| Usuário preenche `client_cnpj` em task tipo Pedido e depois muda tipo para Milestone | Baixa | Ao mudar `customTypeId`, UI avisa "X campos personalizados serão ocultados mas mantidos no banco"; valores ficam órfãos até voltar ao tipo original |
| Tabela `custom_field_values` cresce descontroladamente | Média | Índice `(work_item_id)` ajuda; job mensal identifica top-N tasks com valores + DRE |
| Ordem de fields inconsistente entre workspaces (já que `sortOrder` do template pode divergir) | Baixa | `TaskTypeTemplateField.sortOrder` é source of truth para builtins; definition.sortOrder é fallback |
| BlockNote lazy load demora → defaultDescriptionBlocks não renderiza | Baixa | Fallback texto puro durante loading (regra #20 squad-tasks) |

---

## Arquivos Críticos a Modificar

**Governança (Sprint 0):**
- `.claude/rfc/tasks-004-typed-task-templates.md` (TTT-001)
- `.claude/rfc/tasks-005-custom-fields.md` (TTT-002)

**Schema e migrations:**
- [mundial-erp-api/prisma/schema.prisma](../../mundial-erp-api/prisma/schema.prisma) — Sprint 1 (TTT-010) + Sprint 3 (TTT-030)
- `mundial-erp-api/prisma/migrations/YYYYMMDD_custom_fields/migration.sql` (Sprint 1)
- `mundial-erp-api/prisma/migrations/YYYYMMDD_task_type_templates/migration.sql` (Sprint 3)
- `mundial-erp-api/prisma/rollbacks/custom_fields.down.sql`, `task_type_templates.down.sql`
- [mundial-erp-api/prisma/seed-reference-data.ts](../../mundial-erp-api/prisma/seed-reference-data.ts) — Sprint 4 (TTT-040)

**Backend novo (M1, Sprint 1):**
- `mundial-erp-api/src/modules/custom-fields/**`

**Backend novo (M2, Sprint 3):**
- `mundial-erp-api/src/modules/task-type-templates/**`

**Backend modificado:**
- [mundial-erp-api/src/app.module.ts](../../mundial-erp-api/src/app.module.ts) — registrar M1 (Sprint 1), depois M2 (Sprint 3)
- [mundial-erp-api/src/config/env.validation.ts](../../mundial-erp-api/src/config/env.validation.ts) — 2 flags
- [mundial-erp-api/src/modules/tasks/tasks.service.ts](../../mundial-erp-api/src/modules/tasks/tasks.service.ts) — extensão `create` (Sprint 3, TTT-032)

**Frontend novo (M1, Sprint 2):**
- `mundial-erp-web/src/features/custom-fields/**` (feature folder dedicada — **não dentro de `features/tasks/`**, reforçando desacoplamento)

**Frontend modificado (M4, Sprint 4):**
- [mundial-erp-web/src/features/tasks/components/task-view/task-view.tsx](../../mundial-erp-web/src/features/tasks/components/task-view/task-view.tsx) — consumir `CustomFieldsSection` de `features/custom-fields/`
- Modal "Nova tarefa" — preview (path a confirmar)
- Seção de anexos — chips (path a confirmar)

**Memória (pós-merge, Sprint 5):**
- Atualizar `project_task-types-semantics.md`
- Criar `project_task-type-templates-roadmap.md`
- Criar `project_custom-fields-module.md` (documentando M1 como módulo autônomo)

---

## Verificação End-to-End

**Módulo M1 (após Sprint 1+2):**
1. `POST /custom-field-definitions {key:"test_cnpj", type:"CNPJ", label:"Teste"}` → 201.
2. `PATCH /tasks/:id/custom-fields/:definitionId {value:"12.345.678/0001-00"}` → 200.
3. Task view dev page renderiza editor CNPJ inline com optimistic.
4. `GET /orders` regressão passa.

**Módulo M2 (após Sprint 3):**
1. `GET /task-type-templates/builtin-test` → retorna template com fieldIds.
2. `POST /tasks {customTypeId:"builtin-test"}` → checklist populado, descrição default, outbox evento.
3. `GET /tasks` regressão passa (tasks sem customTypeId inalteradas).

**Integração (após Sprint 4):**
1. Browser `/tasks/new?type=builtin-order` → modal mostra preview (17 fields + 11 checklist + 3 anexos).
2. Criar → redireciona para `/tasks/[taskId]` com todos 17 editores.
3. Preencher `client_cnpj` → optimistic update; mudar tab e voltar → valor persistiu.
4. Anexar PDF → chip "Comprovante pagamento (obrigatório)" fica verde.
5. Lighthouse Perf ≥ 85, A11y ≥ 95.

**Rollout (Sprint 5):**
- Desligar `FEATURE_CUSTOM_FIELDS_WRITE_ENABLED` → editores ficam read-only; M2 continua funcionando com checklist+descrição.
- Desligar `FEATURE_TASK_TYPE_TEMPLATES_ENABLED` → criação de Pedido ignora template; custom fields ainda podem ser preenchidos se M1 ON.
- Desligar ambas → voltamos ao sistema pré-mudança; dados permanecem intactos.

---

## Roadmap (task types padrão futuros — salvar em memória pós-merge)

Resumo por feature do PLANO.md que vira builtin em RFCs seguintes. Cada entrada = 1 sprint pequena (3-5 pts), reutiliza M1+M2.

| slug | Nome | Processo (PLANO.md) | Fase original | Reuso de definitions |
|---|---|---|---|---|
| `builtin-production-order` | Ordem de Produção | Produção/Fabricação (982-1030) | 7C | Baixo (campos específicos: batch, consumption, output, loss) |
| `builtin-invoice` | Nota Fiscal | Financeiro/Faturamento (1051-1086) | 7C | Médio (reusa client_cnpj/cpf/name) |
| `builtin-account-receivable` | Conta a Receber | Financeiro/Tesouraria | 7C | Alto (client_* + amounts) |
| `builtin-account-payable` | Conta a Pagar | Financeiro/Tesouraria | 7C | Médio (supplier_* ainda não definido) |
| `builtin-purchase-quotation` | Cotação de Compra | Compras/Suprimentos | 7C | Baixo |
| `builtin-purchase-order` | Pedido de Compra | Compras/Suprimentos | 7C | Médio |
| `builtin-picking` | Separação | Logística/Expedição (1026-1045) | 7C | Alto (reusa linked_order_number) |
| `builtin-product` | Produto | Compras/Catálogo | 4B | Baixo (campos próprios: EAN, dimensões, estoque) |
| `builtin-client` | Cliente | Comercial/Gestão | 4A/7A | Alto (client_*) |
| `builtin-supplier` | Fornecedor | Compras | 4A | Médio |
| `builtin-production-formula` | Fórmula de Produção | Produção | 4B/7C | Baixo |

Cada entrada futura: 1 RFC + add seeds + testes. Nenhum schema novo — reutiliza M1+M2 plenamente.

---

## Itens Abertos (não bloqueiam início — abordar em refinement de cada sprint)

- **TTT-001 (Sprint 0):** numeração RFC `tasks-004` ou `tasks-005` — verificar colisão com ADRs existentes no momento da abertura da RFC.
- **TTT-040 (Sprint 4):** `payment_method` replica options de `payment_methods` legacy ou fica enum fixo? **Proposta MVP: enum fixo com 6 options; tornar DROPDOWN com fonte externa é RFC futura.**
- **TTT-041 (Sprint 4):** path exato do modal "Nova tarefa" no frontend (a confirmar ao iniciar story).
- **TTT-044 (Sprint 4):** badge "Com template" na settings page — decidir copy/ícone com designer.
- **TTT-033 (Sprint 3):** se `FEATURE_CUSTOM_FIELDS_WRITE_ENABLED` estiver OFF quando usuário criar task Pedido, experiência cai para read-only — documentar no copy do modal.

---

## Checklist de Aprovação do Plano

Antes de iniciar qualquer código, validar que:
- [ ] Arquitetura modular desacoplada (M1 isolado de M2) aprovada
- [ ] Sprints/stories/AC/DoD foram revisados pelo Tech Lead
- [ ] Seeds Pedido e Requisição batem com PLANO.md
- [ ] Definition of Done global aceito pelo squad
- [ ] Riscos de flag fora de ordem mitigados
- [ ] Cronograma de 5 sprints cabe no quarter
- [ ] Memórias a atualizar pós-merge estão listadas
