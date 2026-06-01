# PLANO — UI do editor de descrição em paridade visual com ClickUp

> Status: pronto pra execução · Estimativa: 2-3 dias · Owner: Samuel + Mascos

---

## Context

A descrição da task já está ativa em prod (Sprint 3 do PLANO-TASK-DESCRIPTION-BLOCKNOTE entregue). O editor renderiza nos 3 tipos (Bug, Feature, Otimização) mas com UI default do BlockNote + Mantine — borda visível, fundo branco, placeholder em inglês. Samuel pediu paridade visual com o ClickUp.

Auditoria do ClickUp via Playwright na task `https://app.clickup.com/t/86e1mvjq8` (Mystic workspace):

- Lib: **Quill 2.x** (`ql-bubble`, `ql-snow`, blocos `<div class="ql-block" data-block-id>`) — não casa com nossa stack BlockNote
- Estado vazio: sem container visual (sem borda, sem bg), texto único integrado ao fluxo "Adicione uma descrição ou escreva com ✦ IA" em cinza médio `rgb(131,131,131)` ~14px
- Estado focado vazio: Quill expande pra 822×108 com placeholder via `::before content` "Escreva, pressione a barra de espaço para usar a IA ou \"/\" para usar comandos"
- 2 ícones top-right do editor: histórico + fullscreen (sempre visíveis)
- Tipografia: `font-size:16px line-height:24px color:rgb(32,32,32)`
- Slash menu: painel 440×400 sem borda + sombra suave, 2 colunas, headers maiúsculos cinza (SUGESTÕES / TEXTO), itens IA em roxo
- Sem toolbar persistente; sem indicador "salvando/salvo"

Estado atual ERP em prod (capturado via Playwright na task `cmpuezwhe000101od4voqk3ok`):
- Wrapper [task-description-editor.tsx:39](mundial-erp-web/src/features/tasks/components/task-view/task-description-editor.tsx) tem `rounded-lg border border-stroke-soft-200 bg-bg-white-0 px-3 py-2`
- Placeholder default BlockNote em inglês: "Enter text or type '/' for commands"
- font-size 16px / line-height 24px / color rgb(63,63,63) — já bem perto do ClickUp
- min-height seguindo conteúdo (~30px) — diverge dos 108px do ClickUp
- Slash menu nativo BlockNote (1 coluna, EN)

### Decisão fixada com o Samuel

**Estratégia 1: estilizar BlockNote pra parecer ClickUp.** Mantém a lib (já deployada Sprint 1-3, paridade com Hoppe que também usa BlockNote). Diffs ficam em wrapper + CSS Mantine + i18n do BlockNote.

Fora de escopo desta PR (avaliar em outra rodada):
- Feature de IA funcional (botões aparecem visualmente, sem ação)
- Redesign do slash menu pra 2 colunas com headers maiúsculos (continua nativo BlockNote)
- Bubble menu custom
- Botão fullscreen / histórico funcional

---

## Roadmap de Sprints

| Sprint | Objetivo | Estimativa |
|--------|----------|------------|
| 1 — Casco visual + i18n | Remove borda/bg, placeholder PT-BR ClickUp-style, tipografia validada, min-height 108px | 1 dia |
| 2 — Botões laterais + estado vazio especial | 2 ícones top-right (histórico + fullscreen visuais), placeholder "Adicione uma descrição..." quando totalmente vazio | 0,5 dia |
| 3 — Slash menu PT-BR | Tradução dos labels do slash menu + ícones via dicionário BlockNote | 0,5 dia |
| 4 — Validação visual lado a lado | Screenshots ERP × ClickUp, ajuste fino | 0,5 dia |

Total: ~2,5 dias.

---

## Sprint 1 — Casco visual + i18n

> **Objetivo:** task-description-editor.tsx fica visualmente idêntico ao ClickUp em estado focado (sem borda, sem bg destacado, tipografia ajustada, placeholder PT-BR).

### Tasks técnicas

**1.1 — Remover container destacado** ([task-description-editor.tsx:39](../../mundial-erp-web/src/features/tasks/components/task-view/task-description-editor.tsx))

```diff
-    <div className='rounded-lg border border-stroke-soft-200 bg-bg-white-0 px-3 py-2'>
+    <div className='cu-desc-editor-wrap min-h-[108px] px-0'>
       <BlockNoteView
         editor={editor}
         editable={!readOnly}
         onChange={persist}
         aria-label={ariaLabel}
+        theme={blockNoteTheme}
       />
     </div>
```

