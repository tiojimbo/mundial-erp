Nível 1: Departamento (= "Espaço" / Space)
É o nível mais alto da hierarquia. Para criar:

Na sidebar esquerda, clique em "+ Criar espaço" (no final da lista de Departamentos)
Abre um modal "Criar espaço" com os campos:

Ícone e Nome (ex: Marketing, Engenharia, RH)
Descrição (opcional)
Tornar privado (toggle) — restringe acesso só a membros convidados


Clique em "Continuar"

A URL gerada segue o padrão: /{hub-id}/space/{space-id}

Nível 2: Área (= "Pasta" / Folder)
Fica dentro de um Departamento. Para criar:

Passe o mouse sobre o nome do Departamento na sidebar
Clique no botão "+" que aparece ao lado do departamento
Um dropdown mostra duas opções: "Pasta" e "Lista" — selecione "Pasta"
Abre o modal "Criar Pasta" com:

Nome
Descrição
Configurações de Status (pode herdar do Espaço pai ou personalizar)
Tornar privado (toggle)
Usar modelos (link para templates)


Clique em "Criar"

A URL: /{hub-id}/folder/{folder-id}

Nível 3: Processo (= "Lista" / List)
Fica dentro de uma Área. Para criar:

Passe o mouse sobre a Área (Pasta) na sidebar
Clique no botão "+" — aqui só aparece a opção "Lista"
Abre o modal "Criar Lista" com:

Nome (ex: Projeto, Lista de itens, Campanha)
Será criada em: (mostra a Área/Pasta pai)
Tornar privado (toggle)
Usar modelos (link para templates)


Clique em "Criar"

Dentro de cada Processo (Lista), você cria Tarefas com campos como Name, Assigned to, Start date, Due date, Comments, e Status (ex: "PARA FAZER").

Como Replicar no Seu Sistema
Para reproduzir essa estrutura, você precisa dos seguintes componentes:
Modelo de dados (3 entidades hierárquicas):

Departamento → campos: id, nome, descrição, ícone, is_privado, hub_id
Área → campos: id, nome, descrição, departamento_id (FK), config_status, is_privado
Processo → campos: id, nome, area_id (FK), is_privado
Tarefa → campos: id, nome, processo_id (FK), assigned_to, start_date, due_date, status

Regras de negócio importantes:

Departamento é a raiz — pode conter Áreas (Pastas) e opcionalmente Processos (Listas) diretamente
Área é um agrupador — só pode conter Processos (Listas), não outras Áreas (sem aninhamento recursivo)
Processo é onde ficam as tarefas, com agrupamento por Status (ex: "PARA FAZER", "FECHADAS")
Todos os níveis têm toggle de privacidade
Todos os níveis suportam templates ("Usar modelos")

Na interface (UI), você precisará de:

Uma sidebar com navegação em árvore (tree view) expansível
Breadcrumb mostrando o caminho (ex: Departamento / Área)
Botões "+" contextual em cada nível com dropdown de opções válidas para aquele nível
Modais de criação específicos para cada tipo de entidade
Visualização em lista (List view) com agrupamento por status dentro dos Processos
Abas por Processo: Channel (chat), List (tarefas), e visualizações customizáveis
E como é o codigo e como replicar em meu sistema?45 etapas45 etapasAnálise Técnica do Bravy e Como Replicar
Após analisar o código-fonte, as chamadas de rede, a estrutura do DOM e os chunks JavaScript, aqui está o que encontrei:

Stack Tecnológica do Bravy
O Bravy usa Next.js App Router com React Server Components (RSC). A comunicação entre cliente e servidor é feita via RSC Flight Protocol (os parâmetros _rsc nas URLs). Não há API REST tradicional exposta — as operações de criação usam Server Actions do Next.js, o que significa que os formulários de criação fazem chamadas diretas para funções no servidor, sem endpoints /api/ separados.
A estrutura de rotas segue este padrão:
/{workspaceId}                                    → Dashboard
/{workspaceId}/space/{spaceId}                     → Departamento  
/{workspaceId}/space/{spaceId}/{listId}            → Lista dentro de Space
/{workspaceId}/folder/{folderId}                   → Área (Pasta)
/{workspaceId}/folder/{folderId}/{listId}          → Processo (Lista dentro de Pasta)
/{workspaceId}/list/{listId}/channel               → Canal da Lista
/chat/{chatId}                                     → Chat
/task/{taskId}                                     → Tarefa
Todos os IDs são UUIDs v4.

