/**
 * Playwright — Activity Feed em Tempo Real (cross-tab).
 *
 * Caso: 2 contextos autenticados como mesmo user no mesmo workspace.
 * Ambos abertos em /tasks/[taskId]. Page A muda dueDate; Page B recebe
 * via SSE (hook `useTaskSse`) e o painel Atividades atualiza (≤5s).
 *
 * PRE-REQUISITOS (skipIf quando ausentes):
 *   - Dev server rodando (`pnpm dev` web + api).
 *   - Worker do outbox + endpoint SSE ativos.
 *   - E2E_TASK_ID + E2E_USER_STORAGE_STATE fornecidos via env para evitar
 *     dependencia de criacao de task dentro do teste (rota /tasks/:id
 *     nao tem helper de criacao na UI estavel ainda — test.describe.skip
 *     fallback).
 */
import { test, expect, type BrowserContext } from '@playwright/test';

const TASK_ID = process.env.E2E_TASK_ID ?? '';
const STORAGE_STATE = process.env.E2E_USER_STORAGE_STATE ?? '';

// Usa describe.skip quando a infra nao esta pronta — evita noise no CI
// sem pipeline de task prebuilt.
const runnable = TASK_ID.length > 0 && STORAGE_STATE.length > 0;

test.describe('Activity Feed em tempo real (cross-tab)', () => {
  test.skip(!runnable, 'E2E_TASK_ID / E2E_USER_STORAGE_STATE ausentes');

  test('muda dueDate em Page A -> Page B ve no painel de Atividades ≤5s', async ({
    browser,
  }) => {
    let ctxA: BrowserContext | null = null;
    let ctxB: BrowserContext | null = null;

    try {
      ctxA = await browser.newContext({ storageState: STORAGE_STATE });
      ctxB = await browser.newContext({ storageState: STORAGE_STATE });

      const pageA = await ctxA.newPage();
      const pageB = await ctxB.newPage();

      await Promise.all([
        pageA.goto(`/tasks/${TASK_ID}`),
        pageB.goto(`/tasks/${TASK_ID}`),
      ]);

      // Ambas precisam abrir o painel de Atividades (gate do SSE — §205 do plano).
      for (const page of [pageA, pageB]) {
        const panelTrigger = page
          .getByRole('tab', { name: /atividades/i })
          .or(page.getByRole('button', { name: /atividades/i }));
        if (await panelTrigger.first().isVisible().catch(() => false)) {
          await panelTrigger.first().click();
        }
      }

      // Feed eh a regiao role=log (§13 a11y).
      const feedB = pageB
        .getByRole('log')
        .or(pageB.getByRole('region', { name: /atividades/i }));
      await expect(feedB.first()).toBeVisible({ timeout: 10_000 });

      // Page A altera dueDate via popover/datepicker. Seletores defensivos —
      // tolerantes a variacao de label.
      const dueTrigger = pageA
        .getByRole('button', { name: /data de entrega|due date/i })
        .or(pageA.getByLabel(/data de entrega|due date/i));
      await dueTrigger.first().click();

      const dateInput = pageA.getByRole('textbox', {
        name: /data|date/i,
      });
      if (await dateInput.first().isVisible().catch(() => false)) {
        await dateInput.first().fill('2026-07-20');
        await dateInput.first().press('Enter');
      } else {
        // fallback: calendar picker — click em dia 20 visivel
        const dayCell = pageA.getByRole('button', { name: /20/ });
        await dayCell.first().click();
      }

      // Confirmar mudanca (se houver botao Save)
      const saveBtn = pageA.getByRole('button', { name: /salvar|save/i });
      if (await saveBtn.first().isVisible().catch(() => false)) {
        await saveBtn.first().click();
      }

      // Assert em Page B: texto do formatter PT-BR (§199 do plano).
      const feedItem = pageB
        .getByText(/alterou a data de entrega/i)
        .or(pageB.getByText(/alterou a dueDate/i));
      await expect(feedItem.first()).toBeVisible({ timeout: 5_000 });
    } finally {
      await ctxA?.close();
      await ctxB?.close();
    }
  });
});
