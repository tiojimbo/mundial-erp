'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  RiLogoutBoxRLine,
  RiMenuLine,
  RiSearchLine,
  RiSettings4Line,
} from '@remixicon/react';
import { Zap } from 'lucide-react';
import * as Avatar from '@/components/ui/avatar';
import * as Dropdown from '@/components/ui/dropdown';
import * as Tooltip from '@/components/ui/tooltip';
import { AutomationsModal } from '@/features/automations/components/automations-modal';
import { useAuth } from '@/providers/auth-provider';
import { useSidebarStore } from '@/stores/sidebar.store';
import { getAvatarUrl } from '@/lib/api';

export function Header() {
  const { user, logout } = useAuth();
  const avatarSrc = getAvatarUrl(user?.avatar);
  const { toggleMobileSidebar } = useSidebarStore();
  const [automationsOpen, setAutomationsOpen] = useState(false);

  return (
    <header className='flex shrink-0 items-center px-2'>
      {/* Left — mobile menu */}
      <div className='flex items-center gap-3'>
        <button
          type='button'
          onClick={toggleMobileSidebar}
          className='rounded-lg p-2 text-text-sub-600 transition-colors hover:bg-sidebar-accent hover:text-text-strong-950 lg:hidden'
          aria-label='Abrir menu'
        >
          <RiMenuLine className='size-5' />
        </button>
      </div>

      {/* Center — search */}
      <div className='flex flex-1 justify-center'>
        <button
          type='button'
          className='flex h-8 w-80 items-center gap-2 rounded-10 border border-stroke-soft-200 bg-bg-white-0 px-3 text-paragraph-sm text-text-soft-400 shadow-regular-xs transition-colors hover:border-stroke-sub-300'
          onClick={() => {
            document.dispatchEvent(
              new KeyboardEvent('keydown', { key: 'k', metaKey: true }),
            );
          }}
        >
          <RiSearchLine className='size-4 shrink-0' />
          <span className='hidden sm:inline'>Buscar...</span>
          <kbd className='ml-auto hidden rounded bg-bg-weak-50 px-1.5 py-0.5 text-label-xs text-text-soft-400 sm:inline'>
            ⌘K
          </kbd>
        </button>
      </div>

      {/* Right — automações + avatar */}
      <div className='flex items-center gap-2'>
        {/* Automações */}
        <Tooltip.Root>
          <Tooltip.Trigger asChild>
            <button
              type='button'
              onClick={() => setAutomationsOpen(true)}
              aria-label='Automações'
              className='inline-flex h-7 items-center gap-1.5 rounded-md px-2.5 text-label-xs text-text-sub-600 transition-colors hover:bg-sidebar-accent hover:text-text-strong-950'
            >
              <Zap className='size-3.5' />
              <span className='hidden sm:inline'>Automações</span>
            </button>
          </Tooltip.Trigger>
          <Tooltip.Content>Automações</Tooltip.Content>
        </Tooltip.Root>

        <AutomationsModal
          open={automationsOpen}
          onOpenChange={setAutomationsOpen}
        />

        {/* Avatar + Dropdown */}
        <Dropdown.Root>
          <Dropdown.Trigger asChild>
            <button
              type='button'
              className='rounded-full ring-offset-2 focus:ring-2 focus:ring-primary-base'
            >
              <Avatar.Root size='32' color='gray'>
                {avatarSrc ? (
                  <Avatar.Image src={avatarSrc} alt={user?.name ?? 'Avatar'} />
                ) : (
                  (user?.name?.[0] ?? 'U')
                )}
              </Avatar.Root>
            </button>
          </Dropdown.Trigger>
          <Dropdown.Content
            align='end'
            className='w-56 rounded-md bg-sidebar text-sidebar-foreground ring-sidebar-border'
          >
            {/* User info */}
            <div className='px-3 py-2'>
              <p className='text-label-sm text-sidebar-foreground'>
                {user?.name}
              </p>
              <p className='text-paragraph-xs text-sidebar-foreground'>
                {user?.email}
              </p>
            </div>

            <Dropdown.Separator className='-mx-2 my-1 h-px bg-sidebar-border' />

            {/* Configurações */}
            <Dropdown.Item
              asChild
              className='text-sidebar-foreground data-[highlighted]:bg-sidebar-accent data-[highlighted]:text-sidebar-accent-foreground'
            >
              <Link href='/configuracoes'>
                <Dropdown.ItemIcon
                  as={RiSettings4Line}
                  className='text-sidebar-foreground'
                />
                Configurações
              </Link>
            </Dropdown.Item>

            <Dropdown.Separator className='-mx-2 my-1 h-px bg-sidebar-border' />

            {/* Logout */}
            <Dropdown.Item
              onClick={logout}
              className='text-sidebar-foreground data-[highlighted]:bg-sidebar-accent data-[highlighted]:text-sidebar-accent-foreground'
            >
              <Dropdown.ItemIcon
                as={RiLogoutBoxRLine}
                className='text-sidebar-foreground'
              />
              Sair
            </Dropdown.Item>
          </Dropdown.Content>
        </Dropdown.Root>
      </div>
    </header>
  );
}
