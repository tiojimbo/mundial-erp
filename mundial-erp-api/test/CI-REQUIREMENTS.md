# CI Requirements — Tasks feature (v3)

Gates obrigatorios para qualquer PR que toque
`src/modules/(tasks|work-items|task-*|custom-task-types|task-outbox)`. Esta
lista consolida liccoes aprendidas (`ci-cd-gotchas` na memoria do agente) e
os compromissos da Sprint 0/1/2.

## Ordem dos jobs

### 1. `prisma generate` ANTES do lint

Lesson learned: ESLint quebra com erros de tipo vindos de `@prisma/client`
se o cliente nao for gerado antes. Sempre:

```yaml
- run: npx prisma generate
- run: npm run lint
```

### 2. `db push` no CI (nunca `migrate dev`)

Shadow DB nao esta disponivel no runner. Use:

```yaml
- run: npx prisma db push --skip-generate
```

Ja sem a flag `--skip-generate`? Ela foi removida no Prisma 7.x — ver commit
`c8e94a4` no historico.

### 3. Lint + Typecheck + Unit (cobertura minima)

```yaml
- run: npm run lint
- run: npx tsc --noEmit -p tsconfig.json
- run: npm test -- --coverage
```

Thresholds (obrigatorios apos Sprint 1):

| Escopo                          | Min coverage |
| ------------------------------- | ------------ |
| Global                          | 80%          |
| Services novos em `modules/tasks` | 90%        |
| Services em `task-*` (tags, attachments, comments, checklists, watchers) | 85% |

Setar em `jest.config`/`package.json`:

```json
"coverageThreshold": {
  "global": { "lines": 80 },
  "src/modules/tasks/**/*.service.ts": { "lines": 90 },
  "src/modules/task-*/**/*.service.ts": { "lines": 85 }
}
```

### 4. E2E (apos migration)

```yaml
- run: npx prisma db push
- run: npm run test:e2e
- run: bash scripts/regression-check.sh
```

`regression-check.sh` bloqueia merge se orders / production-orders /
financial-summary / invoices / bpm / work-items quebrarem (R9).

### 5. Performance k6 (smoke em CI, full noturno)

```yaml
# CI smoke — 100 tasks fixture, thresholds relaxados
- run: |
    k6 run test/perf/tasks.k6.js \
      --env FIXTURE_SIZE=100 \
      --duration 1m \
      --vus 10
```

Full 50k fixture roda em job `schedule: nightly` no runner dedicado (nao
bloqueia PRs), mas alerta em Slack se p95 violar.

Cenarios k6 ativos (v3):

| Cenario            | CI smoke | Nightly |
| ------------------ | -------- | ------- |
| steady_10rps       | required | required |
| search_fulltext    | skip     | required |
| comments_burst     | skip     | required |

### 6. Lighthouse CI (web — bloqueante)

```yaml
- run: npm run build
- run: npx lhci autorun --config=.lighthouserc.json
```

Categorias: performance >= 0.85, accessibility >= 0.95, script bundle <= 450 KB.

### 7. axe-core zero violacoes criticas/graves

```yaml
- run: npx playwright install --with-deps
- run: npx playwright test
```

Helper `checkA11y` em `mundial-erp-web/e2e/a11y-helpers.ts` falha em
`critical` + `serious` (WCAG AA default). Violacoes `moderate` sao log.

### 8. Cross-tenant audit (NOVO v3)

Qualquer PR que **crie endpoint novo** em modulos Tasks
(`task-*`, `custom-task-types`, `tasks`, `work-items`) DEVE rodar auditoria
automatica:

```yaml
- run: bash scripts/cross-tenant-audit.sh
```

O script:
1. Enumera endpoints novos via `git diff --name-only main | grep controller.ts`.
2. Para cada endpoint, valida que o spec e2e correspondente inclui um
   caso `cross-tenant → 404` (grep no arquivo).
3. Falha o CI se endpoint novo nao tem teste cross-tenant.

Escape hatch: adicionar annotation `@cross-tenant-audit-skip` com
justificativa (ex.: endpoint publico sem workspace). Revisor de PR valida.

### 9. Custom lint rules Tasks (NOVO v3, blocking)

Tres lint rules custom sao BLOCKING no CI:

| Rule                                      | Razao                                                 |
| ----------------------------------------- | ----------------------------------------------------- |
| `no-direct-primary-assignee-cache-write`  | ADR-001: campo deve ser atualizado apenas via Prisma extension |
| `no-direct-activity-write`                | ADR-activities: TaskActivity e read model (projecao outbox) |
| `no-direct-event-emitter-in-hot-path`     | PLANO §11: hot paths devem usar outbox, nunca EventEmitter direto |

Configurar em `.eslintrc.js`:

```js
rules: {
  'tasks/no-direct-primary-assignee-cache-write': 'error',
  'tasks/no-direct-activity-write': 'error',
  'tasks/no-direct-event-emitter-in-hot-path': 'error',
}
```

Plugin vive em `tools/eslint-plugin-tasks/` (Lucas, Sprint 1 FU).

## Matriz de enforcement

| Gate                              | PR         | Nightly   | Release   |
| --------------------------------- | ---------- | --------- | --------- |
| prisma generate                   | required   | required  | required  |
| lint + typecheck                  | required   | required  | required  |
| custom tasks lint rules           | required   | required  | required  |
| unit + coverage                   | required   | required  | required  |
| E2E + regression-check            | required   | required  | required  |
| cross-tenant audit                | required   | required  | required  |
| k6 smoke                          | required   | skip      | required  |
| k6 full 50k (todos cenarios)      | skip       | required  | required  |
| Lighthouse CI                     | required   | required  | required  |
| Playwright + axe                  | required   | required  | required  |

## Como lidar com quebra de regressao

1. Nao adicione `it.skip` no spec legado para "desbloquear" — investigue.
2. Confirme que seu PR nao alterou schemas compartilhados (WorkItem,
   Process) sem manter nullabilidade (PLANO §15: additive-only).
3. Se o spec legado esta errado e precisa atualizar, abra PR separado no
   mesmo branch base, com review de owner do modulo afetado.
4. Em ultimo caso: revert commit ofensivo e re-plan em refinement.

## Quem mantem

QA (Tatiana) mantem esta lista. Proposta de mudanca entra como RFC em
`.claude/adr/`.

## Changelog

- v3 (2026-04-19): +cross-tenant audit gate, +3 custom lint rules blocking,
  +k6 scenarios search_fulltext/comments_burst, +coverage threshold
  task-*/85%.
- v2 (2026-04-18): initial coverage thresholds + regression-check.
- v1 (2026-04-15): gates basicos pos primeiro deploy.
