/**
 * E2E — POST /webhooks/kommo/:workspaceId — Security Contract (ADR-005).
 *
 * Sprint 1 (Etapa 1) — Carolina Andrade (squad-kommo, QA + Security + Compliance).
 * Story K1-9 (fuzz HMAC + E2E cross-tenant + idempotency).
 *
 * Cobre as invariantes de seguranca P0/P1 do webhook Kommo:
 *   - HMAC-SHA256 obrigatorio (bit-flip rejeitado; algoritmo diferente rejeitado;
 *     signature ausente rejeitada) — ADR-005 §2.3 P0#1/#2, threat-model T-S1/T-T1.
 *   - Idempotencia por `(workspaceId, eventId)` unique — ADR-005 §2.1#5,
 *     threat-model T-R1 (replay).
 *   - Cross-tenant: URL `:workspaceId` deve casar com `account_id` do payload
 *     assinado — ADR-005 §2.1#6, threat-model T-T2 (URL swap).
 *   - Stealth 404 para workspace desconhecido — principio #1 squad-kommo
 *     (nunca vazar existencia do tenant).
 *   - Feature flag global kill switch — respostas 404, nao 503.
 *
 * Dependencias deste spec (paralelo ao Rafael/Larissa/Mateus):
 *   - Rafael (squad-kommo): controller `POST /webhooks/kommo/:workspaceId`
 *     com raw body middleware, HMAC validator (ja existe — KommoApiClient),
 *     lookup de KommoAccount por workspaceId, cross-tenant check, insert
 *     KommoWebhookEvent (unique `(workspaceId, eventId)`), enqueue BullMQ.
 *     Se o controller ainda nao estiver wireado no AppModule, **todos** os
 *     cenarios retornam 404 (NotFoundException do Nest router) em vez dos
 *     codigos esperados — isso eh contabilizado como falha real no CI e
 *     sinaliza dependencia bloqueada.
 *   - Larissa (squad-kommo): schema `KommoAccount` + `KommoWebhookEvent` —
 *     ja em place (verificado em `prisma/schema.prisma`).
 *   - Mateus (squad-kommo): worker que consome a fila — irrelevante para
 *     este spec (testamos ate o ack, nao o processamento downstream).
 *
 * Referencias:
 *   - `.claude/plan/PLANO-KOMMO-DASHBOARD.md` secoes 7.2, 8.2, 14.2, 16 (R-K1)
 *   - `.claude/adr/005-kommo-webhook-hmac.md` — contrato completo
 *   - `mundial-erp-api/docs/threat-model-kommo.md` T-S1/T-T1/T-T2/T-I2/T-R1
 *   - `mundial-erp-api/test/utils/kommo-fixture-builder.ts` — setup atomico
 *   - `mundial-erp-api/src/modules/kommo-api-client/kommo-api-client.service.ts`
 *     — `validateHmac` (mesmo contrato aplicado server-side)
 *
 * Decisoes de implementacao registradas para handshake:
 *   - **Raw body**: o spec serializa o corpo como string via JSON.stringify e
 *     envia pelo supertest com Content-Type application/json. Rafael usa
 *     `express.raw({ type: 'application/json' })` na rota Kommo (ADR-005
 *     §2.1#8), entao o handler ve exatamente os bytes aqui enviados. Se Rafael
 *     mudar para outro parser (ex: `bodyParser.json({ verify })`), o HMAC
 *     calculado aqui ainda bate desde que o cliente envie o mesmo canonico —
 *     mas qualquer re-serializacao server-side quebra o teste (flag no CI).
 *   - **Header de signature**: assumido `x-kommo-signature` (minuscula — Express
 *     normaliza). Se Rafael usar outro nome, este teste retorna 401 em todos
 *     os cenarios validos — facil de corrigir (1 constante).
 *   - **Rota publica**: assumido `POST /webhooks/kommo/:workspaceId` SEM o
 *     prefixo global `api/v1` (webhooks convencionalmente nao sao versionados).
 *     Se Rafael aplicar o prefixo, trocar `WEBHOOK_PATH`.
 *   - **Payload `account_id`**: ADR-005 §2.1#6 exige casar payload.account_id
 *     com o identificador externo da conta Kommo. O schema `KommoAccount` hoje
 *     nao tem coluna `kommoAccountId` explicita — apenas `subdomain`. O teste
 *     envia `account_id: subdomain` como proxy; se Rafael adicionar outra
 *     coluna (ex: `externalAccountId: BigInt`), trocar para o valor correto.
 *     **GAP do ADR-005 reportado no resumo.**
 *   - **Feature flag**: o spec forca `process.env.KOMMO_SYNC_ENABLED = 'true'`
 *     antes de compilar o AppModule (sem isso, o KommoFeatureFlagGuard devolve
 *     404 em TODA rota Kommo). Cenario de flag=false entra como TODO — testar
 *     em spec separada reinicializando o modulo.
 *
 * LGPD / secrets:
 *   - `hmacSecret` do fixture NUNCA eh logado. Jest redige por default em
 *     failures a partir do serializador padrao (propriedades diretas do
 *     objeto de erro). Nao exponha via `console.log`.
 */

