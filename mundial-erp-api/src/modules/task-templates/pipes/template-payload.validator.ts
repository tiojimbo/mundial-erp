/**
 * TemplatePayloadValidatorPipe — PLANO-TASKS.md §7.3 / §8 (Task Templates).
 *
 * Valida o `payload` JSON de um `WorkItemTemplate` com dois limites duros
 * (DoS guard; ADR sobre templates):
 *   - Total de nos (task raiz + subtasks + checklists + checklist items) ≤ 200.
 *   - Profundidade de `subtasks` ≤ 3 (raiz conta como nivel 1).
 *
 * Usado como `@UsePipes(TemplatePayloadValidatorPipe)` em create/update/
 * snapshot. O pipe roda APOS class-validator (entao recebe o objeto ja
 * coercionado pelo ValidationPipe global).
 *
 * Strategy: travessia em BFS para o count total e em DFS com contador para
 * a profundidade. Evitamos recursao sem bound para que um input malicioso
 * nao estoure o stack antes do nosso limite.
 */

import {
  ArgumentMetadata,
  BadRequestException,
  Injectable,
  PipeTransform,
} from '@nestjs/common';

/** Limite duro de nos totais do payload. */
export const TEMPLATE_MAX_NODES = 200 as const;
/** Profundidade maxima de subtasks; raiz conta como nivel 1. */
export const TEMPLATE_MAX_DEPTH = 3 as const;

interface RawChecklistItem {
  name?: unknown;
  parentId?: unknown;
}

interface RawChecklist {
  name?: unknown;
  items?: unknown;
}

interface RawNode {
  title?: unknown;
  description?: unknown;
  markdown?: unknown;
  priority?: unknown;
  estimatedMinutes?: unknown;
  tags?: unknown;
  checklists?: unknown;
  subtasks?: unknown;
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isStringArray(value: unknown): value is string[] {
  return (
    Array.isArray(value) && value.every((item) => typeof item === 'string')
  );
}

@Injectable()
export class TemplatePayloadValidatorPipe implements PipeTransform {
  transform(
    value: unknown,
    _metadata: ArgumentMetadata,
  ): Record<string, unknown> {
    // O pipe e montado especificamente para o campo `payload` do DTO OU
    // aplicado ao body inteiro no caso de endpoints como `snapshot` (onde o
    // payload e o corpo). Se vier o DTO completo, extraimos `payload`.
    const payload = this.extractPayload(value);

    if (!isObject(payload)) {
      throw new BadRequestException(
        'payload do template deve ser um objeto JSON',
      );
    }

    this.validateRootShape(payload);
    this.validateNodeCount(payload);
    this.validateDepth(payload);

    // Retornamos o valor original (nao o extraido) para preservar o formato
    // que o controller espera. Se o consumidor usar o pipe diretamente no
    // `@Body('payload')`, recebe o objeto ja validado.
    return value as Record<string, unknown>;
  }

  private extractPayload(value: unknown): unknown {
    if (isObject(value) && 'payload' in value) {
      return value.payload;
    }
    return value;
  }

  private validateRootShape(node: Record<string, unknown>): void {
    const raw = node as RawNode;
    if (typeof raw.title !== 'string' || raw.title.trim().length === 0) {
      throw new BadRequestException(
        'payload.title e obrigatorio e deve ser string nao-vazia',
      );
    }
    if (raw.description !== undefined && typeof raw.description !== 'string') {
      throw new BadRequestException(
        'payload.description deve ser string quando presente',
      );
    }
    if (raw.markdown !== undefined && typeof raw.markdown !== 'string') {
      throw new BadRequestException(
        'payload.markdown deve ser string quando presente',
      );
    }
    if (raw.priority !== undefined && typeof raw.priority !== 'string') {
      throw new BadRequestException(
        'payload.priority deve ser string quando presente',
      );
    }
    if (
      raw.estimatedMinutes !== undefined &&
      (typeof raw.estimatedMinutes !== 'number' ||
        !Number.isInteger(raw.estimatedMinutes) ||
        raw.estimatedMinutes < 0)
    ) {
      throw new BadRequestException(
        'payload.estimatedMinutes deve ser inteiro >= 0 quando presente',
      );
    }
    if (raw.tags !== undefined && !isStringArray(raw.tags)) {
      throw new BadRequestException(
        'payload.tags deve ser array de string quando presente',
      );
    }
  }

