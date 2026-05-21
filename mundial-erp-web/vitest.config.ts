import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'node:path';

/**
 * Sprint 2 (TTT-024) — Vitest config para testes de componentes/hooks.
 *
 * Escopo MVP: cobre `src/features/custom-fields/**` e os outros .test.tsx
 * que forem destravados depois. Next.js usa SWC mas Vitest precisa do
 * transformer proprio do `@vitejs/plugin-react` — sem isso JSX nao compila
 * no contexto de teste.
 */
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./vitest.setup.ts'],
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    css: false,
  },
});
