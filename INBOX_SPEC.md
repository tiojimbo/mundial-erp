# Caixa de entrada — Especificação de Produto + Técnica

## 1. Visão geral

Tela onde o usuário consulta e age sobre notificações geradas por eventos do
sistema (tarefas atrasadas, próximas do vencimento, menções, mensagens, etc.).
A tela fica em `/inbox` e é acessível pelo item "Caixa de Entrada" do menu
lateral, que mostra um badge rosa com o número de notificações **unread**.

Padrão visual: shadcn/ui com tokens OKLCH (tema claro por padrão).

## 2. Tokens e estilo global

Adicione ao `globals.css` (já presentes no shadcn default):

```css
:root {
  --background: oklch(100% 0 0);
  --foreground: oklch(14.5% 0 0);
  --card: oklch(100% 0 0);
  --popover: oklch(100% 0 0);
  --primary: oklch(20.5% 0 0);
  --primary-foreground: oklch(98.5% 0 0);
  --secondary: oklch(97% 0 0);
  --muted: oklch(97% 0 0);
  --muted-foreground: oklch(55.6% 0 0);
  --accent: oklch(97% 0 0);
  --destructive: oklch(57.7% .245 27.325);
  --border: oklch(92.2% 0 0);
  --input: oklch(92.2% 0 0);
  --ring: oklch(70.8% 0 0);
  --radius: .625rem;
}
```

Tipografia base: `14px`, stack `-apple-system, BlinkMacSystemFont, "Segoe UI",
roboto, "Helvetica Neue", helvetica, arial, sans-serif`.

## 3. Modelo de dados

```ts
export type NotificationType =
  | "task.overdue"      // ícone AlertTriangle
  | "task.due_soon"     // ícone Clock
  | "message"           // ícone MessageSquare
  | "mention"           // ícone AtSign
  | "system";           // ícone Bell

export type NotificationStatus = "unread" | "read" | "cleared" | "snoozed";

export type NotificationCategory = "primary" | "other";

export interface Notification {
  id: string;                         // uuid
  userId: string;                     // destinatário
  type: NotificationType;
  category: NotificationCategory;     // roteia para aba Primary/Other
  title: string;                      // ex.: "Teste"
  description: string;                // ex.: "Task is overdue. Due date was past"
  entityId?: string;                  // id da task/mensagem de origem
  entityUrl?: string;                 // rota para abrir ao clicar
  status: NotificationStatus;
  snoozedUntil?: string;              // ISO, quando status = "snoozed"
  createdAt: string;                  // ISO
  readAt?: string;                    // ISO
  clearedAt?: string;                 // ISO
}

export type InboxView = "all" | "primary" | "other" | "later" | "cleared";

export interface NotificationsResponse {
  items: Notification[];
  counts: {
    all: number;                      // unread em Primary+Other
    primary: number;                  // unread em Primary
    other: number;                    // unread em Other
    later: number;                    // snoozed
    cleared: number;                  // total cleared (não precisa unread)
  };
}
```

**Regras de contagem de badge:** os números ao lado das tabs refletem
notificações `status = "unread"` daquela view (em `Later` conta `snoozed`,
em `Cleared` não mostra contagem). O badge no sidebar "Caixa de Entrada"
mostra `counts.all`.

## 4. Endpoints (REST)

Base: `/api/v1`.

| Método | Endpoint                                    | Descrição |
|-------:|---------------------------------------------|-----------|
| GET    | `/notifications?view={view}`                | Lista notificações da view e `counts`. |
| PATCH  | `/notifications/:id/read`                   | Marca como lida. |
| PATCH  | `/notifications/:id/unread`                 | Marca como não lida. |
| PATCH  | `/notifications/:id/clear`                  | Move para `cleared` (soft-delete). |
| PATCH  | `/notifications/:id/unclear`                | Restaura de `cleared`. |
| PATCH  | `/notifications/:id/snooze`                 | Body: `{ until: ISO }`. Status vira `snoozed`. |
| PATCH  | `/notifications/:id/unsnooze`               | Remove snooze. |
| POST   | `/notifications/mark-all-read`              | Body: `{ view: InboxView }`. |
| POST   | `/notifications/clear-all`                  | Body: `{ view: InboxView }`. |
| POST   | `/notifications/delete-all-cleared`         | Remove permanentemente da view `cleared`. |

Entrega: HTTP apenas. Revalidação com React Query `refetchOnWindowFocus: true`
e invalidação após mutations. **Não há WebSocket**.

## 5. Estrutura visual da página

