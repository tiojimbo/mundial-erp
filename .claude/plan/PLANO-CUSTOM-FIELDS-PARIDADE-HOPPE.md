# Plano — Custom Fields 1:1 com Hoppe

> Auditoria via Playwright em https://hoppe.bravy.com.br (workspace Mundial) em 2026-05-13. Cruzamento com `mundial-erp-api/src/modules/custom-fields/` e `mundial-erp-web/src/features/custom-fields/`. Objetivo: levar o ERP a paridade completa com a feature Custom Fields do Hoppe.

## 0. Resumo executivo

O ERP já implementou 80% do esqueleto: schema com 5 escopos (workspace, space, folder, list, customTaskType), CRUD completo, soft-delete, builtins, group flat, fillMethod, manager endpoint, dois paths de SET value (Hoppe-compat + legado), feature flag de write, outbox event. O que falta é:

1. **8 tipos novos**: SELECT, CHECKBOX, PERCENTAGE, DURATION, RATING, USER, TEAM, PEOPLE, RELATIONSHIP, ROLLUP, LABEL (4 sem schema novo, 3 com config obrigatória)
2. **Shape de options divergente**: Hoppe usa `options: string[]` raw na entity; ERP usa `config.options[{value,label}]`
3. **CustomFieldValue mono-coluna**: hoje 3 colunas tipadas (valueText/valueNumber/valueDate); Hoppe tem 1 coluna JSON que comporta USER/TEAM/PEOPLE/RELATIONSHIP
4. **Manager scope divergente**: ERP aceita `list,folder,space,taskType`; Hoppe aceita `all,workspace,taskType`
5. **GET sem param sem bucket workspace**: ERP retorna 4 buckets; Hoppe retorna `{workspace}` quando sem filtro
6. **UI Manager**: Hoppe tem modal completo com sidebar (Quick Access + By Location) + tabela agrupada por tipo + sidebar de detalhes. ERP só tem `CustomFieldsSection` embed na task.
7. **Group como entidade separada**: Hoppe tem objeto `group: {id,name,position,color}` (sugere tabela própria); ERP tem campos flat na própria definition
8. **Name vs Label separados**: hoje ERP usa `entity.label` como name+label; Hoppe tem dois campos independentes

Tabela total de gaps na seção 2.

---

## 1. Estado atual (auditado)

### 1.1 Hoppe — superfície da API

Base: `https://hoppe-api.bravy.com.br/api/v1` + header `Authorization: Bearer <crm_token>` + header `workspace-id`.

| Endpoint | Método | Comportamento |
|---|---|---|
| `/custom-fields` | GET | Sem param → `{workspace:[]}`; com `?listId=` → `{list,folder,space,taskType}`; com `?taskTypeId=` → `{taskType,workspace}`; com `?spaceId=` ou `?folderId=` → `{list:[...]}` (apenas o bucket `list` populado com defs ligadas àquele scope via `locationListIds`). |
| `/custom-fields/:id` | GET | Não testei mas o frontend Hoppe não usa. |
| `/custom-fields/manager` | GET | Aceita `scope=all|workspace|taskType` (apenas estes 3). Outros 400. Retorna array enriquecido com `usageCount`, `locations:[{id,name,type}]`, `taskTypes:[{id,name}]`, `creator`, `group`, `options` (na raiz). |
| `/custom-fields/groups/task-type/:taskTypeId` | GET | Retorna `[]` (placeholder, conta não usa grupos). |
| `/custom-fields/groups/list/:listId` | GET | Retorna `[]`. |
| `/custom-fields` | POST | Body `{name, label, type, required?, options?, defaultValue?, validation?, config?, position?, pinned?, visibleToGuests?, fillMethod?, spaceId?|folderId?|listId?|taskTypeId?}`. `name` e `type` obrigatórios. Tipos `RELATIONSHIP`/`ROLLUP` exigem `config`; `LABEL` exige `options`. |
| `/custom-fields/:id` | PUT | Body parcial. Aceita `label`, `description`, `required`, `pinned`, `visibleToGuests`, `fillMethod`, `validation`, `config`, `defaultValue`. |
| `/custom-fields/:id` | DELETE | Retorna o objeto deletado (200, não 204). |
| `/custom-fields/task/:taskId/field/:defId` | PUT | Body `{value}`. Tipa `value` conforme tipo da def. |
| `/custom-fields/task/:taskId/field/:defId` | DELETE | Limpa valor. Retorna `{message:"Field value deleted successfully"}`. |
| `/tasks/:taskId` | GET | Embed `customFieldValues:[{id,value,customFieldId,taskId,customField:{...def}}]`. |

### 1.2 Hoppe — 19 tipos válidos (validados via POST)

