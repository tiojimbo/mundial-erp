'use client';

import { QueryClientProvider } from '@tanstack/react-query';
import { getQueryClient } from '@/lib/query-client';

export function QueryProvider({ children }: { children: React.ReactNode }) {
  // Usa singleton (browser) — mesma instância do interceptor axios.
  // Em SSR cada request recebe instância nova (getQueryClient lida).
  const queryClient = getQueryClient();

  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}
