'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  RiArrowLeftSLine,
  RiSettings4Line,
  RiTeamLine,
  RiKey2Line,
  RiUserLine,
  RiNotification3Line,
  RiLogoutBoxRLine,
} from '@remixicon/react';
import { cn } from '@/lib/cn';
import { useAuth } from '@/providers/auth-provider';
import { useCompany } from '../hooks/use-company';

type NavItem = {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
};

const hubItems: NavItem[] = [
  { label: 'Configurações', href: '/configuracoes/empresa', icon: RiSettings4Line },
  { label: 'Pessoas', href: '/configuracoes/pessoas', icon: RiTeamLine },
  { label: 'API', href: '/configuracoes/api', icon: RiKey2Line },
];

const personalItems: NavItem[] = [
  { label: 'Minha conta', href: '/configuracoes/minha-conta', icon: RiUserLine },
  { label: 'Notificações', href: '/configuracoes/notificacoes', icon: RiNotification3Line },
];

function NavLink({ item, isActive }: { item: NavItem; isActive: boolean }) {
  return (
    <Link
      href={item.href}
      className={cn(
        'flex items-center gap-2 rounded-lg px-3 py-2 text-paragraph-sm transition-colors',
        isActive
          ? 'bg-bg-soft-200 font-medium text-text-strong-950'
          : 'text-text-sub-600 hover:bg-bg-weak-50',
      )}
    >
      <item.icon className='size-4' />
      {item.label}
    </Link>
  );
}

export function SettingsSidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const { data: company } = useCompany();

  const workspaceName = company?.tradeName ?? company?.name ?? 'Workspace';
  const userName = user?.name ?? 'Usuário';

  return (
    <aside
      role='complementary'
      className='flex w-60 shrink-0 flex-col border-r border-stroke-soft-200 bg-bg-white-0'
    >
      {/* Back link */}
      <div className='px-3 py-4'>
        <Link
          href='/inicio'
          className='flex items-center gap-1 text-paragraph-sm text-text-sub-600 transition-colors hover:text-text-strong-950'
        >
          <RiArrowLeftSLine className='size-4' />
          Voltar ao espaço de trabalho
        </Link>
      </div>

      {/* Navigation */}
      <nav className='flex flex-1 flex-col gap-1 px-3'>
        {/* Workspace group */}
        <span className='mb-1 mt-2 px-3 text-subheading-2xs uppercase text-text-soft-400'>
          {workspaceName}
        </span>
        {hubItems.map((item) => (
          <NavLink
            key={item.href}
            item={item}
            isActive={pathname === item.href}
          />
        ))}

        {/* Separator */}
        <div className='my-3 border-t border-stroke-soft-200' />

        {/* Personal group */}
        <span className='mb-1 px-3 text-subheading-2xs uppercase text-text-soft-400'>
          {userName}
        </span>
        {personalItems.map((item) => (
          <NavLink
            key={item.href}
            item={item}
            isActive={pathname === item.href}
          />
        ))}

        {/* Spacer */}
        <div className='flex-1' />

        {/* Logout */}
        <button
          type='button'
          onClick={logout}
          className='mb-4 flex items-center gap-2 rounded-lg px-3 py-2 text-paragraph-sm text-text-sub-600 transition-colors hover:bg-bg-weak-50'
        >
          <RiLogoutBoxRLine className='size-4' />
          Sair
        </button>
      </nav>
    </aside>
  );
}
