# Runbook: Decommission do motor BPMN

Sprint 7 (PR5) — substitui o motor BPMN por Automations e remove o motor.

## 1. Cenários atuais do motor (BpmEngineService)

O motor escuta `order.status.changed` e executa 2 fluxos:

### 1.1 Activities triggered by status
Para cada `Activity` com `triggerOnStatus = toStatus`:
- Find-or-create `ProcessInstance(listId, orderId)` (idempotente, com retry em race).
- Cria `ActivityInstance(activityId, processInstanceId, status=PENDING, dueAt)`.
- Para cada `Task` da activity, cria `TaskInstance(taskId, activityInstanceId, status=PENDING)`.
- Emite evento `bpm.activity.created`.

Idempotência: skip se já existe `ActivityInstance` para o par `(activityId, processInstanceId)`.

### 1.2 Handoffs triggered by status
Para cada `Handoff` com `triggerOnStatus = toStatus`:
- Busca `ProcessInstance(fromListId, orderId)`. Skip se não achar.
- Cria `HandoffInstance(handoffId, orderId, fromProcessInstanceId, toProcessInstanceId)`.
- Se `autoAdvance=true`: cria `ProcessInstance` no `toListId` e marca handoff como `ACCEPTED`.
- Senão: handoff fica `PENDING`.
- Emite evento `bpm.handoff.created`.

## 2. Listeners de Order que tocam runtime BPM

### 2.1 order-cancelado.listener.ts (toStatus = CANCELADO)
- Estorna ARs (status=CANCELLED + soft-delete).
- Cancela ProductionOrders PENDING.
- Soft-delete SeparationOrders PENDING.
- **[BPM]** Encerra todos `ProcessInstance` ACTIVE da order (status=COMPLETED, completedAt=now).

### 2.2 order-entregue.listener.ts (toStatus = ENTREGUE)
- Marca 2ª parcela AR como PAID.
- **[BPM]** Encerra todos `ProcessInstance` ACTIVE da order.

## 3. Estratégia: Order vira "TaskType" via WorkItem espelho (B)

Decisão: cada `Order` mantém-se como tabela própria, mas ganha um `WorkItem` espelho 1:1 com `customTypeId = 'order'`. Mudanças no Order sincronizam o WorkItem na mesma transação, e o WorkItem é o que dispara Automations.

### Razões
- Reutiliza os 18 triggers já entregues no Sprint 6 (TASK_STATUS_CHANGED, TASK_MOVED_TO_LIST, etc).
- Não precisa adicionar trigger novo `ORDER_STATUS_CHANGED` no catálogo.
- ERP atual (que lê `orders`) continua funcionando sem refator.
- Reversível: se der ruim, basta parar de sincronizar o espelho.

### Trade-offs
- Duas fontes de verdade (Order + WorkItem espelho).
- Custo de sincronização em toda mudança de Order.
- Reports antigos continuam lendo Order; reports novos podem ler WorkItem.

### Mapeamento OrderStatus → WorkflowStatus
| OrderStatus | WorkflowStatus (Hoppe) |
|---|---|
| EM_ORCAMENTO | `open` |
| FATURAR | `in_progress` |
| FATURADO | `in_progress` |
| PRODUZIR | `in_progress` |
| EM_PRODUCAO | `in_progress` |
| PRODUZIDO | `in_progress` |
| ENTREGUE | `closed` |
| CANCELADO | `closed` |

O matching fino entre status do Order e status do WorkItem fica como CustomField do WorkItem espelho (`order_status`).

## 4. Equivalente em Automations

| Cenário BPMN | Automation equivalente |
|---|---|
| `Activity` por status do Order cria checklist | Automation: trigger `TASK_STATUS_CHANGED` + condition `customTypeId == 'order' AND order_status == X` → actions `create_subtask` (uma por task da Activity) |
| `Handoff` `autoAdvance=true` move pedido entre listas | Automation: trigger `TASK_STATUS_CHANGED` + condition idem → action `move_to_list` (listId destino) |
| `Handoff` `autoAdvance=false` (manual) | Automation: trigger idem → action `add_task_link` (link entre origem e destino) + `send_notification` |
| Encerrar `ProcessInstance` em CANCELADO/ENTREGUE | Sem equivalente. Sem motor, não há instância pra encerrar. Trecho dos listeners é removido. |

## 5. Plano de execução

Cada item = 1 commit isolado.

1. **HPP-120** — este runbook (atual).
2. **HPP-121.a** — seed cria workspace `Teste`, Space `Comercial`, Lists equivalentes aos antigos, WorkflowStatuses Hoppe.
3. **HPP-121.5** — `OrdersService` cria/atualiza WorkItem espelho na mesma transação de create/update/changeStatus do Order.
4. **HPP-121.b** — `seed-automations.ts` cria as Automations equivalentes aos cenários BPMN no workspace `Teste`.
5. **HPP-122** — reescrever `order-cancelado.listener.ts` removendo bloco `ProcessInstance`.
6. **HPP-123** — reescrever `order-entregue.listener.ts` removendo bloco `ProcessInstance`.
7. **HPP-127** — smoke test ponta a ponta: cria Order → espelho cria WorkItem → muda status → Automation dispara → WorkItem reage.
8. **HPP-124** — `scripts/backup-bpm-tables.sql` (não roda automatizado — é runbook manual de prod).
9. **HPP-125** — remove `bpm/engine/bpm-engine.service.ts` + `bpm/runtime/*` + ajusta `bpm.module.ts`.
10. **HPP-126** — migration `drop-bpm-runtime-tables` + remove models Prisma `ProcessInstance`, `ActivityInstance`, `TaskInstance`, `HandoffInstance` e enums associados.

