# Squad Chat — 5 Subagentes Paralelos para Funcionalidade de Chat

> **Como usar:** Referencie este arquivo (`@.claude/agents/squad-chat.md`) em qualquer conversa.
> Ao receber este arquivo, o assistente DEVE imediatamente lançar os 5 agentes em paralelo usando a tool `Agent` com 5 chamadas simultâneas em um único bloco de mensagem — sem perguntar, sem planejar, sem esperar.

---

## Instrução de Execução

Ao receber este arquivo, execute EXATAMENTE este fluxo:

1. **Lance TODOS os 5 agentes em paralelo** (um único bloco com 5 chamadas `Agent`)
2. Cada agente recebe seu prompt completo abaixo (copie integralmente)
3. Aguarde todos terminarem
4. Apresente um resumo consolidado ao usuário com o que cada agente fez
5. Verifique os arquivos alterados por cada agente para garantir consistência

**NÃO faça:** perguntas antes de lançar, planejamento adicional, execução sequencial.

---

## Contexto Compartilhado (incluir no prompt de CADA agente)

```
CONTEXTO DO PROJETO:
- Monorepo: mundial-erp (backend: mundial-erp-api, frontend: mundial-erp-web)
- Backend: NestJS + Prisma + PostgreSQL + Socket.io
- Frontend: Next.js 14 (App Router) + React Query + Zustand + Tailwind CSS + Radix UI
- Chat namespace WebSocket: /chat
- API prefix: /api/v1
- Padrões: Controller → Service → Repository, DTOs com class-validator, response envelope { data, meta }
- Frontend: features/{nome}/components|hooks|services|types|schemas
- Validação front: Zod + React Hook Form
- State server: React Query (TanStack), State client: Zustand
- Named exports, zero `any`, zero `console.log`, Logger do NestJS

ARQUIVOS-CHAVE DO CHAT:
Backend (mundial-erp-api/src/modules/chat/):
  - chat.module.ts
  - gateway/chat.gateway.ts
  - channels/channels.controller.ts, channels.service.ts, channels.repository.ts
  - channels/dto/*.dto.ts
  - messages/messages.controller.ts, channel-messages.controller.ts
  - messages/messages.service.ts, messages.repository.ts
  - messages/dto/*.dto.ts
  - reactions/reactions.controller.ts, reactions.service.ts, reactions.repository.ts
  - reactions/dto/*.dto.ts

Frontend (mundial-erp-web/src/features/chat/):
  - components/chat-layout.tsx, channel-list.tsx, channel-list-item.tsx
  - components/message-area.tsx, message-list.tsx, message-item.tsx
  - components/message-composer.tsx, mention-menu.tsx, thread-panel.tsx
  - components/members-popover.tsx, emoji-picker-dropdown.tsx
  - components/create-channel-dialog.tsx, create-dm-dialog.tsx
  - hooks/use-channels.ts, use-messages.ts, use-chat-socket.ts, use-reactions.ts
  - services/channel.service.ts, message.service.ts, reaction.service.ts
  - types/chat.types.ts

Outros:
  - mundial-erp-web/src/lib/socket.ts (Socket.io client)
  - mundial-erp-web/src/stores/chat.store.ts (Zustand)
  - mundial-erp-api/prisma/schema.prisma (modelos Chat*)

PADRÃO DE COMMIT: Conventional Commits em português
  Exemplo: feat(chat): adiciona contagem real de unread nos canais
```

---

## Agent 1 — Backend Data Fix (Correções Críticas)

**Descrição para o Agent tool:** `Chat Squad 1: Backend data fixes`

**Prompt completo:**

