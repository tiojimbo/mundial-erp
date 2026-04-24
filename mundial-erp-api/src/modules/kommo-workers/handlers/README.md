# Kommo event handlers (Sprint 2 K2-3)

Esta pasta vai receber **1 arquivo por tipo de evento Kommo MVP**
(PLANO-KOMMO-DASHBOARD.md §4.1, §6). Convenção:
`<evento-com-hifens>.handler.ts` exportando `class <Evento>Handler`.

**Nesta rodada (Sprint 1 K1-1) os arquivos NÃO foram criados** — esqueletos
reais dependem dos models Prisma (Larissa, K1-2) e dos serviços consumidos
(KommoApiClient — Rafael, K2-1). Este README marca a localização e o contrato.

---

## Eventos MVP (10) — files a serem criados em K2-3

| # | Event type Kommo | File | Grava/atualiza |
|---|---|---|---|
| 1 | `incoming_chat_message`  | `incoming-chat-message.handler.ts`   | `KommoMessage` (direction=IN) + `KommoConversation.lastMessageAt` |
| 2 | `outgoing_chat_message`  | `outgoing-chat-message.handler.ts`   | `KommoMessage` (direction=OUT) + `KommoConversation.lastMessageAt` |
| 3 | `chat_created`           | `chat-created.handler.ts`            | `KommoConversation` (status=OPEN) |
| 4 | `chat_resolved`          | `chat-resolved.handler.ts`           | `KommoConversation.status=RESOLVED` + `resolvedAt` |
| 5 | `chat_responsible_changed` | `chat-responsible-changed.handler.ts` | `KommoConversation.agentId` |
| 6 | `lead_created`           | `lead-created.handler.ts`            | `KommoLead` |
| 7 | `lead_updated`           | `lead-updated.handler.ts`            | `KommoLead` (upsert) |
| 8 | `lead_status_changed`    | `lead-status-changed.handler.ts`     | `KommoLead.statusId` |
| 9 | `lead_responsible_changed` | `lead-responsible-changed.handler.ts` | `KommoLead.agentId` |
| 10 | `note_added` (opcional MVP) | `note-added.handler.ts`            | `KommoMessage` (type=NOTE) ou tabela futura |

> Fonte canônica de semântica de eventos: <https://developers.kommo.com/docs>.
> Validar payload shape contra os schemas Zod em
> `C:\Users\USER\Documents\agents\kommo\mcp-server\src\schemas\*.ts` (inventário em
> [docs/kommo-external-scaffolding-inventory.md](../../../../docs/kommo-external-scaffolding-inventory.md)).

---

## Contrato do handler (proposta — Rafael finaliza em K2-3)

```ts
export interface KommoEventHandler<TPayload = unknown> {
  readonly eventType: string;                    // match contra KommoWebhookEvent.eventType
  handle(ctx: KommoEventHandlerContext<TPayload>): Promise<void>;
}

export interface KommoEventHandlerContext<TPayload> {
  readonly workspaceId: string;
  readonly accountId: string;                    // KommoAccount.id
  readonly eventId: string;                      // KommoWebhookEvent.id (idempotência)
  readonly payload: TPayload;                    // validado via class-validator antes de chegar
  readonly tx: PrismaTransactionClient;          // tudo dentro de $transaction
  readonly logger: Logger;
}
```

Cada handler:
1. Faz **upsert** no model alvo (idempotente — replay não duplica).
2. **NÃO** chama a API Kommo externa (só drena o payload recebido). Se precisar
   de dado faltante, delega para `KommoApiClient` via service.
3. Loga `{ eventId, workspaceId, eventType, durationMs, entityIds: [...] }`.
4. Retorna `void` — erro lança exception (worker trata retry/DLQ).
