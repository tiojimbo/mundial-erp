/**
 * KommoFixtureBuilder — builder pattern para cenarios E2E/QA da integracao Kommo.
 *
 * Sprint 1 (Etapa 1) — Carolina Andrade (squad-kommo, QA + Security + Compliance).
 *
 * Referencias:
 *   - `mundial-erp-api/docs/test-plan-kommo.md` secao 2.3 (contrato do builder)
 *   - `mundial-erp-api/docs/threat-model-kommo.md` (ameacas T-I*, T-T*)
 *   - `.claude/plan/PLANO-KOMMO-DASHBOARD.md` secoes 13 (Sprint 1 K1-10) e 14
 *
 * Invariantes aplicadas:
 *   1. `workspaceId` e SEMPRE obrigatorio em toda chamada.
 *   2. `hmacSecret` gerado random por fixture run (crypto.randomBytes 32 bytes hex).
 *      NUNCA usar valor fixo — caso contrario, fuzz HMAC em CI pararia com secret
 *      conhecido e poderia mascarar regressao de autenticacao em prod.
 *   3. `contentPreview` truncado a 200 chars para refletir invariante do model
 *      (`KommoMessage.contentPreview` — squad-kommo principio #9 LGPD).
 *   4. `contentHash` SHA-256 do conteudo FULL (antes do truncamento) — preserva
 *      integridade mesmo que preview perca sufixo.
 *   5. Build roda via `prisma.$transaction([...])` para atomicidade (fixture
 *      parcial e lixo em teste E2E).
 *   6. Idempotencia NAO e garantida — fixtures sao descartaveis por run (cleanup
 *      por `workspaceId` basta; Prisma cascade faz o resto via onDelete: Cascade).
 *   7. Zero `any`, zero `console.log`, zero logging de secrets.
 *
 * Uso tipico:
 * ```ts
 * const fx = await new KommoFixtureBuilder(prisma)
 *   .withWorkspace('QA Workspace 1')
 *   .withKommoAccount({ subdomain: 'qa-ws-1' })
 *   .withConversation({ kommoChatId: 1001n, status: 'OPEN' })
 *   .withMessage({ kommoMessageId: 'msg-1', direction: 'IN' })
 *   .build();
 * expect(fx.workspaceId).toBeDefined();
 * ```
 *
 * Handshakes:
 *   - Rafael (squad-kommo): o `hmacSecret` random casa com o `validateHmac` que
 *     ele entrega nesta rodada. Fuzz HMAC real entra em rodada seguinte, quando
 *     o endpoint `/webhooks/kommo/:workspaceId` existir.
 *   - Larissa (squad-kommo): depende dos models em `prisma/schema.prisma`
 *     (`KommoAccount`, `KommoConversation`, `KommoMessage`) — ja presentes.
 *   - Hugo (squad-dashboards): este builder materializa o contrato descrito por
 *     ele no `test-plan-kommo.md` secao 2.3.
 */

import { createHash, randomBytes } from 'crypto';
import type {
  PrismaClient,
  KommoAccountStatus,
  KommoAuthType,
  KommoConversationStatus,
  KommoMessageDirection,
  Prisma,
} from '@prisma/client';

// Prisma transaction client — aceita tanto o client normal quanto o handle
// retornado pelo `$transaction` callback. Mesmo shape publico para os models.
type PrismaTxClient = Omit<
  PrismaClient,
  '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'
>;

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export interface WithKommoAccountOptions {
  subdomain: string;
  authType?: KommoAuthType;
  status?: KommoAccountStatus;
}

export interface WithConversationOptions {
  kommoChatId: bigint;
  status?: KommoConversationStatus;
  createdAt?: Date;
  resolvedAt?: Date | null;
  firstMessageAt?: Date | null;
  firstResponseAt?: Date | null;
  lastMessageAt?: Date | null;
  responsibleAgentId?: string | null;
  departmentId?: string | null;
  leadId?: string | null;
}

export interface WithMessageOptions {
  kommoMessageId: string;
  direction: KommoMessageDirection;
  /**
   * Conteudo "completo" da mensagem — usado para calcular `contentHash` via
   * SHA-256. O builder trunca para 200 chars ao armazenar em `contentPreview`.
   * Default: `'test message content'`.
   */
  contentPreview?: string;
  createdAt?: Date;
  authorAgentId?: string | null;
  /**
   * Se informado, associa a mensagem a uma conversa previamente registrada
   * via `withConversation()`. Caso omitido, associa a ULTIMA conversa
   * registrada no builder (conveniencia para specs simples).
   */
  conversationIndex?: number;
}