`min-h-[108px]` espelha o `min-height: 108px` do `.ql-editor` do ClickUp. Class `cu-desc-editor-wrap` serve de anchor pro CSS overrides do Mantine (§1.3).

**1.2 — Placeholder PT-BR via i18n do BlockNote**

BlockNote suporta `dictionary` prop em `useCreateBlockNote`. Substituir:

```diff
-  const editor = useCreateBlockNote();
+  const editor = useCreateBlockNote({
+    dictionary: clickupPtBrDictionary,
+  });
```

Criar [mundial-erp-web/src/features/tasks/components/task-view/blocknote-ptbr.ts](../../mundial-erp-web/src/features/tasks/components/task-view/blocknote-ptbr.ts):

```ts
import { en } from '@blocknote/core/locales';

export const clickupPtBrDictionary = {
  ...en,
  placeholders: {
    ...en.placeholders,
    default: 'Escreva, pressione a barra de espaço para usar a IA ou "/" para usar comandos',
    heading: 'Título',
    emptyDocument: 'Adicione uma descrição ou escreva com ✦ IA',
  },
  slash_menu: {
    ...en.slash_menu,
    // Sprint 3 cobre o resto. Por ora deixa só os já em pt-BR.
  },
};
```

Strings batem 1:1 com o que capturei do ClickUp (memória `feedback_validacao_visual_paridade`).

**1.3 — Overrides CSS via Mantine theme**

Criar [mundial-erp-web/src/features/tasks/components/task-view/task-description.css](../../mundial-erp-web/src/features/tasks/components/task-view/task-description.css):

```css
.cu-desc-editor-wrap .bn-container.bn-mantine {
  background: transparent;
  border: none;
  box-shadow: none;
}

.cu-desc-editor-wrap .bn-editor {
  padding: 0;
  margin: 0;
  font-size: 16px;
  line-height: 24px;
  color: rgb(32, 32, 32);
}

.cu-desc-editor-wrap .bn-editor[data-placeholder]::before,
.cu-desc-editor-wrap .bn-inline-content[data-placeholder]::before {
  color: rgb(131, 131, 131);
  font-size: 14px;
  font-style: normal;
}

.cu-desc-editor-wrap .bn-block-content {
  padding: 0;
}
```

Importar no editor:
```ts
import './task-description.css';
```

Cores extraídas do DOM ClickUp: texto `rgb(32,32,32)`, placeholder `rgb(131,131,131)`, font 16/24.

### DoD Sprint 1

- [ ] Container sem borda nem fundo visível (DevTools confirma `border: none`, `background: transparent`)
- [ ] font-size 16px / line-height 24px / color rgb(32,32,32) no editor
- [ ] Placeholder em PT-BR quando focado vazio
- [ ] min-height 108px (área de clique mesmo sem texto)
- [ ] Screenshot lado a lado: nosso vs ClickUp focado vazio — diferença visual < 10% (medição olhométrica)

---

## Sprint 2 — Estado vazio "colapsado" + botões laterais

> **Objetivo:** quando a descrição está totalmente vazia (sem foco), renderiza só o texto "Adicione uma descrição ou escreva com ✦ IA" em cinza. Ao clicar, transita pro editor real. 2 ícones top-right (histórico + fullscreen, visuais).

### Tasks técnicas

**2.1 — State machine no wrapper** ([task-description.tsx](../../mundial-erp-web/src/features/tasks/components/task-view/task-description.tsx))

```diff
 export function TaskDescription(props: TaskDescriptionProps) {
+  const [editing, setEditing] = useState(() => {
+    const stripped = (props.value || '').replace(/<[^>]+>/g, '').trim();
+    return stripped.length > 0;
+  });
+
+  if (!editing) {
+    return (
+      <button
+        type='button'
+        onClick={() => setEditing(true)}
+        className='text-paragraph-sm text-text-soft-400 hover:text-text-sub-600 block w-full cursor-text py-2 text-left transition-colors'
+      >
+        Adicione uma descrição ou escreva com{' '}
+        <span className='text-purple-500'>✦ IA</span>
+      </button>
+    );
+  }
+
   return (
     <>
       <noscript><TaskDescriptionFallback {...props} /></noscript>
-      <TaskDescriptionEditor {...props} />
+      <TaskDescriptionEditor {...props} autoFocus />
     </>
   );
 }
```

Adicionar prop `autoFocus` em `TaskDescriptionProps` e usar no editor:

