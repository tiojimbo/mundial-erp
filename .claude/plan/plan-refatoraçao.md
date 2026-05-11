Ordem proposta: começa por refatorações cosméticas (baixo risco) e termina nas features
  novas.

  ---
  Fase 1 — Refatorações cosméticas (sem migration)

  1.1 Trocar PATCH por PUT (compat: aceitar ambos)

  Hoppe rejeita PATCH com 404. Pra "ficar igual" sem quebrar o front atual do ERP, registra o
  mesmo handler nos dois decorators.

  Arquivos a tocar:
  - src/modules/workspaces/workspaces.controller.ts — @Patch(':id') → adicionar @Put(':id')
  apontando pro mesmo handler
  - src/modules/chat/channels/channels.controller.ts — @Patch(':channelId') e
  @Patch(':channelId/members/:targetUserId/role') → idem
  - src/modules/chat/messages/messages.controller.ts — @Patch(':messageId') → idem
  - src/modules/views/views.controller.ts — @Patch(':id/pin') → idem
  - src/modules/work-items/work-items.controller.ts — @Patch(':id') e @Patch(':id/status') →
  idem
  - src/modules/users/users.controller.ts — @Patch('me') e @Patch(':id') → idem

  Padrão: extrai a lógica num método privado, expõe via 2 decorators:
  @Put(':id')
  @Patch(':id')
  update(...) { return this.service.update(...); }

  1.2 Renomear /attachments/signed-url → /attachments/presigned-url

  Arquivo: src/modules/task-attachments/task-attachments.controller.ts

  - Mudar @Post('attachments/signed-url') → manter handler com 2 decorators:
  @Post('attachments/presigned-url') (primary) e @Post('attachments/signed-url') (deprecated
  alias).
  - Alinhar shape do body com Hoppe:

  // DTO Hoppe-compatível (novo):
  {
    taskId: string,
    fileName: string,         // Hoppe usa fileName (camelCase com N maiúsculo)
    fileType: string,
    fileSize: number
  }

  Atualizar SignedUrlRequestDto pra aceitar tanto filename/mimeType/sizeBytes (atual) quanto
  fileName/fileType/fileSize (Hoppe). Marca os antigos como deprecated.

  Resposta:
  // Hoppe retorna:
  { uploadUrl: string, fileKey: string, expiresIn: number }
  // ERP retorna hoje:
  { uploadUrl: string, storageKey: string, expiresAt: number }

  Padronizar: renomear storageKey → fileKey e expiresAt → expiresIn (em segundos, não
  timestamp). Quebra contrato — vale fazer com bandeira: aceitar query ?legacy=true retornando
  o shape antigo por algumas semanas.

  1.3 POST /attachments → POST /attachments/tasks/{taskId}

  Hoppe usa path com taskId no path. ERP usa taskId no body. Adicionar a rota com taskId no
  path (primária), manter /attachments com taskId no body como alias deprecated.

  Mesmo arquivo, mesmo método register(). Só duplicar a anotação:
  @Post('attachments/tasks/:taskId')   // novo, primary
  @Post('attachments')                  // deprecated alias

  1.4 GET /attachments/task/:taskId → GET /attachments/tasks/:taskId

  Hoppe usa plural tasks. ERP usa singular task. Adiciona alias com plural como novo path
  primário.

  1.5 Custom fields — agrupar response por escopo

  Arquivo: src/modules/custom-fields/custom-field-definitions.controller.ts

  Hoje GET /custom-fields retorna array plano. Hoppe retorna {list:[], folder:[], space:[],
  taskType:[]} quando vem ?spaceId=.

  Mudança:
  - Manter GET /custom-fields plano (compat ERP)
  - Quando query incluir spaceId (ou folderId/listId), retornar agrupado no formato Hoppe
  - Lógica de agrupamento no service: para cada CustomFieldDefinition, olhar a relação
  targetType e separar nos buckets

  1.6 Custom task types — adicionar PUT e DELETE

  Arquivo: src/modules/custom-task-types/custom-task-types.controller.ts

  Hoje só tem GET (list/byId) e POST. Adicionar:
  @Put(':id')
  @Roles(Role.ADMIN, Role.MANAGER)
  update(...)

  @Delete(':id')
  @Roles(Role.ADMIN, Role.MANAGER)
  remove(...)

  Service: já tem create. Adicionar update(id, dto) e remove(id). Atenção ao validar que o tipo
   não é builtin (campo isBuiltin ou similar — conferir model).

  1.7 Chat events — renomear message:new → chat:message:new

  Arquivo: src/modules/chat/gateway/chat.gateway.ts linhas 86-119.

  Hoppe usa o prefixo chat: no namespace /chat. ERP emite message:new (sem prefixo). Estratégia
   dupla compatível:

  @OnEvent(CHAT_EVENTS.MESSAGE_CREATED)
  onMessageCreated(payload: MessageCreatedPayload) {
    const room = `channel:${payload.channelId}`;
    this.server.to(room).emit('message:new', payload.message);        // ERP legacy
    this.server.to(room).emit('chat:message:new', payload.message);   // Hoppe
  }

  Repetir pra chat:message:updated, chat:message:deleted, chat:reaction:added,
  chat:reaction:removed.

  ---
  Fase 2 — /favorites (recurso novo)

  2.1 Migration Prisma

  Adicionar no prisma/schema.prisma:

  model Favorite {
    id          String         @id @default(cuid())
    userId      String         @map("user_id")
    workspaceId String         @map("workspace_id")
    entityType  FavoriteEntity
    entityId    String         @map("entity_id")
    position    Int            @default(0)
    createdAt   DateTime       @default(now()) @map("created_at")

    user      User      @relation(fields: [userId], references: [id])
    workspace Workspace @relation(fields: [workspaceId], references: [id])

    @@unique([userId, workspaceId, entityType, entityId], name: "uniq_user_workspace_entity")
    @@index([userId, workspaceId])
    @@map("favorites")
  }

  enum FavoriteEntity {
    SPACE
    FOLDER
    LIST
    TASK
    CHAT_CHANNEL
  }

  Adicionar nas relações de User:
  favorites Favorite[]

  E em Workspace:
  favorites Favorite[]

  Rodar: npx prisma migrate dev --name add_favorites.

  2.2 Módulo NestJS

  Criar src/modules/favorites/:
  - favorites.module.ts
  - favorites.controller.ts
  - favorites.service.ts
  - favorites.repository.ts
  - dtos/
    - create-favorite.dto.ts — { entityType, entityId, position? }
    - favorite-response.dto.ts

  Registrar em src/app.module.ts no array de imports.

  2.3 Endpoints (espelham o Hoppe)

  @Controller()
  @ApiTags('Favorites')
  @ApiBearerAuth()
  export class FavoritesController {
    @Get('favorites')
    list(@CurrentUser() user, @WorkspaceId() workspaceId) {
      // retorna array de Favorite com a entidade embed
    }

    @Get('favorites/spaces')
    listSpaces(...) {
      // filtrado por entityType=SPACE, com space completo embed
    }

    @Get('favorites/check/:entityType/:entityId')
    check(...) {
      // retorna { isFavorite: boolean, favoriteId?: string }
    }

    @Post('favorites')
    @HttpCode(HttpStatus.CREATED)
    create(@CurrentUser() user, @WorkspaceId() workspaceId, @Body() dto) {
      // upsert (user+workspace+entityType+entityId)
    }

    @Delete('favorites/:id')
    remove(...) {
      // hard delete
    }
  }

  2.4 Considerações de auth/escopo

  - Cada Favorite é por usuário e por workspace. Validar que entityId pertence ao workspace do
  header.
  - Retornar 404 se tentar favoritar entidade de outro workspace (mesmo padrão do
  custom-task-types cross-tenant).
  - Lista paginada? Hoppe retorna tudo. Manter simples: array plano.

  ---
  Fase 3 — sidebar-order

  3.1 Decisão de armazenamento

  Hoppe expõe GET/PUT /workspaces/{id}/sidebar-order retornando um JSON com ordem do sidebar do
   usuário (favoritos, espaços, canais).

  Duas opções:
  - A) Adicionar coluna JSON no WorkspaceMember (sidebarOrder Json @default("{}")). Por
  usuário, por workspace. Recomendo.
  - B) Tabela nova UserSidebarPreference. Mais flexível, mas overkill.

  Vou de A.

  3.2 Migration

  Editar model WorkspaceMember no schema.prisma:
  sidebarOrder Json @default("{}") @map("sidebar_order")

  Migration: npx prisma migrate dev --name workspace_member_sidebar_order.

  Shape do JSON sugerido (livre, segue o que o front quer):
  {
    "spaces": ["spaceIdA", "spaceIdB", "spaceIdC"],
    "channels": ["chanId1", "chanId2"],
    "favorites": ["favId1", "favId2"]
  }

  3.3 Endpoints

  Adicionar em src/modules/workspaces/workspaces.controller.ts (ou criar sub-controller):

  @Get(':id/sidebar-order')
  getSidebarOrder(
    @Param('id') workspaceId: string,
    @CurrentUser() user
  ) {
    return this.service.getSidebarOrder(workspaceId, user.sub);
  }

  @Put(':id/sidebar-order')
  updateSidebarOrder(
    @Param('id') workspaceId: string,
    @CurrentUser() user,
    @Body() dto: SidebarOrderDto
  ) {
    return this.service.updateSidebarOrder(workspaceId, user.sub, dto);
  }

  SidebarOrderDto:
  export class SidebarOrderDto {
    @IsObject()
    @IsOptional()
    spaces?: string[];
    // ... outros buckets, todos opcionais
  }

  Service lê/atualiza WorkspaceMember.sidebarOrder (do user logado + workspaceId). Se não
  existir membro, 404.

  ---
  Fase 4 — /spaces/shared-with-me

  4.1 Endpoint

  Adicionar em src/modules/bpm/definitions/spaces/spaces.controller.ts, antes do @Get(':id')
  (senão NestJS bate em :id="shared-with-me"):

  @Get('shared-with-me')
  sharedWithMe(@WorkspaceId() workspaceId, @CurrentUser() user) {
    return this.service.findSharedWithMe(workspaceId, user.sub);
  }

  Service findSharedWithMe:
  return this.prisma.space.findMany({
    where: {
      workspaceId,
      deletedAt: null,
      creatorId: { not: userId },        // não é dono
      members: { some: { userId } }      // mas é membro
    },
    include: { /* mesmo shape do list normal */ }
  });

  Sem migration. Só endpoint + service method.

  ---
  Fase 5 — /spaces/{id}/task-types (CRUD scoped)

  5.1 Endpoints

  CustomTaskType já tem spaceId no model. Falta expor com scope.

  Criar src/modules/custom-task-types/space-task-types.controller.ts (controller adicional,
  mesmo service):

  @Controller('spaces/:spaceId/task-types')
  @ApiBearerAuth()
  export class SpaceTaskTypesController {
    constructor(private readonly service: CustomTaskTypesService) {}

    @Get()
    listBySpace(
      @Param('spaceId') spaceId,
      @WorkspaceId() workspaceId
    ) {
      return this.service.listBySpace(workspaceId, spaceId);
    }

    @Post()
    createInSpace(
      @Param('spaceId') spaceId,
      @WorkspaceId() workspaceId,
      @Body() dto
    ) {
      return this.service.create(workspaceId, { ...dto, spaceId });
    }

    @Put(':ttId')
    update(
      @Param('spaceId') spaceId,
      @Param('ttId') ttId,
      @WorkspaceId() workspaceId,
      @Body() dto
    ) {
      return this.service.update(workspaceId, ttId, dto, { spaceId });
    }

    @Delete(':ttId')
    remove(
      @Param('spaceId') spaceId,
      @Param('ttId') ttId,
      @WorkspaceId() workspaceId
    ) {
      return this.service.remove(workspaceId, ttId, { spaceId });
    }
  }

  Registrar no custom-task-types.module.ts.

  Validar no service que o spaceId bate com o do TT antes de update/delete (cross-tenant
  retorna 404).

  5.2 Response shape

  Hoppe retorna:
  {
    "id":"...", "value":"Tarefa", "pluralName":"Tarefas",
    "description":null, "icon":"CircleDotIcon",
    "spaceId":"...", "creatorId":"...",
    "createdAt":"...", "updatedAt":"...",
    "creator": {"id":"...", "name":"...", "email":"..."}
  }

  Conferir CustomTaskTypeResponseDto do ERP — se difere, criar variante Hoppe-shape ou alinhar.

  ---
  Fase 6 — /tasks/list?viewId=&level=

  6.1 Onde implementar

  O ERP já tem GET /work-items/grouped em work-items.controller.ts. Hoppe expõe como GET
  /tasks/list?viewId=&level=list.

  Adicionar em src/modules/tasks/tasks.controller.ts:

  @Get('tasks/list')
  listGrouped(
    @Query('viewId') viewId: string,
    @Query('level') level: 'list' | 'space' | 'folder',
    @WorkspaceId() workspaceId,
    @CurrentUser() user
  ) {
    return this.tasksService.listGrouped(workspaceId, viewId, level, user.sub);
  }

  Service: reusa WorkItemsService.findGrouped (se existir) ou cria nova lógica que pega view →
  carrega tasks no escopo → agrupa por status.

  Shape da response (igual ao Hoppe):
  Array<{
    group: { id, name, label, type:'STATUS', color, position, ... },
    tasks: Task[]
  }>

  ---
  Fase 7 — WebSocket /notifications

  7.1 Criar gateway

  Novo arquivo: src/modules/notifications/notifications.gateway.ts

  @WebSocketGateway({ namespace: '/notifications' })
  export class NotificationsGateway implements OnGatewayConnection {
    @WebSocketServer() server: Server;

    constructor(private readonly wsAuthGuard: WsAuthGuard) {}

    async handleConnection(client: Socket) {
      const user = this.wsAuthGuard.authenticate(client);
      if (!user) { client.disconnect(); return; }
      client.data.user = user;
      void client.join(`user:${user.sub}`);
    }

    @OnEvent('notification.created')
    onCreated(payload: { userId: string; notification: any }) {
      this.server.to(`user:${payload.userId}`).emit('notification', payload.notification);
    }
  }

  Registrar no notifications.module.ts.

  7.2 Emitir o evento ao criar notification

  Em src/modules/notifications/notification-emitter.service.ts (já existe), depois do create:
  this.eventEmitter.emit('notification.created', { userId, notification });

  ---
  Fase 8 — Bravy AI (/ai/conversations) — opcional

  8.1 Schema

  model AIConversation {
    id          String      @id @default(cuid())
    userId      String      @map("user_id")
    workspaceId String      @map("workspace_id")
    title       String?
    createdAt   DateTime    @default(now()) @map("created_at")
    updatedAt   DateTime    @updatedAt @map("updated_at")

    user      User        @relation(fields: [userId], references: [id])
    workspace Workspace   @relation(fields: [workspaceId], references: [id])
    messages  AIMessage[]

    @@index([userId, workspaceId])
    @@map("ai_conversations")
  }

  model AIMessage {
    id             String         @id @default(cuid())
    conversationId String         @map("conversation_id")
    role           AIMessageRole  // USER, ASSISTANT, SYSTEM
    content        String         @db.Text
    createdAt      DateTime       @default(now()) @map("created_at")

    conversation AIConversation @relation(fields: [conversationId], references: [id])

    @@index([conversationId, createdAt])
    @@map("ai_messages")
  }

  enum AIMessageRole { USER ASSISTANT SYSTEM }

  8.2 Endpoints

  Criar src/modules/ai-conversations/:
  POST /api/v1/ai/conversations             body: {} (opcional: {title})
  GET  /api/v1/ai/conversations/:id
  POST /api/v1/ai/conversations/:id/messages/stream   body: {content}  (SSE)

  SSE no Nest: usar @Sse() decorator do @nestjs/common + RxJS Observable<MessageEvent>.
  Conectar com OpenRouter via axios (já no projeto) com stream: true.

  Custo: precisa configurar OPENROUTER_API_KEY no .env e adicionar à conta da Mundial.

  Recomendo deixar essa fase pro fim. Sem ela, o resto da API fica idêntica ao Hoppe.

  ---
  Fase 9 — Detalhes finos pra fechar 100%

  9.1 Header workspace-id

  Hoppe exige o header workspace-id em todas as rotas autenticadas. O ERP tem o decorator
  @WorkspaceId() (em src/modules/workspaces/decorators/workspace-id.decorator.ts). Conferir:
  - O decorator extrai do header workspace-id (lowercase)?
  - Existe guard que rejeita request sem o header (exceto rotas de auth)?

  Se não, ajustar pra rejeitar com 400 quando o header faltar — Hoppe faz assim.

  9.2 Naming WorkItem vs Task no public API

  Decisão: manter WorkItem* nas tabelas (BPM depende), expor SÓ /tasks/* no público. Marcar
  /work-items/* como interno (talvez prefixo /internal/ ou guard de admin).

  Não precisa migration. Só descontinuar o controller público de work-items ou mover pra
  /internal/work-items.

  9.3 Soft delete vs hard delete

  Hoppe usa hard delete em quase tudo (Task, Folder, etc). ERP usa soft delete (deletedAt).
  Decidir caso a caso. Pra "ficar igual ao Hoppe" o comportamento visível tem que ser: depois
  do DELETE, GET retorna 404. Confere se o ERP filtra por deletedAt: null nos finds — se sim,
  comportamento já bate.

  9.4 Response do read de notification

  Hoppe retorna o objeto sem task/workspace embed após POST /notifications/:id/read. ERP
  precisa fazer o mesmo (não expandir relações nesse endpoint).

  9.5 Filtro ?read= na lista de notifications

  Hoppe ignora o filtro (bug conhecido). ERP filtra de verdade. Manter o ERP correto, é melhor.

  ---
  Ordem executiva (pra abrir PRs)

  1. PR 1 — Refatorações de path (Fase 1.1 a 1.4): só aliases novos. Zero risco.
  2. PR 2 — Custom fields/task types ajustes (Fase 1.5 a 1.6): shape + 2 endpoints.
  3. PR 3 — Chat WS events Hoppe-compat (Fase 1.7): emit duplo. Sem impacto no front atual.
  4. PR 4 — Favorites (Fase 2): migration + módulo + endpoints.
  5. PR 5 — Sidebar-order (Fase 3): migration WorkspaceMember.sidebarOrder + 2 endpoints.
  6. PR 6 — Spaces shared-with-me + task-types scoped (Fases 4 e 5): só endpoints novos.
  7. PR 7 — /tasks/list?viewId= (Fase 6): alias do /work-items/grouped.
  8. PR 8 — Notifications Gateway (Fase 7): WebSocket namespace novo.
  9. PR 9 — Detalhes finos (Fase 9): naming, validação de header, embeds.
  10. PR 10 (opcional) — Bravy AI (Fase 8): schema + módulo + OpenRouter.