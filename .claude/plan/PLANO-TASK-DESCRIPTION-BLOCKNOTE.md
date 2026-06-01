# PLANO — Descrição da task com BlockNote, gated em Bug / Feature / Otimização

> Status: pronto pra Sprint 1 · Owner: Samuel + Mascos (executor) · Estimativa total: ~5-6 dias

---

## Context

Auditoria comparativa Hoppe x Mundial ERP do campo `description` da task. Objetivo: trazer editor rich-text (BlockNote.js) pra descrição da task e restringir o editor a 3 tipos específicos já existentes em produção no workspace **Mundial Telhas** (`mundial-telhas`):

| Tipo | ID em prod | Plural |
|------|------------|--------|
| Bug | `cmppxu9h1004901qq8nwbwpo1` | Bugs |
| Feature | `cmppxyry7004b01qqhrwrlxzp` | Features |
| Otimização | `cmpt5pq1x000u01qe76q1vvdx` | Otimizações |

Os outros 5 tipos do workspace (`Cliente`, `Pedido`, `Cola`, `Bloco EPS`, `Bobina`) **não** devem mostrar o editor de descrição.

### Achados da auditoria Hoppe (https://hoppe.bravy.com.br, task `b4526d30-7da9-4c79-9e3b-c99981cae8a7`)

- **Lib**: BlockNote + Mantine. DOM confirmado: container `bn-container light bn-mantine`, editor `bn-editor`, blocos `bn-block-outer` / `bn-block-content` com `data-content-type="paragraph"`.
- **Persistência**: `PUT /api/v1/tasks/{id}` com body literal `{"description":"<p>Auditoria BlockNote teste H1 conteudo paragrafo</p><p></p>"}`. String HTML pura no campo `description`. Sem campo separado pra blocks JSON.
- **GET retorna mesma string HTML** em `description`. Antes do PUT vinha `description: null`.
- **Sem gate por tipo** no Hoppe — editor aparece em toda task. Nosso ERP vai divergir aqui.

### Estado atual do Mundial ERP

Backend ([mundial-erp-api](../../mundial-erp-api/)):
- `WorkItem.description String? @db.Text` ([schema.prisma:810](../../mundial-erp-api/prisma/schema.prisma)) — campo destino do HTML.
- `WorkItem.markdownContent String? @db.Text` ([schema.prisma:830](../../mundial-erp-api/prisma/schema.prisma)) — planejado pra JSON AST mas vira débito morto.
- `TaskTypeTemplate` ([schema.prisma:3224-3238](../../mundial-erp-api/prisma/schema.prisma)) tem `defaultDescriptionBlocks Json?` que vira débito.
- Service já tem ponto de injeção: [tasks.service.ts:200-260](../../mundial-erp-api/src/modules/tasks/tasks.service.ts) (create) e helpers `resolveMarkdownContentWithTemplate` em 1594-1649 / `isEmptyMarkdown` em 1670-1697 (serão substituídos).
- Module de templates é **read-only** ([task-type-templates.controller.ts](../../mundial-erp-api/src/modules/task-type-templates/task-type-templates.controller.ts)). Mutação vai por seed.
- Cache Redis 5min + circuit breaker no service ([task-type-templates.service.ts](../../mundial-erp-api/src/modules/task-type-templates/task-type-templates.service.ts)). Método `invalidate(customTaskTypeId, workspaceId)` (linha 166) existe — usar após seed em prod.

Frontend ([mundial-erp-web](../../mundial-erp-web/)):
- `@blocknote/core`, `@blocknote/mantine`, `@blocknote/react` `^0.48.1` já em `package.json`. **Nada a instalar no front.**
- [task-description.tsx](../../mundial-erp-web/src/features/tasks/components/task-view/task-description.tsx) é stub Sprint 0 (TSK-102) — esta PR fecha o TODO da Sprint 5 (TSK-150).
- [task-view.tsx:182-191](../../mundial-erp-web/src/features/tasks/components/task-view/task-view.tsx) já consome `TaskDescription` e tem mutation `updateTask`.
- [use-task-type-template.ts](../../mundial-erp-web/src/features/tasks/hooks/use-task-type-template.ts) já gerencia cache RQ alinhado com Redis (5min); 404 sem retry.
- [create-task-dialog.tsx:486-520](../../mundial-erp-web/src/features/tasks/components/create-task-dialog.tsx) ainda usa `<textarea>` simples.