export interface KommoFixtureResult {
  workspaceId: string;
  accountId: string;
  conversationIds: string[];
  messageIds: string[];
  /**
   * Secret HMAC gerado para este fixture run. Exposto APENAS para que specs
   * possam assinar payloads de webhook no teste — nao persistir fora do run.
   * NUNCA logar.
   */
  hmacSecret: string;
}

// ---------------------------------------------------------------------------
// Internal plan shape — descricao declarativa antes do $transaction
// ---------------------------------------------------------------------------

interface WorkspacePlan {
  name: string;
}

interface AccountPlan {
  subdomain: string;
  authType: KommoAuthType;
  status: KommoAccountStatus;
}

interface ConversationPlan {
  kommoChatId: bigint;
  status: KommoConversationStatus;
  createdAt?: Date;
  resolvedAt?: Date | null;
  firstMessageAt?: Date | null;
  firstResponseAt?: Date | null;
  lastMessageAt?: Date | null;
  responsibleAgentId?: string | null;
  departmentId?: string | null;
  leadId?: string | null;
}

interface MessagePlan {
  conversationIndex: number;
  kommoMessageId: string;
  direction: KommoMessageDirection;
  contentFull: string;
  createdAt?: Date;
  authorAgentId?: string | null;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const CONTENT_PREVIEW_MAX_CHARS = 200;
const DEFAULT_CONTENT = 'test message content';
const DEFAULT_PASSWORD_HASH =
  '$2b$10$KommoFixtureBuilderPasswordHashPlaceholderxxxxxxxxxxxxxxxxx';

// ---------------------------------------------------------------------------
// Builder
// ---------------------------------------------------------------------------

/**
 * Builder imutavel-por-chamada (cada `withX` valida invariantes e atualiza o
 * plano interno). A materializacao ocorre so em `build()`, dentro de um
 * unico `$transaction` — se qualquer passo falhar, nada e persistido.
 */
export class KommoFixtureBuilder {
  private workspacePlan: WorkspacePlan | null = null;
  private accountPlan: AccountPlan | null = null;
  private readonly conversationPlans: ConversationPlan[] = [];
  private readonly messagePlans: MessagePlan[] = [];

  constructor(private readonly prisma: PrismaClient) {}

  // -------------------------------------------------------------------------
  // Declaracao (chainable)
  // -------------------------------------------------------------------------

  withWorkspace(name: string): this {
    if (this.workspacePlan !== null) {
      throw new Error(
        'KommoFixtureBuilder: withWorkspace() can only be called once per fixture.',
      );
    }
    if (!name.trim()) {
      throw new Error('KommoFixtureBuilder: workspace name must be non-empty.');
    }
    this.workspacePlan = { name: name.trim() };
    return this;
  }

  withKommoAccount(opts: WithKommoAccountOptions): this {
    if (this.workspacePlan === null) {
      throw new Error(
        'KommoFixtureBuilder: call withWorkspace() before withKommoAccount().',
      );
    }
    if (this.accountPlan !== null) {
      throw new Error(
        'KommoFixtureBuilder: KommoAccount is 1:1 with Workspace — only one allowed.',
      );
    }
    if (!opts.subdomain.trim()) {
      throw new Error(
        'KommoFixtureBuilder: KommoAccount.subdomain must be non-empty.',
      );
    }
    this.accountPlan = {
      subdomain: opts.subdomain.trim(),
      authType: opts.authType ?? 'LONG_LIVED_TOKEN',
      status: opts.status ?? 'ACTIVE',
    };
    return this;
  }

  withConversation(opts: WithConversationOptions): this {
    if (this.accountPlan === null) {
      throw new Error(
        'KommoFixtureBuilder: call withKommoAccount() before withConversation().',
      );
    }
    this.conversationPlans.push({
      kommoChatId: opts.kommoChatId,
      status: opts.status ?? 'OPEN',
      createdAt: opts.createdAt,
      resolvedAt: opts.resolvedAt ?? null,
      firstMessageAt: opts.firstMessageAt ?? null,
      firstResponseAt: opts.firstResponseAt ?? null,
      lastMessageAt: opts.lastMessageAt ?? null,
      responsibleAgentId: opts.responsibleAgentId ?? null,
      departmentId: opts.departmentId ?? null,
      leadId: opts.leadId ?? null,
    });
    return this;
  }

