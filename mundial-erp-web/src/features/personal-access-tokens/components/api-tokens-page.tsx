'use client';

import { useState } from 'react';
import { RiAddLine } from '@remixicon/react';
import * as Button from '@/components/ui/button';
import { useApiTokens } from '../hooks/use-api-tokens';
import type { ApiTokenCreated } from '../types/api-token.types';
import { ApiTokensTable } from './api-tokens-table';
import { ApiTokensEmptyState } from './api-tokens-empty-state';
import { CreateApiTokenModal } from './create-api-token-modal';
import { ApiTokenRevealedModal } from './api-token-revealed-modal';

export function ApiTokensPage() {
  const { data: tokens = [], isLoading, isError, refetch } = useApiTokens();
  const [createOpen, setCreateOpen] = useState(false);
  const [revealed, setRevealed] = useState<ApiTokenCreated | null>(null);

  function handleCreated(created: ApiTokenCreated) {
    setCreateOpen(false);
    setRevealed(created);
  }

  return (
    <div className='space-y-6 p-6'>
      <div>
        <h1 className='text-title-h5 text-text-strong-950'>API</h1>
        <p className='mt-1 text-paragraph-sm text-text-sub-600'>
          Gerencie suas API keys para integrações externas. As keys permitem acesso programático ao seu workspace.
        </p>
      </div>

      <div className='flex items-center justify-between'>
        <h2 className='text-label-md font-semibold text-text-strong-950'>
          API Keys
        </h2>
        <Button.Root
          variant='primary'
          mode='filled'
          size='small'
          onClick={() => setCreateOpen(true)}
        >
          <Button.Icon as={RiAddLine} />
          Criar API Key
        </Button.Root>
      </div>

      {isLoading ? (
        <div className='py-12 text-center text-paragraph-sm text-text-sub-600'>
          Carregando...
        </div>
      ) : isError ? (
        <div className='flex flex-col items-center justify-center rounded-2xl border border-error-base/30 bg-error-light-50 py-12'>
          <p className='text-paragraph-sm text-text-strong-950'>
            Não foi possível carregar suas API keys.
          </p>
          <Button.Root
            variant='neutral'
            mode='stroke'
            size='small'
            className='mt-4'
            onClick={() => refetch()}
          >
            Tentar novamente
          </Button.Root>
        </div>
      ) : tokens.length === 0 ? (
        <ApiTokensEmptyState onCreate={() => setCreateOpen(true)} />
      ) : (
        <ApiTokensTable tokens={tokens} />
      )}

      <CreateApiTokenModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={handleCreated}
      />
      <ApiTokenRevealedModal
        token={revealed}
        onClose={() => setRevealed(null)}
      />
    </div>
  );
}