```
{CONTEXTO COMPARTILHADO}

VOCÊ É O AGENT 1 DO SQUAD CHAT — "Backend Data Fix"

Sua ÚNICA missão é corrigir 3 bugs críticos no backend do chat onde dados são hardcoded ou nunca populados.
Outros agents estão trabalhando em paralelo no frontend e em features novas — NÃO toque em nada fora do seu escopo.

## ESCOPO RESTRITO — Só toque nestes arquivos:
- mundial-erp-api/src/modules/chat/messages/messages.repository.ts
- mundial-erp-api/src/modules/chat/messages/messages.service.ts
- mundial-erp-api/src/modules/chat/messages/dto/message-response.dto.ts
- mundial-erp-api/src/modules/chat/channels/channels.repository.ts
- mundial-erp-api/src/modules/chat/channels/channels.service.ts
- mundial-erp-api/src/modules/chat/channels/dto/channel-response.dto.ts

## BUG 1 — Reactions nunca aparecem nas mensagens

PROBLEMA: O repository tem o método `findGroupedByMessage(messageId)` que agrupa reações por emoji,
mas esse método NUNCA é chamado. O `MessageResponseDto` sempre retorna `reactions: []`.

CORREÇÃO:
1. Leia `messages.repository.ts` — encontre `findGroupedByMessage`
2. Leia `messages.service.ts` — encontre onde mensagens são retornadas (findAll, findOne, findReplies)
3. Após buscar mensagens, chame `reactionsRepository.findGroupedByMessage(message.id)` para cada mensagem
4. Popule o campo `reactions` no DTO de resposta com os dados reais
5. Para listas de mensagens, use uma query batch (buscar todas reactions das mensagens retornadas de uma vez, não N+1)

ATENÇÃO: O ReactionsRepository é injetado no módulo de chat. Se não estiver acessível no MessagesService,
adicione a injeção necessária.

## BUG 2 — Unread count sempre 0

PROBLEMA: O `ChannelResponseDto` ou a lógica no service hardcoda `unreadCount: 0`.
O model `ChatChannelMember` tem o campo `lastReadAt` que deveria ser comparado com as mensagens do canal.

CORREÇÃO:
1. Leia `channels.repository.ts` e `channels.service.ts`
2. No método que lista canais do usuário, calcule o unread count real:
   - Conte mensagens do canal onde `createdAt > member.lastReadAt` (e `deletedAt IS NULL`)
   - Se `lastReadAt` é null, conte todas as mensagens do canal
3. Retorne esse count no campo `unreadCount` do DTO

ATENÇÃO: A query deve ser eficiente. Use um subquery ou um COUNT condicional no Prisma,
não um loop que busca todas as mensagens.

## BUG 3 — LastMessage sempre null

PROBLEMA: O `ChannelResponseDto` hardcoda `lastMessage: null`.
Deveria mostrar um resumo da última mensagem do canal.

CORREÇÃO:
1. No repository de canais, ao buscar canais, inclua a última mensagem (use orderBy createdAt desc, take 1)
2. Mapeie para o formato `{ id, content (truncado em 100 chars), authorName, createdAt }`
3. Popule o campo `lastMessage` no DTO de resposta
4. Para DMs, considere também mensagens do próprio usuário como "última mensagem"

## REGRAS:
- Leia TODOS os arquivos relevantes antes de editar qualquer coisa
- Mantenha o padrão Repository (queries no repo, lógica no service, DTO mapeia)
- Não quebre a interface existente dos DTOs — só preencha campos que já existem
- Não adicione endpoints novos
- Não modifique o schema Prisma
- Use Logger do NestJS para qualquer log, nunca console.log
```

---

## Agent 2 — Reactions & Emoji UI (Frontend de Reações)

**Descrição para o Agent tool:** `Chat Squad 2: Reactions UI frontend`

**Prompt completo:**

