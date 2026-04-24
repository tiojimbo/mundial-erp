Base URL: https://api.clickup.com/api/v2
Autenticação: header Authorization: <API_TOKEN> (Personal token ou OAuth access token)
Content-Type padrão: application/json
Observação geral sobre Custom Task IDs: Em endpoints que operam sobre {task_id}, é possível usar o Custom Task ID da tarefa ao passar custom_task_ids=true combinado com team_id={workspace_id}.

1. Get Tasks (Listar tarefas de uma List)

Método/URL: GET /list/{list_id}/task
Descrição: Retorna as tarefas cuja home List é a lista informada. Paginação fixa de 100 por página. Para incluir tarefas presentes em múltiplas listas, use include_timl=true. O campo time_spent vem em ms e só aparece quando há time entries.
Path params:

list_id (number, required)


Query params:

archived (boolean)
include_markdown_description (boolean)
page (integer, começa em 0)
order_by (string: id | created | updated | due_date)
reverse (boolean)
subtasks (boolean)
statuses[] (array de string)
include_closed (boolean)
include_timl (boolean) — Tasks in Multiple Lists
assignees[] (array de string)
watchers[] (array de string)
tags[] (array de string)
due_date_gt, due_date_lt (integer, Unix ms)
date_created_gt, date_created_lt (integer, Unix ms)
date_updated_gt, date_updated_lt (integer, Unix ms)
date_done_gt, date_done_lt (integer, Unix ms)
custom_fields (array JSON com {field_id, operator, value})
custom_field (variante para um único Custom Field)
custom_items[] (array number: 0 = Task, 1 = Milestone, outros = custom task types)


Response: 200 — lista paginada de tasks.


2. Create Task

Método/URL: POST /list/{list_id}/task
Path params:

list_id (number, required)


Body params:

name (string, required)
description (string)
markdown_content (string) — se enviado junto com description, este prevalece
assignees (array de integer, user IDs)
group_assignees (array de string, user group IDs)
archived (boolean)
tags (array de string)
status (string)
priority (integer | null) — 1 Urgent, 2 High, 3 Normal, 4 Low
due_date (integer, Unix ms)
due_date_time (boolean)
time_estimate (integer, ms)
start_date (integer, Unix ms)
start_date_time (boolean)
points (number) — Sprint Points
notify_all (boolean)
parent (string | null) — cria subtask
links_to (string | null) — cria linked dependency
check_required_custom_fields (boolean)
custom_fields (array de objetos {id, value} dos diversos tipos suportados)
custom_item_id (number) — 0 = Task padrão; demais = custom task types


Response: 200 — tarefa criada.


3. Get Task (Detalhes de uma tarefa)

Método/URL: GET /task/{task_id}
Path params: task_id (string, required)
Query params:

custom_task_ids (boolean)
team_id (number) — obrigatório se custom_task_ids=true
include_subtasks (boolean)
include_markdown_description (boolean)
custom_fields (array JSON de filtros, mesmo formato de Get Tasks)


Response: 200 — detalhe da tarefa. Docs anexados não são retornados; anexos comuns sim.


4. Update Task

Método/URL: PUT /task/{task_id}
Importante: Custom Fields NÃO são atualizados por este endpoint. Use o endpoint Set Custom Field Value.
Path params: task_id (string, required)
Query params:

custom_task_ids (boolean)
team_id (number)


Body params:

custom_item_id (number | null)
name (string)
description (string) — para limpar, enviar " "
markdown_content (string)
status (string)
priority (integer)
due_date (integer)
due_date_time (boolean)
parent (string) — mover subtask para outro parent; não converte subtask em task ao enviar null
time_estimate (integer)
start_date (integer)
start_date_time (boolean)
points (number)
assignees (object: { add: [ids], rem: [ids] })
group_assignees (object: { add, rem })
watchers (object: { add, rem })
archived (boolean)


Response: 200.


5. Delete Task

Método/URL: DELETE /task/{task_id}
Path params: task_id (string, required)
Query params:

custom_task_ids (boolean)
team_id (number)


Headers: Content-Type: application/json (required)
Response: 204 (No Content).


