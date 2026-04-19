'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import * as Tooltip from '@radix-ui/react-tooltip';
import {
  RiAddLine,
  RiArrowDownSLine,
  RiSettings3Line,
} from '@remixicon/react';
import { useCurrentWorkspace } from '../hooks/use-current-workspace';
import { useWorkspaceSeats } from '../hooks/use-workspace-members';

type WorkspaceSwitcherProps = {
  collapsed?: boolean;
};

export function WorkspaceSwitcher({
  collapsed = false,
}: WorkspaceSwitcherProps) {
  const router = useRouter();
  const current = useCurrentWorkspace();
  const [open, setOpen] = useState(false);

  const { data: seats } = useWorkspaceSeats(current?.id ?? '');
  const memberCount =
    (seats?.membersUsed ?? 0) + (seats?.guestsUsed ?? 0);

  if (!current) {
    return (
      <button
        type='button'
        onClick={() => router.push('/workspaces/new')}
        aria-label='Criar workspace'
        className='flex w-fit cursor-pointer items-center justify-center gap-2 rounded-md bg-sidebar-accent px-2 py-1 text-sm text-sidebar-foreground transition-colors hover:bg-sidebar-accent/90 focus-visible:ring-2 focus-visible:ring-sidebar-ring focus-visible:outline-none group-data-[collapsible=icon]:size-8 group-data-[collapsible=icon]:w-8 group-data-[collapsible=icon]:shrink-0 group-data-[collapsible=icon]:p-0 group-data-[collapsible=icon]:[&>span]:hidden'
      >
        <RiAddLine className='size-4 shrink-0' aria-hidden='true' />
        <span className='truncate'>Criar workspace</span>
      </button>
    );
  }

  const trigger = (
    <DropdownMenu.Trigger asChild>
      <button
        type='button'
        aria-haspopup='menu'
        aria-label={`Workspace ${current.name}`}
        className='flex w-fit cursor-pointer items-center justify-center gap-2 rounded-md bg-sidebar-accent px-1 py-1 text-sidebar-foreground transition-colors hover:bg-sidebar-accent/90 focus-visible:ring-2 focus-visible:ring-sidebar-ring focus-visible:outline-none data-[state=open]:bg-sidebar-accent/90 group-data-[collapsible=icon]:size-8 group-data-[collapsible=icon]:w-8 group-data-[collapsible=icon]:shrink-0 group-data-[collapsible=icon]:p-0 group-data-[collapsible=icon]:[&>*:first-child]:size-8 group-data-[collapsible=icon]:[&>span:nth-child(2)]:hidden group-data-[collapsible=icon]:[&>svg]:hidden'
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
          className='size-4 shrink-0 text-muted-foreground/70 opacity-70'
        />
      </button>
    </DropdownMenu.Trigger>
  );

  return (
    <DropdownMenu.Root open={open} onOpenChange={setOpen}>
        {collapsed ? (
          <Tooltip.Provider delayDuration={300}>
            <Tooltip.Root>
              <Tooltip.Trigger asChild>{trigger}</Tooltip.Trigger>
              <Tooltip.Portal>
                <Tooltip.Content
                  side='right'
                  sideOffset={8}
                  className='z-50 rounded-md bg-popover px-2 py-1 text-xs text-popover-foreground shadow-md ring-1 ring-border'
                >
                  {current.name}
                </Tooltip.Content>
              </Tooltip.Portal>
            </Tooltip.Root>
          </Tooltip.Provider>
        ) : (
          trigger
        )}

        <DropdownMenu.Portal>
          <DropdownMenu.Content
            side={collapsed ? 'right' : 'bottom'}
            align='start'
            sideOffset={4}
            collisionPadding={8}
            style={{
              boxShadow:
                '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
              borderRadius: '0.375rem',
              borderWidth: '1px',
              borderStyle: 'solid',
              borderColor: 'var(--border)',
            }}
            className='z-50 w-[256px] origin-(--radix-dropdown-menu-content-transform-origin) overflow-hidden bg-popover p-1 text-popover-foreground data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=top]:slide-in-from-bottom-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2'
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
                  <span className='text-[14px] font-medium text-[oklch(0.145_0_0)]'>
                    {current.name}
                  </span>
                  <span className='text-[12px] text-[oklch(0.556_0_0)]'>
                    {memberCount === 1
                      ? '1 membro'
                      : `${memberCount} membros`}
                  </span>
                </div>
              </div>
            </div>

            <DropdownMenu.Item
              onSelect={() => router.push('/configuracoes/empresa')}
              className="relative flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-hidden select-none focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50 [&_svg:not([class*='size-'])]:size-4 [&_svg:not([class*='text-'])]:text-muted-foreground [&_svg]:pointer-events-none [&_svg]:shrink-0"
            >
              <RiSettings3Line aria-hidden='true' className='mr-2 h-4 w-4' />
              <span className='text-[14px] text-[oklch(0.145_0_0)]'>
                Configurações
              </span>
            </DropdownMenu.Item>

            <DropdownMenu.Separator
              className='-mx-1 my-1 h-px bg-border'
            />

            <div className='px-2 py-1 text-[12px] text-[oklch(0.556_0_0)]'>
              Alternar Espaços de trabalho
            </div>

            {/* preventDefault: ação vive no botão `+` interno, não no Item. */}
            <DropdownMenu.Item
              onSelect={(e) => e.preventDefault()}
              className='relative flex cursor-default items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-hidden select-none focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50'
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
                  className='inline-flex !size-7 shrink-0 cursor-pointer items-center justify-center gap-2 whitespace-nowrap rounded-md border border-border bg-muted text-sm font-medium shadow-xs outline-none transition-all hover:bg-accent hover:text-accent-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50'
                >
                  <RiAddLine aria-hidden='true' className='h-4 w-4' />
                </button>
                <span className='text-[14px] text-[oklch(0.145_0_0)]'>
                  Criar Espaço de trabalho
                </span>
              </div>
            </DropdownMenu.Item>
          </DropdownMenu.Content>
        </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