Lista crua do erro: `TEXT, NUMBER, SELECT, DATE, CHECKBOX, DROPDOWN, URL, EMAIL, PHONE, CURRENCY, PERCENTAGE, DURATION, RATING, USER, TEAM, PEOPLE, RELATIONSHIP, ROLLUP, LABEL`.

| Tipo | Aceita POST simples | Requer |
|---|---|---|
| TEXT, NUMBER, SELECT, DATE, CHECKBOX, DROPDOWN, URL, EMAIL, PHONE, CURRENCY, PERCENTAGE, DURATION, RATING, USER, TEAM, PEOPLE | sim | nada extra |
| RELATIONSHIP | não | `config` obrigatório |
| ROLLUP | não | `config` obrigatório |
| LABEL | não | `options` obrigatório |

Quirks confirmadas:
- `options` em SELECT/DROPDOWN/LABEL é **array de strings** raw (`["A","B"]`), não objetos
- `config: {currency:"BRL"}` em CURRENCY
- `defaultValue` em CURRENCY com objeto/número falha (deixa null)
- `name` aceita label vazio (`""`)

### 1.3 Hoppe — shape da definition (response)

```json
{
  "id": "uuid",
  "name": "CNPJ",
  "type": "TEXT",
  "label": "",
  "description": null,
  "required": false,
  "options": [],
  "defaultValue": null,
  "validation": null,
  "config": null,
  "position": 0,
  "pinned": false,
  "visibleToGuests": true,
  "fillMethod": "manual",
  "workspaceId": "uuid",
  "createdById": "uuid",
  "createdAt": "ISO",
  "updatedAt": "ISO",
  "fixed": false,
  "groupId": null,
  "groupName": null,
  "groupPosition": null,
  "groupColor": null,
  "locationListIds": ["..."]   // só quando vem via ?spaceId/?folderId
}
```

Manager adiciona: `locations:[{id,name,type:list|folder}]`, `taskTypes:[{id,name}]`, `usageCount:number`, `creator:{id,name,email}`, `group:null`.

### 1.4 Hoppe — shape da custom field value

```json
{
  "id": "uuid",
  "value": 4672.43,                  // ou "string" ou ISO date ou array
  "customFieldId": "uuid",
  "taskId": "uuid",
  "createdAt": "ISO",
  "updatedAt": "ISO",
  "customField": { /* def embed */ }
}
```

Tipagem do `value` conforme o `type` da def:
- TEXT, EMAIL, PHONE, URL, SELECT, DROPDOWN, LABEL, DATE → string
- NUMBER, CURRENCY, PERCENTAGE, DURATION, RATING → number
- CHECKBOX → boolean
- USER → string (userId)
- TEAM → string (teamId)
- PEOPLE → string[] (userId array)
- RELATIONSHIP → string[] (taskId array, config define direção)
- ROLLUP → number ou string (computado, não setável manualmente)

### 1.5 Hoppe — UI do modal "Campos personalizados"

Trigger: botão "Gerenciar campos personalizados desta lista" dentro do bloco "Campos personalizados" da task view.

Layout:

```
+--------------------------------------------------+
| Campos personalizados                    [X]     |
+---------------+----------------------------------+
| Quick Access  | Gerencie todos os campos pers.   |
|  Todos        | [Novo grupo][Add existing][Cre.] |
|  Workspace    | [Search...] [All types ▾]        |
|  Grupos       |                                  |
|  TaskType New |  Name  Group  Locations  Creator |
| -----------   |  ----- ------ --------- -------- |
| By Location   |  ▼ Moeda (1)                     |
|  Comercial    |    Valor  Sem grupo  Lançamento  |
|  Financeiro   |  ▼ Número (1)                    |
|  RH           |    Número Sem grupo  Lançamento  |
|               |  ▼ Texto (1)                     |
|               |    CNPJ   Sem grupo  Lançamento  |
+---------------+----------------------------------+--- Detail sidebar ---+
                                                   | Selecione um campo... |
                                                   +-----------------------+
```

Comportamento:
- Quick Access "Workspace Fields" filtra defs com scope = workspace (workspaceId not null + sem space/folder/list/taskType)
- Quick Access "Task Type Fields" filtra defs ligadas a taskType
- By Location lista os spaces e ao clicar mostra defs daquele space + descendentes (folders/lists)
- Tabela agrupa por **tipo** (Moeda, Número, Texto, etc.) com contadores
- Linha selecionada abre sidebar de detalhes pra editar
- Botão "Create new field" abre drawer (não auditei o shape)
- Botão "Add existing field" abre seletor pra ligar def existente a um novo scope
- Botão "Novo grupo" cria grupo
- Search filtra por nome
- Combobox "All types" filtra por tipo