6. Get Filtered Team Tasks (Busca por Workspace)

Método/URL: GET /team/{team_Id}/task
Descrição: Retorna tarefas que atendem a critérios em todo o Workspace. Paginação 100/página.
Path params: team_Id (number, required) — Workspace ID.
Query params:

page (integer)
order_by (string: id | created | updated | due_date)
reverse (boolean)
subtasks (boolean)
space_ids[], project_ids[] (Folders), list_ids[] (arrays de string)
statuses[], assignees[], tags[] (arrays de string)
include_closed (boolean)
due_date_gt/lt, date_created_gt/lt, date_updated_gt/lt, date_done_gt/lt (integer ms)
custom_fields (array JSON de filtros; operador = não suportado em Label)
parent (string) — para retornar subtasks de um parent específico
include_markdown_description (boolean)
custom_items[] (array number)


Response: 200.


7. Merge Tasks

Método/URL: POST /task/{task_id}/merge
Descrição: Mescla múltiplas tarefas em uma tarefa-alvo. Custom Task IDs não suportados aqui.
Path params: task_id (string, required) — tarefa-alvo.
Body params:

source_task_ids (array de string, required) — IDs das tarefas que serão mescladas no alvo.


Responses: 200 sucesso · 400 validação · 403 não autorizado · 404 não encontrado.


8. Get Task's Time in Status

Método/URL: GET /task/{task_id}/time_in_status
Descrição: Tempo que a task passou em cada status. Requer que o ClickApp “Total time in Status” esteja ativo no Workspace.
Path params: task_id (string, required)
Query params:

custom_task_ids (boolean)
team_id (number)


Headers: Content-Type: application/json (required)
Response: 200.


9. Get Bulk Tasks' Time in Status

Método/URL: GET /task/bulk_time_in_status/task_ids
Descrição: Tempo em status para 2+ tarefas (até 100 IDs por request). Requer ClickApp “Total time in Status”.
Query params:

task_ids (string, required) — repetir o parâmetro por id: task_ids=3cuh&task_ids=g4fs
custom_task_ids (boolean)
team_id (number)


Headers: Content-Type: application/json (required)
Response: 200.


10. Create Task From Template

Método/URL: POST /list/{list_id}/taskTemplate/{template_id}
Descrição: Cria uma tarefa a partir de um template. Templates compartilhados publicamente precisam ser adicionados ao Workspace antes de uso via API.
Path params:

list_id (number, required)
template_id (string, required)


Body params:

name (string, required)


Response: 200.


Resumo rápido (tabela mental para a LLM)
#OperaçãoMétodoPath1Listar tasks de uma ListGET/list/{list_id}/task2Criar taskPOST/list/{list_id}/task3Obter taskGET/task/{task_id}4Atualizar taskPUT/task/{task_id}5Excluir taskDELETE/task/{task_id}6Filtrar tasks do WorkspaceGET/team/{team_id}/task7Merge de tasksPOST/task/{task_id}/merge8Time in Status (única)GET/task/{task_id}/time_in_status9Time in Status (bulk)GET/task/bulk_time_in_status/task_ids10Criar task por templatePOST/list/{list_id}/taskTemplate/{template_id}

Observações úteis para o plano de implementação

Paginação: endpoints de listagem usam page a partir de 0 com 100 itens por página. Implemente loop de paginação até vir página vazia.
Datas: sempre em Unix time (ms). Flags *_time indicam se o horário é relevante.
Custom Fields: leitura vem no payload de Get Task(s); escrita requer endpoint próprio Set Custom Field Value (fora do escopo Tasks).
Custom Task IDs: padronize um helper que injete custom_task_ids=true&team_id=... quando o ID for custom.
Subtasks: criadas via parent no Create Task; filtradas via subtasks=true e/ou parent=<id> no filtered endpoint.
Time in Status depende do ClickApp habilitado — trate 4xx/ausência de dados graciosamente.
Merge e Delete são operações destrutivas — recomende camada de confirmação na sua aplicação.
Rate limits do ClickUp (não cobertos na página, mas relevantes): 100 req/min por token em planos padrão; implemente retry com backoff em 429.

