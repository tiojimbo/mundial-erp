'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  RiSearchLine,
  RiCornerDownLeftLine,
  RiArrowUpDownLine,
} from '@remixicon/react';
import * as CommandMenu from '@/components/ui/command-menu';
import { navigation } from '@/config/navigation';

export function GlobalCommandMenu() {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleSelect = useCallback(
    (href: string) => {
      setOpen(false);
      router.push(href);
    },
    [router],
  );

  return (
    <CommandMenu.Dialog open={open} onOpenChange={setOpen}>
      <CommandMenu.DialogTitle className='sr-only'>
        Menu de Comandos
      </CommandMenu.DialogTitle>
      <CommandMenu.DialogDescription className='sr-only'>
        Busque páginas e ações rapidamente
      </CommandMenu.DialogDescription>

      <div className='group/cmd-input flex items-center gap-2 px-5 py-3.5'>
        <RiSearchLine className='size-5 shrink-0 text-text-soft-400' />
        <CommandMenu.Input placeholder='Buscar páginas, ações...' />
      </div>

      <CommandMenu.List>
        {navigation.map((item) => {
          const Icon = item.icon;
          return (
            <CommandMenu.Item
              key={item.href}
              onSelect={() => handleSelect(item.href)}
            >
              <CommandMenu.ItemIcon as={Icon} />
              {item.label}
            </CommandMenu.Item>
          );
        })}
      </CommandMenu.List>

      <CommandMenu.Footer>
        <div className='flex items-center gap-3 text-paragraph-xs text-text-sub-600'>
          <div className='flex items-center gap-1'>
            <CommandMenu.FooterKeyBox>
              <RiCornerDownLeftLine className='size-3' />
            </CommandMenu.FooterKeyBox>
            <span>Abrir</span>
          </div>
          <div className='flex items-center gap-1'>
            <CommandMenu.FooterKeyBox>
              <RiArrowUpDownLine className='size-3' />
            </CommandMenu.FooterKeyBox>
            <span>Navegar</span>
          </div>
        </div>
        <div className='flex items-center gap-1 text-paragraph-xs text-text-sub-600'>
          <CommandMenu.FooterKeyBox>
            <span className='text-[10px]'>Esc</span>
          </CommandMenu.FooterKeyBox>
          <span>Fechar</span>
        </div>
      </CommandMenu.Footer>
    </CommandMenu.Dialog>
  );
}
