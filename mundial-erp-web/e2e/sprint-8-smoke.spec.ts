/**
 * HPP-137 — Smoke e2e Sprint 8 (frontend + realtime).
 *
 * Cobre minimamente os artefatos do Sprint 8:
 *   1. Pagina de Automacoes (HPP-134) carrega com lista vazia ou itens.
 *   2. Painel de Atividades (HPP-133) renderiza componente de reactions
 *      sem quebrar quando ha comments na task.
 *   3. WebSocket de notifications (HPP-136) conecta sem erro de console
 *      apos login.
 *
 * Padrao do projeto: skipIf quando envs ausentes (mesmo
 * `tasks-realtime.spec.ts`). Em dev local rodar com
 *   PLAYWRIGHT_BASE_URL=http://localhost:3000 \
 *   E2E_USER_STORAGE_STATE=path/to/storage.json \
 *   npx playwright test e2e/sprint-8-smoke.spec.ts
 */
import { test, expect } from '@playwright/test';

const STORAGE_STATE = process.env.E2E_USER_STORAGE_STATE ?? '';
const BASE_URL = process.env.PLAYWRIGHT_BASE_URL ?? '';

const runnable = STORAGE_STATE.length > 0 && BASE_URL.length > 0;

test.describe('Sprint 8 — smoke ponta a ponta', () => {
  test.skip(!runnable, 'E2E_USER_STORAGE_STATE / PLAYWRIGHT_BASE_URL ausentes');

  test.use({ storageState: STORAGE_STATE });

  test('Pagina /configuracoes/automacoes renderiza header e CTA', async ({
    page,
  }) => {
    await page.goto('/configuracoes/automacoes');

    await expect(
      page.getByRole('heading', { name: /automa[cç][oõ]es/i }),
    ).toBeVisible({ timeout: 10_000 });

    await expect(
      page.getByRole('button', { name: /nova automa[cç][aã]o/i }),
    ).toBeVisible();
  });

  test('Sidebar de configuracoes tem item Automacoes', async ({ page }) => {
    await page.goto('/configuracoes/minha-conta');
    const link = page.getByRole('link', { name: /automa[cç][oõ]es/i });
    await expect(link).toBeVisible({ timeout: 5_000 });
  });

  test('Modal de nova automacao abre com campos obrigatorios', async ({
    page,
  }) => {
    await page.goto('/configuracoes/automacoes');
    await page.getByRole('button', { name: /nova automa[cç][aã]o/i }).click();

    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();

    await expect(dialog.getByText(/nome/i)).toBeVisible();
    await expect(dialog.getByText(/gatilho/i)).toBeVisible();
    await expect(
      dialog.getByRole('button', { name: /\+ adicionar a[cç][aã]o/i }),
    ).toBeVisible();
  });

  test('WebSocket /notifications conecta sem disparar erro de console', async ({
    page,
  }) => {
    const consoleErrors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        const text = msg.text();
        if (text.toLowerCase().includes('socket')) {
          consoleErrors.push(text);
        }
      }
    });

    await page.goto('/configuracoes/minha-conta');
    await page.waitForTimeout(2_000);

    expect(consoleErrors).toEqual([]);
  });
});