Edição inline na task:
- Bloco "Campos personalizados" mostra **2 seções**: "Campos do tipo Nota Fiscal" (defs ligadas ao taskType + heredados de folder/space) + "Campos desta lista" (defs ligadas à list)
- Quando há defs da folder/space, mostra "Herdados da pasta" como sub-seção dentro de "Campos desta lista"
- Cada campo tem ícone à esquerda + label + botão de configuração (engrenagem por campo)
- Input editado faz PUT inline via debounce
- Botão "Criar campo" cria direto no scope da task (taskTypeId)

### 1.6 ERP — superfície atual da API

| Endpoint | Método | Notas |
|---|---|---|
| `/custom-fields` | GET | `?spaceId?folderId?listId?taskTypeId`. Retorna `{space,folder,list,taskType}`. **Falta bucket `workspace`**. |
| `/custom-fields/:id` | GET | OK. |
| `/custom-fields/manager` | GET | `?scope=list|folder|space|taskType`. **Divergente do Hoppe (`all,workspace,taskType`)**. |
| `/custom-fields/groups/task-type/:taskTypeId` | GET | Retorna `[]` (placeholder). |
| `/custom-fields` | POST | OK, mas DTO exige `name` e gera slug `key`. Hoppe não tem `key`. |
| `/custom-fields/:id` | PUT | OK. |
| `/custom-fields/:id` | DELETE | Soft-delete via `deletedAt`. Hoppe é hard-delete mas retorna mesma estrutura. |
| `/tasks/:taskId/custom-fields` | GET | Legado, mantém. |
| `/tasks/:taskId/custom-fields/:defId` | PUT | Legado. |
| `/custom-fields/task/:taskId/field/:defId` | PUT | **Hoppe-compat OK**. |
| `/custom-fields/task/:taskId/field/:defId` | DELETE | **Hoppe-compat OK**. |

Envelope: ERP responde `{data, meta}`; Hoppe responde raw. Cliente do front Hoppe-compat precisa lidar.

### 1.7 ERP — 10 tipos atuais

`TEXT, NUMBER, CURRENCY, DATE, DROPDOWN, CPF, CNPJ, URL, EMAIL, PHONE`.

ERP tem CPF, CNPJ (Hoppe não). Hoppe tem 11 tipos que ERP não tem.

### 1.8 ERP — shape da definition (response)

Já tem todos os campos do Hoppe + extras: `workspaceId, name, label, description, type, required, config, defaultValue, validation, pinned, visibleToGuests, fillMethod, fixed, position, spaceId, folderId, listId, taskTypeId, createdById, creator, groupId, groupName, groupPosition, groupColor, createdAt, updatedAt`.

**Divergência crítica**: ERP entity tem só `label` no DB; o response duplica `name = entity.label`. Pra ter Hoppe-style (name e label independentes), precisa adicionar coluna `name` separada.

### 1.9 ERP — shape da custom field value

```sql
CustomFieldValue {
  id, workItemId, definitionId,
  valueText: String? @db.Text
  valueNumber: Decimal? @db.Decimal(18,4)
  valueDate: DateTime?
  createdAt, updatedAt
}
```

3 colunas tipadas. Não comporta USER/TEAM/PEOPLE/RELATIONSHIP nativamente. Não há `valueJson` nem `valueBoolean`.

Outra diferença: FK em `WorkItem` (modelo legado a deprecar — ver `project_erp_workitem_deprecation`), não `Task`.

### 1.10 ERP — frontend custom-fields

Estrutura:
```
src/features/custom-fields/
  components/
    custom-field-editor.tsx        ← dispatcher por tipo
    custom-fields-section.tsx       ← embed na task view
    fields/
      text-field, number-field, currency-field, date-field,
      dropdown-field, cpf-field, cnpj-field, email-field,
      phone-field, url-field
      field-base.ts, field-shell.tsx, masks.ts
  hooks/
    use-custom-field-definitions.ts
    use-custom-field-values.ts
    use-feature-flag.ts
  schemas/custom-field.schema.ts
  services/
    custom-field-definitions.service.ts
    custom-field-values.service.ts
  types/custom-field.types.ts
```

NÃO existe modal de manager. Não tem fluxo "criar campo a partir da task" nem "gerenciar grupos". A `CustomFieldsSection` é read+inline-edit only.

---

## 2. Tabela de gaps