Esse contexto cobre todos os 10 endpoints do grupo Tasks conforme listados na navegação oficial (developer.clickup.com/reference), com seus parâmetros e respostas esperadas, pronto para alimentar sua LLM no planejamento da implementação.

Get Custom Task Types

Método/URL: GET /team/{team_id}/custom_item
Descrição: Retorna os custom task types disponíveis no Workspace.
Path params:

team_id (number, required) — Workspace ID.


Query params: nenhum.
Headers: Authorization: <token> (padrão da API).
Response: 200 — lista de custom task types do Workspace (cada item normalmente traz id, name, name_plural, description, avatar, etc.).


Como esse endpoint se conecta à feature de Tasks

custom_item_id no Create Task (POST /list/{list_id}/task):

0 (default) = tipo padrão "Task".
1 = Milestone.
Qualquer outro número = ID retornado por GET /team/{team_id}/custom_item.


custom_items[] nos endpoints de listagem (Get Tasks e Get Filtered Team Tasks):

Filtra as tarefas pelos tipos desejados. Ex.: ?custom_items[]=0&custom_items[]=1300.


custom_item_id no Update Task também aceita null ou um ID vindo desta listagem, permitindo converter uma tarefa entre tipos.


Observações para o plano de implementação

Cacheie o resultado de GET /team/{team_id}/custom_item por Workspace (raramente muda), e use-o para popular selects/filtros de "tipo de tarefa" na sua UI.
Não há endpoints públicos documentados para criar, editar ou excluir custom task types via API — isso é feito na interface do ClickUp pelo admin. Sua aplicação deve apenas consumir a lista.
Milestones (id = 1) são tratadas como um tipo especial em vários pontos da UI; considere destacá-las separadamente se fizer sentido no seu produto.
Sempre que criar ou atualizar uma tarefa permitindo tipo customizado, valide o custom_item_id contra a lista retornada para evitar erros 400.

1) Task Checklists
1.1 Create Checklist

POST /task/{task_id}/checklist
Path: task_id (string, required)
Query: custom_task_ids (boolean), team_id (number)
Body: name (string, required)
Response: 200

1.2 Edit Checklist

PUT /checklist/{checklist_id}
Path: checklist_id (uuid string, required)
Body:

name (string)
position (integer) — 0 coloca a checklist no topo


Response: 200

1.3 Delete Checklist

DELETE /checklist/{checklist_id}
Path: checklist_id (uuid, required)
Response: 200

1.4 Create Checklist Item

POST /checklist/{checklist_id}/checklist_item
Path: checklist_id (uuid, required)
Body:

name (string)
assignee (integer — user ID)


Response: 200

1.5 Edit Checklist Item

PUT /checklist/{checklist_id}/checklist_item/{checklist_item_id}
Path: checklist_id, checklist_item_id (uuid, required)
Body:

name (string)
assignee (string | null)
resolved (boolean)
parent (string | null) — nesting sob outro item


Response: 200

1.6 Delete Checklist Item

DELETE /checklist/{checklist_id}/checklist_item/{checklist_item_id}
Path: ambos (uuid, required)
Response: 200


2) Task Relationships (Dependencies & Task Links)
2.1 Add Dependency

POST /task/{task_id}/dependency
Path: task_id (string, required) — a task que está aguardando ou bloqueando outra
Query: custom_task_ids, team_id
Body (use apenas um por request):

depends_on (string) — a task que deve ser concluída antes desta
dependency_of (string) — a task que aguarda esta


Response: 200

2.2 Delete Dependency

DELETE /task/{task_id}/dependency
Path: task_id (string, required)
Query (obrigatórios): depends_on (string, required), dependency_of (string, required)
Query (opcionais): custom_task_ids, team_id
Response: 200

2.3 Add Task Link

POST /task/{task_id}/link/{links_to}
Equivalente a "Task Links" na sidebar direita da task. Só vincula task↔task.
Path: task_id (origem), links_to (destino) — ambos strings
Query: custom_task_ids, team_id
Response: 200

2.4 Delete Task Link

