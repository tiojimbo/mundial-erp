'use client';

import { useRef, useState } from 'react';
import { RiCameraLine, RiUploadLine } from '@remixicon/react';
import * as Avatar from '@/components/ui/avatar';
import * as Button from '@/components/ui/button';
import { useAuth } from '@/providers/auth-provider';
import { useUploadAvatar } from '../hooks/use-account';
import { useNotification } from '@/hooks/use-notification';

const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB
const ACCEPTED_TYPES = ['image/png', 'image/jpeg'];

function getInitials(name: string) {
  return name
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase();
}

export function AvatarUpload() {
  const { user } = useAuth();
  const { notification } = useNotification();
  const uploadAvatar = useUploadAvatar();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);

  const avatarSrc = preview ?? user?.avatarUrl ?? null;
  const initials = user?.name ? getInitials(user.name) : 'U';

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!ACCEPTED_TYPES.includes(file.type)) {
      notification({
        title: 'Formato inválido',
        description: 'Apenas PNG e JPG são aceitos.',
        status: 'error',
      });
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      notification({
        title: 'Arquivo muito grande',
        description: 'O tamanho máximo é 2MB.',
        status: 'error',
      });
      return;
    }

    setPreview(URL.createObjectURL(file));
    uploadAvatar.mutate(file, {
      onSuccess: () => {
        notification({
          title: 'Avatar atualizado',
          description: 'Sua foto de perfil foi atualizada.',
          status: 'success',
        });
      },
      onError: () => {
        setPreview(null);
        notification({
          title: 'Erro',
          description: 'Falha ao enviar a imagem.',
          status: 'error',
        });
      },
    });

    // Reset input so same file can be re-selected
    e.target.value = '';
  }

  function triggerFileInput() {
    fileInputRef.current?.click();
  }

  return (
    <div className='flex items-center gap-4'>
      {/* Avatar with hover overlay */}
      <button
        type='button'
        onClick={triggerFileInput}
        className='group relative'
      >
        <Avatar.Root size='80' className='!size-24'>
          {avatarSrc ? (
            <Avatar.Image src={avatarSrc} alt={user?.name ?? 'Avatar'} />
          ) : (
            <span className='flex size-full items-center justify-center rounded-full bg-primary-base text-title-h5 text-static-white'>
              {initials}
            </span>
          )}
        </Avatar.Root>

        {/* Hover overlay */}
        <div className='absolute inset-0 flex items-center justify-center rounded-full bg-static-black/40 opacity-0 transition-opacity group-hover:opacity-100'>
          <RiCameraLine className='size-6 text-static-white' />
        </div>
      </button>

      {/* Upload button + helper text */}
      <div>
        <Button.Root
          type='button'
          variant='neutral'
          mode='stroke'
          size='small'
          onClick={triggerFileInput}
          disabled={uploadAvatar.isPending}
        >
          <Button.Icon as={RiUploadLine} />
          {uploadAvatar.isPending ? 'Enviando...' : 'Carregar imagem'}
        </Button.Root>
        <p className='mt-1 text-paragraph-xs text-text-soft-400'>
          Formato recomendado: PNG, JPG. Tamanho máximo: 2MB
        </p>
      </div>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type='file'
        accept='image/png,image/jpeg'
        className='hidden'
        onChange={handleFileSelect}
      />
    </div>
  );
}
