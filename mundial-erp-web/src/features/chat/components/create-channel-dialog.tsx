'use client';

import { useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { RiCloseLine } from '@remixicon/react';
import { useRouter } from 'next/navigation';
import { useCreateChannel } from '../hooks/use-channels';
import { useChatStore } from '@/stores/chat.store';

type CreateChannelDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function CreateChannelDialog({
  open,
  onOpenChange,
}: CreateChannelDialogProps) {
  const [name, setName] = useState('');
  const [isPrivate, setIsPrivate] = useState(false);
  const [attachList, setAttachList] = useState(false);
  const { mutate: createChannel, isPending } = useCreateChannel();
  const setActiveChannel = useChatStore((s) => s.setActiveChannel);
  const router = useRouter();

  function resetForm() {
    setName('');
    setIsPrivate(false);
    setAttachList(false);
  }

  function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen) resetForm();
    onOpenChange(nextOpen);
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const type = isPrivate ? 'PRIVATE' : 'PUBLIC';

    createChannel(
      {
        name: name.trim(),
        type,
      },
      {
        onSuccess: (channel) => {
          setActiveChannel(channel.id);
          router.push('/chat');
          resetForm();
          onOpenChange(false);
        },
      },
    );
  };

  return (
    <Dialog.Root open={open} onOpenChange={handleOpenChange}>
      <Dialog.Portal>
        {/* Overlay — acts as scroll container */}
        <Dialog.Overlay className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/50 p-4" />

        {/* Content */}
        <Dialog.Content
          style={{ width: '458.4px' }}
          className="fixed left-[50%] top-[50%] z-50 flex translate-x-[-50%] translate-y-[-50%] flex-col overflow-hidden rounded-lg border border-[oklch(0.922_0_0)] bg-white shadow-lg"
        >
          {/* Form */}
          <form onSubmit={handleSubmit} className="flex flex-col">
            {/* Body (header + fields) */}
            <div className="flex flex-col gap-3 p-5">
            {/* Header */}
            <div className="flex flex-col gap-2 pr-8 text-left">
              <Dialog.Title className="text-[18px] font-semibold leading-none">
                Criar canal
              </Dialog.Title>
              <Dialog.Description className="text-[14px] font-normal leading-snug text-[oklch(0.556_0_0)]">
                É nos canais do chat que as conversas acontecem. Use um nome que
                seja fácil de encontrar e entender.
              </Dialog.Description>
            </div>

            {/* Field: Name */}
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="channel-name"
                className="text-[14px] font-medium leading-none"
              >
                Nome
                <span className="ml-0.5 text-[#dc2626]">*</span>
              </label>
              <input
                id="channel-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Por exemplo, Ideias"
                autoFocus
                className="flex h-9 w-full min-w-0 rounded-md border border-[oklch(0.922_0_0)] bg-transparent px-3 py-1 text-[14px] shadow-xs outline-none transition-[color,box-shadow] placeholder:text-[oklch(0.556_0_0)] focus-visible:border-[oklch(0.708_0.165_254.624)] focus-visible:ring-[3px] focus-visible:ring-[oklch(0.708_0.165_254.624)]/50"
              />
            </div>

            {/* Field: Private toggle */}
            <div className="flex items-center justify-between gap-4">
              <div className="space-y-0.5">
                <label
                  htmlFor="channel-private-toggle"
                  className="flex cursor-pointer select-none items-center gap-2 text-[14px] font-medium leading-none"
                >
                  Tornar privado
                </label>
                <p className="text-[12px] font-normal text-[oklch(0.556_0_0)]">
                  Somente você e membros convidados têm acesso
                </p>
              </div>
              <button
                id="channel-private-toggle"
                type="button"
                role="switch"
                aria-checked={isPrivate}
                data-state={isPrivate ? 'checked' : 'unchecked'}
                onClick={() => setIsPrivate(!isPrivate)}
                className="peer inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[oklch(0.708_0.165_254.624)] focus-visible:ring-offset-2 focus-visible:ring-offset-white disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:bg-[oklch(0.145_0_0)] data-[state=unchecked]:bg-[oklch(0.922_0_0)]"
              >
                <span
                  data-state={isPrivate ? 'checked' : 'unchecked'}
                  className="pointer-events-none block h-5 w-5 rounded-full bg-white shadow-lg ring-0 transition-transform data-[state=checked]:translate-x-5 data-[state=unchecked]:translate-x-0"
                />
              </button>
            </div>

            {/* Field: Attach list toggle */}
            <div className="flex items-center justify-between gap-4">
              <div className="space-y-0.5">
                <label
                  htmlFor="channel-list-toggle"
                  className="flex cursor-pointer select-none items-center gap-2 text-[14px] font-medium leading-none"
                >
                  Adicionar uma lista
                </label>
                <p className="text-[12px] font-normal text-[oklch(0.556_0_0)]">
                  Anexe uma lista para gerenciar tarefas e trabalhos
                </p>
              </div>
              <button
                id="channel-list-toggle"
                type="button"
                role="switch"
                aria-checked={attachList}
                data-state={attachList ? 'checked' : 'unchecked'}
                onClick={() => setAttachList(!attachList)}
                className="peer inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[oklch(0.708_0.165_254.624)] focus-visible:ring-offset-2 focus-visible:ring-offset-white disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:bg-[oklch(0.145_0_0)] data-[state=unchecked]:bg-[oklch(0.922_0_0)]"
              >
                <span
                  data-state={attachList ? 'checked' : 'unchecked'}
                  className="pointer-events-none block h-5 w-5 rounded-full bg-white shadow-lg ring-0 transition-transform data-[state=checked]:translate-x-5 data-[state=unchecked]:translate-x-0"
                />
              </button>
            </div>
            </div>

            {/* Footer */}
            <div
              data-test="chat-room-create-presentational__create-chat"
              className="flex items-center justify-end gap-2 border-t border-[oklch(0.922_0_0)] bg-[oklch(0.985_0_0)] px-5 py-3"
            >
              <button
                type="submit"
                data-test="chat-room-create-presentational__create-button"
                data-chmln="create-room-button"
                cu3-type="primary"
                cu3-size="medium"
                disabled={!name.trim() || isPending}
                className="inline-flex h-9 cursor-pointer items-center justify-center rounded-md bg-[oklch(0.145_0_0)] px-4 py-2 text-[14px] font-medium text-white shadow-xs outline-none transition-all hover:bg-[oklch(0.205_0_0)] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isPending ? 'Criando...' : 'Criar'}
              </button>
            </div>
          </form>

          {/* Close button */}
          <Dialog.Close asChild>
            <button
              type="button"
              className="absolute right-4 top-4 rounded-full p-1 opacity-70 transition-opacity hover:bg-[oklch(0.97_0_0)] hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-[oklch(0.708_0.165_254.624)] focus:ring-offset-2 disabled:pointer-events-none"
            >
              <RiCloseLine className="size-4" />
              <span className="sr-only">Close</span>
            </button>
          </Dialog.Close>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