```
{CONTEXTO COMPARTILHADO}

VOCÊ É O AGENT 2 DO SQUAD CHAT — "Reactions & Emoji UI"

Sua ÚNICA missão é fazer o sistema de reações funcionar no frontend.
Atualmente as reações existem no backend mas não aparecem na UI.
Outro agent (Agent 1) está corrigindo o backend para retornar reactions nos dados — você foca no FRONTEND.

## ESCOPO RESTRITO — Só toque nestes arquivos:
- mundial-erp-web/src/features/chat/components/message-item.tsx
- mundial-erp-web/src/features/chat/components/emoji-picker-dropdown.tsx
- mundial-erp-web/src/features/chat/hooks/use-reactions.ts
- mundial-erp-web/src/features/chat/types/chat.types.ts

## TAREFA 1 — Renderizar reações abaixo das mensagens

1. Leia `message-item.tsx` — encontre onde o conteúdo da mensagem é renderizado
2. Leia `chat.types.ts` — veja a interface `Message` e o tipo `ReactionGroup`
3. Abaixo do conteúdo da mensagem (e acima do thread preview se houver), adicione uma área de reações:
   - Se `message.reactions` tem itens, renderize uma row de reaction badges
   - Cada badge mostra: emoji + count (ex: "👍 3")
   - Use classes Tailwind: flex flex-wrap gap-1
   - Cada badge: inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs
   - Badge normal: bg-gray-100 dark:bg-gray-800 hover:bg-gray-200
   - Badge "eu reagi": bg-blue-100 dark:bg-blue-900 border border-blue-300 (verifique se o userId atual está em reaction.userIds)
   - No hover do badge, mostre tooltip com nomes: reaction.userNames.join(', ')

## TAREFA 2 — Conectar Emoji Picker às reações

1. Leia `emoji-picker-dropdown.tsx` — veja como ele retorna o emoji selecionado
2. Leia `use-reactions.ts` — veja os hooks `useAddReaction` e `useRemoveReaction`
3. No message-item.tsx, no botão de "React" (emoji) do hover actions:
   - Ao selecionar um emoji no picker, chame `addReaction({ messageId, emojiName })`
   - O emojiName deve ser o emoji character (ex: "👍"), não o nome
4. Ao clicar em um badge de reação existente:
   - Se eu já reagi (meu userId está em userIds): chame `removeReaction({ messageId, emojiName })`
   - Se eu não reagi: chame `addReaction({ messageId, emojiName })`

## TAREFA 3 — Botão "+" para adicionar reação

1. No final da row de reactions, adicione um botão "+" pequeno que abre o emoji picker
2. Estilo: mesmo tamanho dos badges, bg transparente, border dashed, hover:bg-gray-100
3. Ao selecionar emoji nesse picker, chama addReaction

## REGRAS:
- Leia TODOS os arquivos do seu escopo antes de editar
- Use o userId do auth context/store para verificar "eu reagi" (leia como outros componentes obtêm o user atual)
- Não mude a lógica dos hooks, apenas use-os
- Se o tipo ReactionGroup não tiver os campos que você precisa, ajuste o type (mas coordene com o que o backend retorna)
- Mantenha o estilo visual consistente com o resto do chat (leia o Tailwind existente)
- Se precisar do userId atual, veja como outros componentes obtêm — provavelmente via AuthProvider/useAuth ou Zustand auth store
```

---

## Agent 3 — Message Search & Pin (Busca e Fixação)

**Descrição para o Agent tool:** `Chat Squad 3: Search and pin messages`

**Prompt completo:**

