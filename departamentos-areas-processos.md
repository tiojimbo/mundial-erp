HIERARQUIA (3 NÍVEIS)
A estrutura segue este modelo de aninhamento:
Espaço (Departamento) → Pasta (Área) → Lista (Processo)
No Bravy, os nomes internos são:

Espaço = Departamento (ex: Comercial, Produção, Financeiro)
Pasta = Área (folder dentro do departamento)
Lista = Processo (onde vivem as tarefas)

A Área é opcional — um Processo pode ficar diretamente dentro do Departamento OU dentro de uma Área. Porém Áreas não podem conter Áreas aninhadas (só Listas/Processos).

2. O QUE CADA NÍVEL PODE CONTER
Departamento (Espaço) — ao clicar "+":

Pasta (cria uma Área)
Lista (cria um Processo diretamente)

Área (Pasta) — ao clicar "+":

Apenas Lista (cria Processos)

Processo (Lista) — contém:

Tarefas (tasks) com subtarefas, checklists, anexos, campos personalizados


3. MENU DE CONTEXTO ("...") POR NÍVEL
Departamento:

Renomear, Editar status, Excluir, Compartilhamento e permissões

Área:

Renomear, Editar status, Excluir, Compartilhamento e permissões

Processo (tem mais opções!):

Renomear, Copiar link, Favoritar, Editar status, Task Types, Campos personalizados, Tipo padrão, Excluir, Compartilhamento e permissões


SISTEMA DE STATUS (Workflow)
Os status são definidos no nível do Departamento e herdados pelos Processos. São organizados em 4 categorias fixas:
CategoriaStatus padrãoSignificadoNot startedPARA FAZERTarefa não iniciadaActiveEM ANDAMENTOTarefa em progressoDoneCONCLUÍDOTarefa completadaClosedFINALIZADOTarefa encerrada/arquivada
Cada categoria pode ter múltiplos status personalizados. Há suporte a Templates de status (salvar/aplicar).

VISUALIZAÇÕES DISPONÍVEIS (por Processo)
Cada Processo possui abas de visualização. A aba Channel (chat) e List (lista) vêm por padrão. Ao criar nova visualização, existem 4 tipos:
TipoÍconeDescriçãoLista☰Tabela com linhas/colunas (agrupável)Quadro⊞Kanban com cards por statusCalendário📅Visão de calendário por datasGantt≡Timeline/cronograma
Cada visualização tem sua barra de ferramentas com: Agrupar por, Subtasks, Filtros, Fechadas, Buscar tarefas, Campos (configuração de colunas), e botão "+ Task".

AGRUPAMENTO (Group By)
As opções de agrupamento disponíveis: Status, Responsável, Prioridade, Tag, Data de vencimento, Tipo de tarefa. Há ordenação ASC/DESC e um toggle "Agrupar por Lista" que funciona na visão do Departamento (agrupa tarefas por Processo).

CAMPOS PADRÃO (19 campos)
Nome, Comentários, Comentários atribuídos, Criador, Data de atualização, Data de conclusão, Data de criação, Data de fechamento, Data de início, Prioridade, Responsável, Status, Tarefas vinculadas, Task ID, Tempo estimado, Tempo rastreado, Tempo total no status, Tipo de tarefa, Último comentário. Além desses, é possível criar Campos personalizados.

ESTRUTURA DE UMA TAREFA
Cada tarefa possui: Tipo (Task, com dropdown), Status, Responsáveis, Datas (início → fim), Prioridade, Tempo estimado, Tags, editor rich text, Campos personalizados, Tarefas vinculadas, Subtarefas, Checklists, Anexos, Tempo rastreado (com botão Iniciar), e um painel lateral de Atividades + Comentários.

CRIAÇÃO DE DEPARTAMENTO
O diálogo "Criar espaço" pede: ícone + cor, nome, descrição (opcional), e toggle "Tornar privado".

COMO REPLICAR NO SEU SISTEMA
Para replicar exatamente essa estrutura, seu sistema precisa de:
Modelos de dados:

Tabela spaces (departamentos) com: id, name, icon, color, description, is_private, workspace_id
Tabela folders (áreas) com: id, name, space_id (parent)
Tabela lists (processos) com: id, name, folder_id (nullable), space_id, default_task_type
Tabela status_categories (fixa: not_started, active, done, closed)
Tabela statuses com: id, name, category, icon, color, space_id, sort_order
Tabela tasks com todos os 19+ campos mencionados
Tabela views com: id, name, type (list/board/calendar/gantt), list_id, is_pinned, config_json
Tabela custom_fields com: id, name, type, space_id/list_id
Tabela task_types com: id, name, list_id

Navegação/Sidebar:

Seção "Departamentos" com busca (lupa) e "+" para criar
"Todos os Departamentos" como visão agregada
Expandir/colapsar departamentos para ver áreas e processos
Ícone com sigla colorida para cada departamento (CO, PR, FI)
Breadcrumb: Departamento / Área / Processo

Visualizações:

Sistema de abas por Processo: Channel (chat), views personalizáveis (List, Board, Calendar, Gantt)
View "pinável" como padrão
Cada view tem seus próprios filtros, agrupamentos e configuração de campos visíveis

Permissões:

Compartilhamento e permissões em cada nível (Departamento, Área, Processo)
Toggle privado na criação do departamento


VISUALIZAÇÃO EM LISTA (List View)
Estrutura geral:
A lista é uma tabela com linhas (tarefas) e colunas (campos). As tarefas são agrupadas em seções colapsáveis por status (ou outra propriedade).

┌─ Breadcrumb: Departamento / Área / Processo ──────────────────┐
├─ Abas: [Channel] [List 📌] [View1] [View2] [+ Nova Visualização]
├─ Toolbar: [Agrupar: Status] [✕ Subtasks] [🔽 Filtros] [🔽 Fechadas] [🔍 Buscar tarefas...] [⚙] [+ Task]
│
├─ GRUPO: ⊙ PARA FAZER  1
│   ├─ Header: Name | Due date | Comments | Start date | Assigned to | Task ID
│   ├─ ⊙ Tarefa Exemplo       Hoje(vermelho)  💬 1        Ontem        👤 MA      5ec01a8d
│   └─ [Nova tarefa] (inline input)
│
├─ GRUPO: ● EM ANDAMENTO  0
│   ├─ Header: Name | Due date | Comments | ...
│   └─ [Nova tarefa]
└───────────────────────────────────────────────────────────────┘


Hover na linha da tarefa — ao passar o mouse, aparecem (da esquerda para a direita): ícone de drag (⠿) para arrastar/reordenar, checkbox (☐) para seleção em massa, seta de expansão (>) para ver subtarefas, ícone de status (⊙) clicável para trocar status/tipo, nome da tarefa, e à direita do nome: botão + (adicionar subtarefa), tag (🏷), e editar (✏). Esses elementos só aparecem no hover.
Colunas padrão visíveis (configuráveis via ⚙): Name (sempre), Due date, Comments (ícone 💬 + contagem), Start date, Assigned to (avatar), Task ID. Há 19 campos padrão no total, cada um com toggle ON/OFF.
Toolbar da Lista:S
O "Agrupar" oferece 6 opções: Status, Responsável, Prioridade, Tag, Data de vencimento, Tipo de tarefa — com ordenação ASC/DESC e toggle "Agrupar por Lista" (para visão de departamento). O "Fechadas" tem toggles independentes para Tarefas e Subtarefas. "Subtasks" é um toggle para exibir/ocultar subtarefas inline.

VISUALIZAÇÃO EM BOARD (Quadro/Kanban)
Estrutura geral:
Colunas horizontais lado a lado, uma para cada status. Cards de tarefa empilhados dentro de cada coluna.

┌─ Toolbar: [Agrupar: Status] [🔽 Filtros] [🔽 Fechadas] [☑ Vazios] [🔍 Buscar tarefas...] [⚙] [+ Task]
│
│  ┌──PARA FAZER──0──┐  ┌──EM ANDAMENTO──1──┐  ┌──CONCLUÍDO──0──┐  ┌──FINALIZADO──0──┐
│  │  ···  +          │  │  ···  +            │  │  ···  +         │  │  ···  +          │
│  │ + Adicionar      │  │ ┌──────────────┐  │  │ + Adicionar     │  │ + Adicionar      │
│  │   tarefa         │  │ │ Teste        │  │  │   tarefa        │  │   tarefa         │
│  │                  │  │ │ 👤 MA        │  │  │                 │  │                  │
│  │                  │  │ │ 📅Ontem→Hoje │  │  │                 │  │                  │
│  │                  │  │ └──────────────┘  │  │                 │  │                  │
│  │                  │  │ + Adicionar       │  │                 │  │                  │
│  │                  │  │   tarefa          │  │                 │  │                  │
│  └──────────────────┘  └──────────────────┘  └─────────────────┘  └──────────────────┘