DELETE /task/{task_id}/link/{links_to}
Path: task_id, links_to (strings, required)
Query: custom_task_ids, team_id
Response: 200

UI
Especificação técnica — Task View (apenas componentes da tarefa)
Documento limpo, focado exclusivamente na visualização da tarefa. Foram removidos: top bar, sidebar de navegação, breadcrumb, busca global, logo, avatar, automações, Ask, árvore de departamentos/workspaces.

1. Stack alvo

Tailwind CSS v4 (tokens via CSS variables).
shadcn/ui (tokens semânticos --primary, --muted, --card etc.).
BlockNote / ProseMirror para o editor de descrição e composer.
Lucide Icons (stroke 1.5–1.75).
Sistema de cores OKLCH.
Fonte: stack nativa (-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Helvetica, Arial).


2. Design Tokens essenciais
css:root {
  --background: oklch(100% 0 0);
  --foreground: oklch(14.5% 0 0);
  --card: oklch(100% 0 0);
  --card-foreground: oklch(14.5% 0 0);

  --primary: oklch(20.5% 0 0);
  --primary-foreground: oklch(98.5% 0 0);

  --muted: oklch(97% 0 0);
  --muted-foreground: oklch(55.6% 0 0);

  --border: oklch(92.2% 0 0);
  --ring: oklch(70.8% 0 0);

  --radius: 0.625rem;   /* 10px base  */
  --radius-card: 14px;
  --radius-badge: 4px;

  --text-xs: 0.75rem;
  --text-sm: 0.875rem;   /* base do app */
  --text-base: 1rem;
  --text-2xl: 1.5rem;    /* título da task */

  --fw-normal: 400;
  --fw-medium: 500;
  --fw-semibold: 600;
  --fw-bold: 700;

  --transition: 150ms cubic-bezier(.4,0,.2,1);
}
Paletas semânticas de status/prioridade/tags usam as escalas OKLCH do Tailwind (gray, red, orange, amber, yellow, green, emerald, teal, cyan, sky, blue, indigo, violet, purple, pink, rose) nos níveis 100–700.

3. Layout da Task View
Dois cards lado a lado dentro do container da rota /task/:id:
┌─────────────────────────────────────────┬──────────────────────┐
│         TASK MAIN CARD (flex-1)         │  ACTIVITIES PANEL    │
│         radius 14, shadow sm            │  w ≈ 400px           │
│                                         │  radius 14, shadow sm│
└─────────────────────────────────────────┴──────────────────────┘

Gap entre cards: 16px.
Ambos: background: var(--card); border-radius: 14px; box-shadow: 0 1px 3px rgba(0,0,0,.1), 0 1px 2px -1px rgba(0,0,0,.1);.
O painel de Atividades pode ser colapsado via botão » posicionado no gutter entre os cards (fica fixo, w:24 h:40; rounded-xl; bg-card; shadow-sm). Quando colapsado, o Main ocupa 100% da largura.


4. Main Card — estrutura interna
Padding interno: 24px. Layout em flex-col; gap: 24px. Scroll vertical interno.
4.1 Linha de tipo da tarefa
Pill de tipo + ícone secundário de integração (opcional).
jsx<header className="flex items-center gap-2">
  <button className="flex items-center gap-1.5 h-6 px-2 rounded-lg
                     border border-border/60 bg-muted/40
                     text-sm hover:bg-muted hover:border-border
                     active:scale-[0.97] transition-all duration-150">
    <CircleDot className="w-3.5 h-3.5" />
    <span>Task</span>
  </button>
  {integrationIcon && (
    <IntegrationBadge icon={integrationIcon} className="w-4 h-4 text-muted-foreground" />
  )}
</header>
4.2 Título da tarefa
Input transparente auto-expansível.
jsx<textarea
  value={task.name}
  onChange={...}
  placeholder="Título da tarefa"
  className="w-full resize-none bg-transparent outline-none
             text-[24px] font-bold leading-[1.25]
             text-foreground placeholder:text-muted-foreground/60"
