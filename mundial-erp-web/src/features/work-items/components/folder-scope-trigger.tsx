'use client';

import { Folder } from 'lucide-react';

import * as Tooltip from '@/components/ui/tooltip';

type FolderScopeTriggerProps = {
  label: string;
};

export function FolderScopeTrigger({ label }: FolderScopeTriggerProps) {
  return (
    <Tooltip.Root>
      <Tooltip.Trigger asChild>
        <button
          type="button"
          title={label}
          className="group inline-flex h-7 max-w-[13.75rem] shrink-0 items-center gap-1.5 rounded-md px-2 text-[13px] font-normal text-muted-foreground transition-colors duration-150 hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <Folder
            className="size-3.5 shrink-0"
            strokeWidth={1.75}
            aria-hidden
          />
          <span className="truncate">{label}</span>
        </button>
      </Tooltip.Trigger>
      <Tooltip.Content side="bottom">{label}</Tooltip.Content>
    </Tooltip.Root>
  );
}
