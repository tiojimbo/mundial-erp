'use client';

import { useState } from 'react';
import { RiHashtag } from '@remixicon/react';
import * as Modal from '@/components/ui/modal';
import * as Button from '@/components/ui/button';
import * as Input from '@/components/ui/input';
import * as Switch from '@/components/ui/switch';
import * as Label from '@/components/ui/label';
import { useCreateChannel } from '../hooks/use-channels';
import { useChatStore } from '@/stores/chat.store';
import { useRouter } from 'next/navigation';
import type { ChannelVisibility } from '../types/chat.types';

type CreateChannelDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function CreateChannelDialog({
  open,
  onOpenChange,
}: CreateChannelDialogProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isPrivate, setIsPrivate] = useState(false);
  const { mutate: createChannel, isPending } = useCreateChannel();
  const setActiveChannel = useChatStore((s) => s.setActiveChannel);
  const router = useRouter();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const visibility: ChannelVisibility = isPrivate ? 'PRIVATE' : 'PUBLIC';

    createChannel(
      {
        name: name.trim(),
        description: description.trim() || undefined,
        visibility,
      },
      {
        onSuccess: (channel) => {
          setActiveChannel(channel.id);
          router.push('/chat');
          onOpenChange(false);
          setName('');
          setDescription('');
          setIsPrivate(false);
        },
      },
    );
  };

  return (
    <Modal.Root open={open} onOpenChange={onOpenChange}>
      <Modal.Content>
        <Modal.Header
          icon={RiHashtag}
          title='Criar Canal'
          description='Canais sao onde as conversas acontecem sobre um topico.'
        />
        <form onSubmit={handleSubmit}>
          <Modal.Body className='space-y-4'>
            {/* Nome */}
            <div className='space-y-1.5'>
              <Label.Root htmlFor='channel-name'>
                Nome do canal
                <Label.Asterisk />
              </Label.Root>
              <Input.Root>
                <Input.Wrapper>
                  <Input.Input
                    id='channel-name'
                    placeholder='ex: financeiro, vendas-geral'
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    autoFocus
                  />
                </Input.Wrapper>
              </Input.Root>
            </div>

            {/* Descricao */}
            <div className='space-y-1.5'>
              <Label.Root htmlFor='channel-desc'>Descricao</Label.Root>
              <Input.Root>
                <Input.Wrapper>
                  <Input.Input
                    id='channel-desc'
                    placeholder='Sobre o que e este canal?'
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                  />
                </Input.Wrapper>
              </Input.Root>
            </div>

            {/* Privado */}
            <div className='flex items-center justify-between'>
              <div>
                <p className='text-label-sm text-text-strong-950'>
                  Canal privado
                </p>
                <p className='text-paragraph-xs text-text-sub-600'>
                  Somente membros convidados podem acessar
                </p>
              </div>
              <Switch.Root
                checked={isPrivate}
                onCheckedChange={setIsPrivate}
              />
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
              disabled={!name.trim() || isPending}
            >
              {isPending ? 'Criando...' : 'Criar Canal'}
            </Button.Root>
          </Modal.Footer>
        </form>
      </Modal.Content>
    </Modal.Root>
  );
}
