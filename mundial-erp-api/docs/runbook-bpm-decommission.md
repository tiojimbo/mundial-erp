# Runbook: Decommission do motor BPMN

Sprint 7 (PR5) — remove o motor BPMN. Automations e Orders seguem fluxos independentes.

## 1. Cenários atuais do motor (BpmEngineService)

O motor escuta `order.status.changed` e executa 2 fluxos:

### 1.1 Activities triggered by status
Para cada `Activity` com `triggerOnStatus = toStatus`:
- Find-or-create `ProcessInstance(listId, orderId)` (idempotente, com retry em race).
- Cria `ActivityInstance(activityId, processInstanceId, status=PENDING, dueAt)`.
- Para cada `Task` (definição) da activity, cria `TaskInstance(taskId, activityInstanceId, status=PENDING)`.
- Emite evento `bpm.activity.created`.

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
- **[BPM]** Encerra todos `ProcessInstance` ACTIVE da order — **removido na HPP-122**.

### 2.2 order-entregue.listener.ts (toStatus = ENTREGUE)
- Marca 2ª parcela AR como PAID.
- **[BPM]** Encerra todos `ProcessInstance` ACTIVE da order — **removido na HPP-123**.

## 3. Estratégia: motor sai sem substituto

Automations e Orders são domínios independentes:
- **Automations** operam sobre Tasks (WorkItem) e seus TaskTypes (CustomTaskType).
- **Orders** operam sobre o ciclo de pedido (FATURAR → FATURADO → PRODUZIDO → ENTREGUE) via `OrderStatusMachine` + listeners dedicados.

O motor BPMN era a única ponte entre os dois. Removê-lo deixa os domínios desacoplados. Nenhum cenário do motor é replicado em Automations.

Workspace `Teste` (HPP-121.a) é mantido como sandbox para Automations puras, sem relação com Orders.

## 4. Plano de execução

Cada item = 1 commit isolado.

1. **HPP-120** — este runbook.
2. **HPP-121.a** — seed cria workspace `Teste`, Space `Comercial`, 3 Lists, 3 WorkflowStatuses.
3. **HPP-122** — reescrever `order-cancelado.listener.ts` removendo bloco `ProcessInstance`.
4. **HPP-123** — reescrever `order-entregue.listener.ts` removendo bloco `ProcessInstance`.
5. **HPP-127** — smoke completo cobrindo os 18 triggers e 21 actions sobre Tasks puras.
6. **HPP-124** — `scripts/backup-bpm-tables.sql` (não roda automatizado — runbook manual de prod).
7. **HPP-125** — remove `bpm/engine/bpm-engine.service.ts` + `bpm/runtime/*` + ajusta `bpm.module.ts`.
8. **HPP-126** — migration `drop-bpm-runtime-tables` + remove models Prisma `ProcessInstance`, `ActivityInstance`, `TaskInstance`, `HandoffInstance` e enums associados.

## 5. Inventário de arquivos

### Remover na HPP-125
- `mundial-erp-api/src/modules/bpm/engine/bpm-engine.service.ts`
- `mundial-erp-api/src/modules/bpm/runtime/process-instances/` (controller, service, repository, dto/)
- `mundial-erp-api/src/modules/bpm/runtime/activity-instances/` (idem)
- `mundial-erp-api/src/modules/bpm/runtime/task-instances/` (idem)
- `mundial-erp-api/src/modules/bpm/runtime/handoff-instances/` (idem)
- Ajustar `bpm.module.ts` — remover providers/controllers/imports correspondentes.

### Manter
- `mundial-erp-api/src/modules/bpm/engine/order-status-machine.ts` (FSM de transição de Order, independente do motor).
- `mundial-erp-api/src/modules/bpm/definitions/` (spaces, folders, lists, activities, handoffs, tasks, sectors, workflow-statuses).
- `mundial-erp-api/src/modules/orders/listeners/*` (já limpos nas HPP-122/123).

### Models Prisma a remover (HPP-126)
- `ProcessInstance`, `ActivityInstance`, `TaskInstance`, `HandoffInstance`.
- Relações em `Order` (`processInstances`, `handoffInstances`).
- Relações em `List` (`processInstances`).
- Relações em `Activity` (cascata via ActivityInstance).
- Enums: `ProcessStatus`, `ActivityStatus`, `TaskStatus`, `HandoffStatus` (avaliar reuso antes de remover).

## 6. Backup em produção (HPP-124)

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

## 7. Critérios de aceite por etapa

| HPP | Critério |
|---|---|
| 120 | Doc existe e cobre seções 1–6. |
| 121.a | `npm run seed:bpm-decommission` cria workspace `Teste` com Space, Lists e WorkflowStatuses. |
| 122 | `grep -n processInstance order-cancelado.listener.ts` retorna 0. |
| 123 | `grep -n processInstance order-entregue.listener.ts` retorna 0. |
| 127 | Suite e2e cobre os 18 triggers e 21 actions em Tasks puras no workspace `Teste`. |
| 124 | Arquivo SQL existe e roda em ambiente local sem erro. |
| 125 | `grep -rn 'bpm/engine\|bpm/runtime/process-instances\|activity-instances\|task-instances\|handoff-instances' src/` retorna 0. |
| 126 | `npx prisma migrate dev` aplica drop sem erro. Compilação verde. |

## 8. Riscos abertos

- **Definições BPM órfãs**: após remover o motor, `Activity`, `Task` (definição), `Handoff` (e suas `triggerOnStatus` ligadas a `OrderStatus`) deixam de ser executadas. Permanecem como dados de configuração até futura limpeza (fora do escopo do sprint 7).
- **Ciclo do Order**: continua funcionando via `OrderStatusMachine` + listeners (faturar, faturado, produzir, production-completed, entregue, cancelado, search-index). Nenhum desses depende de runtime BPM após HPP-122/123.
