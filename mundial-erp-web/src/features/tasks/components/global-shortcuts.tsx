'use client';

import { useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useHotkeys } from 'react-hotkeys-hook';
import * as Modal from '@/components/ui/modal';

type Shortcut = {
  keys: string;
  description: string;
};

const SHORTCUTS: Shortcut[] = [
  { keys: '/', description: 'Focar no campo de busca' },
  { keys: 'n', description: 'Criar nova tarefa' },
  { keys: 'b', description: 'Abrir view Board do processo atual' },
  { keys: 'l', description: 'Abrir listagem completa de tarefas' },
  { keys: '?', description: 'Abrir ajuda de atalhos' },
  { keys: 'Esc', description: 'Fechar dialogos abertos' },
];

type GlobalShortcutsProps = {
  onNewTask?: () => void;
};

/**
 * Atalhos globais de teclado (TSK-805).
 *
 * Uso: montar uma unica vez no layout root. `useHotkeys` usa captura global
 * por default, mas ignora inputs — o atalho "/" preve foco em search.
 */
export function GlobalShortcuts({
  onNewTask,
}: GlobalShortcutsProps): JSX.Element {
  const router = useRouter();
  const pathname = usePathname();
  const [helpOpen, setHelpOpen] = useState(false);

  useHotkeys('/', (event) => {
    const search = document.querySelector<HTMLInputElement>(
      'input[type="search"]',
    );
    if (search) {
      event.preventDefault();
      search.focus();
    }
  });

  useHotkeys('n', () => {
    if (onNewTask) {
      onNewTask();
      return;
    }
    router.push('/tasks/all?create=1');
  });

  useHotkeys('b', () => {
    const match = pathname?.match(/\/processes\/([^/]+)/);
    if (match) {
      router.push(`/processes/${match[1]}/board`);
      return;
    }
    router.push('/tasks/all');
  });

  useHotkeys('l', () => {
    router.push('/tasks/all');
  });

  useHotkeys('shift+slash', () => setHelpOpen(true));
  useHotkeys('escape', () => setHelpOpen(false), { enableOnFormTags: true });

  return (
    <Modal.Root open={helpOpen} onOpenChange={setHelpOpen}>
      <Modal.Content className="max-w-[480px]">
        <Modal.Header
          title="Atalhos de teclado"
          description="Acoes rapidas disponiveis em qualquer pagina."
        />
        <Modal.Body>
          <ul className="flex flex-col gap-2" role="list">
            {SHORTCUTS.map((shortcut) => (
              <li
                key={shortcut.keys}
                className="flex items-center justify-between gap-4 rounded-md border border-stroke-soft-200 px-3 py-2"
                role="listitem"
              >
                <span className="text-paragraph-sm text-text-strong-950">
                  {shortcut.description}
                </span>
                <kbd className="inline-flex h-6 min-w-[24px] items-center justify-center rounded-md border border-stroke-soft-200 bg-bg-weak-50 px-1.5 font-mono text-subheading-2xs text-text-sub-600">
                  {shortcut.keys}
                </kbd>
              </li>
            ))}
          </ul>
        </Modal.Body>
      </Modal.Content>
    </Modal.Root>
  );
}