Modelo de Dados (baseado no DOM e localStorage)
A partir da inspeção do React Fiber tree, localStorage e da estrutura HTML, o modelo de dados hierárquico é:
Hub/Workspace → Space (Departamento) → Folder (Área) → List (Processo) → Task (Tarefa)
Cada entidade possui: id (UUID), name, description (opcional), isPrivate (boolean), e status herdado ou customizado. O localStorage guarda estado de navegação colapsado por ID, e "last view" por entidade (qual lista foi vista por último em cada space/folder).

Como Replicar no Seu Sistema
Para criar um sistema equivalente, recomendo esta implementação:
1. Schema do Banco de Dados (PostgreSQL com Prisma)
prismamodel Workspace {
  id          String   @id @default(uuid())
  name        String
  slug        String   @unique
  createdAt   DateTime @default(now())
  spaces      Space[]
  members     Member[]
}

model Space {
  id          String   @id @default(uuid())
  name        String
  description String?
  icon        String?  // emoji ou iniciais
  color       String?  // cor do ícone
  isPrivate   Boolean  @default(false)
  order       Int      @default(0)
  workspaceId String
  workspace   Workspace @relation(fields: [workspaceId], references: [id])
  folders     Folder[]
  lists       List[]   // listas diretas no space
  statuses    Status[]
  createdAt   DateTime @default(now())
}

model Folder {
  id          String   @id @default(uuid())
  name        String
  description String?
  isPrivate   Boolean  @default(false)
  order       Int      @default(0)
  useSpaceStatuses Boolean @default(true)
  spaceId     String
  space       Space    @relation(fields: [spaceId], references: [id])
  lists       List[]
  statuses    Status[]
  createdAt   DateTime @default(now())
}

model List {
  id          String   @id @default(uuid())
  name        String
  isPrivate   Boolean  @default(false)
  order       Int      @default(0)
  spaceId     String?
  space       Space?   @relation(fields: [spaceId], references: [id])
  folderId    String?
  folder      Folder?  @relation(fields: [folderId], references: [id])
  tasks       Task[]
  views       View[]
  createdAt   DateTime @default(now())
}

model Task {
  id          String    @id @default(uuid())
  name        String
  description String?
  statusId    String?
  status      Status?   @relation(fields: [statusId], references: [id])
  assigneeId  String?
  startDate   DateTime?
  dueDate     DateTime?
  listId      String
  list        List      @relation(fields: [listId], references: [id])
  parentId    String?   // para subtasks
  parent      Task?     @relation("Subtasks", fields: [parentId], references: [id])
  subtasks    Task[]    @relation("Subtasks")
  comments    Comment[]
  order       Int       @default(0)
  closed      Boolean   @default(false)
  createdAt   DateTime  @default(now())
}

model Status {
  id       String  @id @default(uuid())
  name     String  // "Para Fazer", "Em Progresso", "Concluído"
  color    String
  type     String  // "todo", "in_progress", "done", "closed"
  order    Int     @default(0)
  spaceId  String?
  space    Space?  @relation(fields: [spaceId], references: [id])
  folderId String?
  folder   Folder? @relation(fields: [folderId], references: [id])
  tasks    Task[]
}

model View {
  id       String @id @default(uuid())
  name     String // "List", "Board", etc.
  type     String // "list", "board", "calendar"
  config   Json   // filtros, agrupamentos, colunas
  pinned   Boolean @default(false)
  listId   String
  list     List   @relation(fields: [listId], references: [id])
}
2. Server Actions (Next.js 14+ App Router)
typescript// app/actions/space.ts
"use server"