| # | Área | Hoppe | ERP hoje | Gap | Severidade |
|---|---|---|---|---|---|
| G1 | Enum types | 19 (TEXT...LABEL) | 10 (TEXT...PHONE + CPF, CNPJ) | Faltam 9 (SELECT, CHECKBOX, PERCENTAGE, DURATION, RATING, USER, TEAM, PEOPLE, RELATIONSHIP, ROLLUP, LABEL) | alta |
| G2 | name vs label | 2 campos separados | 1 coluna (`label`); `name` é alias | Adicionar coluna `name` no DB | média |
| G3 | options shape | `options: string[]` na raiz | `config.options:[{value,label}]` | Migrar shape de options; manter compat ou virar 1:1 | alta |
| G4 | CustomFieldValue | 1 coluna `value` JSON | 3 colunas tipadas (text/number/date) | Adicionar `valueJson` ou substituir tudo por uma coluna JSON | alta |
| G5 | Manager scope | `all,workspace,taskType` | `list,folder,space,taskType` | Aceitar os 3 do Hoppe (ou ambos) | alta |
| G6 | GET sem param | retorna `{workspace}` | retorna `{space,folder,list,taskType}` sem bucket workspace | Adicionar bucket `workspace` no grouped response | alta |
| G7 | GET com filtro | `?taskTypeId` → `{taskType,workspace}`; `?listId` → 4 buckets sem workspace | sempre 4 buckets (sem workspace) | Adicionar bucket workspace nos retornos com filtro | média |
| G8 | UI Manager modal | Modal completo (sidebar+tabela+detalhes) | NÃO existe | Criar modal `CustomFieldsManagerDialog` com sidebar+tabela+detail | alta |
| G9 | Group como entidade | Objeto `group:{id,name,position,color}` (sugere tabela própria) | 4 colunas flat (groupId, groupName, groupPosition, groupColor) | Tabela `CustomFieldGroup` separada + FK | média |
| G10 | Endpoints de groups | `/custom-fields/groups/task-type/:id` retorna `[]`; possível CRUD não auditado | endpoint placeholder retornando `[]` | Implementar CRUD de groups se Hoppe expuser | baixa (depois) |
| G11 | DELETE hard vs soft | Hoppe parece hard-delete | ERP soft-delete | Manter ERP soft (vantagem); response não muda | baixa |
| G12 | Envelope ApiResponse | raw object | `{data, meta}` | Manter como está (regra do ERP) ou expor route sem envelope pra Hoppe-compat. Decisão fora deste plano. | baixa |
| G13 | Slug `key` | não existe | obrigatório, derivado de `name` | Manter `key` interno (continua único per workspace), expor opcional na criação | baixa |
| G14 | Feature flag write | não existe | `FEATURE_CUSTOM_FIELDS_WRITE_ENABLED` | Manter no ERP (vantagem, controla rollout) | baixa |
| G15 | Builtins (isBuiltin) | não tem (`fixed: false` em todos) | tem, retorna 403 em update/delete | Manter no ERP (vantagem) | baixa |
| G16 | Outbox event | não tem | emite `CUSTOM_FIELD_VALUE_CHANGED` | Manter no ERP | baixa |
| G17 | Embed em GET /tasks | `task.customFieldValues:[{id,value,customField:{...}}]` | já existe via include? checar | Confirmar embed | média |
| G18 | Frontend types | 10 tipos no union | 10 no union | Estender pra 19 + editores novos | alta |
| G19 | CPF/CNPJ (extras ERP) | não tem | sim (validators dedicados) | Manter (especificidade Mundial) ou remover (1:1 estrito) | DECISÃO |
| G20 | locationListIds no response | aparece em GET `?spaceId/?folderId` | não existe | Adicionar campo computado | baixa |
| G21 | Group queries auxiliares | `/custom-fields/groups/list/:listId` retorna `[]` | só task-type | Adicionar rota | baixa |

---

## 3. Decisões pendentes (perguntar antes de codar)

### D1. CPF/CNPJ permanecem?
- **A**. Manter (10 tipos legados ERP + 11 novos do Hoppe = 21 totais). Quebra paridade estrita mas mantém validators existentes (cnpj-field, cpf-field, validators dedicados).
- **B**. Remover do enum; migrar defs existentes pra TEXT + validation.pattern. 1:1 estrito mas perde 4 arquivos de validator e UX de máscara dedicada.
- **C**. Remover do enum mas manter os componentes de field como helper opcional (configurável via `config.kind: "cpf"` no TEXT).

Recomendado: **A** (manter, ganha pouco perdendo).

### D2. CustomFieldValue como mono-coluna JSON ou aditivo `valueJson`?
- **A**. **Aditivo**: adicionar `valueJson Json?` mantendo `valueText/valueNumber/valueDate`. Tipos novos (USER, PEOPLE, etc) usam `valueJson`. Migration aditiva, sem reescrever valores existentes.
- **B**. **Substituir**: trocar 3 colunas por `value Json` único + migration que move dados. Mais limpo, mais arriscado.

Recomendado: **A** (aditivo, rollback fácil). Dispatcher decide qual coluna usar conforme tipo.

