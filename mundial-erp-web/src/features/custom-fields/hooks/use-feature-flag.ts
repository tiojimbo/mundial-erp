'use client';

import { useEffect, useState } from 'react';
import { isAxiosError } from 'axios';
import { api } from '@/lib/api';
import type { ApiResponse } from '@/types/api.types';

/**
 * Sprint 2 (TTT-023) — Hook de feature flag client-side.
 *
 * Estrategia (em ordem de precedencia):
 *   1. Cache em memoria (TTL 60s) — evita fetch a cada mount.
 *   2. GET `/feature-flags/:flag` — fonte autoritativa.
 *      TODO(backend): squad-tasks ainda NAO expoe esse endpoint publico
 *      (apenas guards internos em `common/feature-flags/`). Quando entregue,
 *      este path passa a funcionar sem mudancas.
 *   3. Fallback: `process.env.NEXT_PUBLIC_FEATURE_<FLAG_UPPER>` em build-time
 *      (ex.: `NEXT_PUBLIC_FEATURE_CUSTOM_FIELDS_WRITE=true`).
 *   4. Default: `false` — read-only seguro.
 *
 * Estende `FeatureFlagName` quando novas flags forem adicionadas (ex.:
 * `task_type_templates` na M2). Manter literal-union evita typo silencioso
 * em paginas que consomem.
 */

export type FeatureFlagName = 'custom_fields_write' | 'task_type_templates';

interface FlagCacheEntry {
  value: boolean;
  ts: number;
}

const FLAG_CACHE = new Map<FeatureFlagName, FlagCacheEntry>();
const TTL_MS = 60_000;

function readEnvFallback(flag: FeatureFlagName): boolean {
  // Mapeamento estatico — o Next.js inlina apenas `process.env.NEXT_PUBLIC_*`
  // referenciados literalmente. `process.env[dynamicKey]` NAO funciona em build,
  // por isso o switch explicito.
  switch (flag) {
    case 'custom_fields_write': {
      const raw = process.env.NEXT_PUBLIC_FEATURE_CUSTOM_FIELDS_WRITE;
      return raw === 'true' || raw === '1';
    }
    case 'task_type_templates': {
      const raw = process.env.NEXT_PUBLIC_FEATURE_TASK_TYPE_TEMPLATES;
      return raw === 'true' || raw === '1';
    }
  }
}

export function useFeatureFlag(flag: FeatureFlagName): boolean {
  const [enabled, setEnabled] = useState<boolean>(() => {
    const cached = FLAG_CACHE.get(flag);
    if (cached && Date.now() - cached.ts < TTL_MS) return cached.value;
    return readEnvFallback(flag);
  });

  useEffect(() => {
    let cancelled = false;
    const cached = FLAG_CACHE.get(flag);
    if (cached && Date.now() - cached.ts < TTL_MS) {
      // Cache quente — nao refaz request.
      return;
    }

    api
      .get<ApiResponse<{ enabled: boolean }>>(`/feature-flags/${flag}`)
      .then((response) => {
        if (cancelled) return;
        const value = response.data.data.enabled;
        FLAG_CACHE.set(flag, { value, ts: Date.now() });
        setEnabled(value);
      })
      .catch((err) => {
        if (cancelled) return;
        // 404 — endpoint ainda nao implementado no backend. Cai em env fallback
        // sem ruido em logs (esperado pelo TODO acima). Outros erros tambem
        // resolvem para fallback (best-effort).
        if (isAxiosError(err) && err.response?.status === 404) {
          const fallback = readEnvFallback(flag);
          FLAG_CACHE.set(flag, { value: fallback, ts: Date.now() });
          setEnabled(fallback);
          return;
        }
        const fallback = readEnvFallback(flag);
        setEnabled(fallback);
      });

    return () => {
      cancelled = true;
    };
  }, [flag]);

  return enabled;
}