```
{CONTEXTO COMPARTILHADO}

VOCÊ É O AGENT 3 DO SQUAD CHAT — "Message Search & Pin"

Sua missão é implementar BUSCA DE MENSAGENS end-to-end (backend + frontend).
A feature de PIN fica como secundária — só implemente se sobrar escopo.

## PARTE 1 — BACKEND: Endpoint de busca

### Arquivos a criar/modificar:
- mundial-erp-api/src/modules/chat/messages/messages.repository.ts (adicionar método)
- mundial-erp-api/src/modules/chat/messages/messages.service.ts (adicionar método)
- mundial-erp-api/src/modules/chat/messages/channel-messages.controller.ts (adicionar endpoint)
- mundial-erp-api/src/modules/chat/messages/dto/ (criar search DTO se necessário)

### Implementação:
1. Leia TODOS os arquivos de messages/ antes de começar
2. Crie o endpoint: `GET /chat/channels/:channelId/messages/search?q=texto&cursor=&limit=20`
3. No repository, implemente busca com `content contains (insensitive)` via Prisma
4. Filtre apenas mensagens do canal, não deletadas (deletedAt IS NULL)
5. Use cursor pagination igual aos outros métodos do repository
6. Retorne mensagens com author info, igual ao findAll existente
7. DTO de query: `q` (string, required, min 2 chars), `cursor` (optional), `limit` (optional, default 20, max 50)

### Padrão a seguir:
- Olhe como `findAll` no repository funciona e siga o mesmo padrão
- Use class-validator nos DTOs
- Swagger decorators (@ApiTags, @ApiOperation, etc.)
- Mantenha o envelope de response padrão

## PARTE 2 — FRONTEND: UI de busca

### Arquivos a criar/modificar:
- mundial-erp-web/src/features/chat/components/message-search.tsx (CRIAR)
- mundial-erp-web/src/features/chat/components/message-area.tsx (integrar)
- mundial-erp-web/src/features/chat/services/message.service.ts (adicionar método)
- mundial-erp-web/src/features/chat/hooks/use-messages.ts (adicionar hook)
- mundial-erp-web/src/features/chat/types/chat.types.ts (adicionar tipos se necessário)

### Implementação:
1. Leia `message-area.tsx` — encontre o botão/ícone de busca no header
2. No service, adicione: `search(channelId, query, params)` que chama o novo endpoint
3. No hooks, adicione: `useSearchMessages(channelId, query)` com React Query (enabled só quando query.length >= 2)
4. Crie `message-search.tsx`:
   - Input de busca com ícone de lupa
   - Debounce de 300ms no input
   - Lista de resultados abaixo do input
   - Cada resultado mostra: author, trecho da mensagem (highlight no match), data
   - Clicar em um resultado deveria fechar a busca (por ora, apenas fechar)
5. No `message-area.tsx`, conecte o botão de busca para toggle o componente de busca
   - Quando busca está ativa, mostra o MessageSearch no lugar ou acima da MessageList

### Estilo:
- Siga o padrão visual do chat existente
- Use componentes shadcn/ui se disponíveis (Input, ScrollArea)
- Highlight do match: bg-yellow-200 dark:bg-yellow-800 rounded px-0.5

## PARTE 3 — PIN (Secundária, só se der tempo)

Se completou busca, implemente pin básico:

### Backend:
1. Adicione campo `isPinned Boolean @default(false)` e `pinnedAt DateTime?` ao model ChatMessage no schema.prisma
2. Endpoint: `PATCH /chat/messages/:messageId/pin` (toggle pin)
3. Endpoint: `GET /chat/channels/:channelId/pinned` (listar pinados)

### Frontend:
1. No menu de ações da mensagem, adicione opção "Fixar mensagem"
2. Mensagens pinadas mostram um ícone de pin
3. No header do canal, botão que abre lista de mensagens pinadas

## REGRAS:
- Leia os arquivos existentes ANTES de criar novos
- Siga os padrões do código existente (cursor pagination, DTOs, envelope)
- Não duplique lógica — reutilize o que já existe
- Backend: Repository faz query, Service orquestra, Controller delega
- Frontend: Service chama API, Hook wrapa React Query, Component usa hook
```

---

## Agent 4 — File Attachments (Upload de Arquivos)

**Descrição para o Agent tool:** `Chat Squad 4: File attachments`

**Prompt completo:**

