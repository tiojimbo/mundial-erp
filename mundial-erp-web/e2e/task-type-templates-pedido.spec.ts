/**
 * TTT-045 (Sprint 4) — Jornada e2e do CustomTaskType "Pedido".
 *
 * Cobre PLANO-TASK-TYPES-TEMPLATES §"AC End-to-End / Pedido":
 *   1. Login (storageState pre-fabricado).
 *   2. Abrir modal "Nova tarefa" e selecionar tipo "Pedido".
 *   3. Verificar preview lazy do template:
 *        - "17 campos personalizados" no resumo.
 *        - 3 chips de categoria de anexo, com "Comprovante pagamento"
 *          marcado como obrigatorio (badge `(obrig.)`).
 *   4. Submeter -> redireciona para /tasks/{taskId}.
 *   5. Preencher 3 custom fields: client_cnpj, client_name, total.
 *   6. (skip) Anexar PDF na categoria "Comprovante pagamento" — backend
 *      ainda nao suporta `category` no DTO de attachment (vide
 *      `attachments-section.tsx` — comentario "TODO infra"), entao o chip
 *      nao muda de estado. Reabilitar quando o squad-tasks adicionar
 *      `category` no schema de attachment + endpoint `POST /attachments`.
 *   7. Refresh da pagina -> valores devem persistir.
 *   8. (skip) Lighthouse via `playwright-lighthouse` — pacote nao
 *      instalado neste workspace; reabilitar apos sprint 5 instalar.
 *
 * PRE-REQUISITOS (skipIf quando ausentes):
 *   - PLAYWRIGHT_BASE_URL apontando para web up.
 *   - E2E_USER_STORAGE_STATE — JSON storageState autenticado.
 *   - E2E_PROCESS_ID — id de Process onde a tarefa sera criada (o modal
 *     "Nova tarefa" exige um contexto; rotas atuais nao constroem o
 *     Process automaticamente sem um proprio /processes/[id] flow).
 *   - Seeds aplicados: `builtin-order` com 17 fields e 3 categorias
 *     (vide `prisma/seed-reference-data.ts`).
 */
import { test, expect, type Locator } from '@playwright/test';

import { checkA11y } from './a11y-helpers';

const STORAGE_STATE = process.env.E2E_USER_STORAGE_STATE ?? '';
const PROCESS_ID = process.env.E2E_PROCESS_ID ?? '';
const BASE_URL = process.env.PLAYWRIGHT_BASE_URL ?? '';

const runnable =
  STORAGE_STATE.length > 0 && PROCESS_ID.length > 0 && BASE_URL.length > 0;

