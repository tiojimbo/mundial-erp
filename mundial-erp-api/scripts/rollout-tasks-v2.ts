/**
 * Rollout — Tasks v2 feature flag por workspace em waves progressivas (Gap #6).
 *
 * Liga explicitamente `workspace.settings.tasksV2Enabled = true` em percentual
 * deterministico de workspaces (wave). Suporte a janelas 5% → 25% → 50% → 100%.
 *
 * INFRA DE FLAG (validacao previa):
 *   O flag `TASKS_V2_ENABLED` e lido em runtime por `TasksFeatureFlagGuard`
 *   (src/common/feature-flags/tasks-feature-flag.guard.ts). Per-workspace vive
 *   em `workspace.settings.tasksV2Enabled` (Json bag, migration
 *   20260420_000006_workspace_settings). A infra ja existe e este script
 *   escreve nesse mesmo contrato — nada de schema novo.
 *
 * SEMANTICA DO GUARD (importante):
 *   O guard considera a feature ligada por default. Ele so NEGA se
 *   `settings.tasksV2Enabled === false` explicito. Isso significa que, para
 *   orquestrar waves, a postura recomendada pre-rollout e:
 *     (a) Setar `tasksV2Enabled = false` em TODOS os workspaces (opt-out
 *         inicial — fora do escopo deste script; geralmente feito via
 *         one-shot SQL controlado OU combinado com o env `TASKS_V2_ENABLED=false`
 *         como kill-switch global enquanto se promove workspaces).
 *     (b) Rodar este script com `--wave 5 --apply` → liga explicitamente
 *         `tasksV2Enabled = true` nos 5% primeiros workspaces (ordem
 *         createdAt ASC, id ASC como tiebreaker).
 *     (c) Reexecutar com `--wave 25 --apply`, depois `--wave 50`, `--wave 100`.
 *
 * ORDENACAO DETERMINISTICA:
 *   createdAt ASC + id ASC (tiebreaker). Isto garante que rerun, rollback e
 *   novos workspaces nao alteram a composicao das waves ja publicadas (novos
 *   entrantes vao para o final da fila — so entram na proxima wave >= X%).
 *
 * IDEMPOTENCIA:
 *   Reexecutar o mesmo `--wave N` e no-op: ja considera workspaces com
 *   `tasksV2Enabled === true` como "ja habilitados" e nao re-escreve.
 *   Rerun de `--wave 25` apos `--wave 5` expande o conjunto ate atingir 25%;
 *   nunca DESLIGA workspaces ja habilitados (operacao monotonica — para
 *   regressao explicita usar script dedicado de rollback).
 *
 * SEGURANCA:
 *   --dry-run e default. Precisa `--apply` explicito para escrever. Log
 *   estruturado via NestJS Logger (zero console.log).
 *
 * Uso:
 *   npm run rollout:tasks-v2 -- --wave 5              (dry-run: apenas lista)
 *   npm run rollout:tasks-v2 -- --wave 5 --apply      (escreve)
 *   npm run rollout:tasks-v2 -- --wave 25 --apply
 *   npm run rollout:tasks-v2 -- --wave 50 --apply
 *   npm run rollout:tasks-v2 -- --wave 100 --apply    (full rollout)
 *
 * Ver PLANO-TASKS-STATUS.md Gap #6 e PLANO-TASKS.md §9.1 (feature flags).
 */