/>
4.3 Grade de propriedades
Grid 2 colunas com linhas de 32px:
jsx<div className="grid grid-cols-2 gap-x-8 gap-y-2">
  <PropertyRow icon={<CircleDot/>}  label="Status"        value={<StatusBadge status={task.status} />} />
  <PropertyRow icon={<User/>}       label="Responsáveis"  value={<AssigneePicker users={task.assignees} />} />
  <PropertyRow icon={<Calendar/>}   label="Datas"         value={<DateRangePicker dates={task.dates} placeholder="Adicionar" />} />
  <PropertyRow icon={<Flag/>}       label="Prioridade"    value={<PriorityPicker value={task.priority} placeholder="Vazio" />} />
  <PropertyRow icon={<Hourglass/>}  label="Tempo est."    value={<TimeEstimateInput value={task.estimate} placeholder="Adicionar" />} />
  <PropertyRow icon={<Tag/>}        label="Tags"          value={<TagPicker tags={task.tags} placeholder="Adicionar" />} />
</div>

<button className="flex items-center gap-1 text-[13px]
                   text-muted-foreground/60 hover:text-muted-foreground
                   transition-colors">
  <ChevronDown className="w-3 h-3" /> Mais
</button>
PropertyRow:
jsxfunction PropertyRow({ icon, label, value }) {
  return (
    <div className="flex items-center gap-2 h-8">
      <div className="flex items-center gap-2 min-w-[130px] text-sm">
        <span className="w-4 h-4 text-muted-foreground">{icon}</span>
        <span>{label}</span>
      </div>
      <div className="flex-1 min-w-0">{value}</div>
    </div>
  );
}
Estado vazio (placeholder "Adicionar" / "Vazio"):
jsx<button className="text-[13px] font-normal text-muted-foreground/60
                   hover:text-muted-foreground cursor-pointer">
  Adicionar
</button>
4.4 Status Badge (pipeline chevron)
Componente distintivo: retângulo + seta indicando fluxo + checkmark.
jsxfunction StatusBadge({ status, onToggleComplete, onChange }) {
  const color = status.color || "rgb(138, 129, 124)";
  return (
    <div className="flex items-center gap-2">
      <button onClick={onChange}
        className="flex items-center h-[22px] px-2.5
                   text-[11px] font-medium uppercase tracking-wide
                   text-white rounded-l-[4px] hover:opacity-80"
        style={{ background: color }}>
        {status.label}
      </button>
      <div className="w-0 h-0 -ml-2 border-y-[11px] border-y-transparent border-l-[8px]"
           style={{ borderLeftColor: color }} />
      <button onClick={onToggleComplete}
        className="w-5 h-5 flex items-center justify-center rounded
                   border border-border text-muted-foreground
                   hover:text-foreground hover:border-foreground/40">
        <Check className="w-3 h-3" />
      </button>
    </div>
  );
}
Paleta sugerida para status padrão:

Para fazer → oklch(55% 0.01 60) (neutral-warm).
Em andamento → var(--color-blue-500).
Em revisão → var(--color-amber-500).
Concluído → var(--color-emerald-500).
Cancelado → var(--color-red-500).

4.5 Descrição (BlockNote / ProseMirror)
jsx<div className="relative">
  <BlockNoteEditor
    initialContent={task.description}
    placeholder="Digite texto ou use '/' para comandos"
    className="min-h-[80px] text-base leading-relaxed
               text-zinc-700 placeholder:italic
               placeholder:text-muted-foreground"
  />
  <button aria-label="Expandir descrição em tela cheia"
          className="absolute top-1 right-1 w-6 h-6 rounded
                     text-muted-foreground hover:bg-muted">
    <Maximize2 className="w-3.5 h-3.5" />
  </button>
