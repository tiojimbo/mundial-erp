# PLANO — Automations ERP × Paridade Hoppe

Data da auditoria: 2026-05-20
Branch auditada: feat/hoppe-sprint-b
Auditor: agent-cto

---

## Veredito em uma linha

**Parcialmente funcional.** Um admin consegue criar e salvar uma automação pela UI, e várias triggers/actions funcionam. Mas 5 triggers nunca disparam (registrados no listener, nunca emitidos), o scope é forçado a WORKSPACE no front, CRON e conditions não têm UI e há bugs latentes (statuses por list ignorados, acoplamento ao WorkItem deprecado).

---

## 1. Mapa lado a lado

### Catálogo

| Item | Hoppe | ERP backend | ERP front |
|---|---|---|---|
| Triggers (enums) | 18 | 18 | consome via GET /triggers |
| Actions (enums) | 21 | 21 catalogadas, 19 executáveis | consome via GET /actions |
| Param types | 12 | string/number/boolean/date/enum/reference/json | renderiza todos |

### Endpoints

| Endpoint | Hoppe | ERP |
|---|---|---|
| GET /ai/automation/triggers | sim | sim |
| GET /ai/automation/actions | sim | sim |
| GET /ai/automation/statuses | sim (achatado) | sim (agrupado por spaces/folders) |
| GET /ai/automation | sim | sim |
| GET /ai/automation/:id | sim | sim |
| POST /ai/automation (estruturado) | sim | sim |
| POST /ai/automation (naturalLanguageRule) | sim, via OpenRouter | nao existe |
| PUT /ai/automation/:id | sim | sim |
| POST /ai/automation/:id/toggle | sim | sim |
| DELETE /ai/automation/:id | hard delete | soft delete (deletedAt + isActive=false) |

### UI

| Componente | Hoppe | ERP |
|---|---|---|
| AutomationsModal global | sim | sim, no header (botão Zap) |
| Builder visual (trigger + actions) | sim | sim, layout 2 colunas |
| Param renderer dinamico | sim | sim, 7 tipos |
| Selector de scope (list/folder/space/ws) | sim | **forcado WORKSPACE no front** |
| CRON: cronExpression + timezone | sim | **sem campos no builder** |
| Conditions editor | sim | **sem editor** |
| Naturallanguage textarea | sim | **nao existe** |
| Acesso por list/folder | sim, botão no header da lista | **nao existe** |
| Tabs (Manage / Browse / Usage) | só Manage relevante | só Manage relevante |

---

## 2. Achados criticos

### P0 — 5 triggers nunca disparam (bug silencioso)

`AutomationListener` registra `@OnEvent` pra 17 triggers (todos menos CRON), mas o `TaskEventsPublisher` só é injetado em `tasks.service.ts`, que emite apenas 12 deles.

Emitidos hoje (em [tasks.service.ts](mundial-erp-api/src/modules/tasks/tasks.service.ts)):
- TASK_CREATED
- TASK_UPDATED
- TASK_STATUS_CHANGED
- TASK_PRIORITY_CHANGED
- TASK_NAME_CHANGED
- TASK_TYPE_CHANGED
- TASK_DUE_DATE_CHANGED
- TASK_START_DATE_CHANGED
- TASK_MOVED_TO_LIST
- TASK_ASSIGNED
- ASSIGNEE_REMOVED
- SUBTASK_CREATED

NÃO emitidos em lugar nenhum (módulo dono não importa o publisher):
- **TAG_ADDED** — quem adiciona tag em task não emite
- **TAG_REMOVED** — idem
- **COMMENT_CREATED** — comments module não emite
- **ALL_SUBTASKS_RESOLVED** — ninguém calcula essa condição
- **CUSTOMFIELD_CHANGED** — custom-fields module não emite

Consequência prática: um usuário cria uma automação com gatilho "Quando comentário criado → notificar gerente", salva, valida no GET /:id, mas ela nunca roda. `executionCount` fica em 0 pra sempre. Não há mensagem de erro, não há aviso. É falha silenciosa, o pior tipo.

**Correção:** injetar `TaskEventsPublisher` nos 5 módulos donos (tags, comments, subtasks, custom-fields) e chamar `emit*` nas mutações relevantes. Cada um é mudança pequena (~5 linhas no service do módulo). Total estimado: 1 dia.

Alternativa defensiva (P1): no UI, esconder esses 5 triggers do dropdown até o emit ser implementado. Marca de "ativando em breve".

### P0 — Scope hardcoded a WORKSPACE no front