### Decisões fixadas com o Samuel

1. **Formato: HTML** (paridade Hoppe, permite migração bidirecional).
2. **Gate: `hasDescription Boolean @default(false)` no `TaskTypeTemplate`** — só aparece em tipos que declararem explicitamente.
3. **Rollout em prod via seed manual** (SSH + docker exec — memória `project_erp_deploy_db_push_limitacao`), porque mutator de template não existe e o MVP não pede UI pra editar template.

---

## Roadmap de Sprints

| Sprint | Objetivo | Estimativa | Depende de |
|--------|----------|------------|------------|
| 1 — Backend | Schema, sanitização HTML, service com gate por tipo, DTO, testes | 2 dias | — |
| 2 — Frontend | Editor BlockNote real, gates UI no task-view e create-dialog, preview seguro | 2 dias | Sprint 1 mergeada |
| 3 — Rollout | Seed em prod, invalidação Redis, validação visual nos 8 tipos | 0,5 dia | Sprint 2 mergeada |

Não há Sprint 0: o `@blocknote/*` já está instalado e o backend já tem a infra-base pronta — vai direto pro Sprint 1.

---

## Sprint 1 — Backend (descrição com gate por tipo)

> **Objetivo:** Schema com flag `hasDescription`, sanitização HTML, gate no `create`/`update`, DTO atualizado e testes verdes. PR mergeada sem mudança visível pro usuário (gate default `false` mantém comportamento atual).

### DoR (Definition of Ready)

- [ ] Branch `feat/task-description-blocknote` criada a partir de `main`.
- [ ] Confirmado que `SELECT count(*) FROM task_type_templates WHERE default_description_blocks IS NOT NULL` retorna 0 em dev (e o time tem acesso pra rodar mesma query em prod antes do drop final no Sprint 3).
- [ ] `@blocknote/*` confirmado em `mundial-erp-web/package.json` (já está — sanity check).

### Tasks técnicas

**1.1 — Schema Prisma** ([mundial-erp-api/prisma/schema.prisma:3224-3238](../../mundial-erp-api/prisma/schema.prisma))

Substituir bloco do `TaskTypeTemplate`:

```prisma
model TaskTypeTemplate {
  id                     String    @id @default(cuid())
  customTaskTypeId       String    @unique @map("custom_task_type_id")
  attachmentCategories   Json?     @map("attachment_categories")
  hasDescription         Boolean   @default(false) @map("has_description")
  defaultDescriptionHtml String?   @map("default_description_html") @db.Text
  createdAt              DateTime  @default(now()) @map("created_at")
  updatedAt              DateTime  @updatedAt @map("updated_at")
  deletedAt              DateTime? @map("deleted_at")

  customTaskType CustomTaskType          @relation(fields: [customTaskTypeId], references: [id], onDelete: Cascade)
  fields         TaskTypeTemplateField[]

  @@index([deletedAt])
  @@map("task_type_templates")
}
```

Memória `feedback_schema_no_prose`: sem comentários explicativos no schema.

`npx prisma db push` em dev faz:
```sql
ALTER TABLE task_type_templates ADD COLUMN has_description BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE task_type_templates ADD COLUMN default_description_html TEXT NULL;
ALTER TABLE task_type_templates DROP COLUMN default_description_blocks;
```

**1.2 — Instalar `sanitize-html`** (memória `feedback_erp_package_manager`: api usa npm)

```bash
cd mundial-erp-api
npm install --save sanitize-html@^2.13.0
npm install --save-dev @types/sanitize-html@^2.13.0
```

**1.3 — Helper de sanitização** — novo arquivo [mundial-erp-api/src/modules/tasks/description-html.util.ts](../../mundial-erp-api/src/modules/tasks/description-html.util.ts):