3. SISTEMA DE STATUS — DETALHAMENTO COMPLETO
Arquitetura:
Os status são definidos no nível do Espaço (Departamento) e herdados por todas as Listas/Processos dentro dele. Cada status pertence obrigatoriamente a uma de 4 categorias fixas que controlam o comportamento do sistema.
As 4 categorias (imutáveis):
CategoriaNome internoDescrição (tooltip)ÍconeCor padrãoSignificado no sistemaNot startednot_started"Tarefas que ainda não foram iniciadas"Círculo tracejado/pontilhado cinzaCinzaEstado inicial das tarefasActiveactive"Tarefas que estão em andamento"Círculo meio preenchido azulAzulTarefas em progressoDonedone"Tarefas que foram concluídas"Círculo verde com check (✓)VerdeTarefas completadasClosedclosed"Tarefas que foram fechadas"Círculo verde com check (✓)VerdeTarefas arquivadas/finalizadas
Comportamento especial por categoria:
Tarefas em categorias "Done" e "Closed" são controladas pelo toggle "Fechadas" na toolbar. Quando "Fechadas" está desligado, tarefas nessas categorias ficam ocultas. Na visão Board, colunas "Closed" só aparecem se "Fechadas > Tarefas" estiver ativo. As categorias "Not started" e "Active" estão sempre visíveis.
Cada status individual possui:
Nome (editável), Cor (14 opções: roxo escuro, roxo, azul escuro, azul claro, turquesa, verde, verde limão, amarelo, laranja, vermelho, rosa, lilás, marrom, preto, cinza escuro, cinza claro), Ícone/emoji (personalizável), Handle de drag para reordenação dentro da categoria, e Menu "..." com Renomear e Excluir.
Cada categoria pode ter múltiplos status. Por exemplo, "Active" pode ter "Em revisão", "Aguardando aprovação", "Em desenvolvimento" — todos se comportam como status ativos.
Templates de status:
Pode-se salvar um conjunto de status como template via "Salvar template" e aplicá-lo a outros departamentos via dropdown "Templates" (com busca).

4. DROPDOWN DE STATUS/TYPE NA TAREFA
Ao clicar no ícone de status na linha da tarefa (lista ou board), abre um dropdown com 2 abas:
Aba "Status": Lista todos os status agrupados por categoria (NOT STARTED, ACTIVE, DONE, CLOSED), cada um com seu ícone colorido. O status atual mostra um checkmark (✓).
Aba "Type": Lista os tipos de tarefa: Tarefa (ícone ⊙) e Milestone (ícone ◇). Tipos customizáveis na config do Processo.

5. COMO REPLICAR — ESPECIFICAÇÕES TÉCNICAS
Modelo de dados para Status:
// Enum fixo - NÃO editável pelo usuário
StatusCategory {
  NOT_STARTED  // comportamento: sempre visível, estado inicial
  ACTIVE       // comportamento: sempre visível
  DONE         // comportamento: controlado por toggle "Fechadas"
  CLOSED       // comportamento: controlado por toggle "Fechadas"
}

// Tabela de status - editável pelo usuário
Status {
  id: UUID
  name: string           // ex: "PARA FAZER"
  category: StatusCategory  // referência à categoria fixa
  color: string          // hex da cor (14 opções pré-definidas)
  icon: string           // emoji ou ícone customizado
  sort_order: number     // ordenação dentro da categoria
  space_id: UUID         // pertence ao departamento
}

// Template de status
StatusTemplate {
  id: UUID
  name: string
  workspace_id: UUID
  statuses: StatusTemplateItem[]  // snapshot dos status
}
Para a List View:
ListView {
  id: UUID
  name: string
  list_id: UUID          // processo ao qual pertence
  is_pinned: boolean
  group_by: enum(status, assignee, priority, tag, due_date, task_type)
  sort_direction: enum(ASC, DESC)
  group_by_list: boolean // agrupa por lista (visão departamento)
  show_subtasks: boolean
  show_closed_tasks: boolean
  show_closed_subtasks: boolean
  visible_fields: string[]  // array de field IDs ativados
}
Para a Board View:
BoardView {
  id: UUID
  name: string
  list_id: UUID
  group_by: enum(status, assignee, priority, tag, due_date, task_type)
  card_size: enum(small, medium, large)
  show_closed: boolean
  show_empty_columns: boolean
  visible_fields: string[]
}
Comportamentos críticos a implementar:
Ao mudar o status de uma tarefa na Lista, a tarefa deve mover-se em tempo real do grupo antigo para o novo grupo (com animação). No Board, o card deve se mover da coluna antiga para a nova coluna (suporte a drag-and-drop entre colunas também). As contagens nos headers dos grupos/colunas devem atualizar em tempo real. As datas atrasadas devem renderizar em vermelho, e no card do Board, datas mostram fundo rosa/vermelho.
Os ícones de status seguem um padrão visual que varia por categoria: Not started usa círculo tracejado/pontilhado, Active usa círculo meio preenchido, Done e Closed usam círculo com checkmark. A cor do ícone segue a cor configurada para o status, mas o estilo do ícone é determinado pela categoria.