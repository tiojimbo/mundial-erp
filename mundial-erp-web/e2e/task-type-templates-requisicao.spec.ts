/**
 * TTT-045 (Sprint 4) — Jornada e2e do CustomTaskType "Requisicao de Estoque".
 *
 * Foco: validacao condicional `requiredWhen` (PLANO-TASK-TYPES-TEMPLATES §"Edge
 * cases — DROPDOWN condicional"). A regra "se type=VENDA entao
 * linked_order_number e obrigatorio" e enforced *server-side* (422 com campo
 * + razao). O front exibe o hint do field — o asterisco visual condicional
 * pode existir conforme implementacao da Juliana B; usamos `aria-required`
 * + hint como sinais resilientes.
 *
 *   1. Login (storageState pre-fabricado).
 *   2. Criar Requisicao via modal (selecionar tipo "Requisicao de Estoque").
 *   3. Selecionar `type=VENDA` -> `linked_order_number` deve sinalizar
 *      obrigatoriedade (asterisco / aria-required / hint visivel).
 *   4. Salvar sem `linked_order_number` -> aguardar 422 + erro visivel
 *      mencionando o campo.
 *   5. Preencher `linked_order_number=ORD-12345` -> salvar -> 200.
 *   6. Trocar `type=INTERNO` -> `linked_order_number` sai do obrigatorio.
 *
 * PRE-REQUISITOS (skipIf quando ausentes): mesmos do spec irmao
 * (`task-type-templates-pedido.spec.ts`). Veja README de e2e.
 */
import { test, expect, type Locator, type Page } from '@playwright/test';

import { checkA11y } from './a11y-helpers';

const STORAGE_STATE = process.env.E2E_USER_STORAGE_STATE ?? '';
const PROCESS_ID = process.env.E2E_PROCESS_ID ?? '';
const BASE_URL = process.env.PLAYWRIGHT_BASE_URL ?? '';

const runnable =
  STORAGE_STATE.length > 0 && PROCESS_ID.length > 0 && BASE_URL.length > 0;

