/**
 * Unit test — assertCategoryAllowed (TTT-043).
 *
 * Funcao pura sem dependencias de modulo Nest — testavel em isolamento
 * sem topar com `file-type` (ESM) que ts-jest nao transforma.
 */
import { BadRequestException, NotFoundException } from '@nestjs/common';
import {
  assertCategoryAllowed,
  type TemplateLoader,
} from './task-attachments.category-validator';

const buildLoader = (
  impl: (
    customTypeId: string,
    workspaceId: string,
  ) => Promise<{ attachmentCategories: unknown }>,
): TemplateLoader => ({ findByCustomTaskTypeId: impl });

describe('assertCategoryAllowed (TTT-043)', () => {
  it('no-op quando category e undefined', async () => {
    const loader = buildLoader(jest.fn());
    await expect(
      assertCategoryAllowed(loader, 'ws-1', null, undefined),
    ).resolves.toBeUndefined();
    expect(loader.findByCustomTaskTypeId).not.toHaveBeenCalled();
  });

  it('rejeita category quando task nao tem customTypeId', async () => {
    const loader = buildLoader(jest.fn());
    await expect(
      assertCategoryAllowed(loader, 'ws-1', null, 'comprovante'),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(loader.findByCustomTaskTypeId).not.toHaveBeenCalled();
  });

  it('rejeita category quando template nao existe (NotFound -> 400)', async () => {
    const loader = buildLoader(
      jest.fn().mockRejectedValue(new NotFoundException('not found')),
    );
    await expect(
      assertCategoryAllowed(loader, 'ws-1', 'builtin-order', 'comprovante'),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(loader.findByCustomTaskTypeId).toHaveBeenCalledWith(
      'builtin-order',
      'ws-1',
    );
  });

  it('rejeita slug fora do attachmentCategories', async () => {
    const loader = buildLoader(
      jest.fn().mockResolvedValue({
        attachmentCategories: [
          { slug: 'comprovante', label: 'Comprovante', required: true },
          { slug: 'nota_fiscal', label: 'NF', required: false },
        ],
      }),
    );
    await expect(
      assertCategoryAllowed(loader, 'ws-1', 'builtin-order', 'inexistente'),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('aceita slug presente em attachmentCategories', async () => {
    const loader = buildLoader(
      jest.fn().mockResolvedValue({
        attachmentCategories: [
          { slug: 'comprovante', label: 'Comprovante', required: true },
        ],
      }),
    );
    await expect(
      assertCategoryAllowed(loader, 'ws-1', 'builtin-order', 'comprovante'),
    ).resolves.toBeUndefined();
  });

  it('rejeita quando attachmentCategories e null', async () => {
    const loader = buildLoader(
      jest.fn().mockResolvedValue({ attachmentCategories: null }),
    );
    await expect(
      assertCategoryAllowed(loader, 'ws-1', 'builtin-order', 'qualquer'),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejeita quando attachmentCategories tem entry sem slug', async () => {
    const loader = buildLoader(
      jest.fn().mockResolvedValue({
        attachmentCategories: [{ label: 'Sem slug', required: false }],
      }),
    );
    await expect(
      assertCategoryAllowed(loader, 'ws-1', 'builtin-order', 'qualquer'),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('propaga erros nao-NotFound do loader (ex: 500 inesperado)', async () => {
    const loader = buildLoader(
      jest.fn().mockRejectedValue(new Error('redis down')),
    );
    await expect(
      assertCategoryAllowed(loader, 'ws-1', 'builtin-order', 'comprovante'),
    ).rejects.toThrow('redis down');
  });
});
