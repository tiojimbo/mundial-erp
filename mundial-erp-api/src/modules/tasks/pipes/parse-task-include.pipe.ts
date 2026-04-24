import { BadRequestException, Injectable, PipeTransform } from '@nestjs/common';

/**
 * Whitelist de includes suportados por `GET /tasks/:taskId` (PLANO-TASKS.md §7.1).
 *
 * Motivo do design: bloquear a API de crescer `?include=*` ad-hoc —
 * cada item aqui implica uma query adicional e uma projecao conhecida.
 * Desconhecidos viram 400 (nao 200 silencioso) para falhar rapido em CI.
 */
export const TASK_INCLUDE_WHITELIST = new Set<string>([
  'subtasks',
  'checklists',
  'dependencies',
  'links',
  'tags',
  'watchers',
  'attachments',
  'markdown',
  'assignees',
]);

@Injectable()
export class ParseTaskIncludePipe
  implements PipeTransform<string | undefined, ReadonlySet<string>>
{
  transform(value: string | undefined): ReadonlySet<string> {
    if (!value || value.trim() === '') {
      return new Set<string>();
    }

    const tokens = value
      .split(',')
      .map((v) => v.trim())
      .filter((v) => v.length > 0);

    const result = new Set<string>();
    const unknown: string[] = [];
    for (const t of tokens) {
      if (TASK_INCLUDE_WHITELIST.has(t)) {
        result.add(t);
      } else {
        unknown.push(t);
      }
    }

    if (unknown.length > 0) {
      throw new BadRequestException(
        `include inclui tokens desconhecidos: ${unknown.join(', ')}. ` +
          `Permitidos: ${[...TASK_INCLUDE_WHITELIST].join(', ')}.`,
      );
    }

    return result;
  }
}