### D3. options shape — quebrar API atual ou aceitar os dois?
- **A**. **Hoppe-puro**: response retorna `options: string[]` na raiz. POST aceita `options: string[]`. Migração de defs existentes (mover `config.options[].value` pra raiz).
- **B**. **Compat dual**: aceita ambos no POST; response retorna AMBOS (`options: string[]` E `config.options`). Frontend escolhe.
- **C**. Manter shape ERP (`config.options[{value,label}]`); divergência permanece.

Recomendado: **A** (1:1 estrito). Frontend ajusta.

### D4. Tabela `CustomFieldGroup` separada?
- **A**. Criar `CustomFieldGroup {id, workspaceId, name, color, position}` + FK em CFD via `groupId`. Remover colunas flat. Migration move dados.
- **B**. Manter flat (G9 fica como divergência aceita). Funciona idêntico do ponto de vista da UI.

Recomendado: **A** (cleaner, casa com Hoppe; permite reordenar grupos sem mexer em N defs).

### D5. Schema `value` JSON — usar `Json` do Prisma ou serializar string?
- `Json` é melhor pra typing e indexação parcial. Migration aditiva. **Recomendado**.

### D6. Manager scope — substituir ou aceitar ambos?
- **A**. **Substituir**: aceitar só `all,workspace,taskType`. Frontend Hoppe-compat. Quebra o frontend ERP que pode estar usando `list/folder/space`.
- **B**. **Aceitar ambos**: enum vira `all, workspace, taskType, list, folder, space` (6). Hoppe-compat funciona.

Recomendado: **B**, com nota de deprecação dos 3 do ERP.

### D7. UI manager — criar do zero ou adaptar lib?
- ERP usa shadcn/ui + Tailwind. Vou modelar componente novo `CustomFieldsManagerDialog` espelhando Hoppe (sidebar+tabela+detail).

---

## 4. Plano de implementação por sprint

Convenção: cada sprint vira PR isolado, deploy independente, rollback por reverter o commit.

### Sprint 1 — Schema (backend) [DB CHANGES]

Migration `20260514_custom_fields_hoppe_parity_schema`:

1. **Enum `CustomFieldType`**: adicionar 11 valores em ordem alfabética
   ```sql
   ALTER TYPE "CustomFieldType" ADD VALUE 'CHECKBOX';
   ALTER TYPE "CustomFieldType" ADD VALUE 'DURATION';
   ALTER TYPE "CustomFieldType" ADD VALUE 'LABEL';
   ALTER TYPE "CustomFieldType" ADD VALUE 'PEOPLE';
   ALTER TYPE "CustomFieldType" ADD VALUE 'PERCENTAGE';
   ALTER TYPE "CustomFieldType" ADD VALUE 'RATING';
   ALTER TYPE "CustomFieldType" ADD VALUE 'RELATIONSHIP';
   ALTER TYPE "CustomFieldType" ADD VALUE 'ROLLUP';
   ALTER TYPE "CustomFieldType" ADD VALUE 'SELECT';
   ALTER TYPE "CustomFieldType" ADD VALUE 'TEAM';
   ALTER TYPE "CustomFieldType" ADD VALUE 'USER';
   ```

2. **CustomFieldDefinition**: adicionar `name` separado de `label`
   ```sql
   ALTER TABLE "custom_field_definitions" ADD COLUMN "name" VARCHAR(120);
   UPDATE "custom_field_definitions" SET "name" = "label";
   ALTER TABLE "custom_field_definitions" ALTER COLUMN "name" SET NOT NULL;
   ```

3. **CustomFieldDefinition.options**: nova coluna `options` JSON
   ```sql
   ALTER TABLE "custom_field_definitions" ADD COLUMN "options" JSONB DEFAULT '[]'::jsonb;
   UPDATE "custom_field_definitions" SET "options" = COALESCE(config->'options', '[]'::jsonb)
     WHERE "type" IN ('DROPDOWN','SELECT');
   ```
   (Move `config.options[{value,label}]` → simplifica pra `[v1,v2]` no app, ou aceita objeto e o dispatcher resolve.)

4. **CustomFieldValue.valueJson**: aditivo
   ```sql
   ALTER TABLE "custom_field_values" ADD COLUMN "value_json" JSONB;
   ALTER TABLE "custom_field_values" ADD COLUMN "value_boolean" BOOLEAN;
   ```