</div>
Slash menu (/) suporta: headings, listas, checklist, code block, quote, tabela, imagem, anexo, divisor.
4.6 Seções colapsáveis — padrão comum
jsxfunction CollapsibleSection({ title, icon, counter, actions, children, defaultOpen = true }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <section className="flex flex-col gap-2">
      <header className="flex items-center justify-between">
        <button onClick={() => setOpen(!open)}
          className="flex items-center gap-2 text-[13px] font-semibold text-foreground">
          <ChevronDown className={cn("w-3.5 h-3.5 text-muted-foreground transition-transform",
                                     !open && "-rotate-90")} />
          {icon && <span className="w-4 h-4 text-muted-foreground">{icon}</span>}
          <span>{title}</span>
          {counter && <span className="text-muted-foreground font-normal">{counter}</span>}
        </button>
        {actions && <div className="flex items-center gap-1">{actions}</div>}
      </header>
      {open && <div>{children}</div>}
    </section>
  );
}
CTA vazio reutilizável (card pontilhado):
jsx<button className="flex items-center gap-2 w-full px-4 py-3
                   rounded-lg border border-dashed border-border/60
                   text-[13px] text-muted-foreground
                   hover:bg-muted/40 hover:text-foreground transition-colors">
  <Plus className="w-4 h-4" />
  <span>{label}</span>
</button>
4.7 Seção: Campos personalizados
jsx<CollapsibleSection title="Campos personalizados"
  actions={
    <IconButton aria-label="Gerenciar campos personalizados desta lista">
      <Settings2 className="w-3.5 h-3.5" />
    </IconButton>
  }>
  <CustomFieldsList fields={task.customFields} />
  <EmptyCardCTA icon={<Plus/>} label="Criar campo personalizado" />
</CollapsibleSection>
4.8 Seção: Tarefas vinculadas
jsx<CollapsibleSection title="Tarefas vinculadas"
  icon={<Link2/>}
  actions={<IconButton aria-label="Adicionar vínculo"><Plus className="w-3.5 h-3.5"/></IconButton>}>
  <LinkedTasksList items={task.linkedTasks} />
</CollapsibleSection>
Item vinculado exibe ícone de link + título clicável + tipo de relação à direita (bloqueia, bloqueada por, duplicata, relacionada).
4.9 Seção: Tempo rastreado
jsx<CollapsibleSection title="Tempo rastreado" icon={<Timer/>}
  actions={
    <button className="inline-flex items-center gap-1.5 h-6 px-2.5
                       text-xs font-medium rounded-md
                       bg-primary/10 text-primary hover:bg-primary/20
                       transition-colors">
      <Play className="w-3 h-3" /> Iniciar
    </button>
  }>
  <TimeTrackingLog entries={task.timeEntries} />
</CollapsibleSection>
4.10 Seção: Subtarefas
jsx<CollapsibleSection title="Subtarefas" counter={`${done}/${total}`}>
  <ProgressBar value={done} max={total} />
  <ul className="flex flex-col gap-1 mt-2">
    {subtasks.map(st => <SubtaskRow key={st.id} task={st} />)}
  </ul>
  <EmptyCardCTA icon={<Plus/>} label="Adicionar subtarefa" />
</CollapsibleSection>
ProgressBar:
jsx<div className="h-1 w-full rounded-full bg-muted overflow-hidden">
  <div className="h-full rounded-full bg-primary transition-[width] duration-200"
       style={{ width: `${(value / max) * 100}%` }} />
</div>
SubtaskRow:
jsx<div className="flex items-center gap-2 px-3 py-2 rounded-lg
                border border-border/60 hover:bg-muted/40 transition-colors">
  <button aria-label="Alterar status"
          className="w-4 h-4 rounded-full border border-dashed
                     border-muted-foreground/60 hover:border-foreground" />
  <a href={`/task/${st.id}`} className="text-sm flex-1 truncate hover:underline">
    {st.name}
  </a>
  <button aria-label="Definir datas" className="icon-btn"><Calendar className="w-3.5 h-3.5"/></button>
  <button aria-label="Atribuir responsáveis" className="icon-btn"><UserPlus className="w-3.5 h-3.5"/></button>
</div>
4.11 Seção: Checklists
jsx<CollapsibleSection title="Checklists" icon={<ListChecks/>}>
  <ChecklistsList items={task.checklists} />
  <EmptyCardCTA icon={<Plus/>} label="Criar checklist" />
