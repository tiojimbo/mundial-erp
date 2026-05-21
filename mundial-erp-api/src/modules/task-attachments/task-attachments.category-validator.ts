/**
 * Validador de slug de categoria de anexo (TTT-043).
 *
 * Funcao pura extraida de `TaskAttachmentsService` para isolamento de
 * teste — service depende de `file-type` (ESM) que ts-jest nao transforma,
 * entao o helper vive em arquivo proprio sem dependencias transitivas.
 *
 * Regras (espelham §"Regras de Negocio" do PLANO-TASK-TYPES-TEMPLATES):
 *  - `category` undefined => no-op (anexo sem categoria continua valido).
 *  - Task sem `customTypeId` + category dada => `category invalida`.
 *  - Template ausente / NotFound => `category invalida`.
 *  - Slug fora de `attachmentCategories` => `category invalida`.
 *  - Slug presente => passa.
 */
import { BadRequestException, NotFoundException } from '@nestjs/common';

export interface TemplateLoader {
  findByCustomTaskTypeId(
    customTypeId: string,
    workspaceId: string,
  ): Promise<{ attachmentCategories: unknown }>;
}

export async function assertCategoryAllowed(
  loader: TemplateLoader,
  workspaceId: string,
  customTypeId: string | null,
  category: string | undefined,
): Promise<void> {
  if (!category) return;
  if (!customTypeId) {
    throw new BadRequestException(
      'category invalida: tarefa nao possui tipo com template',
    );
  }
  let template: { attachmentCategories: unknown };
  try {
    template = await loader.findByCustomTaskTypeId(customTypeId, workspaceId);
  } catch (err) {
    if (err instanceof NotFoundException) {
      throw new BadRequestException(
        'category invalida: tipo da tarefa nao possui template',
      );
    }
    throw err;
  }
  const raw = template.attachmentCategories;
  const list = Array.isArray(raw) ? raw : [];
  const allowed = new Set(
    list
      .map((c) =>
        c && typeof c === 'object' && 'slug' in c
          ? String((c as { slug: unknown }).slug)
          : null,
      )
      .filter((s): s is string => typeof s === 'string' && s.length > 0),
  );
  if (!allowed.has(category)) {
    throw new BadRequestException(
      `category invalida: slug '${category}' nao pertence ao template`,
    );
  }
}
