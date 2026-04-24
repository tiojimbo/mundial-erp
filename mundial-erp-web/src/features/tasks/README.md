# Feature Tasks

Fachada semantica para gestao de tarefas (Task View integral, Kanban, listagens,
calendario, Gantt). Documento vivo — atualizar a cada sprint.

> Referencias: [`/.claude/plan/PLANO-TASKS.md`](../../../../.claude/plan/PLANO-TASKS.md) secoes 10–13, 16; `tasks.md` linhas 378–775.

---

## 1. Arquitetura

```
features/tasks/
  components/
    task-view/          # UI da rota /tasks/[taskId] (Main + Activities)
      task-description.tsx   # BlockNote via dynamic({ ssr: false })
      index.ts
    task-board.tsx      # Kanban (dnd-kit)
    task-list.tsx       # DataTable + react-virtual
    task-calendar.tsx   # fase G
    task-gantt.tsx      # fase G
    task-card.tsx
  hooks/                # React Query: useTasks, useTask, useCustomTaskTypes, ...
  services/             # tasks.service, custom-task-types.service
  schemas/              # Zod — fonte unica da verdade
  types/                # derivados via z.infer
  stores/               # Zustand (UI state, saved filters)
  utils/
```

Fluxo: `Component` → `hook` (React Query) → `service` (axios) → API v1.
Tipos sao **sempre** derivados dos schemas Zod via `z.infer` (zero `any`).

---

## 2. Nomenclatura: `WorkItem` (Prisma) x `Task` (fachada)

O registro persistido no Prisma chama-se `WorkItem` por razoes historicas (BPM).
A partir desta feature, a **fachada semantica** exposta ao usuario, UI e API
publica e **Task**. Sao a **mesma entidade** — nao ha duplicacao.

- Backend: DTOs `Task*`, rotas `/api/v1/tasks`, modulo `TasksModule`.
- Prisma: tabela continua `work_items` (compatibilidade retroativa).
- Frontend: **features/tasks** e a fonte canonica; `features/work-items/` vira
  re-exports (PLANO §11) — nao quebrar as paginas `/work-items`, `/my-tasks`
  existentes.
- Risco R13 (PLANO §16): mitigado por este documento + onboarding.

---

## 3. Excecao documentada a regra #13 (named exports)

`99-referencia-completa.md` regra **#13** proibe `export default` em
componentes. **Unica excecao**: `app/tasks/[taskId]/page.tsx` — o Next.js
App Router (v15) **exige** `export default` em `page.tsx` (convencao do
framework, nao negociavel).

- Todos os outros arquivos da feature usam `export function Name()` (named).
- A excecao e documentada no addendum de `99-referencia-completa.md`
  (PLANO §17, checklist item 12) e referenciada no PLANO §10.11.
- Justificativa: R18 do registro de riscos (PLANO §16).

---

## 4. Como adicionar um novo componente

1. Escolha a pasta:
   - Especifico da rota `/tasks/[taskId]` → `components/task-view/`.
   - Compartilhado entre views (board, list, detail) → `components/`.
2. Use **named export**:
   ```tsx
   export function MyComponent(props: MyComponentProps) { /* ... */ }
   ```
3. Defina props em `type MyComponentProps = { ... }` imediatamente acima.
4. Tipos derivados dos schemas Zod (ex.: `import type { Task } from '../../types'`).
5. Se for Client Component (hooks, event handlers), adicione `'use client'`.
6. **Nunca** `export default`. **Zero `any`**. **Zero `console.log`**.
7. Adicione ao barrel `components/task-view/index.ts` se aplicavel.
8. Testes: `*.spec.tsx` (Vitest + Testing Library); a11y via `axe-core`
   (PLANO §14.4).

---

## 5. BlockNote — lazy-load obrigatorio

BlockNote pesa ~180 kb gzip (PLANO §11.1, R4). Regras:

- **SEMPRE** importar via `dynamic(() => import(...), { ssr: false })`.
- Fornecer **fallback SSR** com `<article class="prose prose-sm">` ou `<noscript>`
  para A11y (PLANO §10.9) — referencia em `components/task-view/task-description.tsx`.
- **Nunca** chamar APIs do BlockNote em Server Components.
- Markdown lido da API deve ser sanitizado com `DOMPurify` na leitura
  (PLANO §8.10) — **TODO Sprint 5** (TSK-150).

Deps ja presentes em `package.json`:
- `@blocknote/core`, `@blocknote/react`, `@blocknote/mantine`.

---

## 6. Lighthouse budget — gate de CI

Arquivo: `mundial-erp-web/lighthouse-budget.json`.

- Orcamento: scripts ≤ 450 kb, total ≤ 1200 kb, TTI ≤ 3500 ms, FCP ≤ 2000 ms,
  no maximo 10 third-parties.
- CI deve rodar `lhci collect` contra a rota `/tasks/[taskId]` apos deploy
  em staging.
- **Gate bloqueante**: Performance ≥ 85, Accessibility ≥ 95.
  Falha em qualquer metrica bloqueia o merge (PLANO §14.4, CTO note #4).
- TODO infra (TSK-101): adicionar workflow `.github/workflows/lighthouse.yml`
  em Sprint 0.

---

## 7. Tokens de design

Variaveis em `src/app/globals.css` namespaceadas `--task-*` (PLANO §10.2/10.3):

- `--task-radius-card` (14px), `--task-radius-badge` (4px).
- `--task-text-*`, `--task-fw-*`, `--task-transition`.
- Paleta de status: `--task-status-todo|in-progress|in-review|done|cancelled`
  (OKLCH).

Usar sempre essas variaveis via Tailwind arbitrary values ou classes utilitarias.
Nao cirar valores hard-coded em cada componente.

---

## 8. Estado de UI (Zustand)

`stores/tasks.store.ts` persiste:
- `savedFilters[]` + `activeFilterId` — filtros salvos do usuario.
- `activitiesPanelOpen` — preferencia do lado direito da Task View (§10.4).
- `collapsedSections` — estado colapso das secoes (§10.5).

Persistencia em `localStorage` com key `mundial.tasks.ui` versionada.
Migrations stub — atualizar quando o shape evoluir.

---

## 9. Proximos passos (Sprint 1)

1. TSK-110 — hook `useTasks` real com paginacao cursor/offset.
2. TSK-111 — SSE subscribe para realtime `/tasks/:id`.
3. TSK-112 — `useCustomTaskTypes` integrado com cache 5 min.
4. TSK-120 — sincronizar `savedFilters` com `ProcessView.config` do backend.
5. Workflow CI: `lighthouse.yml` + `axe-core` no Playwright Task View.
