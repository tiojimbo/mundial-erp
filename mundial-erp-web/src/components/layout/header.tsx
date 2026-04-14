'use client';

import Link from 'next/link';
import { useTheme } from 'next-themes';
import {
  RiNotification3Line,
  RiLogoutBoxRLine,
  RiMenuLine,
  RiSearchLine,
  RiSettings4Line,
  RiSunLine,
  RiMoonLine,
  RiComputerLine,
} from '@remixicon/react';
import * as Avatar from '@/components/ui/avatar';
import * as Dropdown from '@/components/ui/dropdown';
import { useAuth } from '@/providers/auth-provider';
import { useSidebarStore } from '@/stores/sidebar.store';
import { cn } from '@/lib/cn';

export function Header() {
  const { user, logout } = useAuth();
  const { toggleMobileSidebar } = useSidebarStore();
  const { theme, setTheme } = useTheme();

  return (
    <header className='flex shrink-0 items-center px-2'>
      {/* Left — mobile menu */}
      <div className='flex items-center gap-3'>
        <button
          type='button'
          onClick={toggleMobileSidebar}
          className='rounded-lg p-2 text-text-sub-600 transition-colors hover:bg-[oklch(0.94_0_0)] hover:text-text-strong-950 lg:hidden'
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
          <kbd className='hidden rounded bg-bg-weak-50 px-1.5 py-0.5 text-label-xs text-text-soft-400 sm:inline'>
            ⌘K
          </kbd>
        </button>
      </div>

      {/* Right — notifications + avatar */}
      <div className='flex items-center gap-2'>
        {/* Notifications */}
        <button
          type='button'
          className='relative rounded-lg p-2 text-text-sub-600 transition-colors hover:bg-[oklch(0.94_0_0)] hover:text-text-strong-950'
        >
          <RiNotification3Line className='size-5' />
          <span className='absolute right-1.5 top-1.5 size-2 rounded-full bg-error-base' />
        </button>

        {/* Avatar + Dropdown */}
        <Dropdown.Root>
          <Dropdown.Trigger asChild>
            <button type='button' className='rounded-full ring-offset-2 focus:ring-2 focus:ring-primary-base'>
              <Avatar.Root size='32' color='gray'>
                {user?.avatarUrl ? (
                  <Avatar.Image src={user.avatarUrl} alt={user.name} />
                ) : (
                  user?.name?.[0] ?? 'U'
                )}
              </Avatar.Root>
            </button>
          </Dropdown.Trigger>
          <Dropdown.Content align='end' className='w-56'>
            {/* User info */}
            <div className='px-3 py-2'>
              <p className='text-label-sm text-text-strong-950'>
                {user?.name}
              </p>
              <p className='text-paragraph-xs text-text-sub-600'>
                {user?.email}
              </p>
            </div>

            <Dropdown.Separator />

            {/* Configurações */}
            <Dropdown.Item asChild>
              <Link href='/configuracoes'>
                <Dropdown.ItemIcon as={RiSettings4Line} />
                Configurações
              </Link>
            </Dropdown.Item>

            <Dropdown.Separator />

            {/* Logout */}
            <Dropdown.Item onClick={logout}>
              <Dropdown.ItemIcon as={RiLogoutBoxRLine} />
              Sair
            </Dropdown.Item>
          </Dropdown.Content>
        </Dropdown.Root>
      </div>
    </header>
  );
}