5. **CustomFieldGroup**: nova tabela (D4 = A)
   ```sql
   CREATE TABLE "custom_field_groups" (
     "id" TEXT PRIMARY KEY,
     "workspace_id" TEXT NOT NULL REFERENCES "workspaces"(id),
     "name" VARCHAR(120) NOT NULL,
     "color" VARCHAR(20),
     "position" INTEGER DEFAULT 0,
     "created_at" TIMESTAMPTZ DEFAULT NOW(),
     "updated_at" TIMESTAMPTZ DEFAULT NOW()
   );
   ALTER TABLE "custom_field_definitions" ADD CONSTRAINT "cfd_group_fk"
     FOREIGN KEY ("group_id") REFERENCES "custom_field_groups"("id") ON DELETE SET NULL;
   -- backfill: pra cada (workspaceId, groupName, groupColor) único, criar 1 row e atualizar groupId
   ```
   Manter colunas flat por 1 sprint pra rollback, dropar em sprint posterior.

6. **Index**: `@@index([workspaceId, type])` em CustomFieldDefinition (manager filtra por type).

**Validação**:
- `prisma migrate dev` em local roda sem erro
- Seeds dos builtins continuam funcionando (TEXT, CURRENCY, etc.)
- Query `SELECT type, COUNT(*) FROM custom_field_definitions` mostra distribuição esperada

**Rollback**: reverter migration via downgrade SQL (ALTER TABLE DROP COLUMN para options/valueJson/valueBoolean/name; DROP TABLE custom_field_groups; ALTER TYPE não é facilmente reversível em PG, OK aceitar).

---

### Sprint 2 — Validators e dispatchers (backend)

1. **field-type-dispatch.ts**: estender switch case pros 9 tipos novos
   - SELECT → string presente em `def.options[]` (na raiz, não config.options)
   - CHECKBOX → boolean
   - PERCENTAGE → number 0..100 (config.min/max optional)
   - DURATION → number ms ou objeto `{value, unit}` conforme config
   - RATING → number 0..config.maxStars (default 5)
   - USER → string (userId), valida que existe via `usersRepo.exists`
   - TEAM → string (teamId), valida via `teamsRepo.exists` se tabela existir; senão accept-any
   - PEOPLE → string[] (array de userIds), cada validado
   - RELATIONSHIP → string[] (taskIds) + `config:{taskTypeId,direction}` valida coerência
   - ROLLUP → readonly (não set, retorna 422 em PUT direto)
   - LABEL → string em `def.options[]` (igual SELECT mas multi-purpose visual)

2. **Adicionar coluna de destino no result do dispatch**:
   ```ts
   export interface FieldDispatchResult {
     valid: boolean;
     normalized?: NormalizedValue;
     column: 'valueText' | 'valueNumber' | 'valueDate' | 'valueJson' | 'valueBoolean';
     reason?: string;
   }
   ```
   Service usa `result.column` pra escolher onde gravar.

3. **DTO updates**:
   - `CreateCustomFieldDefinitionDto`: adicionar `name` (separado de label), `options: string[]` opcional, validar conforme type
   - `update-custom-field-definition.dto`: idem
   - `set-custom-field-value.dto`: aceitar `value: unknown` (JSON arbitrário)

4. **Service `CustomFieldDefinitionsService.create`**: validar requirements por tipo (RELATIONSHIP/ROLLUP exigem config; LABEL/SELECT exigem options).

5. **Service `CustomFieldValuesService.setValue`**: usa nova coluna conforme dispatch.column.

**Testes**:
- `field-type-dispatch.spec.ts` ganha 11 casos (1 happy + 1 erro por tipo novo)
- E2E: criar def CHECKBOX, setar value true/false; PEOPLE com array de userIds; RELATIONSHIP com taskIds válidos.

---

### Sprint 3 — Manager scope e GET responses (backend)

1. **manager-custom-fields-query.dto.ts**: estender enum `ManagerScope`
   ```ts
   export type ManagerScope = 'all' | 'workspace' | 'taskType'  // Hoppe-compat
     | 'list' | 'folder' | 'space';                              // legado ERP
   ```

2. **Service `manager`**: novos cases
   - `all` → retorna todas as defs visíveis no workspace
   - `workspace` → filtra `workspaceId NOT NULL AND spaceId IS NULL AND folderId IS NULL AND listId IS NULL AND customTaskTypeId IS NULL`
   - `taskType` → como hoje

3. **Service `list`**: adicionar bucket `workspace` no `GroupedCustomFieldsResponseDto`
   ```ts
   export class GroupedCustomFieldsResponseDto {
     workspace!: CustomFieldDefinitionResponseDto[];  // NOVO
     space!: ...; folder!: ...; list!: ...; taskType!: ...;
   }
   ```
   Sem filtro: apenas `workspace` populado. Com filtro: respeita Hoppe.
   - `?listId=X` → `{list:[...], folder:[...], space:[...], taskType:[...]}` (sem workspace, igual Hoppe)
   - `?taskTypeId=X` → `{taskType:[...], workspace:[...]}` (igual Hoppe)
   - `?spaceId=X` ou `?folderId=X` → `{list:[...]}` com `locationListIds` em cada item