```
{CONTEXTO COMPARTILHADO}

VOCÊ É O AGENT 4 DO SQUAD CHAT — "File Attachments"

Sua missão é implementar upload e visualização de arquivos/anexos nas mensagens do chat.
Atualmente o botão de attachment existe no message-composer.tsx mas não faz nada.

## PARTE 1 — BACKEND: Upload e modelo de dados

### Arquivos a criar/modificar:
- mundial-erp-api/prisma/schema.prisma (adicionar model ChatAttachment)
- mundial-erp-api/src/modules/chat/chat.module.ts (registrar novos providers)
- Criar: mundial-erp-api/src/modules/chat/attachments/attachments.controller.ts
- Criar: mundial-erp-api/src/modules/chat/attachments/attachments.service.ts
- Criar: mundial-erp-api/src/modules/chat/attachments/attachments.repository.ts
- Criar: mundial-erp-api/src/modules/chat/attachments/dto/

### Schema Prisma — Model ChatAttachment:
```prisma
model ChatAttachment {
  id        String   @id @default(cuid())
  createdAt DateTime @default(now()) @map("created_at")

  messageId String  @map("message_id")
  message   ChatMessage @relation(fields: [messageId], references: [id])

  fileName     String @map("file_name")
  fileSize     Int    @map("file_size")
  mimeType     String @map("mime_type")
  storageKey   String @map("storage_key")
  thumbnailKey String? @map("thumbnail_key")
  width        Int?
  height       Int?

  uploadedById String @map("uploaded_by_id")
  uploadedBy   User   @relation(fields: [uploadedById], references: [id])

  @@index([messageId], name: "idx_chat_attachment_message")
  @@map("chat_attachments")
}
```
Adicione a relação inversa em ChatMessage: `attachments ChatAttachment[]`
Adicione a relação inversa em User: `chatAttachments ChatAttachment[]`

### Endpoints:
1. `POST /chat/channels/:channelId/attachments` — Upload de arquivo (multipart/form-data)
   - Usa multer para receber o arquivo
   - Valida: tamanho máximo 10MB, tipos permitidos (imagens, PDFs, docs, vídeos curtos)
   - Salva o arquivo em disco em `uploads/chat/` com nome UUID (evitar conflito)
   - Retorna o ChatAttachment criado
2. `GET /chat/attachments/:attachmentId` — Download/serve do arquivo
   - Serve o arquivo com headers corretos (Content-Type, Content-Disposition)
3. `DELETE /chat/attachments/:attachmentId` — Remove anexo (autor ou ADMIN)
   - Remove arquivo do disco e registro do banco

### Storage Strategy (simplicidade primeiro):
- Salve em `uploads/chat/{YYYY-MM}/` no filesystem local
- Mais tarde pode migrar para S3 — por ora, filesystem é suficiente
- Crie a pasta se não existir (mkdirSync recursive)
- Nome do arquivo: `{cuid()}-{originalName}` (mantém extensão)

### DTO:
- AttachmentResponseDto: id, fileName, fileSize, mimeType, url (construir URL relativa), width?, height?, createdAt
- Para a URL: `/api/v1/chat/attachments/${id}`

## PARTE 2 — FRONTEND: Upload e visualização

### Arquivos a criar/modificar:
- mundial-erp-web/src/features/chat/components/message-composer.tsx (conectar botão)
- Criar: mundial-erp-web/src/features/chat/components/attachment-preview.tsx
- mundial-erp-web/src/features/chat/components/message-item.tsx (mostrar anexos)
- mundial-erp-web/src/features/chat/services/message.service.ts (ou criar attachment.service.ts)
- mundial-erp-web/src/features/chat/hooks/ (criar use-attachments.ts)
- mundial-erp-web/src/features/chat/types/chat.types.ts (adicionar tipos)

### Implementação — Composer:
1. Leia `message-composer.tsx` — encontre o botão de attachment (ícone de clip)
2. Ao clicar, abra um input[type=file] hidden (accept="image/*,.pdf,.doc,.docx,.xls,.xlsx")
3. Ao selecionar arquivo(s), mostre preview acima do textarea:
   - Imagens: thumbnail pequeno (64x64 rounded)
   - Outros: ícone de documento + nome do arquivo + tamanho
   - Botão X para remover da fila antes de enviar
4. Ao enviar a mensagem, primeiro faça upload dos arquivos, depois envie a mensagem com os attachment IDs
5. Mostre barra de progresso durante upload

### Implementação — Visualização:
1. No `message-item.tsx`, após o conteúdo da mensagem, mostre os anexos
2. Imagens: renderize inline com max-width: 400px, rounded, clicável para ver em tamanho original
3. Outros arquivos: card com ícone, nome, tamanho, botão de download
4. Agrupe imagens em grid se múltiplas (grid-cols-2 gap-2)

### Service e Hook:
- `attachmentService.upload(channelId, file): Promise<Attachment>`
- `useUploadAttachment(channelId)` — useMutation com onSuccess

## REGRAS:
- Leia todos os arquivos relevantes ANTES de editar
- Validação de tipo e tamanho tanto no frontend quanto no backend
- Nunca confie no Content-Type do upload — valide pela extensão também
- Renomeie arquivos com UUID para evitar path traversal
- Crie a pasta uploads/ com .gitkeep
- Limite: 10MB por arquivo, max 5 arquivos por mensagem
- NÃO use pacotes novos sem necessidade — multer já é suficiente para upload
```