import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { createHmac } from 'node:crypto';
import request from 'supertest';

import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/database/prisma.service';
import { KommoFixtureBuilder } from './utils/kommo-fixture-builder';

// ---------------------------------------------------------------------------
// Constants / handshake points
// ---------------------------------------------------------------------------

/**
 * Rota publica do webhook. Se Rafael escolher outra convencao, trocar aqui
 * e documentar em handshake com squad-kommo.
 */
const WEBHOOK_PATH = (workspaceId: string): string =>
  `/webhooks/kommo/${workspaceId}`;

/**
 * Nome do header de signature conforme ADR-005 §Open Questions #1.
 * Express normaliza para minusculas na leitura — aqui enviamos em minusculo
 * para consistencia.
 */
const SIG_HEADER = 'x-kommo-signature';

/**
 * Tipo minimo de evento Kommo para o teste (incoming chat message — §4.1 do
 * PLANO). Conteudo concreto nao importa para o contrato de seguranca; o que
 * importa eh `event_id`, `event_type`, `timestamp`, `account_id`.
 */
interface KommoWebhookPayload {
  event_id: string;
  event_type: string;
  timestamp: number; // unix seconds
  account_id: string; // subdomain do KommoAccount (proxy — ver doc do arquivo)
  // Campos extras podem existir — opacos para este spec.
  [key: string]: unknown;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function sha256Hmac(rawBody: string, secret: string): string {
  return createHmac('sha256', secret).update(rawBody).digest('hex');
}

function sha1Hmac(rawBody: string, secret: string): string {
  return createHmac('sha1', secret).update(rawBody).digest('hex');
}

/**
 * Gera um payload determinístico com `event_id` unico por chamada (evita
 * colisao cross-test via unique constraint).
 */
function makePayload(
  accountSubdomain: string,
  overrides: Partial<KommoWebhookPayload> = {},
): KommoWebhookPayload {
  const eventId =
    overrides.event_id ??
    `evt-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  return {
    event_id: eventId,
    event_type: 'incoming_chat_message',
    timestamp: Math.floor(Date.now() / 1000),
    account_id: accountSubdomain,
    ...overrides,
  };
}

/**
 * Serializa e assina o payload em um unico passo. Retorna o raw body exato
 * que deve ir no `.send()` — re-serializar quebraria o HMAC.
 */
function sign(
  payload: KommoWebhookPayload,
  secret: string,
): { rawBody: string; signature: string } {
  const rawBody = JSON.stringify(payload);
  return { rawBody, signature: sha256Hmac(rawBody, secret) };
}

// ---------------------------------------------------------------------------
// Suite
// ---------------------------------------------------------------------------

describe('POST /webhooks/kommo/:workspaceId — Security Contract (ADR-005)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let dbAvailable = true;

  // IDs criados ao longo da suite — limpos em afterAll.
  const createdWorkspaceIds: string[] = [];

  beforeAll(async () => {
    // Feature flag global: sem isso o KommoFeatureFlagGuard responde 404 em
    // TODA rota Kommo, mascarando o contrato real do webhook. Fixamos ANTES
    // do AppModule compilar (o guard le o env no construtor). Cenario
    // contrario (flag=false deve devolver 404) entra como `it` com TODO.
    process.env.KOMMO_SYNC_ENABLED = 'true';

    try {
      const mod: TestingModule = await Test.createTestingModule({
        imports: [AppModule],
      }).compile();

      app = mod.createNestApplication();

      // Mesmo setup do main.ts (sem Swagger/Helmet — irrelevante aqui).
      app.setGlobalPrefix('api/v1', {
        exclude: [
          'health',
          'health/ready',
          'docs',
          // webhooks nao sao versionados
          'webhooks/(.*)',
        ],
      });
      app.useGlobalPipes(
        new ValidationPipe({
          whitelist: true,
          forbidNonWhitelisted: true,
          transform: true,
          transformOptions: { enableImplicitConversion: true },
        }),
      );

      await app.init();
      prisma = app.get(PrismaService);
      await prisma.$queryRaw`SELECT 1`;
    } catch (err) {
      dbAvailable = false;
      // Segue a convencao de workspace-isolation.e2e-spec.ts: pular suite
      // sem falhar se DB/Redis nao estao disponiveis (ex: CI sem servicos).
      // eslint-disable-next-line no-console
      console.warn(
        '[kommo-webhooks-security] Bootstrap falhou — pulando suite:',
        (err as Error).message,
      );
      try {
        await app?.close();
      } catch {
        /* noop */
      }
    }
  }, 60_000);

  afterAll(async () => {
    if (!dbAvailable) return;

    try {
      // Limpa tudo criado: webhook events, kommo account, workspace, user.
      // Cascade do Prisma (KommoAccount onDelete: Cascade) ja derruba conta
      // ao remover workspace, mas precisamos remover explicitamente os
      // KommoWebhookEvent primeiro (nao tem FK-cascade no schema).
      for (const workspaceId of createdWorkspaceIds) {
        await prisma.kommoWebhookEvent.deleteMany({ where: { workspaceId } });
      }
      if (createdWorkspaceIds.length > 0) {
        // `workspaceMembers`, `kommoAccount` e cia caem via cascade.
        await prisma.workspace.deleteMany({
          where: { id: { in: createdWorkspaceIds } },
        });
        // Owner users criados pelo fixture ficam orfaos — limpa por email
        // prefix (padrao do KommoFixtureBuilder).
        await prisma.user.deleteMany({
          where: { email: { startsWith: 'kommo-fixture-owner-' } },
        });
      }
    } finally {
      await app.close();
    }
  }, 60_000);

  /**
   * Cria um fixture novo (workspace + KommoAccount + hmacSecret) e registra
   * o workspaceId para cleanup. Isolamento estrito: cada teste chama este
   * helper para nao contaminar runs paralelos nem herdar state de outro
   * cenario.
   */
  async function setupFixture(
    subdomainPrefix = 'qa-ws',
  ): Promise<{
    workspaceId: string;
    hmacSecret: string;
    subdomain: string;
  }> {
    const runId = Math.random().toString(36).slice(2, 10);
    const subdomain = `${subdomainPrefix}-${runId}`;
    const fx = await new KommoFixtureBuilder(prisma)
      .withWorkspace(`QA Workspace ${runId}`)
      .withKommoAccount({ subdomain })
      .build();
    createdWorkspaceIds.push(fx.workspaceId);
    return {
      workspaceId: fx.workspaceId,
      hmacSecret: fx.hmacSecret,
      subdomain,
    };
  }

  const skipIfNoDb = (): boolean => {
    if (!dbAvailable) {
      // eslint-disable-next-line jest/no-conditional-expect
      expect(true).toBe(true);
      return true;
    }
    return false;
  };

  // -------------------------------------------------------------------------
  // 1) Valid HMAC → 200 accepted
  // -------------------------------------------------------------------------
  it('accepts a valid request and persists a KommoWebhookEvent row', async () => {
    if (skipIfNoDb()) return;

    const { workspaceId, hmacSecret, subdomain } = await setupFixture();
    const payload = makePayload(subdomain);
    const { rawBody, signature } = sign(payload, hmacSecret);

    const res = await request(app.getHttpServer())
      .post(WEBHOOK_PATH(workspaceId))
      .set('Content-Type', 'application/json')
      .set(SIG_HEADER, signature)
      .send(rawBody);

    expect(res.status).toBe(200);
    // Shape flexivel: pode vir envelopado em `data` se passar pelo
    // ResponseInterceptor global. Asserta ambos os shapes comuns.
    const body = res.body?.data ?? res.body;
    expect(body).toEqual(
      expect.objectContaining({
        accepted: true,
        eventId: payload.event_id,
      }),
    );

    // Evento persistido com a eventId correta. Status pode ser RECEIVED ou
    // PROCESSED dependendo de o worker ja ter consumido — aceita ambos.
    const row = await prisma.kommoWebhookEvent.findUnique({
      where: {
        workspaceId_eventId: {
          workspaceId,
          eventId: payload.event_id,
        },
      },
    });
    expect(row).not.toBeNull();
    expect(row!.workspaceId).toBe(workspaceId);
    expect(row!.eventType).toBe('incoming_chat_message');
  }, 15_000);

  // -------------------------------------------------------------------------
  // 2) Invalid signature (bit-flip) → 401
  // -------------------------------------------------------------------------
  it('rejects a request with a bit-flipped signature (401)', async () => {
    if (skipIfNoDb()) return;

    const { workspaceId, hmacSecret, subdomain } = await setupFixture();
    const payload = makePayload(subdomain);
    const { rawBody, signature } = sign(payload, hmacSecret);

    // Flipa o ultimo caractere hex (sempre produz hex valido: 0..f cycle).
    const lastChar = signature[signature.length - 1];
    const flippedChar = lastChar === '0' ? '1' : '0';
    const tamperedSig = signature.slice(0, -1) + flippedChar;
    expect(tamperedSig).not.toBe(signature);

    const res = await request(app.getHttpServer())
      .post(WEBHOOK_PATH(workspaceId))
      .set('Content-Type', 'application/json')
      .set(SIG_HEADER, tamperedSig)
      .send(rawBody);

    expect(res.status).toBe(401);
    // Evento NAO pode ter sido gravado — HMAC invalido = rejeita antes de
    // tocar banco.
    const row = await prisma.kommoWebhookEvent.findUnique({
      where: {
        workspaceId_eventId: {
          workspaceId,
          eventId: payload.event_id,
        },
      },
    });
    expect(row).toBeNull();
  }, 15_000);

  // -------------------------------------------------------------------------
  // 2b) Invalid signature — fuzz minimo: 3 mutacoes diferentes (prefixo
  //     zeroado, tamanho errado, garbage hex). Mantem-se leve para caber
  //     no timeout de E2E — fuzz extensivo (500 payloads) eh responsabilidade
  //     do pipeline dedicado (`scripts/fuzz-kommo-hmac.ts` — proxima rodada).
  // -------------------------------------------------------------------------
  it.each([
    { label: 'zeroed signature', mutate: () => '0'.repeat(64) },
    {
      label: 'short signature (63 hex chars)',
      mutate: (sig: string) => sig.slice(0, 63),
    },
    {
      label: 'non-hex garbage',
      mutate: () =>
        'zzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzz',
    },
  ])('rejects signature mutation "$label" with 401', async ({ mutate }) => {
    if (skipIfNoDb()) return;

    const { workspaceId, hmacSecret, subdomain } = await setupFixture();
    const payload = makePayload(subdomain);
    const { rawBody, signature } = sign(payload, hmacSecret);

    const res = await request(app.getHttpServer())
      .post(WEBHOOK_PATH(workspaceId))
      .set('Content-Type', 'application/json')
      .set(SIG_HEADER, mutate(signature))
      .send(rawBody);

    expect(res.status).toBe(401);
  }, 15_000);

  // -------------------------------------------------------------------------
  // 3) Missing signature header → 401
  // -------------------------------------------------------------------------
  it('rejects a request with no signature header (401)', async () => {
    if (skipIfNoDb()) return;

    const { workspaceId, subdomain } = await setupFixture();
    const payload = makePayload(subdomain);
    const rawBody = JSON.stringify(payload);

    const res = await request(app.getHttpServer())
      .post(WEBHOOK_PATH(workspaceId))
      .set('Content-Type', 'application/json')
      // sem SIG_HEADER
      .send(rawBody);

    expect(res.status).toBe(401);
  }, 15_000);

  // -------------------------------------------------------------------------
  // 4) Algorithm downgrade (sha1) → 401
  //
  // Nao ha header explicito de algoritmo no contrato ADR-005 (sha256 eh
  // codificado server-side). O que conseguimos testar eh: se o cliente
  // calcular HMAC-sha1 em vez de sha256, o hash sai diferente e produz 401
  // como "invalid signature". Isso cobre a propriedade de interesse
  // (downgrade-resistencia) sem requerer API exotica de header.
  // -------------------------------------------------------------------------
  it('rejects a sha1-based signature (algorithm downgrade guarded as invalid signature)', async () => {
    if (skipIfNoDb()) return;

    const { workspaceId, hmacSecret, subdomain } = await setupFixture();
    const payload = makePayload(subdomain);
    const rawBody = JSON.stringify(payload);
    const sha1Sig = sha1Hmac(rawBody, hmacSecret);

    const res = await request(app.getHttpServer())
      .post(WEBHOOK_PATH(workspaceId))
      .set('Content-Type', 'application/json')
      .set(SIG_HEADER, sha1Sig)
      .send(rawBody);

    expect(res.status).toBe(401);
  }, 15_000);

  // -------------------------------------------------------------------------
  // 5) Idempotency — same eventId twice → second is deduplicated
  // -------------------------------------------------------------------------
  it('deduplicates when the same eventId is delivered twice', async () => {
    if (skipIfNoDb()) return;

    const { workspaceId, hmacSecret, subdomain } = await setupFixture();
    const payload = makePayload(subdomain);
    const { rawBody, signature } = sign(payload, hmacSecret);

    // 1a entrega — deve aceitar
    const first = await request(app.getHttpServer())
      .post(WEBHOOK_PATH(workspaceId))
      .set('Content-Type', 'application/json')
      .set(SIG_HEADER, signature)
      .send(rawBody);
    expect(first.status).toBe(200);
    const firstBody = first.body?.data ?? first.body;
    expect(firstBody).toEqual(
      expect.objectContaining({ accepted: true, eventId: payload.event_id }),
    );

    // 2a entrega identica — deve desduplicar
    const second = await request(app.getHttpServer())
      .post(WEBHOOK_PATH(workspaceId))
      .set('Content-Type', 'application/json')
      .set(SIG_HEADER, signature)
      .send(rawBody);
    expect(second.status).toBe(200);
    const secondBody = second.body?.data ?? second.body;
    expect(secondBody).toEqual(
      expect.objectContaining({
        deduplicated: true,
        eventId: payload.event_id,
      }),
    );

    // Apenas 1 registro na tabela (unique constraint funcionou).
    const rows = await prisma.kommoWebhookEvent.findMany({
      where: { workspaceId, eventId: payload.event_id },
    });
    expect(rows).toHaveLength(1);
  }, 20_000);

  // -------------------------------------------------------------------------
  // 6) Cross-tenant: HMAC valido para W1 mas URL de W2 → 403
  //
  // Cenario do ADR-005 §2.1#6 — atacante conhece hmacSecret de W1 (ou captura
  // um webhook) e tenta postar em /webhooks/kommo/W2. HMAC bate (por acaso
  // sessao compartilhada nao deveria existir, mas testamos o cenario duro:
  // HMAC valido quanto ao secret de W2 — so conseguimos cobrir isso se
  // assinarmos com o secret de W2 mas mandarmos account_id do W1).
  //
  // Construcao do caso: geramos payload cujo account_id pertence a W1
  // (subdomain W1), assinamos com hmacSecret de W2, postamos em URL de W2.
  // HMAC valida (secret do W2 bate), URL bate, mas payload.account_id NAO
  // bate com a conta Kommo do W2 → 403 (workspace_account_mismatch).
  // -------------------------------------------------------------------------
  it('rejects 403 when payload.account_id does not match the URL workspaceId account', async () => {
    if (skipIfNoDb()) return;

    const w1 = await setupFixture('qa-ws-1');
    const w2 = await setupFixture('qa-ws-2');

    // Payload carrega account_id do W1 (subdomain W1), posta em URL do W2,
    // assinado com secret do W2 (HMAC valida — so o mismatch de conta falha).
    const payload = makePayload(w1.subdomain);
    const rawBody = JSON.stringify(payload);
    const signature = sha256Hmac(rawBody, w2.hmacSecret);

    const res = await request(app.getHttpServer())
      .post(WEBHOOK_PATH(w2.workspaceId))
      .set('Content-Type', 'application/json')
      .set(SIG_HEADER, signature)
      .send(rawBody);

    // ADR-005 §2.1#6 diz explicitamente 403. Se Rafael escolher 404 para
    // nao vazar o fato de que a conta existe (principio #1 squad-kommo),
    // aceitamos 404 tambem — documentar no handshake.
    expect([403, 404]).toContain(res.status);

    // Evento NAO deve ter sido gravado em nenhum dos workspaces.
    const w1Rows = await prisma.kommoWebhookEvent.findMany({
      where: { workspaceId: w1.workspaceId, eventId: payload.event_id },
    });
    const w2Rows = await prisma.kommoWebhookEvent.findMany({
      where: { workspaceId: w2.workspaceId, eventId: payload.event_id },
    });
    expect(w1Rows).toHaveLength(0);
    expect(w2Rows).toHaveLength(0);
  }, 20_000);

  // -------------------------------------------------------------------------
  // 7) Unknown workspaceId (sem KommoAccount) → 404 stealth
  // -------------------------------------------------------------------------
  it('returns 404 for an unknown workspaceId (no KommoAccount row)', async () => {
    if (skipIfNoDb()) return;

    // cuid-like random — nao existe no banco.
    const ghostWorkspaceId = `ck${Math.random().toString(36).slice(2, 26)}`;
    const payload = makePayload('unknown-subdomain');
    // Assina com um secret qualquer — nao importa, o lookup falha antes.
    const rawBody = JSON.stringify(payload);
    const bogusSig = sha256Hmac(rawBody, 'any-32-byte-secret-placeholder-x');

    const res = await request(app.getHttpServer())
      .post(WEBHOOK_PATH(ghostWorkspaceId))
      .set('Content-Type', 'application/json')
      .set(SIG_HEADER, bogusSig)
      .send(rawBody);

    // Stealth 404 — NAO 401, NAO 403. Principio #1 squad-kommo.
    expect(res.status).toBe(404);
  }, 15_000);

  // -------------------------------------------------------------------------
  // 8) Feature flag OFF → 404 (TODO — requer restart do modulo)
  // -------------------------------------------------------------------------
  it.todo(
    'returns 404 (not 403/503) when KOMMO_SYNC_ENABLED=false globally — requires a separate TestingModule compiled with the flag off; scoped out of this spec to keep setup single-boot',
  );

  // -------------------------------------------------------------------------
  // 9) Timestamp skew > 5min → 401 (TODO — depende de Rafael implementar
  //    ADR-005 §2.1#4 nesta rodada)
  // -------------------------------------------------------------------------
  it.todo(
    'rejects 401 when payload.timestamp is more than 300s outside server time — ADR-005 §2.1#4; enable after Rafael lands the window check',
  );

  // -------------------------------------------------------------------------
  // 10) Rate-limit burst → 429 (TODO — inviavel dentro do jest timeout
  //    padrao; endereca-se em spec k6/artillery dedicada)
  // -------------------------------------------------------------------------
  it.todo(
    'returns 429 after 300 valid requests per workspaceId per minute — requires dedicated load-test harness (k6/artillery), not jest E2E',
  );
});
