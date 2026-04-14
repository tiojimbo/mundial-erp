'use client';

import { useAuth } from '@/providers/auth-provider';

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Bom dia';
  if (hour < 18) return 'Boa tarde';
  return 'Boa noite';
}

export function Greeting() {
  const { user } = useAuth();
  const firstName = user?.name?.split(' ')[0] ?? 'Usuário';

  return (
    <div>
      <h1 className='text-title-h4 text-text-strong-950'>
        {getGreeting()}, {firstName}
      </h1>
      <p className='text-paragraph-sm text-text-sub-600'>
        Aqui está o resumo das suas atividades de hoje.
      </p>
    </div>
  );
}