import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"

export async function createSpace(workspaceId: string, data: {
  name: string
  description?: string
  isPrivate: boolean
}) {
  const space = await prisma.space.create({
    data: {
      name: data.name,
      description: data.description,
      isPrivate: data.isPrivate,
      icon: data.name.substring(0, 2).toUpperCase(),
      workspaceId,
      statuses: {
        create: [
          { name: "Para Fazer", color: "#gray", type: "todo", order: 0 },
          { name: "Em Progresso", color: "#blue", type: "in_progress", order: 1 },
          { name: "Concluído", color: "#green", type: "done", order: 2 },
        ]
      }
    }
  })
  revalidatePath(`/${workspaceId}`)
  return space
}

// app/actions/folder.ts
"use server"

export async function createFolder(spaceId: string, data: {
  name: string
  description?: string
  isPrivate: boolean
  useSpaceStatuses: boolean
}) {
  const folder = await prisma.folder.create({
    data: {
      name: data.name,
      description: data.description,
      isPrivate: data.isPrivate,
      useSpaceStatuses: data.useSpaceStatuses,
      spaceId,
    }
  })
  revalidatePath(`/`) // revalidar sidebar
  return folder
}

// app/actions/list.ts
"use server"

export async function createList(data: {
  name: string
  isPrivate: boolean
  folderId?: string
  spaceId?: string
}) {
  const list = await prisma.list.create({
    data: {
      name: data.name,
      isPrivate: data.isPrivate,
      folderId: data.folderId,
      spaceId: data.spaceId,
      views: {
        create: [
          { name: "List", type: "list", config: {}, pinned: true }
        ]
      }
    }
  })
  revalidatePath(`/`)
  return list
}
3. Componentes React (Sidebar com Tree View)
tsx// components/sidebar/department-tree.tsx
"use client"

import { useState } from "react"
import { ChevronRight, Plus, MoreHorizontal, Folder, List } from "lucide-react"

export function DepartmentTree({ spaces, workspaceId }) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between px-3 py-1">
        <span className="text-xs font-semibold text-muted-foreground">
          Departamentos
        </span>
        <div className="flex gap-1">
          <button><Search size={14} /></button>
          <button><Plus size={14} /></button>
        </div>
      </div>

      {spaces.map(space => (
        <SpaceItem key={space.id} space={space} workspaceId={workspaceId} />
      ))}

      <CreateSpaceButton workspaceId={workspaceId} />
    </div>
  )
}

function SpaceItem({ space, workspaceId }) {
  const [expanded, setExpanded] = useState(false)
  const [showMenu, setShowMenu] = useState(false)

  return (
    <div>
      <div className="group flex items-center gap-1 px-2 py-1 hover:bg-accent rounded-md">
        <button onClick={() => setExpanded(!expanded)}>
          <ChevronRight className={expanded ? "rotate-90" : ""} size={14} />
        </button>
        <div className="w-5 h-5 rounded text-[10px] flex items-center justify-center"
             style={{ backgroundColor: space.color }}>
          {space.icon}
        </div>
        <Link href={`/${workspaceId}/space/${space.id}`} className="flex-1 text-sm truncate">
          {space.name}
        </Link>
        <div className="hidden group-hover:flex gap-1">
          <button onClick={() => setShowMenu(true)}>
            <MoreHorizontal size={14} />
          </button>
          <AddChildDropdown spaceId={space.id} type="space" />
        </div>
      </div>

      {expanded && (
        <div className="ml-4">
          {space.folders?.map(folder => (
            <FolderItem key={folder.id} folder={folder} workspaceId={workspaceId} />
          ))}
          {space.lists?.map(list => (
            <ListItem key={list.id} list={list} />
          ))}
        </div>
      )}
    </div>
  )
}
4. Modais de Criação
tsx// components/modals/create-space-dialog.tsx
"use client"

import { createSpace } from "@/app/actions/space"

