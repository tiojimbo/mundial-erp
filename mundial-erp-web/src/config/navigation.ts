import { RiHome5Line, RiInboxLine } from '@remixicon/react';
import type { ComponentType } from 'react';

export type NavItem = {
  label: string;
  icon: ComponentType<{ className?: string }>;
  href: string;
};

export const homeItems: NavItem[] = [
  { label: 'Início', href: '/inicio', icon: RiHome5Line },
  { label: 'Caixa de Entrada', href: '/caixa-de-entrada', icon: RiInboxLine },
];

/** Flat list for command menu compatibility (home items only; departments are loaded dynamically) */
export const navigation: NavItem[] = [...homeItems];