4. **Response DTO**: expor `name` separado de `label` (corrigir `dto.name = entity.label`).

5. **Manager response**: adicionar `options` na raiz (não dentro de config).

**Testes**:
- E2E em `custom-field-definitions.controller.e2e-spec.ts`: 7 cenários de GET (sem param, com listId, com taskTypeId, com spaceId, com folderId, com listId+taskTypeId, manager scope=all/workspace/taskType).

---

### Sprint 4 — Groups como entidade (backend)

1. **CustomFieldGroup**: novo módulo `src/modules/custom-fields/groups/`
   - Entity + repo + service + controller
   - Rotas:
     - `GET /custom-fields/groups?workspaceId=...` (lista todos)
     - `GET /custom-fields/groups/task-type/:taskTypeId` (já existe placeholder, ligar ao módulo novo)
     - `GET /custom-fields/groups/list/:listId` (novo)
     - `POST /custom-fields/groups` body `{name, color, position}`
     - `PUT /custom-fields/groups/:id`
     - `DELETE /custom-fields/groups/:id`

2. **Ligação com CustomFieldDefinition**: response embed `group: {id, name, position, color}` quando `groupId` populado.

3. **Migration**: dropar colunas flat (`groupName, groupPosition, groupColor`) depois de backfill confirmado e 1 sprint de coexistência.

---

### Sprint 5 — Frontend types + dispatcher de editor

1. **types/custom-field.types.ts**: estender union `CustomFieldType` pros 19 (+ CPF/CNPJ se mantidos).

2. **Novos componentes em `components/fields/`**:
   - `select-field.tsx` (similar dropdown mas string em options[])
   - `checkbox-field.tsx`
   - `percentage-field.tsx`
   - `duration-field.tsx` (input com seletor de unidade)
   - `rating-field.tsx` (5 estrelas, config.maxStars)
   - `user-field.tsx` (autocomplete sobre users do workspace)
   - `team-field.tsx`
   - `people-field.tsx` (multi-user)
   - `relationship-field.tsx` (autocomplete sobre tasks do taskType configurado)
   - `rollup-field.tsx` (display readonly)
   - `label-field.tsx` (chip colorido a partir de options[])

3. **custom-field-editor.tsx**: estender switch pros tipos novos. Manter castStringProps pra os que aceitam só string.

4. **custom-fields-section.tsx**: ajustar `normalizeScalar` pros tipos novos (PEOPLE retorna array, etc.).

5. **services/custom-field-definitions.service.ts**: ajustar payload pra `options: string[]` na raiz; ler `name` e `label` separados.

6. **services/custom-field-values.service.ts**: aceitar `value: unknown` (JSON).

7. **schemas/custom-field.schema.ts**: Zod schemas pros 19 tipos.

**Stories e tests**: cada novo field component ganha `.stories.tsx` e `.test.tsx` espelhando os existentes.

---

### Sprint 6 — Frontend UI Manager modal

1. **`features/custom-fields/components/manager/`** (pasta nova):
   - `custom-fields-manager-dialog.tsx` (modal raiz com layout 3 colunas)
   - `manager-quick-access-sidebar.tsx` (sidebar esquerda)
   - `manager-by-location-list.tsx` (lista de spaces)
   - `manager-fields-table.tsx` (tabela agrupada por tipo, com TanStack Table)
   - `manager-field-detail-sidebar.tsx` (sidebar direita pra editar def selecionada)
   - `manager-create-field-drawer.tsx` (drawer "Create new field")
   - `manager-add-existing-field-drawer.tsx` ("Add existing field" — liga def já existente a novo scope)
   - `manager-new-group-dialog.tsx`

2. **Hooks**:
   - `use-custom-fields-manager.ts` (estado global do modal)
   - `use-custom-field-groups.ts` (CRUD de groups)

3. **Integração na TaskView**: adicionar botão "Gerenciar campos personalizados desta lista" dentro do header da section `CustomFieldsSection` que abre o modal pré-filtrado por `listId`.

4. **Botão "Criar campo" inline** dentro de "Campos do tipo X" e "Campos desta lista" (cria direto sem abrir modal, pra UX rápida).

5. **Sub-seção "Herdados da pasta"** dentro de "Campos desta lista" quando há defs do folder/space.

**Testes**: Storybook full coverage + Playwright e2e do fluxo "Abrir manager → criar campo SELECT → ver na tabela → editar → deletar".

---

### Sprint 7 — Cleanup e telemetria

