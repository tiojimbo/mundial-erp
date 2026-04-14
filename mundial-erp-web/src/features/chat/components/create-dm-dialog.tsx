'use client';

import { useState } from 'react';
import { RiUserLine, RiSearchLine } from '@remixicon/react';
import * as Modal from '@/components/ui/modal';
import * as Button from '@/components/ui/button';
import * as Input from '@/components/ui/input';
import * as Label from '@/components/ui/label';
import { useCreateDm } from '../hooks/use-channels';
import { useChatStore } from '@/stores/chat.store';
import { useRouter } from 'next/navigation';

type CreateDmDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function CreateDmDialog({
  open,
  onOpenChange,
}: CreateDmDialogProps) {
  const [userIdInput, setUserIdInput] = useState('');
  const { mutate: createDm, isPending } = useCreateDm();
  const setActiveChannel = useChatStore((s) => s.setActiveChannel);
  const router = useRouter();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const userIds = userIdInput
      .split(',')
      .map((id) => id.trim())
      .filter(Boolean);

    createDm(
      { userIds: userIds.length > 0 ? userIds : undefined },
      {
        onSuccess: (channel) => {
          setActiveChannel(channel.id);
          router.push('/chat');
          onOpenChange(false);
          setUserIdInput('');
        },
      },
    );
  };

  return (
    <Modal.Root open={open} onOpenChange={onOpenChange}>
      <Modal.Content>
        <Modal.Header
          icon={RiUserLine}
          title='Nova Mensagem Direta'
          description='Inicie uma conversa com um ou mais usuarios.'
        />
        <form onSubmit={handleSubmit}>
          <Modal.Body className='space-y-4'>
            <div className='space-y-1.5'>
              <Label.Root htmlFor='dm-users'>
                ID dos usuarios (separados por virgula)
              </Label.Root>
              <Input.Root>
                <Input.Wrapper>
                  <Input.Input
                    id='dm-users'
                    placeholder='ID do usuario...'
                    value={userIdInput}
                    onChange={(e) => setUserIdInput(e.target.value)}
                    autoFocus
                  />
                </Input.Wrapper>
              </Input.Root>
              <p className='text-paragraph-xs text-text-sub-600'>
                Deixe vazio para criar uma mensagem para si mesmo (Self DM).
              </p>
            </div>
          </Modal.Body>

          <Modal.Footer>
            <Modal.Close asChild>
              <Button.Root
                type='button'
                variant='neutral'
                mode='stroke'
                size='small'
              >
                Cancelar
              </Button.Root>
            </Modal.Close>
            <Button.Root
              type='submit'
              variant='primary'
              mode='filled'
              size='small'
              disabled={isPending}
            >
              {isPending ? 'Criando...' : 'Iniciar Conversa'}
            </Button.Root>
          </Modal.Footer>
        </form>
      </Modal.Content>
    </Modal.Root>
  );
}
