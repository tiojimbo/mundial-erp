# DESIGN SPEC — Task List View (Pasta/Departamento)

## SCREENSHOTS DE REFERÊNCIA
---

## DESIGN TOKENS (valores computados reais, não estimados)

### Paleta de Cores
```
--background:          oklch(100% 0 0)        → branco puro (#FFFFFF)
--foreground:          oklch(14.5% 0 0)       → quase preto (#1a1a1a)
--muted:               oklch(97% 0 0)         → cinza levíssimo (#f7f7f7)
--muted-foreground:    oklch(55.6% 0 0)       → cinza médio (#737373)
--primary:             oklch(20.5% 0 0)       → preto suave (#282828)
--primary-foreground:  oklch(98.5% 0 0)       → quase branco (#fafafa)
--accent:              oklch(97% 0 0)         → cinza hover (#f7f7f7)
--accent-foreground:   oklch(20.5% 0 0)       → preto suave
--border:              oklch(92.2% 0 0)       → cinza claro (#ebebeb)
--input:               oklch(92.2% 0 0)       → igual border
--ring:                oklch(70.8% 0 0)       → cinza médio para focus
--radius:              0.625rem               → 10px
--sidebar-accent:      oklch(94% 0 0)         → cinza sidebar hover
--card:                oklch(100% 0 0)        → branco
--destructive:         oklch(57.7% 0.245 27.325) → vermelho
```

### Tipografia
```
font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, 
             "Helvetica Neue", Helvetica, Arial, sans-serif
letter-spacing: -0.011em  (tracking-tight — padrão em TODOS os textos)
```

---

## ESTRUTURA DE LAYOUT

```
[Sidebar: 257px fixo]
[Main Content: flex-1, bg-background, rounded-xl, shadow-sm]
  ├── [Page Header: padding 16px 40px, border-bottom 0.8px border]
  │     ├── Breadcrumb row
  │     └── Tabs row (border-bottom: 0.8px solid border)
  ├── [Toolbar: padding 6px 0 / inner padding-x: 40px]
  └── [Tab Panel: flex-1, overflow-hidden]
        └── [Scroll Container: overflow-auto, pb-24, gap-16px]
              └── [List Card] × N
```

---

## COMPONENTE 1 — BREADCRUMB

**Layout:** `flex items-center gap-6px padding: 16px 40px`

| Elemento | Estilo computado |
|---|---|
| Texto inativo ("Comercial") | `font-size: 13px, font-weight: 400, color: oklch(55.6% 0 0), letter-spacing: -0.143px` |
| Separador "/" | `font-size: 12px, color: oklch(55.6% 0 0 / 0.4)` |
| Ícone pasta | `lucide FolderOpen, 16x16, color: muted-foreground` |
| Texto ativo ("Vendas") | `font-size: 13px, font-weight: 600, color: oklch(14.5% 0 0), letter-spacing: -0.143px` |
| Chevron dropdown | `lucide ChevronDown, 14x14, color: muted-foreground` |
| Estrela favorito | `lucide Star, 14x14, color: muted-foreground, hover: foreground` |

---

## COMPONENTE 2 — TABS

**Container:** `flex items-center overflow-x-auto bg-transparent` + `border-bottom: 0.8px solid oklch(92.2% 0 0)`

| Elemento | Estilo computado |
|---|---|
| Tab inativa | `font-size: 13px, font-weight: 500, color: muted-foreground, padding: 8px 12px, height: 35.5px` |
| Tab ativa | `color: oklch(14.5% 0 0) (foreground), after::pseudo-element: position absolute, bottom 0, height 2px, bg: foreground` |
| Tab ativa indicador | `after: absolute bottom-0 left-0 right-0 h-[2px] bg-foreground` |
| Ícone da tab | `16x16, inline no texto, gap: 6px` |
| "+ Nova Visualização" | `font-size: 13px, color: muted-foreground, icon: Plus 14x14, hover: foreground` |

---

## COMPONENTE 3 — TOOLBAR

**Container:** `padding: 6px 0 / inner div: padding-x 40px`  
**Layout:** `flex justify-between items-center`

### Lado Esquerdo
| Botão | Estilo |
|---|---|
| "Agrupar: Status" | `bg: oklch(20.5% 0 0 / 0.1), color: oklch(20.5% 0 0), border-radius: 8px, padding: 6px 10px, font-size: 12px, font-weight: 500, height: 28px, gap: 6px` |
| "Subtasks" | `bg: transparent, color: muted-foreground, border-radius: 8px, padding: 6px 10px, font-size: 12px, font-weight: 500, height: 28px, gap: 6px, hover: bg-accent` |

