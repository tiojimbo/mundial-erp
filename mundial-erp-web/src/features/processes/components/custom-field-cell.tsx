'use client';

import { useMemo } from 'react';

import { CustomFieldEditor } from '@/features/custom-fields/components/custom-field-editor';
import { useFeatureFlag } from '@/features/custom-fields/hooks/use-feature-flag';
import {
  useClearCustomFieldValue,
  useCustomFieldValues,
  usePatchCustomFieldValue,
} from '@/features/custom-fields/hooks/use-custom-field-values';
import type {
  CustomFieldDefinition,
  CustomFieldRawValue,
  CustomFieldScalarValue,
} from '@/features/custom-fields/types/custom-field.types';

type CustomFieldCellProps = {
  taskId: string;
  definition: CustomFieldDefinition;
  width: number;
};

export function CustomFieldCell({
  taskId,
  definition,
  width,
}: CustomFieldCellProps) {
  const writeEnabled = useFeatureFlag('custom_fields_write');
  const valuesQuery = useCustomFieldValues(taskId);
  const patchMutation = usePatchCustomFieldValue();
  const clearMutation = useClearCustomFieldValue();

  const value = useMemo<CustomFieldScalarValue>(() => {
    const entry = (valuesQuery.data ?? []).find(
      (v) => v.customFieldId === definition.id,
    );
    return entry?.value ?? null;
  }, [valuesQuery.data, definition.id]);

  function handleChange(next: CustomFieldRawValue) {
    if (!writeEnabled) return;
    const isEmpty =
      next === null ||
      next === undefined ||
      next === '' ||
      (Array.isArray(next) && next.length === 0);
    if (isEmpty) {
      clearMutation.mutate({ taskId, customFieldId: definition.id });
    } else {
      patchMutation.mutate({
        taskId,
        customFieldId: definition.id,
        value: next,
      });
    }
  }

  return (
    <div
      data-col={`CF_${definition.id}`}
      className='flex shrink-0 flex-col overflow-hidden'
      style={{ width }}
      onClick={(e) => e.stopPropagation()}
    >
      <div className='flex h-full w-full items-center overflow-hidden px-3 py-1'>
        <CustomFieldEditor
          definition={definition}
          value={value}
          onChange={handleChange}
          readOnly={!writeEnabled}
          inline
        />
      </div>
    </div>
  );
}