[automation-builder-view.tsx:203](mundial-erp-web/src/features/automations/components/automation-builder-view.tsx#L203):

```ts
scopeType: 'WORKSPACE',
```

Não tem UI pra escolher LIST/FOLDER/SPACE, nem pra escolher `scopeId`. Toda automação criada pelo usuário vira global no workspace. No Hoppe, automações ficam no escopo da lista onde foram criadas (o builder abre a partir do header da lista).

**Impacto:** Se a Mundial tem 10 fluxos diferentes em 10 listas, todas precisariam virar uma única regra global ou criar condições complexas. Inviável na prática.

**Correção:** Adicionar selector de scope no builder. Duas opções:
1. Fluxo Hoppe — abrir builder a partir de um botão no header da lista/folder/space, já com scope preenchido (recomendado)
2. Selector dentro do builder com 4 opções e auto-complete pra escolher entity

Estimativa: 1-2 dias (UI + integração com endpoints de busca de list/folder/space que já existem).

### P1 — CRON trigger sem UI

`AutomationTrigger.CRON` existe no enum, está no catálogo, e o `CronSchedulerService` roda. Mas o builder não tem campo pra `cronExpression` nem `timezone`. Se o usuário escolher "CRON" no dropdown, o save passa (`compiledActions` válido, name preenchido), mas o backend salva com `cronExpression: null` e a automação nunca dispara.

**Correção:** quando trigger === 'CRON', mostrar dois campos extras (cronExpression livre ou seletor "todo dia às X" + timezone IANA). Validar no isValid. Estimativa: meio dia.

### P1 — Conditions não tem UI

Backend tem `automation.processor.ts` que avalia condições com AND lógico. DTOs aceitam `conditions: ConditionDef[]`. Mas o builder não tem editor de condições. Resultado: toda automação dispara sempre que o trigger ocorre, sem filtragem.

**Impacto prático:** "Quando task muda de status PARA DONE" precisa ser "quando task muda status" + condition `newStatus = DONE`. Sem condition editor, o usuário recebe execução em toda mudança de status e precisa fazer o filtro do lado do action — o que muitas actions não permitem.

**Correção:** UI condicional, idealmente reusando os mesmos selectors de param que o ActionCard tem. Estimativa: 2-3 dias.

### P1 — `allStatuses` ignora lists

[automation-builder-view.tsx:129-147](mundial-erp-web/src/features/automations/components/automation-builder-view.tsx#L129-L147):

```ts
const allStatuses = useMemo(() => {
  if (!statuses.data) return [];
  return [
    ...statuses.data.spaces.flatMap(...),
    ...statuses.data.folders.flatMap(...),
  ];
}, [statuses.data]);
```

Só agrupa statuses de spaces e folders. Se uma list tem statuses próprios (que é o padrão Hoppe), eles não aparecem no dropdown da action `change_status`. Usuário não consegue mover task para um status de list-level.

**Correção:** repository.listStatusesByScope incluir statuses de scope=LIST. Frontend adicionar `statuses.data.lists.flatMap(...)`. Estimativa: meio dia.

### P2 — Acoplamento ao WorkItem deprecado

Toda action no [action-runner.service.ts](mundial-erp-api/src/modules/automations/engine/action-runner.service.ts) usa `prisma.workItem`. A memória project_erp_workitem_deprecation diz que WorkItem será removido quando Tasks ficar 1:1 com Hoppe. No dia da remoção, todas as 19 actions quebram simultaneamente.

**Correção:** quando a migração de WorkItem → Task acontecer, esse módulo entra no escopo. Hoje é P2.

### P2 — Sem NL/AI (naturalLanguageRule)

Hoppe permite criar automação com texto natural via OpenRouter. ERP não tem. Considerando que OpenRouter da Mundial está sem créditos (memória reference_hoppe_automations_e_ai), o próprio Hoppe não consegue usar isso hoje. Pode ficar pra depois.

**Decisão sugerida:** descartar essa feature até resolver custos de LLM e ter clareza de ROI. Não bloqueia paridade funcional.

### P2 — 2 actions não implementadas

`send_channel_message` e `send_direct_message` retornam `status: 'not_implemented'`. Depende do módulo chat estar pronto. Hoje os usuários da Mundial não usam chat ainda, então low priority.

### P2 — `delete` é soft no ERP, hard no Hoppe

Divergência pequena de comportamento. ERP soft delete é mais seguro. Não muda nada pro usuário final. Manter como está.

---

## 3. O que JÁ funciona end-to-end hoje

Um cenário realista que funciona hoje pela UI:

1. Usuario abre o app
2. Clica no botão "Automações" (Zap) no header
3. Clica em "Adicionar automação"
4. Da um nome ("Notificar gerente quando task vira urgente")
5. Escolhe trigger "Tarefa: prioridade alterada"
6. Escolhe action "Enviar notificação"
7. Preenche params: userIds (UUID livre — não tem picker) e message
8. Clica em Criar
9. Vai pra qualquer task, muda priority pra URGENT
10. Notificação é criada em poucos ms

Funciona. Mas note os calos:
- Sem filtragem por "só quando priority muda PARA urgent" (sem conditions)
- Sem picker de usuário (precisa colar UUID)
- Vale pra todo o workspace, não dá pra restringir a uma lista
- Se quiser disparar quando alguém comenta na task, não vai funcionar (trigger COMMENT_CREATED não é emitido)

---

## 4. Plano priorizado

### Sprint imediato (1 semana, P0 + 1 P1)

| # | Tarefa | Camadas tocadas (ordem standard) | Estimativa | Quem mexe |
|---|---|---|---|---|
| 1 | Emitir 5 triggers faltantes: importar `AutomationsModule` (já `@Global`) e chamar `TaskEventsPublisher.emit*` nos services de tags, comments, subtasks, custom-fields | service | 1d | backend |
| 2 | Selector de scope no builder: types → service HTTP de busca de list/folder/space (já existem) → hook RQ → schema Zod (`scopeId` obrigatório quando scopeType≠WORKSPACE) → componente picker → integração no builder + remover hardcode | types→service→hook→schema→componente | 1-2d | front |
| 3 | Campos cronExpression + timezone no builder quando trigger=CRON: schema Zod (cronExpression obrigatório) + 2 FormField condicionais + DTO backend (`@ValidateIf` em CreateAutomationDto) | schema→DTO→componente | 0.5d | full-stack |
| 4 | Statuses scope LIST: repository.listStatusesByScope adicionar `lists: [...]` → response DTO atualizar shape → front consumir `statuses.data.lists.flatMap(...)` | repo→DTO→front | 0.5d | full-stack |
| 5 | Cobertura de testes: `*.spec.ts` unitários (publisher chamado nos 5 services novos) + 1 `*.e2e-spec.ts` por cenário crítico (TASK_CREATED→change_status, COMMENT_CREATED→send_notification, CRON→call_webhook) | spec + e2e-spec | 1d | QA + backend |

Resultado esperado: usuário não-dev consegue criar automações úteis no escopo certo, com gatilhos confiáveis.

### Sprint seguinte (1-2 semanas, P1 restantes)

| # | Tarefa | Camadas tocadas (ordem standard) | Estimativa |
|---|---|---|---|
| 6 | Editor de conditions: types `ConditionDef` → service (já recebe `conditions`) → schema Zod (validar field/operator/value) → componente `ConditionRow` reusando ParamField → integração no builder | types→schema→componente | 2-3d |
| 7 | Botão "Automações" no header de cada lista: novo componente em `features/processes/components/` que abre AutomationsModal já com scope preenchido | componente | 1d |
| 8 | Pickers reference (user/list/tag/task-type): para cada tipo — service HTTP + hook RQ + componente Combobox shadcn → substituir input UUID no `ParamField` | service→hook→componente | 2d |
| 9 | Painel "Execuções": novo endpoint `GET /ai/automation/:id/executions` (model + migration + repo + service + DTO + controller) → types front → hook RQ → componente tabela | 14-etapas completas | 2d |

Resultado esperado: paridade funcional completa com Hoppe, exceto NL/AI.

### Backlog (P2)

- Implementar send_channel_message / send_direct_message (depende de módulo chat)
- Avaliar custo/benefício de NL via OpenRouter (depende de decisão de orçamento)
- Migrar action-runner de WorkItem para Task quando deprecation acontecer
- Hard delete (alinhar com Hoppe) — opcional

---

## 5. Riscos

- **Risco 1: rodar a Sprint imediata sem o item 2 (scope)** — usuários vão criar regras globais que afetam tudo e gerar incidentes ("por que minha task mudou sozinha?"). NÃO faça o item 1 sem o 2.
- **Risco 2: emitir COMMENT_CREATED antes de testar performance** — comentários acontecem em volume alto. Listener carrega automações via cache, mas vale rodar load test antes de subir pra prod.
- **Risco 3: deprecação de WorkItem** — se isso vier antes da paridade ficar pronta, o esforço acumulado vai precisar ser refeito. Vale alinhar timing com o roadmap de Tasks.

---

## 6. Conformidade com Standards Bravy

Auditoria do plano e do código atual contra `.claude/standards/99-referencia-completa.md`.

### Alinhado ✓

- **Camadas (regras 2, 5, 6):** Controller → Service → Repository preservados em todo o módulo.
- **Soft delete (regra 10):** `DELETE` faz soft (`deletedAt + isActive=false`). Mantido no plano.
- **Validação obrigatória (regra 12):** DTOs com `class-validator` no backend (`CreateAutomationDto`, `UpdateAutomationDto`).
- **Logger (regra 4):** `Logger` do Nest em `automation.listener.ts` e `action-runner.service.ts`. Zero `console.log`.
- **Operações pesadas em fila:** execução vai pra BullMQ via `QUEUE_AUTOMATION_EXECUTION`. Endpoint POST retorna em ms.
- **Zero `any`:** types explicitos em todo o módulo (revisado durante a auditoria).
- **Repository isolado (regra 6):** zero Prisma direto no service. ActionRunner usa Prisma mas é o caso especial documentado (motor de execução).

### Drift consciente do padrão (registrar como exceção)

| Item | Padrão Bravy | Estado atual | Justificativa |
|---|---|---|---|
| Rota `/ai/automation` (singular) | `/api/v1/` + kebab-case **plural** | singular, sem prefixo `/api/v1/` no controller | Paridade 1:1 com Hoppe. O front consome assim e o Hoppe expõe assim. |
| `@SkipResponseTransform()` no controller | Envelope `{data, meta}` obrigatório (regra 11) | retorna arrays/objetos crus | Mesma razão — Hoppe não usa envelope, paridade exige resposta crua. |

Ambos os drifts devem ser registrados como ADR (ex: `.claude/adr/0XX-automations-paridade-hoppe.md`) explicando que esse módulo é paridade espelhada com sistema externo e por isso quebra dois pontos do standard de forma deliberada. Não replicar em outros módulos.

### Cuidados a aplicar nas próximas tarefas (Sprint imediato e seguinte)

- **Item 1 (emit triggers):** os 4 services novos devem injetar `TaskEventsPublisher` via construtor padrão Nest. AutomationsModule já é `@Global` e exporta o publisher — basta importar o type e injetar.
- **Item 2/3 (DTOs):** `CreateAutomationDto` precisa de `@ValidateIf(o => o.trigger === 'CRON') @IsString() cronExpression`. Idem `scopeId`. Atualizar `UpdateAutomationDto` por consequência (já é `PartialType`, então só adicionar a validação no Create).
- **Item 2/6/8 (front):** seguir pipeline obrigatório — schema Zod → resolver no `useForm` → `FormField` shadcn. Não criar inputs soltos.
- **Item 5 (testes):** `*.spec.ts` para unitário (mock de Prisma) e `*.e2e-spec.ts` com supertest para fluxo completo. Não chamar tudo de "teste e2e".
- **Item 9 (novo endpoint /executions):** seguir as 14 etapas da seção "Ordem para criar uma feature nova" do standard. É feature nova, não pula etapa.
- **Pickers reference:** usar Combobox do shadcn/Radix existente em outras features; não inventar componente novo (regra de simplicidade radical).
- **Conditions editor:** se virar uma estrutura repetível (já existe `ParamField`), extrair `ConditionRow` reusando o renderer — não duplicar.

### Red flags a NÃO cometer durante a execução do plano

- Não retornar objeto Prisma cru — sempre via `AutomationResponseDto.fromEntity(...)` (já existe).
- Não inserir lógica de validação no controller — fica no service ou no DTO.
- Não criar `findAll` sem paginação em novos endpoints (regra 7).
- Não logar payload inteiro de webhook em produção — apenas URL, método, status.
- Não emitir `COMMENT_CREATED` síncrono na request de criar comentário — deixar o `EventEmitter` async e medir overhead antes de subir pra prod (já alinhado com Risco 2).

---

## 7. Files-key

Backend:
- [automations.controller.ts](mundial-erp-api/src/modules/automations/automations.controller.ts) — 127 linhas, 9 endpoints
- [automation.listener.ts](mundial-erp-api/src/modules/automations/events/automation.listener.ts) — 17 handlers `@OnEvent`
- [action-runner.service.ts](mundial-erp-api/src/modules/automations/engine/action-runner.service.ts) — 19 actions implementadas, 2 not_implemented
- [tasks.service.ts:1051-1114](mundial-erp-api/src/modules/tasks/tasks.service.ts#L1051-L1114) — única emissão de eventos hoje
- [automations.repository.ts:200-219](mundial-erp-api/src/modules/automations/automations.repository.ts#L200-L219) — `listStatusesByScope` (precisa incluir lists)

Frontend:
- [automation-builder-view.tsx](mundial-erp-web/src/features/automations/components/automation-builder-view.tsx) — builder visual, 586 linhas
- [automation-builder-view.tsx:203](mundial-erp-web/src/features/automations/components/automation-builder-view.tsx#L203) — scopeType hardcoded
- [automation-builder-view.tsx:129-147](mundial-erp-web/src/features/automations/components/automation-builder-view.tsx#L129-L147) — allStatuses sem lists
- [automations-modal.tsx](mundial-erp-web/src/features/automations/components/automations-modal.tsx) — modal global

Hoppe (referência):
- memory: reference_hoppe_automations_e_ai (catálogo + erros confirmados)
- memory: reference_hoppe_ui_componentes (AutomationsModal/Builder)