```ts
import sanitizeHtml from 'sanitize-html';

const HTML_OPTIONS: sanitizeHtml.IOptions = {
  allowedTags: ['p', 'h1', 'h2', 'h3', 'ul', 'ol', 'li', 'strong', 'em', 'u', 's', 'code', 'pre', 'blockquote', 'a', 'br', 'hr', 'span', 'div'],
  allowedAttributes: {
    a: ['href', 'target', 'rel'],
    span: ['class', 'data-content-type', 'data-node-type', 'data-id'],
    div: ['class', 'data-content-type', 'data-node-type', 'data-id'],
    p: ['class'],
  },
  allowedSchemes: ['http', 'https', 'mailto'],
  transformTags: {
    a: (tag, attribs) => ({
      tagName: 'a',
      attribs: { ...attribs, rel: 'noopener noreferrer', target: attribs.target || '_blank' },
    }),
  },
};

export function sanitizeDescriptionHtml(html: string | null | undefined): string | null {
  if (!html) return null;
  const clean = sanitizeHtml(html, HTML_OPTIONS).trim();
  if (isEmptyHtml(clean)) return null;
  return clean;
}

export function isEmptyHtml(html: string | null | undefined): boolean {
  if (!html) return true;
  const stripped = html
    .replace(/<br\s*\/?>(?=\s*<\/p>|\s*$)/gi, '')
    .replace(/<p>\s*<\/p>/gi, '')
    .replace(/<[^>]+>/g, '')
    .trim();
  return stripped.length === 0;
}
```

Whitelist cobre os atributos que o BlockNote serializa (capturados na auditoria DOM: `data-content-type`, `data-node-type`, `data-id`, classes `bn-*`).

**1.4 — DTO de resposta** ([task-type-template-response.dto.ts:89-180](../../mundial-erp-api/src/modules/task-type-templates/dtos/task-type-template-response.dto.ts))

- Remover `defaultDescriptionBlocks` (linhas 105-112) e `parseRecord` se ficar sem uso.
- Adicionar:
  ```ts
  @ApiProperty()
  hasDescription!: boolean;

  @ApiPropertyOptional({ nullable: true })
  defaultDescriptionHtml!: string | null;
  ```
- `fromEntity` (linhas 129-178): trocar `entity.defaultDescriptionBlocks: unknown` por `hasDescription: boolean; defaultDescriptionHtml: string | null` e atribuir direto.

**1.5 — Repository** ([task-type-templates.repository.ts:13-35,78-107,135-164](../../mundial-erp-api/src/modules/task-type-templates/task-type-templates.repository.ts))

- Interface `TaskTypeTemplateWithFields`: trocar `defaultDescriptionBlocks: Prisma.JsonValue | null` por `hasDescription: boolean; defaultDescriptionHtml: string | null`.
- Ajustar os 2 blocos `select` consistentemente.

**1.6 — Service: novo helper + remover legados** ([tasks.service.ts](../../mundial-erp-api/src/modules/tasks/tasks.service.ts))

Adicionar:
```ts
private async resolveDescriptionWithTemplate(
  tx: Prisma.TransactionClient,
  clientHtml: string | undefined,
  customTypeId: string | undefined,
  workspaceId: string,
): Promise<string | null> {
  const clean = sanitizeDescriptionHtml(clientHtml);

  if (!customTypeId) {
    if (clean) {
      throw new UnprocessableEntityException(
        'Apenas tasks com tipo (Bug/Feature/Otimização) podem ter descrição',
      );
    }
    return null;
  }

  if (!this.taskTypeTemplatesRepository) return clean;

  const template = await this.taskTypeTemplatesRepository.findByCustomTaskTypeId(
    customTypeId, workspaceId,
  );

  const allowed = template?.hasDescription === true;

  if (!allowed && clean) {
    throw new UnprocessableEntityException(
      `Tipo ${customTypeId} não comporta descrição`,
    );
  }

  if (allowed && !clean && template?.defaultDescriptionHtml) {
    return sanitizeDescriptionHtml(template.defaultDescriptionHtml);
  }

  return allowed ? clean : null;
}
```

No `create` (linhas 200-260), substituir bloco da chamada antiga por:
```ts
const resolvedDescription = await this.resolveDescriptionWithTemplate(
  tx, dto.description, customTypeId ?? undefined, workspaceId,
);
const created = await this.repository.createTask(tx, {
  listId, title,
  description: resolvedDescription,
  markdownContent: null,
  ...
});
```

No método de update (grep `update` no service): chamar `resolveDescriptionWithTemplate` antes do `repository.update` quando `description` estiver no body.