```
┌────────────────────────────────────────────────────────────┐
│ [📥] Caixa de entrada                                       │ ← header
├────────────────────────────────────────────────────────────┤
│ [📥 All •3] [💬 Primary •3] [⇄ Other] [🕒 Later] [🗑 Cleared] │ ← tabs
├────────────────────────────────────────────────────────────┤
│ [▽ Filter]                   [✓✓ Mark all read] [✓ Clear all]│ ← toolbar
├────────────────────────────────────────────────────────────┤
│ Today                                                        │
│   ⚠︎ Teste — Task is overdue. Due date was past     15:57    │
│ Yesterday                                                    │
│   ⚠︎ Teste — Task is overdue. Due date was past     15 de abr│
│ Last 7 days                                                  │
│   ⚠︎ Teste — Task is overdue. Due date was past     14 de abr│
│   🕒 Teste — Task is due soon. Due date was upcoming 13 de abr│
└────────────────────────────────────────────────────────────┘
```

Comportamento da toolbar por view:

- `All`, `Primary`, `Other`: `Mark all read` + `Clear all`.
- `Later`: `Mark all read` + `Clear all` (esse fica disabled se vazio).
- `Cleared`: substitui `Clear all` por **`Delete all`** (ícone 🗑) e oculta
  `Mark all read`.

## 6. Agrupamento por data

O cliente agrupa por `createdAt` com base no fuso do usuário, com os headers:
`Today`, `Yesterday`, `Last 7 days`, `Last 30 days`, `Older`. Formato do
rótulo à direita:

- mesmo dia: `HH:mm` (ex.: `15:57`).
- outro dia do mesmo ano: `d 'de' MMM` em pt-BR (ex.: `15 de abr`).
- outro ano: `d 'de' MMM 'de' yyyy`.

Use `date-fns` com locale `ptBR`.

## 7. Item de notificação (UI crítica)

Estrutura HTML/Tailwind obrigatória (copie tal qual):

```tsx
<div className="group/notification relative cursor-pointer transition-colors bg-background hover:bg-muted/50">
  <div className="flex items-center gap-3 px-4 py-2.5">
    <div className="min-w-0">
      <div className="flex items-center gap-2.5">
        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-muted transition-opacity hover:opacity-75">
          <Icon className="h-3.5 w-3.5 text-muted-foreground" />
        </span>
        <span className="text-foreground truncate text-sm font-medium">{title}</span>
      </div>
    </div>
    <span className="shrink-0 text-muted-foreground/40">—</span>
    <div className="min-w-0 flex-1">
      <span className="text-muted-foreground truncate text-sm">{description}</span>
    </div>
    <div className="relative ml-auto flex h-7 shrink-0 items-center justify-end pl-3">
      {/* Camada 1: data (usa invisible, não hidden, para manter largura) */}
      <div className="group-hover/notification:invisible">
        <span className="shrink-0 text-xs tabular-nums text-muted-foreground">{timeLabel}</span>
      </div>
      {/* Camada 2: ações (sobrepostas) */}
      <div className="absolute inset-y-0 right-0 hidden items-center group-hover/notification:flex">
        <div className="flex shrink-0 flex-row items-center gap-1.5">
          <button aria-label="Marcar como lida" className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-border bg-background transition-all hover:bg-muted">
            <Mail className="h-3.5 w-3.5" />
          </button>
          <button className="inline-flex h-7 items-center gap-2 rounded-md bg-foreground px-2.5 text-xs font-medium text-background transition-all hover:bg-foreground/90">
            <Check className="h-3.5 w-3.5" />
            Clear
            <kbd className="ml-1 flex h-4 min-w-4 items-center justify-center rounded bg-background/20 px-1 text-[10px] font-medium">E</kbd>
          </button>
        </div>
      </div>
    </div>
  </div>
</div>
```

Regras fixas:

- Usar **named group** `group/notification` (nunca `group` puro) para não
  vazar hover para containers pais.
- Data some com `group-hover/notification:invisible` (mantém largura). NUNCA
  usar `hidden` aqui — causaria jump visual.
- Ações aparecem com `absolute inset-y-0 right-0 hidden group-hover/notification:flex`.
- Botão "Clear" é escuro (`bg-foreground` com `text-background`) com `<kbd>E</kbd>`.

Item **unread** recebe um indicador extra: borda-esquerda colorida de 3px
(`before:absolute before:inset-y-0 before:left-0 before:w-[3px] before:bg-primary`)
e título em `font-semibold`. Item **read**: título em `font-medium`.

## 8. Interações

- **Click na linha** → navega para `entityUrl` (ou no-op se ausente) e
  dispara `PATCH /read` (otimista).
