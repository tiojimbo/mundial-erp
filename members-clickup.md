Na criação do canal: o campo user_ids (até 100 usuários) define os membros iniciais. Se você não especificar, a visibilidade (PUBLIC/PRIVATE) determina quem tem acesso.
Na criação de DMs: o campo user_ids (até 15 usuários) define os participantes. A composição do grupo é imutável — se um DM entre os mesmos usuários já existir, ele é retornado.
Canais PUBLIC: todos os membros do Workspace têm acesso implícito. Os "members" retornados pelo endpoint podem incluir quem já interagiu ou entrou no canal.
Canais PRIVATE: apenas os user_ids especificados na criação. A adição/remoção posterior provavelmente acontece internamente no produto (UI), mas não está exposta na API v3 atual.
Canais vinculados a localização (Space/Folder/List): a memberidade é herdada da hierarquia. Se um usuário tem acesso ao Space, ele tem acesso ao canal do Space.

Como replicar na sua aplicação
Modelo de dados
channel_members
├── id              (PK)
├── channel_id      (FK → channels)
├── user_id         (FK → users)
├── role            (ENUM: 'owner' | 'admin' | 'member')
├── is_follower     (BOOLEAN, default: true)
├── joined_at       (TIMESTAMP)
├── left_at         (TIMESTAMP, nullable — para soft remove)
└── UNIQUE(channel_id, user_id)

message_followers
├── message_id      (FK → messages)
├── user_id         (FK → users)
└── UNIQUE(message_id, user_id)
Lógica de Memberidade por tipo de canal
Canais PUBLIC:
Ao criar, insira os user_ids fornecidos na tabela channel_members. Qualquer usuário do workspace pode entrar no canal (auto-join). Quando alguém envia a primeira mensagem ou acessa o canal, adicione-o automaticamente como membro. O endpoint de listar canais retorna todos os públicos, mas o filtro is_follower permite ao frontend separar "meus canais" dos demais.
Canais PRIVATE:
Somente os user_ids definidos na criação têm acesso. Crie endpoints adicionais que o ClickUp não expõe publicamente mas certamente possui internamente:
POST   /api/channels/:channelId/members     → adicionar membro(s)
DELETE /api/channels/:channelId/members/:userId  → remover membro
Valide que apenas owners/admins do canal podem adicionar ou remover membros. Ao remover, o usuário perde acesso imediato — use WebSocket para notificá-lo.
DMs (Direct Messages):
Os participantes são imutáveis após a criação. A idempotência é garantida pelo hash dos participantes. Não permita adicionar ou remover membros. Se o usuário quiser um grupo diferente, crie um novo DM.
Canais de Localização (Space/Folder/List):
A memberidade é derivada. Consulte a tabela de permissões do Space/Folder/List para resolver quem tem acesso. Quando um usuário é adicionado ao Space, ele automaticamente ganha acesso ao canal associado. Isso exige uma hierarquia de permissões:
Workspace → Space → Folder → List → Channel
Followers vs Members — implementação
O ClickUp separa claramente esses conceitos com dois endpoints distintos. Na prática:
Quando um usuário entra em um canal, ele se torna member E follower por padrão (recebe notificações). Ele pode unfollow para parar de receber notificações sem sair do canal — continue sendo membro mas com is_follower = false. O filtro is_follower=true no endpoint de listar canais permite ao frontend montar a sidebar mostrando só os canais que o usuário segue ativamente.
Para a sua aplicação, implemente:
POST   /api/channels/:channelId/follow      → seguir canal (is_follower = true)
DELETE /api/channels/:channelId/follow       → deixar de seguir (is_follower = false)
Message-level followers
Quando alguém cria uma mensagem com followers: ["user1", "user2"], esses usuários recebem notificações sobre replies naquela thread específica. Quando alguém responde a uma thread, auto-adicione o autor como follower da mensagem. Isso replica o comportamento de apps como Slack/ClickUp onde responder a um thread automaticamente te "inscreve" nas notificações dele.
Endpoint de DMs fechados
O ClickUp tem o conceito de DMs que foram "explicitamente fechados" (include_closed no Retrieve Channels). Para replicar, adicione um campo closed_at na tabela channel_members que indica quando o usuário "fechou" (escondeu) aquele DM. O DM continua existindo, mas não aparece na listagem padrão — só com include_closed=true.
Endpoints que você precisa criar (que o ClickUp tem internamente mas não expõe na API pública)
POST   /api/channels/:id/members              → adicionar membros
DELETE /api/channels/:id/members/:userId       → remover membro
POST   /api/channels/:id/follow               → seguir canal
DELETE /api/channels/:id/follow               → deixar de seguir
PATCH  /api/channels/:id/members/:userId/role  → alterar role (owner/admin/member)
POST   /api/channels/:id/close                → fechar/esconder DM
POST   /api/channels/:id/open                 → reabrir DM
Esses endpoints complementam os 19 da API pública do ClickUp e são essenciais para uma replicação funcional completa. O ClickUp certamente os possui no backend — eles simplesmente não os expuseram na API v3 experimental.