Remover:
- `resolveMarkdownContentWithTemplate` (linhas 1594-1649)
- `isEmptyMarkdown` (linhas 1670-1697)
- Imports não usados e referências a `markdownContent` no `createTask` (linha 221).

**1.7 — Limpeza de débito**

- Remover flag `FEATURE_TASK_TYPE_TEMPLATES_ENABLED` (grep pra confirmar caller). Guard [task-type-templates.guard.ts](../../mundial-erp-api/src/modules/task-type-templates/task-type-templates.guard.ts) sai junto se nada mais usar.
- **NÃO** remover `WorkItem.markdownContent` agora — memória `project_erp_workitem_deprecation` cobre.
- **NÃO** criar templates pros 5 tipos sem descrição — sem template, hook retorna null e gate falha (comportamento desejado).

**1.8 — Testes**

[task-type-templates.service.spec.ts:80,142](../../mundial-erp-api/src/modules/task-type-templates/task-type-templates.service.spec.ts) — trocar `defaultDescriptionBlocks: null` por `hasDescription: false, defaultDescriptionHtml: null` nas fixtures.

Adicionar em [tasks.service.spec](../../mundial-erp-api/src/modules/tasks/tasks.service.spec.ts):
- `create com description em tipo hasDescription:false retorna 422`
- `create sem description em tipo com defaultDescriptionHtml aplica default`
- `create com <script>alert(1)</script><p>ok</p> é sanitizado pra <p>ok</p>`
- `update tentando setar description em tipo bloqueado retorna 422`
- `description vazia ("<p></p>") em tipo allowed grava NULL no banco`

### DoD (Definition of Done)

- [ ] `npx prisma db push` em dev sem erro; `\d task_type_templates` mostra colunas novas.
- [ ] `npm test` no mundial-erp-api: 100% verde, incluindo 5 testes novos.
- [ ] `curl GET /api/v1/task-type-templates/cmppxu9h1004901qq8nwbwpo1` retorna `{"hasDescription": false, "defaultDescriptionHtml": null, ...}` (ainda false porque seed do Sprint 3 não rodou).
- [ ] `curl PUT /api/v1/tasks/<task-id-bug> -d '{"description":"<p>x</p>"}'` retorna 422 (tipo ainda sem `hasDescription:true`).
- [ ] Lint zero warnings (`npm run lint`); memória `project_erp_ci_lint_formatacao`.
- [ ] PR descrita com link pra este plano. Code review aprovado.
- [ ] Merge → Coolify deploya → schema em prod atualizado (ainda nenhuma task mostra editor: gate default false).

### Riscos

| Risco | Mitigação |
|-------|-----------|
| Drop de `default_description_blocks` em prod com dados existentes | Sprint 1 DoR exige verificar `count(*)` antes; se >0, faz script JSON→HTML antes do drop |
| `tasks.service.ts` é gigante (1700+ linhas) e remover helpers pode ferir outro caller | Grep `resolveMarkdownContentWithTemplate` e `isEmptyMarkdown` antes do delete; só remover se único caller for o `create` |
| `sanitize-html` pode descascar atributos que o BlockNote depende | Teste 1.8.3 cobre; se HTML capturado do BlockNote sair quebrado, ampliar `allowedAttributes` antes do merge |

---

## Sprint 2 — Frontend (editor BlockNote + gates)

> **Objetivo:** Editor BlockNote ativo no drawer e no create-dialog **apenas** quando `template.hasDescription === true`. UI fica idêntica pra tipos sem descrição. Como gate de prod ainda está false (seed só roda no Sprint 3), o editor não aparece em lugar nenhum por enquanto — perfeito pra dar merge sem visibilidade.

### DoR

- [ ] Sprint 1 mergeada e em prod (schema com colunas novas, DTO expondo `hasDescription`/`defaultDescriptionHtml`).
- [ ] Hook `useTaskTypeTemplate` confirmado retornando o tipo novo do backend.

### Tasks técnicas

**2.1 — Tipo do hook** ([use-task-type-template.ts:56-64](../../mundial-erp-web/src/features/tasks/hooks/use-task-type-template.ts))

```ts
export interface TaskTypeTemplate {
  id: string;
  customTaskTypeId: string;
  attachmentCategories: TaskTypeTemplateAttachmentCategory[] | null;
  hasDescription: boolean;
  defaultDescriptionHtml: string | null;
  fields: TaskTypeTemplateField[];
  createdAt: string;
  updatedAt: string;
}
```