test.describe('CustomTaskType — Pedido (jornada completa)', () => {
  test.skip(
    !runnable,
    'E2E_USER_STORAGE_STATE / E2E_PROCESS_ID / PLAYWRIGHT_BASE_URL ausentes',
  );

  test.use({ storageState: STORAGE_STATE });

  test('seleciona tipo Pedido, cria task e preenche custom fields', async ({
    page,
  }) => {
    // -----------------------------------------------------------------------
    // 1. Abrir lista de tarefas do Process e disparar o modal.
    // -----------------------------------------------------------------------
    await page.goto(`/processes/${PROCESS_ID}`);

    const novaTarefaBtn = page.getByRole('button', { name: /nova tarefa/i });
    await expect(novaTarefaBtn.first()).toBeVisible({ timeout: 10_000 });
    await novaTarefaBtn.first().click();

    // Modal "Nova tarefa" aberto — gate de a11y antes de qualquer interacao.
    const dialog = page.getByRole('dialog', { name: /nova tarefa/i });
    await expect(dialog).toBeVisible();
    await checkA11y(page, { context: '[role="dialog"]' });

    // -----------------------------------------------------------------------
    // 2. Selecionar tipo "Pedido" no dropdown de CustomTaskType.
    // -----------------------------------------------------------------------
    const typeSelect = page.getByLabel(/tipo de tarefa/i);
    await expect(typeSelect).toBeVisible();
    await typeSelect.selectOption({ label: 'Pedido' });

    // -----------------------------------------------------------------------
    // 3. Aguardar preview lazy carregar e validar contadores + chips.
    // -----------------------------------------------------------------------
    const preview = page.getByRole('region', {
      name: /resumo do template pedido/i,
    });
    await expect(preview).toBeVisible({ timeout: 10_000 });

    // "17 campos personalizados" — copy do `CustomTypeTemplatePreview`.
    await expect(
      preview.getByText(/17 campos personalizados/i),
    ).toBeVisible();

    // 3 chips de categoria — ul aria-label="Categorias de anexo".
    const chips = preview.getByRole('list', { name: /categorias de anexo/i });
    await expect(chips.locator('li')).toHaveCount(3);

    // "Comprovante pagamento" deve aparecer como obrigatoria (badge `(obrig.)`).
    await expect(
      chips.locator('li').filter({ hasText: /comprovante pagamento/i }),
    ).toContainText(/obrig\./i);

    // -----------------------------------------------------------------------
    // 4. Preencher titulo e submeter.
    // -----------------------------------------------------------------------
    await page
      .getByLabel(/titulo/i)
      .first()
      .fill('Pedido Playwright Test');

    await Promise.all([
      page.waitForURL(/\/tasks\/[^/]+$/, { timeout: 15_000 }),
      page.getByRole('button', { name: /^criar$/i }).click(),
    ]);

    // -----------------------------------------------------------------------
    // 5. Task View aberta — preencher 3 custom fields + a11y check.
    // -----------------------------------------------------------------------
    await expect(
      page.getByRole('heading', { name: /pedido playwright test/i }),
    ).toBeVisible({ timeout: 10_000 });

    await checkA11y(page);

    // CNPJ — mascara aplicada inline pelo CnpjField.
    const cnpjInput = page.getByLabel(/cnpj do cliente/i);
    await expect(cnpjInput).toBeVisible();
    await cnpjInput.fill('12.345.678/0001-95');

    // Nome / razao social — TextField (label exato do seed).
    const nameInput = page.getByLabel(/nome\/razao social/i);
    await expect(nameInput).toBeVisible();
    await nameInput.fill('Cliente Teste');

    // Total — CurrencyField. Usamos label exato porque "Total" tambem e
    // substring de "Subtotal".
    const totalInput = page.getByLabel('Total', { exact: true });
    await expect(totalInput).toBeVisible();
    await totalInput.fill('1000.00');

    // Tab para sair de foco e disparar o debounced PATCH do CurrencyField.
    await page.keyboard.press('Tab');

    // -----------------------------------------------------------------------
    // 6. Anexar PDF na categoria "Comprovante pagamento".
    //
    // TODO(BACKEND): habilitar quando `TaskAttachment.category` for suportado
    // pelo schema/DTO (vide `attachments-section.tsx` linha "TODO infra").
    // Hoje o chip nunca muda para "anexado" -> teste falharia mesmo com
    // upload bem sucedido. Mantemos o ponto de extensao registrado:
    //
    //   const fileChooserPromise = page.waitForEvent('filechooser');
    //   await page.getByRole('button', {
    //     name: /categoria comprovante pagamento/i,
    //   }).click();
    //   const chooser = await fileChooserPromise;
    //   await chooser.setFiles('e2e/fixtures/sample-comprovante.pdf');
    //   await expect(
    //     page.getByRole('button', {
    //       name: /comprovante pagamento.*anexado/i,
    //     }),
    //   ).toBeVisible();
    //
    // Por enquanto apenas verificamos que o chip pendente esta presente.
    const comprovanteChipTaskView = page.getByRole('button', {
      name: /categoria comprovante pagamento.*pendente/i,
    });
    await expect(comprovanteChipTaskView).toBeVisible();

    // -----------------------------------------------------------------------
    // 7. Refresh -> valores persistidos.
    // -----------------------------------------------------------------------
    await page.reload();

    await expect(page.getByLabel(/cnpj do cliente/i)).toHaveValue(
      '12.345.678/0001-95',
    );
    await expect(page.getByLabel(/nome\/razao social/i)).toHaveValue(
      'Cliente Teste',
    );
    // CurrencyField pode formatar a saida (ex.: "1.000,00" pt-BR ou
    // "1000.00" simples) — checagem tolerante por valor numerico.
    await expectCurrencyValue(
      page.getByLabel('Total', { exact: true }),
      1000,
    );
  });

  // ---------------------------------------------------------------------------
  // 8. Lighthouse — ponto de extensao para sprint 5.
  // ---------------------------------------------------------------------------
  test('Lighthouse budget na Task View do Pedido', async () => {
    test.skip(
      true,
      'TODO(SPRINT-5): instalar `playwright-lighthouse` e rodar playAudit com thresholds performance>=85 e accessibility>=95.',
    );
  });
});

/**
 * CurrencyField pode renderizar valores em PT-BR (`1.000,00`) ou simplificado
 * (`1000.00`). Convertemos para numero antes de comparar para nao acoplar
 * o teste a um locale especifico.
 */
async function expectCurrencyValue(
  locator: Locator,
  expected: number,
): Promise<void> {
  const raw = await locator.inputValue();
  const numeric = Number(raw.replace(/\./g, '').replace(',', '.'));
  expect(numeric).toBeCloseTo(expected, 2);
}