  /**
   * Conta: raiz + todas as subtasks (recursivas) + todas as checklists (em
   * qualquer nivel) + todos os checklist items. Limite: {@link TEMPLATE_MAX_NODES}.
   * Implementado em BFS iterativo com contador — sem recursao para evitar
   * stack overflow em inputs adversariais.
   */
  private validateNodeCount(root: Record<string, unknown>): void {
    let count = 0;
    const queue: Record<string, unknown>[] = [root];

    while (queue.length > 0) {
      const current = queue.shift() as Record<string, unknown>;
      count += 1; // o proprio node
      if (count > TEMPLATE_MAX_NODES) {
        throw new BadRequestException(
          `Template excede ${TEMPLATE_MAX_NODES} nos`,
        );
      }

      const raw = current as RawNode;

      if (raw.checklists !== undefined) {
        if (!Array.isArray(raw.checklists)) {
          throw new BadRequestException(
            'checklists deve ser array quando presente',
          );
        }
        for (const checklistUnknown of raw.checklists) {
          if (!isObject(checklistUnknown)) {
            throw new BadRequestException('Cada checklist deve ser um objeto');
          }
          const checklist = checklistUnknown as RawChecklist;
          count += 1; // a propria checklist
          if (count > TEMPLATE_MAX_NODES) {
            throw new BadRequestException(
              `Template excede ${TEMPLATE_MAX_NODES} nos`,
            );
          }
          if (typeof checklist.name !== 'string') {
            throw new BadRequestException('checklist.name deve ser string');
          }
          if (!Array.isArray(checklist.items)) {
            throw new BadRequestException('checklist.items deve ser array');
          }
          for (const itemUnknown of checklist.items) {
            if (!isObject(itemUnknown)) {
              throw new BadRequestException(
                'Cada item de checklist deve ser objeto',
              );
            }
            const item = itemUnknown as RawChecklistItem;
            if (typeof item.name !== 'string') {
              throw new BadRequestException(
                'checklist.item.name deve ser string',
              );
            }
            if (
              item.parentId !== undefined &&
              typeof item.parentId !== 'string'
            ) {
              throw new BadRequestException(
                'checklist.item.parentId deve ser string',
              );
            }
            count += 1;
            if (count > TEMPLATE_MAX_NODES) {
              throw new BadRequestException(
                `Template excede ${TEMPLATE_MAX_NODES} nos`,
              );
            }
          }
        }
      }

      if (raw.subtasks !== undefined) {
        if (!Array.isArray(raw.subtasks)) {
          throw new BadRequestException(
            'subtasks deve ser array quando presente',
          );
        }
        for (const child of raw.subtasks) {
          if (!isObject(child)) {
            throw new BadRequestException('Cada subtask deve ser um objeto');
          }
          queue.push(child);
        }
      }
    }
  }

  /**
   * Profundidade via DFS iterativa: a raiz e nivel 1. Qualquer subtask em
   * nivel > {@link TEMPLATE_MAX_DEPTH} falha.
   */
  private validateDepth(root: Record<string, unknown>): void {
    const stack: Array<{ node: Record<string, unknown>; depth: number }> = [
      { node: root, depth: 1 },
    ];

    while (stack.length > 0) {
      const frame = stack.pop();
      if (!frame) break;
      const { node, depth } = frame;

      if (depth > TEMPLATE_MAX_DEPTH) {
        throw new BadRequestException(
          `Template excede profundidade ${TEMPLATE_MAX_DEPTH} de subtasks`,
        );
      }

      const raw = node as RawNode;
      if (Array.isArray(raw.subtasks)) {
        for (const child of raw.subtasks) {
          if (isObject(child)) {
            stack.push({ node: child, depth: depth + 1 });
          }
        }
      }
    }
  }
}
