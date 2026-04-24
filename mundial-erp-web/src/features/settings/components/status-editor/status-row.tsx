'use client';

import { useRef, useState } from 'react';
import { GripVertical, MoreHorizontal, Pencil, Trash2 } from 'lucide-react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { cn } from '@/lib/cn';
import * as Popover from '@/components/ui/popover';
import * as Dropdown from '@/components/ui/dropdown';
import { StatusIcon } from '@/features/work-items/components/status-icon';
import { ColorPalette } from './color-palette';
import type { StatusCategory } from './constants';

export interface StatusDraft {
  id: string;
  name: string;
  color: string;
  category: StatusCategory;
  sortOrder: number;
}

export interface StatusRowProps {
  status: StatusDraft;
  onUpdate: (id: string, patch: Partial<Pick<StatusDraft, 'name' | 'color'>>) => void;
  onRemove: (id: string) => void;
  canRemove: boolean;
  dragDisabled: boolean;
  autoOpenColorPicker?: boolean;
  onColorPickerOpenChange?: (open: boolean) => void;
}

export function StatusRow({
  status,
  onUpdate,
  onRemove,
  canRemove,
  dragDisabled,
  autoOpenColorPicker,
  onColorPickerOpenChange,
}: StatusRowProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [paletteOpen, setPaletteOpen] = useState<boolean>(!!autoOpenColorPicker);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: status.id, disabled: dragDisabled });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  function handlePaletteOpenChange(open: boolean) {
    setPaletteOpen(open);
    onColorPickerOpenChange?.(open);
  }

  function handleRenameClick() {
    inputRef.current?.focus();
    inputRef.current?.select();
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'flex items-center gap-2 rounded-lg border border-stroke-soft-200 bg-bg-white-0 px-2 py-1.5',
        isDragging && 'opacity-60 shadow-regular-md',
      )}
    >
      <button
        type="button"
        aria-label="Arrastar para reordenar"
        disabled={dragDisabled}
        className={cn(
          'flex size-5 items-center justify-center rounded text-text-soft-400',
          !dragDisabled && 'cursor-grab hover:bg-bg-weak-50 active:cursor-grabbing',
          dragDisabled && 'cursor-not-allowed opacity-40',
        )}
        {...attributes}
        {...listeners}
      >
        <GripVertical className="size-3.5" />
      </button>

      <StatusIcon category={status.category} color={status.color} size={14} />

      <input
        ref={inputRef}
        value={status.name}
        onChange={(e) => onUpdate(status.id, { name: e.target.value })}
        placeholder="Nome do status"
        className="flex-1 bg-transparent text-[14px] font-normal uppercase text-text-strong-950 outline-none placeholder:normal-case placeholder:text-text-soft-400"
      />

      <Popover.Root open={paletteOpen} onOpenChange={handlePaletteOpenChange}>
        <Popover.Trigger asChild>
          <button
            type="button"
            aria-label="Alterar cor"
            className="flex size-5 items-center justify-center rounded-full transition hover:ring-2 hover:ring-stroke-soft-200"
          >
            <span
              className="size-3.5 rounded-full"
              style={{ backgroundColor: status.color }}
            />
          </button>
        </Popover.Trigger>
        <Popover.Content
          align="end"
          sideOffset={6}
          className="w-max p-2.5"
          showArrow={false}
        >
          <ColorPalette
            value={status.color}
            onChange={(color) => {
              onUpdate(status.id, { color });
              handlePaletteOpenChange(false);
            }}
          />
        </Popover.Content>
      </Popover.Root>

      <Dropdown.Root>
        <Dropdown.Trigger asChild>
          <button
            type="button"
            aria-label="Mais acoes"
            className="flex size-5 items-center justify-center rounded text-text-sub-600 hover:bg-bg-weak-50"
          >
            <MoreHorizontal className="size-3.5" />
          </button>
        </Dropdown.Trigger>
        <Dropdown.Content align="end" className="w-40">
          <Dropdown.Item onSelect={handleRenameClick}>
            <Dropdown.ItemIcon as={Pencil} />
            Renomear
          </Dropdown.Item>
          <Dropdown.Item
            onSelect={() => {
              if (!canRemove) return;
              onRemove(status.id);
            }}
            disabled={!canRemove}
          >
            <Dropdown.ItemIcon as={Trash2} />
            Excluir
          </Dropdown.Item>
        </Dropdown.Content>
      </Dropdown.Root>
    </div>
  );
}
