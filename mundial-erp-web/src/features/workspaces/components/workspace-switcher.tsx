'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { RiAddLine, RiArrowDownSLine, RiSettings3Line } from '@remixicon/react';
import { useCurrentWorkspace } from '../hooks/use-current-workspace';
import { useWorkspaceSeats } from '../hooks/use-workspace-members';

export function WorkspaceSwitcher() {
  const router = useRouter();
  const current = useCurrentWorkspace();
  const [open, setOpen] = useState(false);

  const { data: seats } = useWorkspaceSeats(current?.id ?? '');
  const memberCount = (seats?.membersUsed ?? 0) + (seats?.guestsUsed ?? 0);

  if (!current) {
    return (
      <button
        type='button'
        onClick={() => router.push('/workspaces/new')}
        aria-label='Criar workspace'
        className='text-sm hover:bg-sidebar-accent/90 flex w-fit cursor-pointer items-center justify-center gap-2 rounded-md bg-sidebar-accent px-2 py-1 text-sidebar-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring'
      >
        <RiAddLine className='size-4 shrink-0' aria-hidden='true' />
        <span className='truncate'>Criar workspace</span>
      </button>
    );
  }

  return (
    <DropdownMenu.Root open={open} onOpenChange={setOpen}>
      <DropdownMenu.Trigger asChild>
        <button
          type='button'
          aria-haspopup='menu'
          aria-label={`Workspace ${current.name}`}
          className='hover:bg-sidebar-accent/90 data-[state=open]:bg-sidebar-accent/90 flex w-fit cursor-pointer items-center justify-center gap-2 rounded-md bg-sidebar-accent px-1 py-1 text-sidebar-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring'
        >
          <span
            data-slot='avatar'
            className='relative flex size-6 shrink-0 overflow-hidden rounded-md'
          >
            <span
              data-slot='avatar-fallback'
              className='flex size-full items-center justify-center rounded-md text-[12px] font-semibold'
              style={{ backgroundColor: current.bgColor, color: '#FFFFFF' }}
            >
              {current.initials}
            </span>
          </span>
          <span className='truncate text-[14px] font-bold'>{current.name}</span>
          <RiArrowDownSLine
            aria-hidden='true'
            className='text-muted-foreground/70 size-4 shrink-0 opacity-70'
          />
        </button>
      </DropdownMenu.Trigger>

      <DropdownMenu.Portal>
        <DropdownMenu.Content
          side='bottom'
          align='start'
          sideOffset={4}
          collisionPadding={8}
          style={{
            boxShadow:
              '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
            borderRadius: '0.375rem',
            borderWidth: '1px',
            borderStyle: 'solid',
            borderColor: 'var(--sidebar-border)',
          }}
          className='origin-(--radix-dropdown-menu-content-transform-origin) z-50 w-[256px] overflow-hidden bg-sidebar p-1 text-sidebar-foreground data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2'
        >
          <div className='mb-1 p-2'>
            <div className='flex items-center gap-2'>
              <span
                data-slot='avatar'
                className='relative mr-2 flex size-6 shrink-0 overflow-hidden rounded-md'
              >
                <span
                  data-slot='avatar-fallback'
                  className='flex size-full items-center justify-center rounded-md text-[10px] font-semibold'
                  style={{
                    backgroundColor: current.bgColor,
                    color: '#FFFFFF',
                  }}
                >
                  {current.initials}
                </span>
              </span>
              <div className='flex flex-col'>
                <span className='text-[14px] font-medium text-sidebar-foreground'>
                  {current.name}
                </span>
                <span className='text-[12px] text-sidebar-foreground'>
                  {memberCount === 1 ? '1 membro' : `${memberCount} membros`}
                </span>
              </div>
            </div>
          </div>

          <DropdownMenu.Item
            onSelect={() => router.push('/configuracoes/empresa')}
            className="text-sm outline-hidden relative flex cursor-pointer select-none items-center gap-2 rounded-sm px-2 py-1.5 focus:bg-sidebar-accent focus:text-sidebar-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50 [&_svg:not([class*='size-'])]:size-4 [&_svg:not([class*='text-'])]:text-sidebar-foreground [&_svg]:pointer-events-none [&_svg]:shrink-0"
          >
            <RiSettings3Line aria-hidden='true' className='mr-2 h-4 w-4' />
            <span className='text-[14px] text-sidebar-foreground'>
              Configurações
            </span>
          </DropdownMenu.Item>

          <DropdownMenu.Separator className='-mx-1 my-1 h-px bg-sidebar-border' />

          <div className='px-2 py-1 text-[12px] text-sidebar-foreground'>
            Alternar Espaços de trabalho
          </div>

          {/* preventDefault: ação vive no botão `+` interno, não no Item. */}
          <DropdownMenu.Item
            onSelect={(e) => e.preventDefault()}
            className='text-sm outline-hidden relative flex cursor-default select-none items-center gap-2 rounded-sm px-2 py-1.5 focus:bg-sidebar-accent focus:text-sidebar-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50'
          >
            <div className='flex items-center gap-2'>
              <button
                type='button'
                data-slot='button'
                aria-label='Criar Espaço de trabalho'
                onClick={() => {
                  setOpen(false);
                  router.push('/workspaces/new');
                }}
                className='text-sm shadow-xs hover:bg-sidebar-accent/70 focus-visible:ring-sidebar-ring/50 inline-flex !size-7 shrink-0 cursor-pointer items-center justify-center gap-2 whitespace-nowrap rounded-md border border-sidebar-border bg-sidebar-accent font-medium text-sidebar-foreground outline-none transition-all hover:text-sidebar-accent-foreground focus-visible:border-sidebar-ring focus-visible:ring-[3px] disabled:pointer-events-none disabled:opacity-50'
              >
                <RiAddLine aria-hidden='true' className='h-4 w-4' />
              </button>
              <span className='text-[14px] text-sidebar-foreground'>
                Criar Espaço de trabalho
              </span>
            </div>
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