Remover `defaultDescriptionBlocks` da interface.

**2.2 — Componente editor** — novo arquivo [task-description-editor.tsx](../../mundial-erp-web/src/features/tasks/components/task-view/task-description-editor.tsx):

```tsx
'use client';
import { useEffect, useRef } from 'react';
import { useCreateBlockNote } from '@blocknote/react';
import { BlockNoteView } from '@blocknote/mantine';
import { useDebouncedCallback } from 'use-debounce';
import '@blocknote/mantine/style.css';
import type { TaskDescriptionProps } from './task-description';

export default function TaskDescriptionEditor({ value, onChange, readOnly, 'aria-label': ariaLabel }: TaskDescriptionProps) {
  const editor = useCreateBlockNote();
  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;
    (async () => {
      const blocks = value
        ? await editor.tryParseHTMLToBlocks(value)
        : [{ type: 'paragraph' as const }];
      editor.replaceBlocks(editor.document, blocks);
    })();
  }, [editor, value]);

  const persist = useDebouncedCallback(async () => {
    if (!onChange) return;
    const html = await editor.blocksToHTMLLossy(editor.document);
    onChange(html);
  }, 300);

  return (
    <div className='rounded-lg border border-stroke-soft-200 bg-bg-white-0 px-3 py-2'>
      <BlockNoteView
        editor={editor}
        editable={!readOnly}
        onChange={persist}
        aria-label={ariaLabel}
      />
    </div>
  );
}
```

`use-debounce` já está no projeto (confirmar com grep). 300ms espelha o TODO original do Sprint 5.

**2.3 — Wrapper dynamic + Fallback** ([task-description.tsx](../../mundial-erp-web/src/features/tasks/components/task-view/task-description.tsx)) — substituir o conteúdo mantendo `TaskDescriptionProps`:

```tsx
'use client';
import dynamic from 'next/dynamic';

export type TaskDescriptionProps = {
  value: string;
  onChange?: (next: string) => void;
  readOnly?: boolean;
  'aria-label'?: string;
};

function Fallback({ value }: TaskDescriptionProps) {
  return (
    <div className='text-paragraph-sm prose max-w-none text-text-sub-600'
         dangerouslySetInnerHTML={{ __html: value || '<p><em>Sem descrição.</em></p>' }} />
  );
}

const Editor = dynamic(() => import('./task-description-editor'), {
  ssr: false,
  loading: () => <div className='text-paragraph-xs animate-pulse text-text-soft-400'>Carregando editor...</div>,
});

export function TaskDescription(props: TaskDescriptionProps) {
  return (
    <>
      <noscript><Fallback {...props} /></noscript>
      <Editor {...props} />
    </>
  );
}
```

`dynamic({ ssr: false })` mantém o "lazy ~180kb" da regra CTO note #4 do PLANO-TASKS.

**2.4 — Gate no task-view** ([task-view.tsx:182-191](../../mundial-erp-web/src/features/tasks/components/task-view/task-view.tsx))

```tsx
const { data: typeTemplate } = useTaskTypeTemplate(
  task.customType?.id ?? null,
  workspaceId,
);

{typeTemplate?.hasDescription === true && (
  <TaskDescription
    value={task.description ?? ''}
    aria-label='Descrição da tarefa'
    onChange={(html) =>
      updateTask.mutate({
        taskId: task.id,
        payload: { description: html },
      })
    }
  />
)}
```

**Importante:** remover `markdownContent: next` da mutation (era duplicação morta — só `description` agora).

**Edge case 1**: task tem `description` legada mas tipo é `hasDescription:false` → editor escondido, dado intocado.

**Edge case 2**: task sem `customType` → hook não dispara, gate falha → escondido.

**2.5 — Gate no create-dialog** ([create-task-dialog.tsx:486-520](../../mundial-erp-web/src/features/tasks/components/create-task-dialog.tsx))

Substituir o `<textarea>` por:

```tsx
{typeTemplate?.hasDescription === true && (
  <div className='space-y-1.5'>
    <label className='text-label-sm text-text-strong-950'>
      Descrição <span className='text-text-soft-400'>(opcional)</span>
    </label>
    <Controller
      control={control}
      name='description'
      render={({ field }) => (
        <TaskDescription
          value={field.value ?? ''}
          onChange={field.onChange}
          aria-label='Descrição da nova tarefa'
        />
      )}
    />
    {errors.description && (
      <p className='text-paragraph-xs text-error-base'>{errors.description.message}</p>
    )}
  </div>
)}
```

Trocar `register('description')` por `Controller` (BlockNote não casa com refs DOM diretos).

**2.6 — Atualizar preview do template** ([create-task-dialog.tsx:786-820](../../mundial-erp-web/src/features/tasks/components/create-task-dialog.tsx))

Trocar `hasDefaultDescription = Boolean(template.defaultDescriptionBlocks)` por:
```ts
const hasDefaultDescription = template.hasDescription === true && Boolean(template.defaultDescriptionHtml);
```

Texto "Descrição padrão será aplicada" continua igual.

**2.7 — Preview seguro em list view** — novo helper [mundial-erp-web/src/features/tasks/utils/description-preview.ts](../../mundial-erp-web/src/features/tasks/utils/description-preview.ts):

```ts
export function descriptionPreview(html: string | null | undefined, max = 120): string {
  if (!html) return '';
  return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max);
}
```

Aplicar em todos os lugares que hoje renderizam `task.description` direto (grep `task\.description` no front; provavelmente list view e kanban card). Nunca `dangerouslySetInnerHTML` fora do drawer.

### DoD

- [ ] `npm run dev` em mundial-erp-web (porta 3001) sem erro.
- [ ] Abrir task de qualquer tipo: editor **não** aparece (gate default false em prod ainda).
- [ ] Storybook (se houver story de `TaskDescription`) renderiza editor com mock `hasDescription:true`.
- [ ] DevTools Network: bundle do BlockNote só carrega quando editor é montado (lazy split).
- [ ] Lint zero warnings.
- [ ] PR descrita. Code review aprovado. Merge → Coolify deploya.

### Riscos

| Risco | Mitigação |
|-------|-----------|
| BlockNote @0.48.1 quebrar SSR mesmo com `dynamic` | `noscript` Fallback cobre; sanity test em Lighthouse após merge |
| `tryParseHTMLToBlocks` perder formatação ao roundtrip | Smoke local: digitar conteúdo com headings/listas, salvar, F5, conferir se voltou idêntico |
| `Controller` do RHF não casar com BlockNote API | Documentação BlockNote tem exemplo com RHF; se falhar, fallback é `useEffect` com `setValue` manual |

---

## Sprint 3 — Rollout em produção

> **Objetivo:** Ativar os 3 tipos (Bug, Feature, Otimização) em prod, invalidar cache, validar visualmente. Após este sprint o editor está vivo pros usuários do Mundial Telhas.

### DoR

- [ ] Sprint 2 mergeada e Coolify finalizou deploy.
- [ ] Acesso SSH ao VPS confirmado.
- [ ] Workspace ID do `mundial-telhas` em mãos (via `mcp__mundial-erp__erp_me` ou `SELECT id FROM workspaces WHERE slug='mundial-telhas'`).

### Tasks técnicas

**3.1 — Seed script** — novo arquivo [mundial-erp-api/prisma/seed-task-types-descricao.ts](../../mundial-erp-api/prisma/seed-task-types-descricao.ts) (modelo: [seed-enable-cf-write.ts](../../mundial-erp-api/prisma/seed-enable-cf-write.ts)):

```ts
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const TYPE_IDS = [
  { id: 'cmppxu9h1004901qq8nwbwpo1', nome: 'Bug' },
  { id: 'cmppxyry7004b01qqhrwrlxzp', nome: 'Feature' },
  { id: 'cmpt5pq1x000u01qe76q1vvdx', nome: 'Otimização' },
];

const DEFAULT_HTML = '<p></p>';

async function main() {
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
  const prisma = new PrismaClient({ adapter });

  for (const tipo of TYPE_IDS) {
    const tt = await prisma.customTaskType.findUnique({ where: { id: tipo.id } });
    if (!tt) {
      console.log(`SKIP ${tipo.nome}: tipo ${tipo.id} não existe`);
      continue;
    }
    const template = await prisma.taskTypeTemplate.upsert({
      where: { customTaskTypeId: tipo.id },
      update: { hasDescription: true, defaultDescriptionHtml: DEFAULT_HTML },
      create: {
        customTaskTypeId: tipo.id,
        hasDescription: true,
        defaultDescriptionHtml: DEFAULT_HTML,
      },
    });
    console.log(`OK ${tipo.nome} (${tipo.id}) template=${template.id} hasDescription=true`);
  }

  await prisma.$disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });
```