</CollapsibleSection>
4.12 Seção: Anexos (drop zone)
jsx<CollapsibleSection title="Anexos" icon={<Paperclip/>}>
  <label className="block rounded-lg border border-dashed border-border/60
                    py-6 text-center text-sm text-muted-foreground
                    hover:bg-muted/40 cursor-pointer transition-colors">
    <input type="file" multiple hidden onChange={onUpload} />
    Solte seus arquivos aqui para <span className="underline">anexar</span>
  </label>
  <AttachmentsGrid items={task.attachments} />
</CollapsibleSection>
No drag-over: border-color: var(--primary); background: oklch(20.5% 0 0 / 0.05).

5. Activities Panel (lateral direito)
Card separado, w ≈ 400px, flex-col, overflow-hidden.
5.1 Header
jsx<header className="flex items-center justify-between px-4 h-12 border-b border-border/60">
  <h2 className="text-sm font-semibold">Atividades</h2>
  <div className="flex items-center gap-1 text-muted-foreground">
    <IconButton aria-label="Buscar atividades"><Search className="w-4 h-4"/></IconButton>
    <IconButton aria-label="Filtrar atividades"><Filter className="w-4 h-4"/></IconButton>
    <IconButton aria-label="Opções da tarefa"><MoreHorizontal className="w-4 h-4"/></IconButton>
    <IconButton aria-label="Fechar atividades" onClick={onClose}><X className="w-4 h-4"/></IconButton>
  </div>
</header>
5.2 Feed (log)
jsx<ul role="log" aria-live="polite"
    className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
  {activities.map(a => (
    <li key={a.id} className="flex items-start justify-between gap-3">
      <div className="flex items-start gap-2">
        <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/40 mt-[6px]" />
        <span className="text-[11px] text-muted-foreground leading-relaxed">
          <strong className="font-medium text-foreground">{a.actor}</strong> {a.action}
        </span>
      </div>
      <time className="text-[10px] text-muted-foreground/60 whitespace-nowrap">
        {a.date}
      </time>
    </li>
  ))}
</ul>
Tipos de atividade: task.created, task.renamed, task.status_changed, task.assignee_added, task.priority_changed, task.comment_added, task.attachment_added, task.subtask_completed.
5.3 Composer
jsx<footer className="border-t border-border/60 p-3 space-y-2">
  <BlockNoteEditor
    placeholder="Digite texto ou use '/' para comandos"
    className="min-h-[44px] text-sm
               placeholder:italic placeholder:text-muted-foreground" />

  <div className="flex items-center justify-between">
    <div className="flex items-center gap-1 text-muted-foreground">
      <IconButton aria-label="Emoji"><Smile className="w-4 h-4"/></IconButton>
      <IconButton aria-label="Anexar arquivo"><Paperclip className="w-4 h-4"/></IconButton>
      <IconButton aria-label="Gravar áudio"><Mic className="w-4 h-4"/></IconButton>
      <IconButton aria-label="Mencionar"><AtSign className="w-4 h-4"/></IconButton>
      <IconButton aria-label="Atribuir"><UserPlus className="w-4 h-4"/></IconButton>
      <IconButton aria-label="Código"><Code2 className="w-4 h-4"/></IconButton>
      <IconButton aria-label="IA"><Sparkles className="w-4 h-4"/></IconButton>
    </div>
    <button onClick={submit}
      className="inline-flex items-center gap-1.5 h-9 px-2.5
                 rounded-[10px] bg-primary text-primary-foreground
                 text-sm font-medium shadow-sm hover:opacity-90
                 disabled:opacity-50">
      <Send className="w-3.5 h-3.5" /> Comentar
    </button>
  </div>
</footer>
IconButton genérico: w-7 h-7 rounded-md hover:bg-muted transition-colors.
Enter → enviar. Shift+Enter → nova linha. / → slash menu. @ → menção.