---

## Agent 5 — Presence, Markdown & Polish

**Descrição para o Agent tool:** `Chat Squad 5: Presence and polish`

**Prompt completo:**

```
{CONTEXTO COMPARTILHADO}

VOCÊ É O AGENT 5 DO SQUAD CHAT — "Presence, Markdown & Polish"

Sua missão é polir a experiência do chat com 4 melhorias visuais e funcionais.
Outros agents estão trabalhando em reações, busca e attachments — NÃO toque nessas áreas.

## TAREFA 1 — Indicadores de presença online/offline

### Arquivos:
- mundial-erp-web/src/stores/chat.store.ts (já tem onlineUserIds — apenas leia)
- mundial-erp-web/src/features/chat/components/channel-list-item.tsx
- mundial-erp-web/src/features/chat/components/message-item.tsx
- mundial-erp-web/src/features/chat/components/members-popover.tsx

### Implementação:
1. Leia `chat.store.ts` — veja como `onlineUserIds` é gerenciado
2. Crie um componente inline ou utility para indicador de presença:
   - Bolinha de 8px (w-2 h-2) posicionada no canto inferior direito do avatar
   - Online: bg-green-500 com ring-2 ring-white dark:ring-gray-900
   - Offline: bg-gray-400 (ou não mostrar)
3. Aplique nos seguintes locais:
   - `channel-list-item.tsx`: No avatar de DMs, mostre indicador de presença do outro usuário
   - `message-item.tsx`: No avatar do autor da mensagem
   - `members-popover.tsx`: Na lista de membros
4. Para verificar se online: `useChatStore().onlineUserIds.includes(userId)`

## TAREFA 2 — Markdown rendering nas mensagens

### Arquivos:
- mundial-erp-web/src/features/chat/components/message-item.tsx
- Possivelmente criar: mundial-erp-web/src/features/chat/components/message-content.tsx

### Implementação:
1. Leia `message-item.tsx` — encontre onde `message.content` é renderizado
2. Verifique se o projeto já tem alguma lib de markdown (busque por 'marked', 'remark', 'markdown' no package.json)
3. Se não tem, implemente markdown BÁSICO sem lib externa:
   - **bold** → <strong>
   - *italic* → <em>
   - `code` → <code> com bg-gray-100 px-1 rounded
   - ```code block``` → <pre><code> com bg-gray-900 text-gray-100 p-3 rounded
   - [link](url) → <a> com text-blue-600 hover:underline
   - Newlines → <br>
4. Crie uma função `renderMarkdown(content: string): React.ReactNode` ou um componente `<MessageContent content={content} />`
5. Mantenha a funcionalidade de @mention highlighting que já existe (regex para @userId)
6. Sanitize HTML — não use dangerouslySetInnerHTML, parse e renderize como React elements

## TAREFA 3 — Exibir tópico/descrição do canal no header

### Arquivos:
- mundial-erp-web/src/features/chat/components/message-area.tsx

### Implementação:
1. Leia `message-area.tsx` — encontre o header do canal
2. O objeto `channel` já tem `description` e `topic`
3. Abaixo do nome do canal, mostre o tópico (se existir) em texto menor:
   - Estilo: text-xs text-muted-foreground truncate max-w-md
   - Se não tem tópico mas tem description, mostre a description
   - Se não tem nenhum, não mostre nada (não ocupe espaço)
4. Ao clicar no tópico, abra um tooltip ou popover com o texto completo (se truncado)

## TAREFA 4 — Typing indicator com nomes

### Arquivos:
- mundial-erp-web/src/features/chat/components/message-area.tsx (ou componente de typing)
- mundial-erp-web/src/stores/chat.store.ts (leia — tem typingUsers)

### Implementação:
1. Encontre onde o typing indicator é renderizado (provavelmente no message-area.tsx)
2. Atualmente pode mostrar apenas "alguém está digitando..."
3. Melhore para mostrar nomes:
   - 1 pessoa: "João está digitando..."
   - 2 pessoas: "João e Maria estão digitando..."
   - 3+: "João, Maria e outros estão digitando..."
4. Adicione animação de 3 pontos (●●●) com CSS pulse/bounce
5. A informação do typing vem do Zustand store `typingUsers[channelId]`
   - Se guarda só userId, você precisa resolver o nome (veja como membros são buscados)
   - Se já guarda nome, use diretamente

## REGRAS:
- Leia TODOS os arquivos antes de editar
- NÃO toque em: sistema de reações, busca, attachments, socket logic, backend
- Mantenha o estilo visual consistente com o Tailwind existente no chat
- Componentes pequenos e focados (máximo ~150 linhas)
- Se precisar de uma lib de markdown, NÃO instale — implemente o básico manualmente
- Use dark mode classes em tudo (dark: prefix)
- Não modifique o Zustand store — apenas leia dele
```

