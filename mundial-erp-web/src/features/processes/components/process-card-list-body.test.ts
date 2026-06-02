import { describe, expect, it } from 'vitest';
import { flattenInheritedFields } from './process-card-list-body';
import type {
  CustomFieldDefinition,
  CustomFieldsGroupedResponse,
} from '@/features/custom-fields/types/custom-field.types';

function def(id: string, name = id): CustomFieldDefinition {
  return { id, name, type: 'TEXT' } as CustomFieldDefinition;
}

function grouped(
  partial: Partial<CustomFieldsGroupedResponse>,
): CustomFieldsGroupedResponse {
  return {
    taskType: [],
    list: [],
    folder: [],
    space: [],
    workspace: [],
    ...partial,
  };
}

describe('flattenInheritedFields', () => {
  it('retorna vazio quando todos os buckets estao vazios', () => {
    expect(flattenInheritedFields(grouped({}))).toEqual([]);
  });

  it('ordena por taskType > list > folder > space > workspace', () => {
    const result = flattenInheritedFields(
      grouped({
        workspace: [def('w')],
        space: [def('s')],
        folder: [def('fo')],
        list: [def('l')],
        taskType: [def('t')],
      }),
    );
    expect(result.map((d) => d.id)).toEqual(['t', 'l', 'fo', 's', 'w']);
  });

  it('deduplica por id mantendo a posicao do bucket de maior precedencia', () => {
    const result = flattenInheritedFields(
      grouped({
        list: [def('shared'), def('only-list')],
        space: [def('shared'), def('only-space')],
      }),
    );
    expect(result.map((d) => d.id)).toEqual([
      'shared',
      'only-list',
      'only-space',
    ]);
  });
});