test.describe('CustomTaskType — Requisicao de Estoque (requiredWhen)', () => {
  test.skip(
    !runnable,
    'E2E_USER_STORAGE_STATE / E2E_PROCESS_ID / PLAYWRIGHT_BASE_URL ausentes',
  );

  test.use({ storageState: STORAGE_STATE });

  test('type=VENDA torna linked_order_number obrigatorio (422 -> 200 -> opcional)', async ({
    page,
  }) => {
    // -----------------------------------------------------------------------
    // 1-2. Abrir modal e criar Requisicao com titulo placeholder (linked
    //      vazio) -> backend resolve o customType e cria a task; a validacao
    //      `requiredWhen` so dispara ao tentar salvar `type=VENDA` sem
    //      linked_order_number.
    // -----------------------------------------------------------------------
    await page.goto(`/processes/${PROCESS_ID}`);

    const novaTarefaBtn = page.getByRole('button', { name: /nova tarefa/i });
    await expect(novaTarefaBtn.first()).toBeVisible({ timeout: 10_000 });
    await novaTarefaBtn.first().click();

    const dialog = page.getByRole('dialog', { name: /nova tarefa/i });
    await expect(dialog).toBeVisible();
    await checkA11y(page, { context: '[role="dialog"]' });

    const typeSelect = page.getByLabel(/tipo de tarefa/i);
    await expect(typeSelect).toBeVisible();
    await typeSelect.selectOption({ label: 'Requisicao de Estoque' });

    // Preview lazy ate aparecer (gate de carregamento do template).
    await expect(
      page.getByRole('region', {
        name: /resumo do template requisicao de estoque/i,
      }),
    ).toBeVisible({ timeout: 10_000 });

    await page
      .getByLabel(/titulo/i)
      .first()
      .fill('Requisicao Playwright Test');

    await Promise.all([
      page.waitForURL(/\/tasks\/[^/]+$/, { timeout: 15_000 }),
      page.getByRole('button', { name: /^criar$/i }).click(),
    ]);

    // -----------------------------------------------------------------------
    // 3. Selecionar `type=VENDA` -> linked_order_number sinaliza obrigatorio.
    // -----------------------------------------------------------------------
    const typeField = page.getByLabel(/^tipo$/i);
    await expect(typeField).toBeVisible({ timeout: 10_000 });

    // DropdownField renderiza um <select> nativo (vide
    // `dropdown-field.tsx`). `selectOption({ value })` casa com a chave
    // `VENDA` definida no seed.
    await typeField.selectOption({ value: 'VENDA' });

    const linkedField = page.getByLabel(/n[°o] do pedido vinculado/i);
    await expect(linkedField).toBeVisible();

    // Sinal de obrigatoriedade — toleramos 3 implementacoes possiveis (a
    // Juliana B ainda esta finalizando a UX condicional):
    //   (a) `aria-required="true"` no input;
    //   (b) asterisco vermelho no label associado;
    //   (c) hint "Obrigatorio se tipo = Venda" visivel.
    // Pelo menos UM dos sinais precisa estar presente.
    await expectRequiredSignal(page, linkedField, /pedido vinculado/i);

    // -----------------------------------------------------------------------
    // 4. Salvar sem linked_order_number -> esperar 422 com mensagem visivel.
    //
    // Nao ha botao "Salvar" global na Task View (PATCH e por field, debounced).
    // O 422 vem do PATCH do `type` (server-side cross-field validation
    // `requiredWhen`). Capturamos a response do PATCH para garantir o status.
    // -----------------------------------------------------------------------
    const errorResp = await page
      .waitForResponse(
        (resp) =>
          /\/custom-field-values\b/.test(resp.url()) &&
          resp.request().method() === 'PATCH' &&
          resp.status() === 422,
        { timeout: 5_000 },
      )
      .catch(() => null);

    if (errorResp !== null) {
      const errAlert = page
        .getByRole('alert')
        .filter({ hasText: /pedido vinculado|linked_order_number/i });
      await expect(errAlert.first()).toBeVisible({ timeout: 5_000 });
    } else {
      // Fallback: alguns ambientes validam apenas no save explicito do
      // proprio campo `linked_order_number`. Forca um blur em vazio para
      // disparar o PATCH e re-aguarda.
      await linkedField.click();
      await linkedField.fill('');
      await page.keyboard.press('Tab');

      const errAlert = page
        .getByRole('alert')
        .filter({ hasText: /pedido vinculado|linked_order_number/i });
      await expect(errAlert.first()).toBeVisible({ timeout: 5_000 });
    }

    // -----------------------------------------------------------------------
    // 5. Preencher `linked_order_number=ORD-12345` -> 200.
    // -----------------------------------------------------------------------
    const okRespPromise = page.waitForResponse(
      (resp) =>
        /\/custom-field-values\b/.test(resp.url()) &&
        resp.request().method() === 'PATCH' &&
        resp.status() >= 200 &&
        resp.status() < 300,
      { timeout: 10_000 },
    );

    await linkedField.fill('ORD-12345');
    await page.keyboard.press('Tab');

    const okResp = await okRespPromise;
    expect(okResp.status()).toBeGreaterThanOrEqual(200);
    expect(okResp.status()).toBeLessThan(300);

    // Erro inline some apos sucesso.
    await expect(
      page
        .getByRole('alert')
        .filter({ hasText: /pedido vinculado|linked_order_number/i }),
    ).toHaveCount(0);

    // -----------------------------------------------------------------------
    // 6. Trocar `type=INTERNO` -> linked_order_number sai do obrigatorio.
    // -----------------------------------------------------------------------
    await typeField.selectOption({ value: 'INTERNO' });

    // Apos virar opcional, o sinal de obrigatoriedade NAO deve estar presente
    // (asterisco no label some, aria-required vira false). Hint pode
    // permanecer (ele descreve a regra), entao usamos asterisco/aria como
    // assertivas duras.
    await expectNotRequiredSignal(page, linkedField);
  });
});

/**
 * Heuristica de obrigatoriedade.
 *
 * Sinais aceitos (pelo menos UM precisa estar presente):
 *   (a) `aria-required="true"` no input;
 *   (b) asterisco vermelho `*` dentro do `<label>` associado (rotulo
 *       contendo `labelMatcher`);
 *   (c) hint visivel com texto "Obrigatorio se tipo = Venda" (case-
 *       insensitive).
 */
async function expectRequiredSignal(
  page: Page,
  field: Locator,
  labelMatcher: RegExp,
): Promise<void> {
  const ariaRequired = await field.getAttribute('aria-required');
  if (ariaRequired === 'true') {
    return;
  }

  const label = page.locator('label').filter({ hasText: labelMatcher });
  const labelHasAsterisk = await label
    .first()
    .locator('span', { hasText: '*' })
    .count();
  if (labelHasAsterisk > 0) {
    return;
  }

  const hint = page.getByText(/obrigatorio se tipo = venda/i);
  await expect(hint.first()).toBeVisible();
}

async function expectNotRequiredSignal(
  page: Page,
  field: Locator,
): Promise<void> {
  const ariaRequired = await field.getAttribute('aria-required');
  expect(ariaRequired === 'true').toBe(false);

  // Asterisco no label nao deve estar visivel.
  const label = page.locator('label').filter({
    hasText: /n[°o] do pedido vinculado/i,
  });
  const asterisk = label.first().locator('span', { hasText: '*' });
  expect(await asterisk.count()).toBe(0);
}