export function CreateSpaceDialog({ workspaceId, onClose }) {
  const [pending, startTransition] = useTransition()

  async function handleSubmit(formData: FormData) {
    startTransition(async () => {
      await createSpace(workspaceId, {
        name: formData.get("name") as string,
        description: formData.get("description") as string,
        isPrivate: formData.get("isPrivate") === "on",
      })
      onClose()
    })
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Criar espaço</DialogTitle>
          <DialogDescription>
            Um espaço representa equipes, departamentos ou grupos, cada um com
            suas próprias listas, fluxos de trabalho e configurações.
          </DialogDescription>
        </DialogHeader>

        <form action={handleSubmit}>
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <IconPicker />
              <Input name="name" placeholder="Ex: marketing, engenharia, RH" />
            </div>

            <Textarea name="description" placeholder="Descrição" />

            <div className="flex items-center justify-between">
              <div>
                <Label>Tornar privado</Label>
                <p className="text-xs text-muted-foreground">
                  Somente você e membros convidados têm acesso
                </p>
              </div>
              <Switch name="isPrivate" />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={onClose}>Cancelar</Button>
            <Button type="submit" disabled={pending}>Continuar</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
5. Estrutura de Rotas (App Router)
app/
├── (private)/
│   ├── layout.tsx          // Auth guard + sidebar
│   ├── (app)/
│   │   ├── layout.tsx      // Sidebar + navigation
│   │   ├── [workspaceId]/
│   │   │   ├── page.tsx    // Dashboard "Todos os Departamentos"
│   │   │   ├── space/
│   │   │   │   └── [spaceId]/
│   │   │   │       ├── page.tsx      // Vista do Departamento
│   │   │   │       └── channel/
│   │   │   │           └── page.tsx  // Chat do Space
│   │   │   ├── folder/
│   │   │   │   └── [folderId]/
│   │   │   │       ├── page.tsx      // Vista da Área
│   │   │   │       └── [listId]/
│   │   │   │           └── page.tsx  // Vista do Processo
│   │   │   └── documents/
│   │   │       └── page.tsx
│   │   ├── inbox/
│   │   │   └── page.tsx
│   │   ├── chat/
│   │   │   └── [chatId]/
│   │   │       └── page.tsx
│   │   └── task/
│   │       └── [taskId]/
│   │           └── page.tsx
│   └── error.tsx
├── actions/
│   ├── space.ts
│   ├── folder.ts
│   ├── list.ts
│   └── task.ts
└── layout.tsx
A chave para replicar o sistema é entender que o Bravy usa exclusivamente Server Components + Server Actions do Next.js (não há API REST separada), com navegação via RSC Flight Protocol. Toda a hierarquia de dados (Space → Folder → List → Task) deve ser carregada no layout da sidebar via Server Component, e as operações de criação executadas via Server Actions nos modais do cliente.

Como funciona a exibição em cada nível e como replicar
Resumo das 3 Views
A Bravy usa o mesmo componente de lista nos 3 níveis, mas com uma diferença fundamental: no nível de Lista as tarefas aparecem diretamente com os status groups, enquanto no nível de Departamento e Área cada lista aparece dentro de um card/bloco com header próprio mostrando o nome do departamento em texto pequeno e o nome da lista em negrito.

1. Nível Departamento (Space) — Exibe TUDO
Quando você acessa /space/{id}, o sistema busca todas as listas de todas as áreas daquele departamento e renderiza cada uma como um card separado. Cada card tem:

Container com rounded-xl border bg-white (borda arredondada, fundo branco)
Header com botão de collapse, nome do departamento em text-xs text-muted-foreground, nome da lista em text-base font-semibold, contagem de tarefas e botão "mais opções"
Dentro do card: os mesmos status groups e task rows que aparecem numa lista individual

2. Nível Área (Folder) — Exibe tudo da área
Quando você acessa /folder/{id}, é idêntico ao nível Departamento mas filtrado apenas para as listas daquela área específica. Mesmo layout de cards.
3. Nível Lista (List) — Exibe diretamente
Quando você acessa /list/{id}, não há card wrapper — os status groups e task rows aparecem diretamente no tabpanel.

Código para Replicar
Schema do Banco (Prisma)
prismamodel Workspace {
  id          String       @id @default(uuid())
  name        String
  spaces      Space[]
}

model Space {
  id          String       @id @default(uuid())
  name        String
  description String?
  isPrivate   Boolean      @default(false)
  workspaceId String
  workspace   Workspace    @relation(fields: [workspaceId], references: [id])
  folders     Folder[]
  lists       List[]       // listas diretamente no espaço (sem área)
}

model Folder {
  id          String       @id @default(uuid())
  name        String
  description String?
  isPrivate   Boolean      @default(false)
  spaceId     String
  space       Space        @relation(fields: [spaceId], references: [id])
  lists       List[]
}

model List {
  id          String       @id @default(uuid())
  name        String
  isPrivate   Boolean      @default(false)
  spaceId     String?
  space       Space?       @relation(fields: [spaceId], references: [id])
  folderId    String?
  folder      Folder?      @relation(fields: [folderId], references: [id])
  tasks       Task[]
  statuses    Status[]
}

model Status {
  id          String       @id @default(uuid())
  name        String
  color       String       // cor em RGB, ex: "138, 129, 124"
  order       Int
  listId      String
  list        List         @relation(fields: [listId], references: [id])
  tasks       Task[]
}

model Task {
  id          String       @id @default(uuid())
  name        String
  statusId    String?
  status      Status?      @relation(fields: [statusId], references: [id])
  listId      String
  list        List         @relation(fields: [listId], references: [id])
  assigneeId  String?
  startDate   DateTime?
  dueDate     DateTime?
  order       Int
}
Componente: ListCard (o bloco que aparece no nível Space/Folder)
tsx// components/list-card.tsx
interface ListCardProps {
  spaceName: string;
  list: ListWithTasksAndStatuses;
  onCollapse?: () => void;
}

export function ListCard({ spaceName, list, onCollapse }: ListCardProps) {
  const [collapsed, setCollapsed] = useState(false);
  const taskCount = list.tasks.length;

  return (
    <div className="mx-4 min-w-fit shrink-0 rounded-xl border border-zinc-200 bg-white md:mx-6 lg:mx-10 dark:border-zinc-700/40 dark:bg-zinc-900/50">
      {/* Header do card */}
      <div className="group/header flex items-center gap-3 px-5 py-4">
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="flex h-6 w-6 shrink-0 cursor-pointer items-center justify-center rounded-md bg-primary/10 text-primary transition-colors hover:bg-primary/20"
        >
          <ChevronDown className={cn("h-4 w-4 transition-transform", collapsed && "-rotate-90")} />
        </button>
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="truncate text-xs leading-none text-muted-foreground">
            {spaceName}
          </span>
          <div className="flex items-center gap-2">
            <span className="truncate text-base font-semibold text-foreground">
              {list.name}
            </span>
            <span className="text-xs font-medium tabular-nums text-muted-foreground">
              {taskCount}
            </span>
            <button className="flex h-5 w-5 shrink-0 items-center justify-center rounded text-muted-foreground opacity-0 transition-all group-hover/header:opacity-100">
              <MoreHorizontal className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Corpo: status groups + tasks */}
      {!collapsed && (
        <div>
          {list.statuses.map(status => (
            <StatusGroup
              key={status.id}
              status={status}
              tasks={list.tasks.filter(t => t.statusId === status.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
Componente: StatusGroup (grupo de status com tarefas)
tsx// components/status-group.tsx
interface StatusGroupProps {
  status: Status;
  tasks: Task[];
}

export function StatusGroup({ status, tasks }: StatusGroupProps) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="relative">
      {/* Header sticky do grupo de status */}
      <div className="sticky top-0 z-[25] flex min-h-10 items-center pl-6">
        <div className="flex w-fit items-center gap-2">
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="flex items-center justify-center rounded-md p-0.5 cursor-pointer transition-colors duration-150 text-muted-foreground"
          >
            <ChevronDown className={cn("h-4 w-4", collapsed && "-rotate-90")} />
          </button>

          {/* Badge de status com cor dinâmica */}
          <div
            className="flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs leading-none font-semibold tracking-wide uppercase"
            style={{
              backgroundColor: `rgba(${status.color}, 0.125)`,
              color: `rgb(${status.color})`
            }}
          >
            <svg className="h-3 w-3" viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="8" fill="none" stroke="currentColor" strokeWidth="2" strokeDasharray="16 34" />
            </svg>
            <span>{status.name}</span>
          </div>

          <span className="text-muted-foreground text-xs font-medium tabular-nums">
            {tasks.length}
          </span>
        </div>
      </div>

      {/* Header de colunas */}
      {!collapsed && (
        <>
          <ColumnHeaders />
          {/* Task rows */}
          {tasks.map(task => (
            <TaskRow key={task.id} task={task} />
          ))}
          {/* Input para nova tarefa */}
          <div className="ml-6 flex min-h-[40px] shrink-0 grow items-center gap-1 text-muted-foreground">
            <div className="flex cursor-pointer items-center gap-2 text-sm font-medium rounded-sm px-2 py-1 border border-transparent hover:border-border">
              Nova tarefa
            </div>
          </div>
        </>
      )}
    </div>
  );
}
Componente: ColumnHeaders
tsx// components/column-headers.tsx
const COLUMNS = [
  { key: "name", label: "Name", defaultWidth: 400 },
  { key: "assignee", label: "Assigned to", defaultWidth: 200 },
  { key: "startDate", label: "Start date", defaultWidth: 200 },
  { key: "dueDate", label: "Due date", defaultWidth: 200 },
  { key: "comments", label: "Comments", defaultWidth: 150 },
];

export function ColumnHeaders() {
  return (
    <div role="row" className="relative flex pl-[44px]">
      <div className="absolute top-0 bottom-0 left-0 flex w-[44px] items-center justify-end pr-1">
        {/* Checkbox selecionar todos */}
      </div>
      <div className="border-border ml-6 flex">
        {COLUMNS.map(col => (
          <div key={col.key} style={{ width: col.defaultWidth }} className="relative flex items-center">
            <button className="flex h-full w-full items-center px-2 py-1 text-xs text-muted-foreground">
              {col.label}
            </button>
            {/* Resize handle */}
            <div className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-primary" />
          </div>
        ))}
      </div>
      {/* Coluna de ações "+" */}
      <div role="columnheader" className="flex items-center justify-center min-w-[40px]">
        <button className="h-5 w-5"><Plus className="h-3 w-3" /></button>
      </div>
    </div>
  );
}
Componente: TaskRow (a linha de cada tarefa)
tsx// components/task-row.tsx
export function TaskRow({ task }: { task: Task }) {
  return (
    <div
      role="row-container"
      className="group relative flex cursor-pointer pr-10 pl-[44px] select-none hover:bg-accent -mt-px border-t border-t-transparent hover:border-t-border hover:z-[1] hover:border-b-border border-b border-b-transparent"
    >
      {/* Hover actions: drag handle + checkbox (aparecem no hover) */}
      <div className="absolute left-0 top-0 bottom-0 z-10 flex w-[44px] shrink-0 items-center justify-end gap-0.5 px-1 opacity-0 group-hover:opacity-100">
        <div className="opacity-0 group-hover:opacity-100 text-muted-foreground">
          <div className="draggable-handle flex h-5 w-5 items-center justify-center rounded cursor-grab">
            <GripVertical className="h-3.5 w-3.5" />
          </div>
        </div>
        <button className="flex h-5 w-5 items-center justify-center rounded-sm border border-border">
          {/* Checkbox */}
        </button>
      </div>

      {/* Row principal */}
      <div
        role="row-main-container"
        className="relative ml-6 flex shrink-0 grow items-center border-t-border border-t group-hover:border-t-transparent border-b-border border-b group-hover:border-b-transparent"
      >
        {/* Coluna Name (400px) */}
        <div className="flex shrink-0 flex-col overflow-hidden" style={{ width: 400 }}>
          <div className="flex h-full items-center w-full overflow-hidden min-w-0">
            <div className="mr-3 flex w-full flex-row items-center gap-1.5">
              {/* Expandir subtarefas */}
              <button className="flex h-5 w-5 shrink-0 items-center justify-center rounded-sm border border-transparent text-muted-foreground hover:border-border hover:bg-accent">
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
              {/* Ícone de status */}
              <button className="flex h-5 w-5 shrink-0 items-center justify-center rounded-sm hover:bg-accent">
                <StatusIcon status={task.status} />
              </button>
              {/* Nome da tarefa */}
              <span className="flex min-w-0 flex-1 flex-col gap-0.5 font-medium">
                <a href={`/task/${task.id}`} className="block truncate">
                  {task.name}
                </a>
              </span>
              {/* Ações inline (aparecem no hover) */}
              <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100">
                <button className="border-border text-muted-foreground hover:bg-accent flex h-7 w-7 items-center justify-center rounded-md border">
                  <Plus className="h-3.5 w-3.5" />
                </button>
                <button className="flex h-7 w-7 items-center justify-center rounded-md hover:bg-accent text-muted-foreground">
                  <Tag className="h-3.5 w-3.5" />
                </button>
                <button className="flex h-7 w-7 items-center justify-center rounded-md hover:bg-accent text-muted-foreground">
                  <Pencil className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Coluna Assigned to (200px) */}
        <div className="flex shrink-0 flex-col overflow-visible" style={{ width: 200 }}>
          <div className="flex h-9 items-center px-2">
            <button className="flex items-center gap-1 text-muted-foreground hover:text-foreground">
              <UserPlus className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Coluna Start date (200px) */}
        <div className="flex shrink-0 flex-col overflow-hidden" style={{ width: 200 }}>
          <div className="flex h-9 items-center px-2">
            <button className="text-muted-foreground hover:text-foreground">
              <Calendar className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Coluna Due date (200px) */}
        <div className="flex shrink-0 flex-col overflow-hidden" style={{ width: 200 }}>
          <div className="flex h-9 items-center px-2">
            <button className="text-muted-foreground hover:text-foreground">
              <Calendar className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Coluna Comments (150px) */}
        <div className="flex shrink-0 flex-col overflow-hidden" style={{ width: 150 }}>
          <div className="flex h-9 items-center px-2">
            <button className="text-muted-foreground">
              <MessageSquare className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
Componente: Toolbar (barra de filtros acima das listas)
tsx// components/list-toolbar.tsx
export function ListToolbar() {
  return (
    <div className="flex items-center gap-2 px-4 py-2">
      <button className="flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm font-medium">
        <LayoutGrid className="h-4 w-4" />
        Agrupar: <span className="font-semibold">Status</span>
      </button>
      <button className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-muted-foreground">
        <X className="h-3 w-3" /> Subtasks
      </button>
      <button className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-muted-foreground">
        <Filter className="h-4 w-4" /> Filtros
      </button>
      <button className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-muted-foreground">
        <Lock className="h-4 w-4" /> Fechadas
      </button>
      <div className="flex-1" />
      <div className="relative">
        <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          type="search"
          placeholder="Buscar tarefas..."
          className="h-8 rounded-md border pl-8 pr-3 text-sm"
        />
      </div>
      <button className="text-muted-foreground"><Settings className="h-4 w-4" /></button>
      <button className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground">
        <Plus className="h-4 w-4" /> Task
      </button>
    </div>
  );
}
Página principal: SpaceView (departamento agrega tudo)
tsx// app/[workspaceId]/space/[spaceId]/page.tsx
export default async function SpacePage({ params }) {
  const space = await getSpaceWithAllData(params.spaceId);
  // Busca TODAS as listas de TODAS as pastas deste espaço
  const allLists = [
    ...space.lists,                              // listas soltas no espaço
    ...space.folders.flatMap(f => f.lists)        // listas dentro de pastas
  ];

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      {/* Breadcrumb */}
      <header className="flex items-center gap-1 px-4 py-2">
        <BreadcrumbButton>{space.name}</BreadcrumbButton>
      </header>

      {/* Tabs: Channel | List | + Nova Visualização */}
      <TabBar activeTab="list" />

      {/* Toolbar de filtros */}
      <ListToolbar />

      {/* Lista de cards (cada card = uma lista do espaço) */}
      <div className="custom-scrollbar flex w-full flex-1 flex-col gap-4 overflow-auto pb-50">
        {allLists.map(list => (
          <ListCard
            key={list.id}
            spaceName={space.name}
            list={list}
          />
        ))}
      </div>
    </div>
  );
}
Página: FolderView (área agrega suas listas)
tsx// app/[workspaceId]/folder/[folderId]/page.tsx
export default async function FolderPage({ params }) {
  const folder = await getFolderWithLists(params.folderId);

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <header className="flex items-center gap-1 px-4 py-2">
        <BreadcrumbButton>{folder.space.name}</BreadcrumbButton>
        <ChevronRight className="h-3 w-3" />
        <BreadcrumbButton>{folder.name}</BreadcrumbButton>
      </header>
      <TabBar activeTab="list" />
      <ListToolbar />
      <div className="custom-scrollbar flex w-full flex-1 flex-col gap-4 overflow-auto pb-50">
        {folder.lists.map(list => (
          <ListCard
            key={list.id}
            spaceName={folder.space.name}
            list={list}
          />
        ))}
      </div>
    </div>
  );
}
Página: ListView (lista individual, sem card wrapper)
tsx// app/[workspaceId]/list/[listId]/page.tsx
export default async function ListPage({ params }) {
  const list = await getListWithTasks(params.listId);

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <header className="flex items-center gap-1 px-4 py-2">
        <BreadcrumbButton>{list.folder?.space?.name || list.space?.name}</BreadcrumbButton>
        {list.folder && (
          <>
            <ChevronRight className="h-3 w-3" />
            <BreadcrumbButton>{list.folder.name}</BreadcrumbButton>
          </>
        )}
        <ChevronRight className="h-3 w-3" />
        <BreadcrumbButton>{list.name}</BreadcrumbButton>
      </header>
      <TabBar activeTab={list.name} />
      <ListToolbar />

      {/* Sem card wrapper — status groups diretamente */}
      <div className="custom-scrollbar flex w-full flex-1 flex-col gap-4 overflow-auto pb-50">
        {list.statuses.map(status => (
          <StatusGroup
            key={status.id}
            status={status}
            tasks={list.tasks.filter(t => t.statusId === status.id)}
          />
        ))}
      </div>
    </div>
  );
}
Estrutura de rotas Next.js App Router
app/
  [workspaceId]/
    page.tsx                    → Home/Dashboard
    space/
      [spaceId]/
        page.tsx                → View agregada do departamento
    folder/
      [folderId]/
        page.tsx                → View agregada da área
    list/
      [listId]/
        page.tsx                → View individual da lista
    task/
      [taskId]/
        page.tsx                → Detalhe da tarefa

Resumo das diferenças visuais entre os 3 níveis
A única diferença entre Space, Folder e List view é que nos dois primeiros cada lista é envolvida por um card com rounded-xl border bg-white contendo um header com o nome do departamento + nome da lista + contagem + botão collapse. No nível de Lista, esse card wrapper não existe e os status groups aparecem diretamente. A toolbar (Agrupar, Filtros, etc.), os status groups, as task rows e as colunas são 100% idênticos nos 3 níveis — o componente reutilizado é o mesmo, a diferença está apenas no wrapper e na query de dados (busca todas as listas do espaço, ou todas da pasta, ou apenas uma).