### Lado Direito
| Botão | Estilo |
|---|---|
| "Filtros" | igual Subtasks (ghost) |
| "Fechadas" | igual Subtasks (ghost) |
| Search wrapper | `bg: oklch(97% 0 0), border: 0.8px solid oklch(92.2% 0 0), border-radius: 8px, padding: 6px 10px, width: 160px, height: ~29px, gap: 6px` — focus: `border-ring, bg-background, ring-2 ring-ring/20` |
| Input search | `bg: transparent, font-size: 12px, color: foreground, placeholder: muted-foreground` |
| Config icon btn | `icon-only, rounded-md, p-1.5, color: muted-foreground, hover: bg-accent` |
| "+ Task" | `bg: oklch(20.5% 0 0) (primary), color: primary-foreground, border-radius: 8px, padding: 6px 12px, font-size: 12px, font-weight: 500, height: 28px, margin-left: 4px, gap: 6px, hover: bg-primary/90` |

---

## COMPONENTE 4 — LIST CARD (o card branco)

**Container:**
```
background: #FFFFFF (rgb(255,255,255))
border: 0.8px solid oklch(0.92 0.004 286.32)  ← levíssimo toque azul-acinzentado
border-radius: 14px  (rounded-xl = 12px, mas computado = 14px)
margin: 0 40px  (mx-4 md:mx-6 lg:mx-10 → 40px em lg)
overflow: hidden (implícito pelo rounded)
```

### 4a. Card Header
```
padding: 16px 20px  (px-5 py-4)
display: flex, align-items: center, gap: 12px
height: 74px (computado com conteúdo)
background: transparent
```

| Sub-elemento | Estilo |
|---|---|
| Botão colapsar (↓) | `bg: oklch(20.5% 0 0 / 0.1), color: oklch(20.5% 0 0), border-radius: 8px, size: 24x24px, icon: ChevronDown 14x14` |
| Label dept (superior) | `font-size: 12px, font-weight: 400, color: muted-foreground, line-height: 1, truncate` |
| Título lista (inferior) | `font-size: 16px, font-weight: 600, color: foreground, truncate` |
| Count | `font-size: 12px, font-weight: 500, color: muted-foreground, tabular-nums` |
| Layout texto | `flex-col gap-2px, flex-1 min-w-0` |

---

## COMPONENTE 5 — STATUS GROUP

### 5a. Status Badge Row (sticky top-0 z-[25])
```
min-height: 40px, padding-left: 24px (pl-6)
display: flex, align-items: center
position: sticky, top: 0, z-index: 25
background: transparente (herda do card)
```

| Sub-elemento | Estilo |
|---|---|
| Botão ∨ collapse | `bg: transparent, color: muted-foreground, border-radius: 8px, size: 20x20px, padding: 2px, hover: bg-accent` |
| Status Badge | `bg: rgba(138,129,124,0.125), color: rgb(138,129,124), border-radius: 10px, padding: 6px 8px, font-size: 12px, font-weight: 600, letter-spacing: tracking-wide, text-transform: uppercase, gap: 6px, height: 28px` |
| Ícone status no badge | `lucide CircleDot, 14x14, color: herdado do badge (rgb(138,129,124))` |
| Count ao lado | `font-size: 12px, font-weight: 500, color: muted-foreground, tabular-nums, margin-left: auto` |

> **IMPORTANTE:** As cores do status badge são dinâmicas via `style` inline.  
> "Para fazer": `bg: rgba(138,129,124,0.125)`, `color: rgb(138,129,124)`  
> Regra: `color` = cor do status, `bg` = `cor + opacity 12.5%`

### 5b. Column Header Row (sticky top-10 z-20)
```
position: sticky, top: 40px (top-10), z-index: 20
height: 44px
padding-left: 44px (pl-[44px])
display: flex, align-items: center
background: transparente
color: oklch(55.6% 0 0)  (muted-foreground)
font-size: 12.8px (~0.8rem), font-weight: 500
letter-spacing: -0.1408px
```

| Coluna | Largura |
|---|---|
| Name | 400px |
| Assigned to | 200px |
| Start date | 200px |
| Due date | 200px |
| Comments | 150px |
| Actions (vazio) | 40px min |

---

## COMPONENTE 6 — TASK ROW

### Row Container
```
position: relative
display: flex
cursor: pointer
padding: 0 40px 0 44px  (pr-10 pl-[44px])
margin-top: -1px  (-mt-px, para overlap de bordas)
height: ~37px (computado)
select: none

border-top: 0.8px solid transparent  → hover: oklch(92.2% 0 0)
border-bottom: 0.8px solid transparent → hover: oklch(92.2% 0 0)
background: transparent → hover: oklch(97% 0 0) (accent)
z-index: auto → hover: z-[1]
```

### Hover Overlay (position absolute, esquerda, opacity 0 → 100 no hover)
```
position: absolute, left: 0, top: 0, bottom: 0
width: 44px
display: flex, align-items: center, justify-content: flex-end, gap: 2px, padding-right: 4px
opacity: 0 → group-hover: opacity-100
```
Conteúdo: `drag handle (GripVertical 14x14)` + `checkbox (3.5×3.5, rounded-[4px])`

