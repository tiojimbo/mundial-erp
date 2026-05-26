'use client';

import * as Button from '@/components/ui/button';
import { useNotification } from '@/hooks/use-notification';
import type { ApiToken } from '../types/api-token.types';
import { useRevokeApiToken } from '../hooks/use-api-tokens';

type Props = {
  tokens: ApiToken[];
};

const COLUMN_CLASSES =
  'grid grid-cols-[1.6fr_1.2fr_1fr_1fr_120px] items-center gap-4 px-4 py-3';

export function ApiTokensTable({ tokens }: Props) {
  const { notification } = useNotification();
  const revoke = useRevokeApiToken();

  function handleRevoke(id: string) {
    revoke.mutate(id, {
      onSuccess: () => {
        notification({
          title: 'Sucesso',
          description: 'API key revogada com sucesso.',
          status: 'success',
        });
      },
      onError: () => {
        notification({
          title: 'Erro',
          description: 'Falha ao revogar a API key.',
          status: 'error',
        });
      },
    });
  }

  return (
    <div className='overflow-hidden rounded-2xl border border-stroke-soft-200 bg-bg-white-0'>
      <div
        className={`${COLUMN_CLASSES} bg-bg-weak-50 text-subheading-xs uppercase text-text-sub-600`}
      >
        <span>Nome</span>
        <span>Key</span>
        <span>Criado por</span>
        <span>Último uso</span>
        <span>Ações</span>
      </div>
      {tokens.map((t) => (
        <div
          key={t.id}
          className={`${COLUMN_CLASSES} border-t border-stroke-soft-200 text-paragraph-sm`}
        >
          <span className='font-medium text-text-strong-950'>{t.name}</span>
          <code className='text-paragraph-xs text-text-sub-600'>
            {t.prefix}...
          </code>
          <span className='text-text-sub-600'>{t.user.name}</span>
          <span className='text-text-sub-600'>
            {t.lastUsedAt
              ? new Date(t.lastUsedAt).toLocaleString('pt-BR')
              : 'Nunca'}
          </span>
          <Button.Root
            variant='error'
            mode='stroke'
            size='xsmall'
            disabled={revoke.isPending}
            onClick={() => handleRevoke(t.id)}
          >
            Revogar
          </Button.Root>
        </div>
      ))}
    </div>
  );
}