Idempotente (`upsert` por `customTaskTypeId` unique).

**3.2 — Smoke local do seed**

```bash
cd mundial-erp-api
DATABASE_URL='postgres://...@localhost:5435/mundial_erp' npx tsx prisma/seed-task-types-descricao.ts
```

Esperado: 3 linhas `OK ...`. Rodar de novo: mesmas 3 linhas (upsert).

**3.3 — Rodar seed em prod** (SSH → docker exec — memória `project_erp_deploy_db_push_limitacao`)

```bash
ssh root@<vps>
docker ps | grep mundial-erp-api      # pegar container id
docker exec -it <container-id> npx tsx prisma/seed-task-types-descricao.ts
```

**3.4 — Invalidar cache Redis** (TTL 300s; sem isso front pode levar até 5min pra ver)

```bash
docker exec -it <container-id> sh -c "
  redis-cli -h \$REDIS_HOST -p \$REDIS_PORT DEL \
    'task-type-template:cmppxu9h1004901qq8nwbwpo1:<workspace-id>' \
    'task-type-template:cmppxyry7004b01qqhrwrlxzp:<workspace-id>' \
    'task-type-template:cmpt5pq1x000u01qe76q1vvdx:<workspace-id>'
"
```

Substituir `<workspace-id>` pelo ID real do `mundial-telhas`.

**3.5 — Validação visual em prod**

| Tipo | Esperado |
|------|----------|
| Bug | Editor BlockNote aparece no drawer e no create dialog |
| Feature | Editor aparece |
| Otimização | Editor aparece |
| Cliente | Sem editor (campo invisível) |
| Pedido | Sem editor |
| Cola | Sem editor |
| Bloco EPS | Sem editor |
| Bobina | Sem editor |

Criar 1 task de teste em cada um dos 3 com descrição rica (heading, lista, link). Recarregar (F5) e conferir que voltou exatamente.

**3.6 — Comparativo Hoppe x ERP** (paridade visual)

Abrir mesma task de teste em Hoppe e ERP lado a lado, capturar `PUT /tasks/{id}` em ambos via DevTools. Esperado: ambos enviam `{"description":"<p>...</p>"}` com estrutura HTML similar (mesmas tags, atributos parecidos).

### DoD

- [ ] Seed rodou em prod sem erro (3 linhas `OK`).
- [ ] Cache Redis invalidado (3 chaves DEL retornaram 1).
- [ ] Validação visual da matriz §3.5 100% verde.
- [ ] Paridade Hoppe confirmada (§3.6).
- [ ] Métricas (Datadog/Loki — `reference_standards_*`): zero 500 novo em `/api/v1/tasks/*`, latência p95 estável.
- [ ] Demo rápido pro time (Samuel + 1 user) com criação de bug real.

### Rollback

Se algo der errado em prod (regressão crítica, render quebrado, etc):

```bash
# Reverter via UPDATE direto (rápido, sem deploy)
docker exec -it <container-id> psql -h $DB_HOST -U $DB_USER -d $DB_NAME -c "
  UPDATE task_type_templates SET has_description = false
  WHERE custom_task_type_id IN (
    'cmppxu9h1004901qq8nwbwpo1',
    'cmppxyry7004b01qqhrwrlxzp',
    'cmpt5pq1x000u01qe76q1vvdx'
  );
"
# Invalidar cache de novo (§3.4)
```

Editor some, schema intacto, descriptions já gravadas ficam no banco (intocadas). Zero perda de dado.

### Riscos

| Risco | Mitigação |
|-------|-----------|
| Container API restartar entre seed e invalidate (cache em memória sobe limpo, Redis fica stale) | Rodar invalidate **depois** que `docker ps` mostrar container estável (sem restarting) |
| IDs dos 3 tipos terem mudado entre o plano e o deploy | Re-rodar `mcp__mundial-erp__erp_task_types_list` antes do seed; se ID mudou, editar `TYPE_IDS` no script |
| Render quebrado em mobile (BlockNote tem bugs conhecidos em Safari iOS) | Validação §3.5 inclui smoke mobile (iOS Safari + Android Chrome) |

