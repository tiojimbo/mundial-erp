import { ApiPropertyOptional } from '@nestjs/swagger';
import { TaskResponseDto } from './task-response.dto';

/**
 * Projecoes opcionais hidratadas via `?include=` (whitelist pipe).
 * Cada seccao e `null` quando nao solicitada, `[]`/objetos quando presente.
 */

export class TaskAssigneeSummaryDto {
  id!: string;
  name!: string;
  email!: string;
  isPrimary!: boolean;
}

export class TaskWatcherSummaryDto {
  id!: string;
  name!: string;
  email!: string;
}

export class TaskTagSummaryDto {
  id!: string;
  name!: string;
  color!: string | null;
  bgColor!: string | null;
}

export class TaskDetailResponseDto extends TaskResponseDto {
  @ApiPropertyOptional({ type: [Object] })
  subtasks?: Array<Record<string, unknown>>;

  @ApiPropertyOptional({ type: [Object] })
  checklists?: Array<Record<string, unknown>>;

  @ApiPropertyOptional({ type: [Object] })
  dependencies?: {
    blocking: Array<Record<string, unknown>>;
    waitingOn: Array<Record<string, unknown>>;
  };

  @ApiPropertyOptional({ type: [Object] })
  links?: Array<Record<string, unknown>>;

  @ApiPropertyOptional({ type: [TaskTagSummaryDto] })
  tags?: TaskTagSummaryDto[];

  @ApiPropertyOptional({ type: [TaskAssigneeSummaryDto] })
  assignees?: TaskAssigneeSummaryDto[];

  @ApiPropertyOptional({ type: [TaskWatcherSummaryDto] })
  watchers?: TaskWatcherSummaryDto[];

  @ApiPropertyOptional({ type: [Object] })
  attachments?: Array<Record<string, unknown>>;

  @ApiPropertyOptional({ nullable: true })
  markdown?: string | null;

  /**
   * Fabrica a partir do row detalhado do repository (ja com relacoes aplicadas
   * conforme o conjunto de `include`s). Campos nao solicitados permanecem
   * `undefined` (e portanto omitidos do JSON).
   */
  static fromDetailRow(
    row: Record<string, unknown>,
    includes: ReadonlySet<string>,
  ): TaskDetailResponseDto {
    const base = TaskResponseDto.fromRow(row);
    const dto = Object.assign(new TaskDetailResponseDto(), base);

    if (includes.has('subtasks')) {
      const children = (row.children as Array<Record<string, unknown>>) ?? [];
      dto.subtasks = children.map(
        (c) => TaskResponseDto.fromRow(c) as unknown as Record<string, unknown>,
      );
    }

    if (includes.has('checklists')) {
      dto.checklists = (row.checklists as Array<Record<string, unknown>>) ?? [];
    }

    if (includes.has('dependencies')) {
      // Mapeamento blocking/waitingOn (PLANO-TASKS.md §7.3).
      const out = (row.dependenciesOut as Array<Record<string, unknown>>) ?? [];
      const inn = (row.dependenciesIn as Array<Record<string, unknown>>) ?? [];
      dto.dependencies = { blocking: out, waitingOn: inn };
    }

    if (includes.has('links')) {
      const from = (row.linksFrom as Array<Record<string, unknown>>) ?? [];
      const to = (row.linksTo as Array<Record<string, unknown>>) ?? [];
      dto.links = [...from, ...to];
    }

    if (includes.has('tags')) {
      const rawTags =
        (row.tags as
          | Array<{
              tag: {
                id: string;
                name: string;
                color: string | null;
                bgColor: string | null;
              };
            }>
          | undefined) ?? [];
      dto.tags = rawTags.map((t) => ({
        id: t.tag.id,
        name: t.tag.name,
        color: t.tag.color,
        bgColor: t.tag.bgColor,
      }));
    }

    if (includes.has('attachments')) {
      dto.attachments =
        (row.attachments as Array<Record<string, unknown>>) ?? [];
    }

    if (includes.has('markdown')) {
      dto.markdown = (row.markdownContent as string | null) ?? null;
    }

    // assignees e watchers sao fetch-on-demand pelo service (join tables
    // potencialmente grandes; service controla o `select`).
    return dto;
  }
}