```diff
 export default function TaskDescriptionEditor({
   value, onChange, readOnly, 'aria-label': ariaLabel,
+  autoFocus,
 }: TaskDescriptionProps) {
   const editor = useCreateBlockNote({ dictionary: clickupPtBrDictionary });
   const initialized = useRef(false);

   useEffect(() => {
     if (initialized.current) return;
     initialized.current = true;
     void (async () => {
       const blocks = value ? await editor.tryParseHTMLToBlocks(value) : [{ type: 'paragraph' as const }];
       editor.replaceBlocks(editor.document, blocks);
+      if (autoFocus) editor.focus();
     })();
   }, [editor, value, autoFocus]);
```

A regra "estado vazio colapsado" só fecha quando `value` está realmente vazio (HTML strip = string vazia). Se já tem conteúdo, abre direto no modo edit.

**2.2 — 2 ícones top-right (histórico + fullscreen visuais)**

Wrapper externo recebe os botões absolute:

```tsx
<div className='cu-desc-editor-wrap relative min-h-[108px] px-0 group'>
  <div className='absolute right-2 top-2 z-10 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100'>
    <button
      type='button'
      aria-label='Histórico de edições'
      className='text-text-soft-400 hover:bg-bg-weak-100 flex h-7 w-7 items-center justify-center rounded'
      onClick={() => {/* TODO: histórico — fora de escopo */}}
    >
      <ClockIcon className='h-4 w-4' />
    </button>
    <button
      type='button'
      aria-label='Expandir tela cheia'
      className='text-text-soft-400 hover:bg-bg-weak-100 flex h-7 w-7 items-center justify-center rounded'
      onClick={() => {/* TODO: fullscreen — fora de escopo */}}
    >
      <Maximize2Icon className='h-4 w-4' />
    </button>
  </div>
  <BlockNoteView ... />
</div>
```

Importar de `lucide-react` (já em uso no projeto):
```ts
import { Clock as ClockIcon, Maximize2 as Maximize2Icon } from 'lucide-react';
```

Aparecem só no hover/focus do bloco — espelha ClickUp que mostra constantes mas com baixa proeminência.

### DoD Sprint 2

- [ ] Task sem descrição: mostra só placeholder PT-BR cinza (sem editor renderizado)
- [ ] Clique no placeholder → editor abre e fica em foco automaticamente
- [ ] Task com descrição preenchida (após F5): abre direto em modo edit
- [ ] Hover do editor: 2 ícones top-right visíveis com opacity 100
- [ ] Sem hover/focus: ícones em opacity 0 (clean visual)
- [ ] Console limpo (nenhum warning sobre re-renders do BlockNote)

---

## Sprint 3 — Slash menu em PT-BR

> **Objetivo:** os 15+ comandos do slash menu BlockNote ficam em PT-BR com labels alinhadas ao ClickUp.

### Tasks técnicas

**3.1 — Dicionário slash menu** ([blocknote-ptbr.ts](../../mundial-erp-web/src/features/tasks/components/task-view/blocknote-ptbr.ts))

Mapear cada slash item do BlockNote pra label/aliases ClickUp (captura DOM `cu-slash-command-value-list` mostrou: Meu Brain, Escrever com IA, Faixas, Checklist, Colunas, Modelo, Lista ClickUp (Tabela), Alternar lista, Botão, Criar documento, Criar Whiteboard, Continuar escrevendo, Criar uma recapitulação, Texto normal, Cabeçalho 1/2/3, Lista numerada).

Tradução mínima (só itens que BlockNote já oferece):

```ts
export const clickupPtBrDictionary = {
  ...en,
  // ... placeholders
  slash_menu: {
    heading: { title: 'Cabeçalho 1', subtext: 'Título grande', aliases: ['h1', 'titulo', 'cabecalho'], group: 'Texto' },
    heading_2: { title: 'Cabeçalho 2', subtext: 'Título médio', aliases: ['h2'], group: 'Texto' },
    heading_3: { title: 'Cabeçalho 3', subtext: 'Título pequeno', aliases: ['h3'], group: 'Texto' },
    bullet_list: { title: 'Lista com marcadores', subtext: 'Lista pontilhada', aliases: ['ul', 'lista'], group: 'Texto' },
    numbered_list: { title: 'Lista numerada', subtext: 'Lista numerada', aliases: ['ol'], group: 'Texto' },
    check_list: { title: 'Checklist', subtext: 'Lista com checkbox', aliases: ['todo', 'task'], group: 'Texto' },
    paragraph: { title: 'Texto normal', subtext: 'Parágrafo simples', aliases: ['p', 'texto'], group: 'Texto' },
    code_block: { title: 'Código', subtext: 'Bloco de código', aliases: ['code'], group: 'Texto' },
    table: { title: 'Tabela', subtext: 'Tabela simples', aliases: ['tabela'], group: 'Sugestões' },
    image: { title: 'Imagem', subtext: 'Imagem', aliases: ['img', 'imagem'], group: 'Sugestões' },
    // ... outros conforme @blocknote/core/locales/en
  },
};
```