---

## Critical files (consolidado)

**Backend (Sprint 1):**
- [mundial-erp-api/prisma/schema.prisma:3224-3238](../../mundial-erp-api/prisma/schema.prisma) — `TaskTypeTemplate` ganha `hasDescription` / `defaultDescriptionHtml`, perde `defaultDescriptionBlocks`.
- [mundial-erp-api/src/modules/tasks/description-html.util.ts](../../mundial-erp-api/src/modules/tasks/description-html.util.ts) — **novo**, sanitização.
- [mundial-erp-api/src/modules/tasks/tasks.service.ts:200-260,1594-1697](../../mundial-erp-api/src/modules/tasks/tasks.service.ts) — novo `resolveDescriptionWithTemplate`; remove métodos legados.
- [mundial-erp-api/src/modules/task-type-templates/task-type-templates.repository.ts](../../mundial-erp-api/src/modules/task-type-templates/task-type-templates.repository.ts) — interface + 2 `select`s.
- [mundial-erp-api/src/modules/task-type-templates/dtos/task-type-template-response.dto.ts:89-180](../../mundial-erp-api/src/modules/task-type-templates/dtos/task-type-template-response.dto.ts) — DTO com 2 campos novos.
- [mundial-erp-api/src/modules/task-type-templates/task-type-templates.service.spec.ts:80,142](../../mundial-erp-api/src/modules/task-type-templates/task-type-templates.service.spec.ts) — fixtures.
- `mundial-erp-api/package.json` — `sanitize-html ^2.13.0` e `@types/sanitize-html ^2.13.0`.

**Frontend (Sprint 2):**
- [mundial-erp-web/src/features/tasks/components/task-view/task-description.tsx](../../mundial-erp-web/src/features/tasks/components/task-view/task-description.tsx) — wrapper Fallback + dynamic.
- [mundial-erp-web/src/features/tasks/components/task-view/task-description-editor.tsx](../../mundial-erp-web/src/features/tasks/components/task-view/task-description-editor.tsx) — **novo**, editor BlockNote.
- [mundial-erp-web/src/features/tasks/components/task-view/task-view.tsx:182-191](../../mundial-erp-web/src/features/tasks/components/task-view/task-view.tsx) — gate + remove duplicação `markdownContent`.
- [mundial-erp-web/src/features/tasks/components/create-task-dialog.tsx:486-520,786-820](../../mundial-erp-web/src/features/tasks/components/create-task-dialog.tsx) — substitui textarea + atualiza preview.
- [mundial-erp-web/src/features/tasks/hooks/use-task-type-template.ts:56-64](../../mundial-erp-web/src/features/tasks/hooks/use-task-type-template.ts) — tipo `TaskTypeTemplate`.
- [mundial-erp-web/src/features/tasks/utils/description-preview.ts](../../mundial-erp-web/src/features/tasks/utils/description-preview.ts) — **novo**, preview seguro.

**Rollout (Sprint 3):**
- [mundial-erp-api/prisma/seed-task-types-descricao.ts](../../mundial-erp-api/prisma/seed-task-types-descricao.ts) — **novo**, upsert dos 3 templates.

---

## Métricas de sucesso (pós-Sprint 3)

| Métrica | Alvo |
|---------|------|
| Tasks criadas nos 3 tipos com descrição preenchida | ≥ 30% nos primeiros 14 dias |
| 500s em `/api/v1/tasks/*` | Zero novo |
| Latência p95 do PUT `/tasks/:id` | Sem regressão > 50ms |
| Bundle initial do `/task/:id` no front | Sem aumento (BlockNote é lazy) |
| Feedback do time interno | Aprovação positiva em demo |

---

## Quem faz o quê

- **Samuel** (PO): valida demo de cada sprint, autoriza rollout do Sprint 3.
- **Mascos** (executor): implementa Sprints 1-3 e roda smoke testing.
- **Code reviewer** (quem estiver disponível): aprova PRs dos Sprints 1 e 2.