---

## Checklist Pós-Execução

Após todos os 5 agents terminarem, o assistente principal deve:

- [ ] Verificar se o `chat.module.ts` inclui novos providers/controllers do Agent 4
- [ ] Verificar se o `schema.prisma` foi alterado (Agent 4) e precisa de `npx prisma generate`
- [ ] Verificar conflitos entre Agent 2 e Agent 5 em `message-item.tsx` (ambos editam)
- [ ] Verificar se tipos em `chat.types.ts` estão consistentes (Agents 2, 3, 4 editam)
- [ ] Rodar `npm run build` no backend e frontend para verificar TypeScript
- [ ] Apresentar resumo consolidado ao usuário

### Resolução de Conflitos

Se dois agents editaram o mesmo arquivo:
1. Leia o arquivo resultante
2. Identifique qual parte é de qual agent
3. Faça merge manual preservando ambas as mudanças
4. Verifique que o TypeScript compila

### Ordem de Merge Sugerida (se conflito em message-item.tsx)

1. Agent 5 (presence + markdown — mais invasivo na renderização)
2. Agent 2 (reactions — adiciona seção nova abaixo do conteúdo)

---

## Resumo dos 5 Agents

| # | Nome | Foco | Camada | Risco de Conflito |
|---|------|------|--------|-------------------|
| 1 | Backend Data Fix | Reactions, unread, lastMessage no backend | Backend only | Nenhum |
| 2 | Reactions & Emoji UI | Exibir/interagir com reações | Frontend only | message-item.tsx |
| 3 | Message Search & Pin | Buscar mensagens (full-stack) | Full-stack | Nenhum |
| 4 | File Attachments | Upload de arquivos (full-stack) | Full-stack | chat.types.ts |
| 5 | Presence & Polish | Presença, markdown, tópico, typing | Frontend only | message-item.tsx |