1. Dropar colunas flat de group (groupName/Position/Color).
2. Atualizar `custom-fields-prometheus.metrics.ts` pros novos tipos.
3. Atualizar `README.md` do módulo.
4. Migrar defs existentes que usam `config.options[{value,label}]` pra `options:string[]` na raiz; remover lógica de leitura do shape antigo.
5. Atualizar `PLANO-CUSTOMFIELDS-ADAPTACAO.md` (seed por taskType) com os tipos novos quando aplicável.
6. Atualizar memórias:
   - `reference_hoppe_custom_fields.md` (refletir 19 types validados + manager scope correto)
   - `project_erp_custom-fields-module.md` (refletir 19 types + value JSON + groups separados)

---

## 5. Estimativa e ordem

| Sprint | Escopo | Esforço | Bloqueio? |
|---|---|---|---|
| 1 | Schema + migration | 1d | nenhum |
| 2 | Dispatcher backend | 2d | depende de 1 |
| 3 | Manager scope + GET | 1d | depende de 1 |
| 4 | Groups entidade | 1d | depende de 1 |
| 5 | Frontend types + 11 fields | 3d | depende de 2 |
| 6 | UI Manager modal | 3-4d | depende de 5 e 4 |
| 7 | Cleanup | 1d | depende de tudo |
| **Total** | | **~12-13d** | |

Ordem de PR: 1 → 2 → 3 (paralelo com 4) → 5 → 6 → 7.

---

## 6. Validação ponta-a-ponta

Após sprint 6, rodar este teste manual no ambiente de homologação:

1. Abrir uma task no ERP
2. Clicar "Gerenciar campos personalizados desta lista"
3. Modal abre com sidebar (Quick Access + By Location)
4. Clicar "Workspace Fields" → mostra só workspace-level
5. Clicar space "Comercial" → mostra defs do space + descendentes
6. Voltar pra "Todos os campos personalizados"
7. Clicar "Create new field" → drawer abre
8. Criar SELECT com options `["A","B","C"]` no scope da list atual
9. Fechar modal, ver campo aparecer em "Campos desta lista"
10. Setar valor "B" via dropdown → persiste, refetch task mostra `customFieldValues[].value = "B"`
11. Criar PEOPLE → setar array de userIds → persiste
12. Criar RELATIONSHIP → config:`{taskTypeId: "...", direction: "outbound"}` → setar array de taskIds → persiste
13. Voltar pro manager, editar SELECT criado → mudar `required: true` → save
14. Deletar SELECT → some da tela
15. Verificar via SQL: row mantida com `deletedAt NOT NULL` (soft-delete ERP)

Critérios de aceite:
- Todos os 19 tipos criam, editam, deletam
- Valores persistem corretamente (text/number/date/json/boolean conforme tipo)
- Manager retorna `usageCount` correto
- UI espelha layout do Hoppe (não precisa pixel-perfect, mas estrutura idêntica)
- Endpoints retornam shape compatível com cliente Hoppe (testar com cliente axios padrão Hoppe)

---

## 7. Riscos e mitigações

| Risco | Mitigação |
|---|---|
| Migration de enum em produção pode travar Postgres (lock) | Rodar fora de pico, em transação separada, com `ALTER TYPE ... ADD VALUE` que é não-bloqueante em PG 12+ |
| Backfill de `name = label` em tabela grande | Indexar antes; rodar em batches se >100k rows |
| Frontend quebra pra defs antigas com `config.options[{value,label}]` | Sprint 5 mantém leitura dual (raiz + config); sprint 7 dropa config.options |
| Tipos novos no enum sem editor no front | Default fallback `null` no switch do editor; UI degrada pra "tipo não suportado nesta versão" |
| Hard delete vs soft delete divergente | Mantém soft-delete ERP; nada quebra (response idêntico ao Hoppe) |
| Performance do manager `scope=all` em workspaces grandes | Index em `(workspaceId, deletedAt)` já existe; paginação fica pra sprint futura se necessário |

---

## 8. Não-escopo (não vai entrar)

- Refator do CustomFieldValue → Task FK (hoje FK em WorkItem; ver `project_erp_workitem_deprecation`). Fica pra projeto separado.
- Sync bidirecional com Hoppe (importar custom fields do Hoppe pro ERP via API). Fica pra projeto separado.
- CustomFieldGroup com permissions por role. Fica fora.
- Type-specific permissions (ex.: só admin cria RELATIONSHIP). Fica fora.
- Internationalization dos labels. Fica fora.

---

## 9. Checklist final antes de codar

- [ ] Decidir D1 (CPF/CNPJ mantém?)
- [ ] Decidir D2 (CustomFieldValue aditivo vs substituir)
- [ ] Decidir D3 (options shape)
- [ ] Decidir D4 (CustomFieldGroup separada vs flat)
- [ ] Decidir D6 (manager scope substituir vs aceitar ambos)
- [ ] Confirmar ordem dos sprints
- [ ] Aprovar plano

Depois disso, sprint 1 vira issue/PR e o ciclo começa.