`group` define o header maiúsculo no slash menu — "Texto" e "Sugestões" replicam ClickUp.

**3.2 — Validar i18n carregou**

Smoke local: abrir editor, digitar `/`, conferir que itens aparecem em PT-BR + headers "TEXTO"/"SUGESTÕES" maiúsculos (BlockNote default já faz uppercase via CSS).

### DoD Sprint 3

- [ ] `/` abre menu com headers "TEXTO" e "SUGESTÕES" (ou similares conforme BlockNote)
- [ ] Itens em PT-BR (Cabeçalho 1/2/3, Lista com marcadores, Lista numerada, Checklist, Texto normal, Código, Tabela, Imagem)
- [ ] Search funciona em PT-BR (digitar "cabe" filtra Cabeçalho)
- [ ] Atalhos antigos ainda funcionam (digitar "h1" continua resolvendo via aliases)

---

## Sprint 4 — Validação visual lado a lado

> **Objetivo:** prova visual que UI ficou em paridade com ClickUp. Fecha o ciclo da paridade.

### Tasks

**4.1 — Screenshots pareados** (Playwright)

Matriz de captura:

| Estado | URL ClickUp | URL ERP |
|--------|-------------|---------|
| Vazio sem foco | `https://app.clickup.com/t/86e1mvjq8` (descrição limpa) | `/tasks/<bug-id>` (descrição limpa) |
| Vazio focado (placeholder) | clica no placeholder | clica no placeholder |
| Preenchido (1 parágrafo) | digita "Lorem ipsum" | digita mesmo |
| Slash menu aberto | digita `/` | digita `/` |
| Hover editor (ícones laterais) | hover na área | hover na área |

Salvar em `~/Documents/Materiais/comparativos/desc-clickup-vs-erp/`.

**4.2 — Diff olhométrico**

Pra cada par de screenshots:
- Listar 3 maiores divergências visuais
- Confirmar com Samuel se valem o ajuste extra (criar Sprint 5 ou aceitar)

### DoD Sprint 4

- [ ] 5 pares de screenshots capturados, organizados em pasta
- [ ] Tabela de divergências documentada
- [ ] Samuel aprova ou aponta ajustes finais

---

## Critical files (consolidado)

Modificados:
- [mundial-erp-web/src/features/tasks/components/task-view/task-description.tsx](../../mundial-erp-web/src/features/tasks/components/task-view/task-description.tsx) — wrapper com state machine "vazio colapsado" vs "editing"
- [mundial-erp-web/src/features/tasks/components/task-view/task-description-editor.tsx](../../mundial-erp-web/src/features/tasks/components/task-view/task-description-editor.tsx) — passa `dictionary`, recebe `autoFocus`, troca container externo

Novos:
- [mundial-erp-web/src/features/tasks/components/task-view/blocknote-ptbr.ts](../../mundial-erp-web/src/features/tasks/components/task-view/blocknote-ptbr.ts) — dicionário i18n (placeholder + slash menu)
- [mundial-erp-web/src/features/tasks/components/task-view/task-description.css](../../mundial-erp-web/src/features/tasks/components/task-view/task-description.css) — overrides Mantine alinhados ao ClickUp

Inalterados:
- Backend (Sprint 1-3 do PLANO-TASK-DESCRIPTION-BLOCKNOTE) — nada muda. Esta PR é puro front-CSS.

---

## Verification end-to-end

1. `npm run dev` no `mundial-erp-web` (porta 3001)
2. Abrir task de tipo Bug em prod ou dev
3. Conferir matriz visual Sprint 4 com ClickUp aberto lado a lado
4. Console limpo (`F12` → nenhum warning)
5. `npm run build` OK
6. Sem regressão visual em comments (que continuam usando o stub `comment-composer` antigo — não é nosso escopo agora)

---

## Não-objetivos desta rodada

- AI funcional ("Meu Brain", "Escrever com IA") — só visual
- Botão fullscreen / histórico funcionais — só visual (TODOs)
- Bubble menu custom (BlockNote já tem um nativo decente)
- Banner topo "Peça ao Brain para Escrever uma descrição" — visualmente diferente do nosso layout, deixaria poluído
- Trocar de BlockNote pra Quill — fora de escopo (foi escolhido manter)
