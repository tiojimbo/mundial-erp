// @ts-check
import eslint from '@eslint/js';
import eslintPluginPrettierRecommended from 'eslint-plugin-prettier/recommended';
import globals from 'globals';
import tseslint from 'typescript-eslint';
import { createRequire } from 'node:module';

// Plugin local: regras customizadas do Mundial ERP.
// Registrado via `createRequire` porque o plugin e CommonJS (eslint-rules/index.js).
// Ver ADR-001 (primary-assignee-cache), ADR-002 (activity-write), ADR-003 (event-emitter).
const require = createRequire(import.meta.url);
const mundialPlugin = require('./eslint-rules');

export default tseslint.config(
  {
    ignores: ['eslint.config.mjs', 'eslint-rules/__tests__/**'],
  },
  eslint.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,
  eslintPluginPrettierRecommended,
  {
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.jest,
      },
      sourceType: 'commonjs',
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    plugins: {
      // Prefixo `mundial/` para todas as regras locais.
      mundial: mundialPlugin,
    },
  },
  {
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-floating-promises': 'warn',
      '@typescript-eslint/no-unsafe-argument': 'off',
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
      '@typescript-eslint/no-unsafe-call': 'off',
      '@typescript-eslint/no-unsafe-return': 'off',
      '@typescript-eslint/unbound-method': 'off',
      '@typescript-eslint/restrict-template-expressions': 'off',
      '@typescript-eslint/no-base-to-string': 'off',
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
          destructuredArrayIgnorePattern: '^_',
        },
      ],
      'prettier/prettier': ['error', { endOfLine: 'auto' }],

      // Regras Tasks feature (severity: error). Cada uma cobre um ADR.
      'mundial/no-direct-primary-assignee-cache-write': 'error',
      'mundial/no-direct-activity-write': 'error',
      'mundial/no-direct-event-emitter-in-hot-path': 'error',
    },
  },
  {
    files: ['**/*.spec.ts', '**/*.e2e-spec.ts', 'test/**/*.ts'],
    rules: {
      '@typescript-eslint/unbound-method': 'off',
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
      '@typescript-eslint/no-unsafe-call': 'off',
      '@typescript-eslint/no-unsafe-return': 'off',
      '@typescript-eslint/no-unsafe-argument': 'off',
      '@typescript-eslint/require-await': 'off',
      '@typescript-eslint/no-misused-promises': 'off',
      '@typescript-eslint/no-floating-promises': 'off',
      '@typescript-eslint/restrict-template-expressions': 'off',
      '@typescript-eslint/no-base-to-string': 'off',

      // Os testes podem mockar direto — mantemos as rules ligadas apenas em
      // producao para nao bloquear o teste do proprio escritor legitimo.
      'mundial/no-direct-primary-assignee-cache-write': 'off',
      'mundial/no-direct-activity-write': 'off',
      'mundial/no-direct-event-emitter-in-hot-path': 'off',
    },
  },
);