6. Iconografia (Lucide)
ContextoÍconeStatus (property)CircleDotDatasCalendarTempo est.HourglassResponsáveisUser / avatarPrioridadeFlagTagsTagTarefas vinculadasLink2Tempo rastreadoTimer / PlaySubtarefa (empty)círculo pontilhado customizadoChecklistsListChecksAnexosPaperclipExpandir descriçãoMaximize2Colapso de seçãoChevronDownConcluir statusCheckAdicionarPlusBuscar feedSearchFiltrar feedFilterMais opçõesMoreHorizontalFechar painelXColapsar painelChevronsRight (»)Enviar comentárioSendGerenciar camposSettings2

7. Estados e interações

Hover: transition: all 150ms cubic-bezier(.4,0,.2,1), fundo passa a var(--muted) e borda a var(--border).
Active: scale(0.97) em pills e triggers.
Focus visível: outline: 2px solid var(--ring); outline-offset: 2px; ou ring-2 ring-ring/50.
Popovers de propriedade (Status, Prioridade, Responsáveis, Datas, Tags): background: var(--popover); border: 1px solid var(--border); border-radius: 10px; box-shadow: 0 10px 30px -10px rgba(0,0,0,.15); padding: 8px;. Cada um abre com um <Command> (busca + lista filtrável) do shadcn.
Colapso de seção: chevron rotaciona 0 → -90deg em 150ms ease-out.
Drag & drop de arquivos: drop zone de Anexos ganha border-color: var(--primary) e background: var(--primary)/5; na página inteira, overlay sutil para indicar zona válida.
Drag & drop de subtarefas: cursor grab/grabbing, placeholder com opacity-60.
Realtime: novas atividades/comentários entram com fade + translateY(-4px) em 150ms.
Atalhos: / abre slash menu em descrição e composer; @ menção no composer; Enter envia comentário; Esc fecha popovers.


8. Acessibilidade

Todos os botões icônicos com aria-label claro ("Alterar status", "Definir datas", "Atribuir responsáveis", "Adicionar subtarefa", "Fechar atividades", etc.).
role="log" + aria-live="polite" no feed.
role="progressbar" com aria-valuenow/aria-valuemax na barra de subtarefas.
Título da tarefa é o <h1> da rota.
Focus trap nos popovers.
Navegação por teclado: Tab percorre as propriedades; Enter/Space ativa; setas navegam listas em popovers.
Contraste conforme WCAG AA (texto principal 15:1; muted ≥ 4.5:1).


9. Responsividade

≥ 1280px: Main + Activities lado a lado.
1024–1280px: Activities colapsável por padrão.
768–1024px: Activities vira drawer (side sheet) acionado por botão.
< 768px: layout em coluna única; Activities acessível via FAB; property grid passa a 1 coluna.

Esqueleto JSX final
jsxexport function TaskView({ task, onUpdate, onClose }) {
  const [showActivities, setShowActivities] = useState(true);

  return (
    <div className="flex gap-4 p-4 h-full bg-background">
      {/* MAIN */}
      <section className="flex-1 min-w-0 flex flex-col
                          bg-card rounded-[14px] shadow-sm overflow-hidden">
        <div className="flex-1 overflow-y-auto px-6 py-5 flex flex-col gap-6">
          <TaskTypeRow type={task.type} />
          <TaskTitle value={task.name} onChange={v => onUpdate({ name: v })} />
          <TaskPropertyGrid task={task} onUpdate={onUpdate} />
          <MoreToggle />
          <TaskDescription value={task.description} onChange={v => onUpdate({ description: v })} />

          <CustomFieldsSection fields={task.customFields} />
          <LinkedTasksSection items={task.linkedTasks} />
          <TimeTrackingSection entries={task.timeEntries} />
          <SubtasksSection items={task.subtasks} />
          <ChecklistsSection items={task.checklists} />
          <AttachmentsSection items={task.attachments} />
        </div>
      </section>

      {/* ACTIVITIES */}
      {showActivities && (
        <aside className="w-[400px] flex flex-col bg-card
                          rounded-[14px] shadow-sm overflow-hidden">
          <ActivitiesHeader onClose={() => setShowActivities(false)} />
          <ActivityFeed items={task.activities} />
          <CommentComposer taskId={task.id} />
        </aside>
      )}
    </div>
  );
}
Com isto, um LLM de codificação tem tudo o que precisa para reproduzir fielmente a Task View