import 'dotenv/config';
import { Logger } from '@nestjs/common';
import { Prisma, PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const SUPPORTED_WAVES = [5, 25, 50, 100] as const;
type SupportedWave = (typeof SUPPORTED_WAVES)[number];

interface Args {
  wave: SupportedWave;
  apply: boolean;
}

function parseArgs(argv: readonly string[]): Args {
  const waveIdx = argv.indexOf('--wave');
  if (waveIdx === -1 || typeof argv[waveIdx + 1] !== 'string') {
    throw new Error(
      `--wave e obrigatorio. Valores suportados: ${SUPPORTED_WAVES.join('|')}.`,
    );
  }
  const raw = argv[waveIdx + 1];
  const parsed = Number.parseInt(raw, 10);
  if (!SUPPORTED_WAVES.includes(parsed as SupportedWave)) {
    throw new Error(
      `--wave invalido: "${raw}". Valores suportados: ${SUPPORTED_WAVES.join('|')}.`,
    );
  }
  const apply = argv.includes('--apply');
  return { wave: parsed as SupportedWave, apply };
}

/**
 * Narrowing tipado do Json bag. `settings` e `Prisma.JsonValue`; so aceitamos
 * como "ligado" a igualdade estrita `true`. Qualquer outro valor (false, null,
 * undefined, string, array) conta como "nao ligado".
 */
function isTasksV2EnabledExplicitTrue(settings: Prisma.JsonValue): boolean {
  if (!settings || typeof settings !== 'object' || Array.isArray(settings)) {
    return false;
  }
  const bag = settings as Record<string, Prisma.JsonValue>;
  return bag.tasksV2Enabled === true;
}

function mergeEnableFlag(
  settings: Prisma.JsonValue,
): Prisma.InputJsonValue {
  const base =
    settings && typeof settings === 'object' && !Array.isArray(settings)
      ? (settings as Record<string, Prisma.JsonValue>)
      : {};
  return { ...base, tasksV2Enabled: true } as Prisma.InputJsonValue;
}

async function main(): Promise<void> {
  const logger = new Logger('rollout-tasks-v2');
  const args = parseArgs(process.argv.slice(2));

  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL ausente no ambiente.');
  }

  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
  const prisma = new PrismaClient({ adapter });

  try {
    const startedAt = new Date();
    logger.log({
      msg: 'rollout_started',
      wave: args.wave,
      mode: args.apply ? 'apply' : 'dry-run',
      startedAt: startedAt.toISOString(),
    });

    // 1) Lista TODOS os workspaces ativos (deletedAt IS NULL) em ordem
    //    deterministica. A ordenacao e a unica fonte de verdade para definir
    //    quem entra na wave.
    const workspaces = await prisma.workspace.findMany({
      where: { deletedAt: null },
      select: { id: true, name: true, slug: true, settings: true, createdAt: true },
      orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
    });

    const total = workspaces.length;
    if (total === 0) {
      logger.warn({ msg: 'rollout_empty_population' });
      return;
    }

    // 2) Tamanho alvo da wave = ceil(total * wave%). Garante que wave=100
    //    sempre cobre 100%, e waves pequenas cobrem pelo menos 1 workspace
    //    (quando ha populacao).
    const targetSize = Math.min(total, Math.ceil((total * args.wave) / 100));

    // 3) Seleciona os N primeiros da lista ordenada. O "ja habilitados" acima
    //    do prefix nao reduz o target — rerun com mesma wave e no-op real
    //    porque todos do prefixo ja estarao `true`.
    const prefix = workspaces.slice(0, targetSize);

    let toEnable: typeof prefix = [];
    let alreadyEnabled = 0;

    for (const ws of prefix) {
      if (isTasksV2EnabledExplicitTrue(ws.settings)) {
        alreadyEnabled += 1;
      } else {
        toEnable.push(ws);
      }
    }

    logger.log({
      msg: 'rollout_plan',
      wave: args.wave,
      totalWorkspaces: total,
      targetSize,
      alreadyEnabled,
      toEnableCount: toEnable.length,
      mode: args.apply ? 'apply' : 'dry-run',
    });

    // Defesa extra: se o alvo for menor que o numero ja habilitado no prefix,
    // significa que a populacao encolheu ou a ordenacao mudou — nao desligamos
    // ninguem (operacao monotonica). Logamos aviso para investigacao.
    if (alreadyEnabled > targetSize) {
      logger.warn({
        msg: 'rollout_monotonic_warning',
        detail:
          'Mais workspaces com tasksV2Enabled=true do que o alvo da wave. ' +
          'Operacao monotonica — nao desligamos ninguem. Verificar drift.',
        alreadyEnabled,
        targetSize,
      });
    }

    if (!args.apply) {
      for (const ws of toEnable) {
        logger.log({
          msg: 'rollout_dry_run_candidate',
          workspaceId: ws.id,
          slug: ws.slug,
          createdAt: ws.createdAt.toISOString(),
        });
      }
      logger.log({
        msg: 'rollout_finished',
        mode: 'dry-run',
        wouldEnable: toEnable.length,
      });
      return;
    }

    // 4) Writes: updates individuais dentro de $transaction para
    //    atomicidade (wave e uma unidade — ou vai tudo, ou nada).
    //    Idempotente: entradas ja `true` ficam fora de `toEnable`.
    let written = 0;
    await prisma.$transaction(async (tx) => {
      for (const ws of toEnable) {
        await tx.workspace.update({
          where: { id: ws.id },
          data: { settings: mergeEnableFlag(ws.settings) },
        });
        written += 1;
      }
    });

    const finishedAt = new Date();
    logger.log({
      msg: 'rollout_finished',
      mode: 'apply',
      wave: args.wave,
      totalWorkspaces: total,
      targetSize,
      alreadyEnabled,
      written,
      durationMs: finishedAt.getTime() - startedAt.getTime(),
      finishedAt: finishedAt.toISOString(),
    });
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err: unknown) => {
  // Erro de parsing de args ou falha fatal. Saida nao-zero para o shell.
  const logger = new Logger('rollout-tasks-v2');
  logger.error({
    msg: 'rollout_failed',
    err: err instanceof Error ? err.message : String(err),
    stack: err instanceof Error ? err.stack : undefined,
  });
  process.exit(1);
});