- **Hover 150 ms+** na linha → revela ações (puramente CSS).
- **Click no botão envelope** → toggle read/unread. `e.stopPropagation()`.
- **Click em "Clear"** → `PATCH /clear`. Otimista: sumir da lista atual,
  aumentar `counts.cleared`. Toast "Notification cleared" com ação `Undo`
  (8 s) que chama `/unclear`.
- **Atalho `E`** com foco/hover no item → dispara Clear no item ativo.
  Ignorar se o target for `INPUT`, `TEXTAREA` ou `[contenteditable]`.
- **Atalho `J` / `K`** → navegar próximo/anterior (foco).
- **`Shift + E`** → Clear all da view atual (com confirmação).
- **`Mark all read`** → `POST /mark-all-read` com a view atual.
- **`Clear all`** → abre `AlertDialog` (shadcn) "Clear all notifications?"
  com `Cancel` + `Clear` (destructive). Confirma → `POST /clear-all`.
- **`Delete all`** (apenas em Cleared) → abre `AlertDialog` "Delete all
  cleared notifications? This cannot be undone." → `POST /delete-all-cleared`.
- **Filter** → abre `Popover` com: tipo (multi-select de `NotificationType`),
  período (Hoje / 7 dias / 30 dias / customizado), apenas não lidas
  (switch). Filtros client-side sobre a resposta da view atual. Mostrar
  badge com número de filtros ativos no botão Filter.
- **Tabs**: clicar troca a view e atualiza a URL com `?view=...`. View
  default: `all`.

## 9. Estados da lista

- **Loading inicial** (sem cache): 6 skeletons `h-11 w-full rounded` na
  lista.
- **Empty por view** (centrado verticalmente, ícone Bell dentro de círculo
  `h-16 w-16 bg-muted rounded-full`):
  - `all` / `primary` / `other`: `"You're all caught up"` +
    subtítulo `"New notifications will appear here."`
  - `later`: `"No snoozed notifications"`
  - `cleared`: `"No cleared notifications"`
- **Erro**: banner no topo `"Couldn't load notifications"` + botão `Retry`.
- **Carregamento de mais** (se paginação): botão `Load more` no final.
  Paginação: cursor `?cursor=<createdAt>` + `?limit=50`.

## 10. Acessibilidade

- `role="tablist"` nas tabs, `role="tab"` em cada, `aria-selected`,
  `aria-controls` → painel com `role="tabpanel"`.
- Lista como `<ul role="list">`, itens `<li>`.
- Cada item tem `tabIndex={0}` e reage a `Enter` (abrir) e `Space` (abrir).
- Botões sem texto têm `aria-label`.
- Atalhos registrados em um único `useHotkeys` global, desativados quando
  modais/popovers estiverem abertos.
- Contraste: garantir AA (tokens do shadcn já cumprem).

## 11. Arquivos a entregar

```
app/
  (app)/inbox/
    page.tsx                    # Server Component → lê cookie de auth, prefetch
    inbox-client.tsx            # "use client" - shell com tabs, toolbar, lista
components/
  inbox/
    InboxTabs.tsx
    InboxToolbar.tsx
    InboxFilterPopover.tsx
    NotificationList.tsx
    NotificationGroup.tsx
    NotificationItem.tsx
    EmptyState.tsx
    ConfirmDialog.tsx
hooks/
  useNotifications.ts           # queries + mutations React Query
  useInboxHotkeys.ts
lib/
  date.ts                       # helpers de agrupamento e formatação
  api.ts                        # fetch helpers tipados
types/
  notifications.ts              # types da seção 3
__tests__/
  NotificationItem.test.tsx
  useNotifications.test.ts
```

## 12. Critérios de aceitação (testáveis)

1. Abrir `/inbox` exibe a view `all` com 5 notificações mockadas agrupadas
   em Today/Yesterday/Last 7 days, conforme seção 5.
2. Badge "3" aparece ao lado de `All` e `Primary`; `Other` não tem badge.
3. Hover em um item revela os dois botões (envelope + Clear) e some o
   horário, sem shift de layout (largura constante).
4. Pressionar `E` com o cursor sobre um item remove-o da lista
   otimistamente e mostra toast com `Undo`.
5. Clicar em "Clear all" em `All` abre AlertDialog; confirmar limpa todos.
6. Tab `Cleared` mostra botão `Delete all` (em vez de `Clear all`) e o
   empty state `"No cleared notifications"`.
7. Tab `Later` mostra `"No snoozed notifications"`.
8. URL reflete a aba via `?view=...` e recarregar mantém a view.
9. `refetchOnWindowFocus` dispara `/notifications` quando a janela ganha
   foco.
10. Nenhum `any`, nenhum warning de a11y em `axe`, build `next build`
    sem erros/warnings.