  withMessage(opts: WithMessageOptions): this {
    if (this.conversationPlans.length === 0) {
      throw new Error(
        'KommoFixtureBuilder: call withConversation() before withMessage().',
      );
    }
    const conversationIndex =
      opts.conversationIndex ?? this.conversationPlans.length - 1;
    if (
      conversationIndex < 0 ||
      conversationIndex >= this.conversationPlans.length
    ) {
      throw new Error(
        `KommoFixtureBuilder: conversationIndex ${conversationIndex} out of range.`,
      );
    }
    const contentFull = opts.contentPreview ?? DEFAULT_CONTENT;
    this.messagePlans.push({
      conversationIndex,
      kommoMessageId: opts.kommoMessageId,
      direction: opts.direction,
      contentFull,
      createdAt: opts.createdAt,
      authorAgentId: opts.authorAgentId ?? null,
    });
    return this;
  }

  // -------------------------------------------------------------------------
  // Materializacao
  // -------------------------------------------------------------------------

  async build(): Promise<KommoFixtureResult> {
    if (this.workspacePlan === null) {
      throw new Error(
        'KommoFixtureBuilder: nothing to build — call withWorkspace() first.',
      );
    }
    if (this.accountPlan === null) {
      throw new Error(
        'KommoFixtureBuilder: build() requires withKommoAccount().',
      );
    }

    const hmacSecret = randomBytes(32).toString('hex');
    const workspacePlan = this.workspacePlan;
    const accountPlan = this.accountPlan;
    const conversationPlans = this.conversationPlans.slice();
    const messagePlans = this.messagePlans.slice();

    // Entropia curta unica — colide com probabilidade ~0 entre runs concorrentes
    // e protege `email`/`slug` unique constraints.
    const runSuffix = randomBytes(6).toString('hex');

    return this.prisma.$transaction(async (tx: PrismaTxClient) => {
      // 1) Owner user (necessario pelo FK Workspace.ownerId)
      const owner = await tx.user.create({
        data: {
          email: `kommo-fixture-owner-${runSuffix}@test.local`,
          name: `Kommo Fixture Owner ${runSuffix}`,
          passwordHash: DEFAULT_PASSWORD_HASH,
          role: 'ADMIN',
        },
        select: { id: true },
      });

      // 2) Workspace
      const workspace = await tx.workspace.create({
        data: {
          name: workspacePlan.name,
          slug: `kommo-fx-${runSuffix}`,
          ownerId: owner.id,
        },
        select: { id: true },
      });

      // 3) KommoAccount (1:1 com Workspace)
      const account = await tx.kommoAccount.create({
        data: {
          workspaceId: workspace.id,
          subdomain: accountPlan.subdomain,
          authType: accountPlan.authType,
          accessToken: 'fixture-access-token-placeholder',
          refreshToken:
            accountPlan.authType === 'OAUTH2'
              ? 'fixture-refresh-token-placeholder'
              : null,
          hmacSecret,
          status: accountPlan.status,
        },
        select: { id: true },
      });

      // 4) Conversations (ordem preservada)
      const conversationIds: string[] = [];
      for (const plan of conversationPlans) {
        const conv = await tx.kommoConversation.create({
          data: {
            workspaceId: workspace.id,
            accountId: account.id,
            kommoChatId: plan.kommoChatId,
            status: plan.status,
            createdAt: plan.createdAt,
            resolvedAt: plan.resolvedAt,
            firstMessageAt: plan.firstMessageAt,
            firstResponseAt: plan.firstResponseAt,
            lastMessageAt: plan.lastMessageAt,
            responsibleAgentId: plan.responsibleAgentId,
            departmentId: plan.departmentId,
            leadId: plan.leadId,
          },
          select: { id: true },
        });
        conversationIds.push(conv.id);
      }

      // 5) Messages
      const messageIds: string[] = [];
      for (const plan of messagePlans) {
        const contentFull = plan.contentFull;
        const preview = contentFull.slice(0, CONTENT_PREVIEW_MAX_CHARS);
        const contentHash = createHash('sha256')
          .update(contentFull)
          .digest('hex');

        const msg = await tx.kommoMessage.create({
          data: {
            workspaceId: workspace.id,
            accountId: account.id,
            conversationId: conversationIds[plan.conversationIndex],
            kommoMessageId: plan.kommoMessageId,
            direction: plan.direction,
            authorAgentId: plan.authorAgentId,
            contentPreview: preview,
            contentHash,
            createdAt: plan.createdAt,
          },
          select: { id: true },
        });
        messageIds.push(msg.id);
      }

      return {
        workspaceId: workspace.id,
        accountId: account.id,
        conversationIds,
        messageIds,
        hmacSecret,
      } satisfies KommoFixtureResult;
    });
  }
}

/**
 * Utility type re-export para consumidores que queiram tipar o callback de tx
 * sem reimportar a gymnastica do Prisma.
 *
 * Nao usado internamente alem da declaracao — exportado por conveniencia.
 */
export type KommoFixtureTxClient = PrismaTxClient;
export type { Prisma };
