O que o componente faz
Ele abre um popover com opções de agrupamento das tarefas. Quando clicado, exibe:

Opções de campo para agrupar: Status ✓, Responsável, Prioridade, Tag, Data de vencimento, Tipo de tarefa
Ordenação: ASC ou DESC
Toggle: "Agrupar por Lista" (ativado/desativado)
Botão de remover o agrupamento atual


Estrutura visual do componente
[ 🗂 Agrupar: Status ]  ← Botão trigger (popover)
         ↓
┌─────────────────────┐
│  AGRUPAR POR        │
│  ✓ Status           │
│    Responsável      │
│    Prioridade       │
│    Tag              │
│    Data de venc.    │
│    Tipo de tarefa   │
├─────────────────────┤
│  [↑ ASC] [↓ DESC] [🗑]│
│  Agrupar por Lista ●│
└─────────────────────┘

Como aplicar no seu sistema
1. Botão Trigger
tsx<button className="flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium bg-primary/10 text-primary hover:bg-primary/15 transition-colors">
  <GroupIcon className="h-3.5 w-3.5" />
  Agrupar: <span className="font-semibold">Status</span>
</button>
2. Popover com opções (usando Radix UI / shadcn)
tsximport { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"

const groupOptions = ["Status", "Responsável", "Prioridade", "Tag", "Data de vencimento", "Tipo de tarefa"]

function GroupByPopover() {
  const [selected, setSelected] = useState("Status")
  const [order, setOrder] = useState<"asc" | "desc">("asc")
  const [groupByList, setGroupByList] = useState(true)

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button className="flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium bg-primary/10 text-primary hover:bg-primary/15">
          <GroupIcon className="h-3.5 w-3.5" />
          Agrupar: <span className="font-semibold">{selected}</span>
        </button>
      </PopoverTrigger>

      <PopoverContent className="w-56 p-2">
        <p className="text-xs text-muted-foreground px-2 py-1">AGRUPAR POR</p>

        {groupOptions.map((opt) => (
          <button
            key={opt}
            onClick={() => setSelected(opt)}
            className="flex w-full items-center justify-between px-2 py-1.5 rounded text-sm hover:bg-accent"
          >
            {opt}
            {selected === opt && <CheckIcon className="h-4 w-4" />}
          </button>
        ))}

        <div className="border-t mt-2 pt-2 flex items-center gap-1">
          <button
            onClick={() => setOrder("asc")}
            className={`flex-1 py-1 text-xs rounded ${order === "asc" ? "bg-accent" : ""}`}
          >
            ↑ ASC
          </button>
          <button
            onClick={() => setOrder("desc")}
            className={`flex-1 py-1 text-xs rounded ${order === "desc" ? "bg-accent" : ""}`}
          >
            ↓ DESC
          </button>
          <button className="p-1 text-destructive hover:bg-destructive/10 rounded">
            <TrashIcon className="h-4 w-4" />
          </button>
        </div>

        <div className="flex items-center justify-between px-2 py-1.5 mt-1">
          <span className="text-sm">Agrupar por Lista</span>
          <Switch checked={groupByList} onCheckedChange={setGroupByList} />
        </div>
      </PopoverContent>
    </Popover>
  )
}
3. Lógica de agrupamento das tarefas
tsx// Agrupa um array de tarefas pelo campo selecionado
function groupTasks(tasks: Task[], groupBy: string) {
  return tasks.reduce((groups, task) => {
    const key = task[groupBy.toLowerCase()] ?? "Sem " + groupBy
    if (!groups[key]) groups[key] = []
    groups[key].push(task)
    return groups
  }, {} as Record<string, Task[]>)
}

Dependências utilizadas

Radix UI Popover (ou shadcn/ui <Popover>) para o dropdown
Tailwind CSS para os estilos
Lucide React para os ícones (Group, Check, Trash2, ArrowUpDown)
shadcn/ui Switch para o toggle "Agrupar por Lista"

O componente usa data-state="closed/open" do Radix para controlar abertura/fechamento, e o campo atual selecionado fica destacado com um ✓ (checkmark) ao lado.