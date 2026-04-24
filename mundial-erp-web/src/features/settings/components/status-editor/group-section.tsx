'use client';

import { Plus, Info } from 'lucide-react';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import * as Tooltip from '@/components/ui/tooltip';
import { StatusRow, type StatusDraft } from './status-row';
import type { StatusGroupConfig } from './constants';

export interface GroupSectionProps {
  group: StatusGroupConfig;
  items: StatusDraft[];
  onAdd: () => void;
  onUpdate: (id: string, patch: Partial<Pick<StatusDraft, 'name' | 'color'>>) => void;
  onRemove: (id: string) => void;
  onReorder: (activeId: string, overId: string) => void;
  justAddedId?: string | null;
  onColorPickerClosed?: () => void;
}

export function GroupSection({
  group,
  items,
  onAdd,
  onUpdate,
  onRemove,
  onReorder,
  justAddedId,
  onColorPickerClosed,
}: GroupSectionProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    onReorder(String(active.id), String(over.id));
  }

  const isClosedGroup = group.key === 'CLOSED';
  const canRemove = items.length > 1 && !isClosedGroup;

  return (
    <section
      role="group"
      aria-label={group.label}
      className="flex flex-col gap-1.5"
    >
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <span className="text-[12px] tracking-wide text-text-soft-400">
            {group.label}
          </span>
          <Tooltip.Root>
            <Tooltip.Trigger asChild>
              <button
                type="button"
                aria-label={`Sobre ${group.label}`}
                className="flex size-3.5 items-center justify-center text-text-soft-400 hover:text-text-sub-600"
              >
                <Info className="size-3" />
              </button>
            </Tooltip.Trigger>
            <Tooltip.Content size="small" variant="dark">
              {group.tip}
            </Tooltip.Content>
          </Tooltip.Root>
        </div>
        {group.canAdd && (
          <button
            type="button"
            aria-label={`Adicionar status em ${group.label}`}
            onClick={onAdd}
            className="flex size-5 items-center justify-center rounded text-text-sub-600 hover:bg-bg-weak-50"
          >
            <Plus className="size-3.5" />
          </button>
        )}
      </header>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={items.map((s) => s.id)}
          strategy={verticalListSortingStrategy}
        >
          <div className="flex flex-col gap-1">
            {items.map((status) => (
              <StatusRow
                key={status.id}
                status={status}
                onUpdate={onUpdate}
                onRemove={onRemove}
                canRemove={canRemove}
                dragDisabled={isClosedGroup}
                autoOpenColorPicker={justAddedId === status.id}
                onColorPickerOpenChange={(open) => {
                  if (!open && justAddedId === status.id) {
                    onColorPickerClosed?.();
                  }
                }}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      {group.canAdd && (
        <button
          type="button"
          onClick={onAdd}
          className="flex w-full items-center justify-center gap-1 rounded-lg border border-dashed border-stroke-soft-200 py-1.5 text-[14px] text-text-sub-600 hover:bg-bg-weak-50"
        >
          <Plus className="size-3" />
          Adicionar status
        </button>
      )}
    </section>
  );
}