### Row Main Container (role="row-main-container")
```
display: flex, align-items: center
flex: 1 (grow)
margin-left: 24px (ml-6)
border-top: 0.8px solid oklch(92.2% 0 0) → group-hover: transparent
border-bottom: 0.8px solid oklch(92.2% 0 0) → group-hover: transparent
height: ~35px (computado)
```

### Coluna Name (400px)
Layout interno: `flex items-center gap-6px mr-12px w-full`

| Sub-elemento | Estilo |
|---|---|
| Expand subtasks btn | `size: 20x20, border-radius: 6px, border: transparent → hover: border-border, icon: ChevronRight 14x14, color: muted-foreground` |
| Status icon btn | `size: 20x20, border-radius: 6px, icon: CircleDot 16x16, color: cor do status (dinâmica via inline style)` |
| Task title link | `font-size: 14px, font-weight: 500, color: foreground, letter-spacing: -0.154px, truncate, block` |
| Quick actions (hover only) | `opacity-0 group-hover:opacity-100, flex gap-4px` |
| Quick action btn (+) | `size: 28x28, border: 0.8px solid border, border-radius: 8px, color: muted-foreground, hover: bg-accent + foreground` |
| Quick action div (tag) | `size: 28x28, border: 0.8px solid border, border-radius: 8px, color: muted-foreground (div, não button)` |
| Quick action btn (✏) | igual ao btn (+) |

### Coluna Assigned to (200px) — Cell wrapper
```
Outer div: flex shrink-0 flex-col overflow-visible, width: 200px
Inner div: flex h-full items-center w-fit overflow-visible
           hover:border-border border border-transparent rounded-md px-2 py-1 transition-colors
Cell (role="cell"): flex h-full w-full items-center overflow-visible text-sm
```
Empty state (sem responsável):
```
Ícone circular: size 24x24, rounded-full, bg: muted (oklch(97% 0 0)),
color: muted-foreground, ring: 1px inset oklch(92.2% 0 0 / 0.6)
Icon: UserPlus 14x14
```

### Colunas Start date / Due date (200px cada) — Cell wrapper
```
Outer div: flex shrink-0 flex-col overflow-hidden, width: 200px
Inner div: flex h-full items-center w-fit overflow-hidden
           hover:border-border border border-transparent rounded-md px-2 py-1 transition-colors
```
Empty state:
```
Span: size 24x24, rounded-full, bg: muted, color: muted-foreground,
ring: 1px inset oklch(92.2% 0 0 / 0.6)
Icon: Calendar 14x14
```

### Coluna Comments (150px)
```
role="cell", padding: 0 8px, gap: 6px, font-size: 14px
hover:text-primary transition-colors
Icon: MessageSquare 14x14, color: muted-foreground, shrink-0
Count: span, text-sm
```

---

## COMPONENTE 7 — NOVA TAREFA

```
display: block
padding: 8px 16px
font-size: 12.8px (~0.8rem), font-weight: 500
color: muted-foreground (oklch(55.6% 0 0))
margin-top: 8px
width: 400px (name column width)
background: transparent
hover: bg-gradient-to-r from-transparent to-accent (oklch(97% 0 0))
transition: all 200ms
```

---

## REGRAS COMPORTAMENTAIS (interações)

1. **Task row hover:** `bg-accent` + bordas top/bottom aparecem (oklch 92.2%) + overlay de checkbox/drag aparece + quick actions aparecem
2. **Task row default:** bordas top/bottom são `transparent` (0.8px mas invisíveis), -mt-px para sobreposição
3. **Card collapse:** botão `bg-primary/10` rotaciona o ChevronDown -90deg
4. **Status group collapse:** ChevronDown do status row rotaciona -90deg
5. **Tab ativa:** `::after` pseudo-element, `height: 2px, bg: foreground (preto)`, bottom: 0
6. **Search focus:** border muda para `--ring`, bg muda para `--background`, ring: `2px ring-ring/20`
7. **Status badge cores:** injetadas via `style` inline (não via classe), calculadas como `color = cor-status`, `bg = cor-status + 12.5% opacity`

---

## ESPAÇAMENTOS CRÍTICOS (os que a LLM geralmente erra)

```
Sidebar width:           257px
Main padding-x:          40px (lg), 24px (md), 16px (sm)
Card margin-x:           40px (lg), 24px (md), 16px (sm)
Card header padding:     16px 20px
Status row padding-left: 24px (pl-6)
Col header padding-left: 44px (pl-[44px])
Task row padding:        0 40px 0 44px
Task row margin-top:     -1px  ← CRÍTICO para bordas não duplicarem
Row overlay width:       44px  ← alinha com pl-[44px]
Border width:            0.8px (NÃO 1px — é o padrão da lib)
Card border-radius:      14px (computado) / rounded-xl
Button border-radius:    8px  (rounded-md)
Badge border-radius:     10px (rounded-lg)
Circular icon size:      24x24
Quick action btn size:   28x28
```

---
