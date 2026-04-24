# E2E web — Tasks feature

## Escopo

Cobre a jornada integral do usuario na Task View (PLANO-TASKS §10, §14.2):
criar -> assign -> checklist -> comment -> status change -> archive.

## Stack

- **Playwright** (`@playwright/test`) — browser automation.
- **axe-core** (`@axe-core/playwright`) — checagem WCAG AA em cada passo.
- **Lighthouse CI** (`@lhci/cli`) — performance + a11y budget bloqueante.

## Pre-requisitos

1. Dependencias declaradas em `package.json` (Sprint 0) — instalar na
   primeira pipeline que habilitar este gate: `npm install`.
2. Backend rodando em `http://localhost:3001`.
3. Frontend rodando em `http://localhost:3000` (ou override
   `PLAYWRIGHT_BASE_URL`).
4. Seed de dados `npm run seed:demo` aplicado.

## Como rodar

### Playwright — todos os testes habilitados

```bash
npx playwright install --with-deps
npx playwright test
```

### Playwright — filtrar um spec

```bash
npx playwright test e2e/tasks-journey.spec.ts
```

### Modo debug (inspector)

```bash
PWDEBUG=1 npx playwright test
```

### Lighthouse CI

```bash
# local
npm run build && npm run start &
npx lhci autorun --config=.lighthouserc.json

# CI
npx lhci autorun
```

## Arquivos marcados `.skip`

Arquivos com sufixo `.spec.ts.skip` sao placeholders do Sprint 0. Nao rodam
porque `testMatch: /.*\.spec\.ts$/` no `playwright.config.ts` nao captura.
Para habilitar:

1. Confirmar que a feature cobrindo a story esta em staging.
2. Renomear `*.spec.ts.skip` para `*.spec.ts`.
3. Remover `describe.skip` / `test.skip` interno e implementar as asserts.
4. Rodar `npx playwright test` para validar.

## a11y — `checkA11y`

`e2e/a11y-helpers.ts` expoe `checkA11y(page, opts)`. Por default falha em
`critical` + `serious` (WCAG AA). Para strict mode (inclui `moderate`):
`checkA11y(page, { strict: true })`.

## Snapshots visuais

TODO Sprint 5 — integrar com Chromatic (`@chromatic-com/playwright`).
Placeholder `TODO Chromatic snapshot` no spec indica os pontos previstos.

## Lighthouse budgets

| Categoria     | Min score    |
| ------------- | ------------ |
| Performance   | 0.85 (error) |
| Accessibility | 0.95 (error) |

| Recurso         | Max           |
| --------------- | ------------- |
| Script bundle   | 450 KB (error) |

Override de URL por ambiente via env `LHCI_BUILD_CONTEXT__CURRENT_BRANCH`.
