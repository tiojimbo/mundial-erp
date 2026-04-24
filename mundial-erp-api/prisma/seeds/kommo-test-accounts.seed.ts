/**
 * Kommo Test Accounts Seed — fixtures para QA manual.
 *
 * Sprint 1 (Etapa 1) — Carolina Andrade (squad-kommo, QA + Security + Compliance).
 *
 * IMPORTANTE: este seed NAO e wireado em `prisma/seed-reference-data.ts` nem em
 * `prisma/seed-workspace.ts` nesta rodada. Fica disponivel como utilitario para
 * Hugo Monteiro / proximas rodadas ativarem quando os cenarios de QA manual
 * precisarem de um `KommoAccount` pronto por workspace.
 *
 * O que faz:
 *   - Upsert idempotente (por `workspaceId` — unique) de 1 `KommoAccount` por
 *     workspaceId passado na lista (max 2 recomendado).
 *   - `subdomain` determinado pelo indice: `test-workspace-1`, `test-workspace-2`, ...
 *   - `authType=LONG_LIVED_TOKEN` (dev; prod usa OAUTH2 via `/kommo/connect`).
 *   - `accessToken`: placeholder — ADR-006 (envelope encryption) ainda pendente.
 *   - `hmacSecret`: random 32 bytes hex por run. NUNCA valor fixo.
 *   - `status=ACTIVE`.
 *
 * O que NAO faz:
 *   - Nao cria workspaces — recebe os IDs prontos do chamador.
 *   - Nao cria conversations/messages — para isso, use `KommoFixtureBuilder`
 *     (em `test/utils/kommo-fixture-builder.ts`).
 *   - Nao loga segredos (hmacSecret / accessToken) — principio #13 squad-kommo.
 *
 * Handshakes:
 *   - Larissa (squad-kommo): depende do model `KommoAccount` — ja presente em
 *     `prisma/schema.prisma` linhas 2603-2624.
 *   - Rafael (squad-kommo): o `hmacSecret` random e compativel com o
 *     `validateHmac` que ele entrega nesta rodada.
 *   - Hugo (squad-dashboards): seed consumivel para preparar cenarios de
 *     smoke-test manual no ambiente dev.
 */

import { Logger } from '@nestjs/common';
import type { PrismaClient } from '@prisma/client';
import { randomBytes } from 'crypto';

const logger = new Logger('KommoTestAccountsSeed');

const ACCESS_TOKEN_PLACEHOLDER = 'local-dev-token-placeholder';

export interface SeedKommoTestAccountsResult {
  seededCount: number;
  /** Nao inclui secrets — expoe apenas os IDs para o chamador logar/validar. */
  accountIds: string[];
}

/**
 * Cria ou atualiza 1 `KommoAccount` por `workspaceId`. Idempotente.
 *
 * @param prisma      instancia ativa do PrismaClient
 * @param workspaceIds lista de workspaceIds ja existentes (validados pelo chamador)
 *
 * @throws se algum dos workspaces nao existir — FK `workspace_id` falha com
 *         P2003 do Prisma; mensagem generica no log, sem vazar IDs sensiveis.
 */
export async function seedKommoTestAccounts(
  prisma: PrismaClient,
  workspaceIds: string[],
): Promise<SeedKommoTestAccountsResult> {
  if (workspaceIds.length === 0) {
    logger.warn(
      'seedKommoTestAccounts called with empty workspaceIds — skipping.',
    );
    return { seededCount: 0, accountIds: [] };
  }

  const accountIds: string[] = [];

  for (let i = 0; i < workspaceIds.length; i += 1) {
    const workspaceId = workspaceIds[i];
    const subdomain = `test-workspace-${i + 1}`;
    const hmacSecret = randomBytes(32).toString('hex');

    const account = await prisma.kommoAccount.upsert({
      where: { workspaceId },
      update: {
        subdomain,
        authType: 'LONG_LIVED_TOKEN',
        status: 'ACTIVE',
        // Nao rotacionamos accessToken no update para nao invalidar testes
        // manuais em andamento — seed e idempotente e nao-destrutivo.
      },
      create: {
        workspaceId,
        subdomain,
        authType: 'LONG_LIVED_TOKEN',
        accessToken: ACCESS_TOKEN_PLACEHOLDER,
        refreshToken: null,
        hmacSecret,
        status: 'ACTIVE',
      },
      select: { id: true },
    });

    accountIds.push(account.id);
  }

  logger.log(
    `Seeded ${accountIds.length} KommoAccount(s) — subdomains test-workspace-1..${accountIds.length}.`,
  );
  // Intentional: nao logar hmacSecret, accessToken, workspaceIds.

  return { seededCount: accountIds.length, accountIds };
}