## 6. Inventário de arquivos

### Remover na HPP-125
- `mundial-erp-api/src/modules/bpm/engine/bpm-engine.service.ts`
- `mundial-erp-api/src/modules/bpm/runtime/process-instances/` (controller, service, repository, dto/)
- `mundial-erp-api/src/modules/bpm/runtime/activity-instances/` (idem)
- `mundial-erp-api/src/modules/bpm/runtime/task-instances/` (idem)
- `mundial-erp-api/src/modules/bpm/runtime/handoff-instances/` (idem)
- Ajustar `bpm.module.ts` — remover providers/controllers/imports correspondentes.

### Manter
- `mundial-erp-api/src/modules/bpm/engine/order-status-machine.ts` (FSM de transição de Order, independente do motor).
- `mundial-erp-api/src/modules/bpm/definitions/` (spaces, folders, lists, activities, handoffs, tasks, sectors, workflow-statuses — são definições, ainda usadas).

### Reescrever na HPP-122/123
- `mundial-erp-api/src/modules/orders/listeners/order-cancelado.listener.ts` — remover bloco ProcessInstance.
- `mundial-erp-api/src/modules/orders/listeners/order-entregue.listener.ts` — idem.

### Models Prisma a remover (HPP-126)
- `ProcessInstance`, `ActivityInstance`, `TaskInstance`, `HandoffInstance`.
- Relações em `Order` (`processInstances`, `handoffInstances`).
- Relações em `List` (`processInstances`).
- Relações em `Activity` (cascata via ActivityInstance).
- Enums: `ProcessStatus`, `ActivityStatus`, `TaskStatus`, `HandoffStatus` (avaliar reuso antes de remover).

## 7. Backup em produção (HPP-124)

Antes de DROP TABLE em prod, executar manualmente:

```sql
CREATE TABLE process_instances_legacy_YYYYMMDD AS SELECT * FROM process_instances;
CREATE TABLE activity_instances_legacy_YYYYMMDD AS SELECT * FROM activity_instances;
CREATE TABLE task_instances_legacy_YYYYMMDD AS SELECT * FROM task_instances;
CREATE TABLE handoff_instances_legacy_YYYYMMDD AS SELECT * FROM handoff_instances;
```

Validar contagem antes/depois:

```sql
SELECT 'process_instances' AS tbl, COUNT(*) FROM process_instances
UNION ALL SELECT 'activity_instances', COUNT(*) FROM activity_instances
UNION ALL SELECT 'task_instances', COUNT(*) FROM task_instances
UNION ALL SELECT 'handoff_instances', COUNT(*) FROM handoff_instances;
```

Script versionado em `mundial-erp-api/scripts/backup-bpm-tables.sql` (HPP-124).

## 8. Critérios de aceite por etapa

| HPP | Critério |
|---|---|
| 120 | Doc existe e cobre seções 1–7. |
| 121.a | `npm run seed` cria workspace `Teste` com Space, Lists e WorkflowStatuses. |
| 121.5 | Criar Order via API gera WorkItem espelho com `customTypeId='order'`; mudar status do Order atualiza WorkItem na mesma transação. |
| 121.b | Seed cria N Automations equivalentes a cada Activity/Handoff atual. |
| 122 | `grep -n processInstance order-cancelado.listener.ts` retorna 0. |
| 123 | `grep -n processInstance order-entregue.listener.ts` retorna 0. |
| 127 | E2E: cria Order EM_ORCAMENTO → Automation dispara → mudança refletida em WorkItem em < 5s. |
| 124 | Arquivo SQL existe e roda em ambiente local sem erro. |
| 125 | `grep -rn 'bpm/engine\|bpm/runtime/process-instances\|activity-instances\|task-instances\|handoff-instances' src/` retorna 0. |
| 126 | `npx prisma migrate dev` aplica drop sem erro. Compilação verde. |

## 9. Gap aberto / risco

- **Sincronização Order↔WorkItem em escrita concorrente**: se 2 requests alterarem o mesmo Order ao mesmo tempo, o espelho pode divergir. Mitigação: usar `$transaction` no OrdersService cobrindo Order + WorkItem.
- **Lists do "Comercial" antigo vs. Lists novas no seed**: hoje há Lists com `processInstances` ativas. O seed novo cria Lists separadas no workspace `Teste` — não conflita, mas em prod a migração final precisa decidir se reaproveita ou cria novas.
- **WorkflowStatus 1:1 com OrderStatus**: hoje OrderStatus tem 8 valores; WorkflowStatuses Hoppe são 3 (`open`/`in_progress`/`closed`). Refletir granularidade via CustomField `order_status` no WorkItem espelho.
- **Snapshot do automation engine não inclui CustomFieldValues**: `automation.processor.ts:loadTaskSnapshot` carrega apenas campos básicos do WorkItem. Por isso o seed da HPP-121.b cria apenas **1 Automation** (`Mover Pedido para Faturamento`), suficiente pro smoke da HPP-127. Replicar o motor BPMN completo (cenários por OrderStatus granular como FATURADO/PRODUZIR/EM_PRODUCAO) exigirá um dos caminhos abaixo, fora do escopo do sprint 7:
  - estender o snapshot com `customFieldValues` + criar CustomFieldDefinition `order_status` no espelho;
  - adicionar trigger `ORDER_STATUS_CHANGED` específico pra Orders;
  - mapear cada OrderStatus pra um WorkflowStatus distinto no space `teste-comercial` (perde a abstração genérica).
