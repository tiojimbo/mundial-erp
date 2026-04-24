# ADR-004 — `kommo-dual-auth`

> Kommo suporta dois modos de autenticacao (OAuth2 + long-lived token). Produzimos endpoints dedicados para cada caminho, modelados no schema via enum `KommoAuthType`, com fluxo OAuth reservado a producao (rotacao segura) e long-lived restrito a dev/admin (sem dependencia de App Kommo externo). `KommoAccount.refreshToken` e nullable (preenchido so em `OAUTH2`); rotacao cron trata apenas `OAUTH2`.

| Campo | Valor |
|---|---|
| **ID** | ADR-004 |
| **Titulo** | `kommo-dual-auth` |
| **Status** | **Accepted** — em vigor a partir de 2026-04-24 |
| **Autor** | Rafael Quintella (Tech Lead / Integration Architect, squad-kommo) |
| **Data** | 2026-04-24 |
| **Supersedes** | — |
| **Related** | ADR-005 (`kommo-webhook-hmac` — consome `hmacSecret` persistido independente do `authType`), ADR-006 (`kommo-token-envelope-encryption`, futura — criptografia simetrica para `accessToken`/`refreshToken`/`hmacSecret`), PLANO-KOMMO-DASHBOARD.md §§ 5.1 (enum), 7.1 (endpoints), 8.1 (OAuth flow) |
| **Squads afetados** | squad-kommo, squad-auth (fluxo JWT pos-callback), squad-infra (config `KOMMO_CLIENT_ID`/`KOMMO_CLIENT_SECRET`) |

---

## 1. Context

### 1.1 O que o Kommo oferece

O Kommo expoe duas formas de autenticar chamadas `api/v4/*`:

1. **OAuth2 Authorization Code** — fluxo padrao. Usuario instala um App Kommo registrado no marketplace, recebe `code`, trocamos por `accessToken` (1h) + `refreshToken` (longevidade maior). `refreshToken` rotaciona a cada uso; token novo invalida o anterior. Webhook secret e gerado no mesmo handshake.
2. **Long-lived token** — token estatico emitido manualmente pelo admin Kommo no painel. Nao expira, nao rotaciona. Ideal para scripts internos, dev, testes. Nao e recomendado para producao multi-tenant porque revogacao e manual e nao existe pareamento 1:1 com o App Kommo.

### 1.2 Nossa realidade nesta rodada

- **Producao** vai usar OAuth — rotacao, expiracao, revogabilidade, audit trail. Exige `KOMMO_CLIENT_ID` + `KOMMO_CLIENT_SECRET` configurados no `.env` apos o usuario registrar um App Kommo. Esse registro e handshake **externo** (pelo usuario, no painel Kommo) e portanto bloqueia entrega desta rodada.
- **Dev / QA / E2E** nao tem (e nao vai ter tao cedo) um App Kommo registrado. Precisam de um caminho que nao dependa disso para poder provar o golden path do webhook, backfill e reconciliacao.
- **Escopo da rodada 5 (Sprint 1 K1-6)** e: schema ja esta entregue (Larissa), controller `kommo-accounts` precisa aceitar token em ambos os formatos, e o campo `authType` precisa estar pronto para quando o OAuth subir em rodada posterior.

### 1.3 Restricoes do projeto

1. **Seguranca > conveniencia em producao** — `accessToken` estatico nao pode ser o default. Se alguem vaza um long-lived, nao ha rotacao automatica.
2. **Multi-tenant hermetico** (squad-kommo #1) — cada tenant tem sua propria conta, sem tokens compartilhados.
3. **HMAC secret per-account** (ADR-005) — existe independente do `authType`. Ambos os caminhos persistem `hmacSecret`.
4. **Zero dependencia em ambiente externo para dev loop** — principio do plano §1.2. OAuth real exige o App Kommo; long-lived nao.

---

## 2. Decision

### 2.1 Resumo

1. **Enum `KommoAuthType { OAUTH2, LONG_LIVED_TOKEN }`** persistido em `KommoAccount.authType` (schema.prisma §1.1 ja entregue). Campo obrigatorio.
2. **Dois caminhos de entrada, um schema unico**:
   - **`POST /kommo/accounts/token`** (dev/admin only): recebe `{ subdomain, accessToken, hmacSecret }`. Cria/atualiza `KommoAccount` com `authType=LONG_LIVED_TOKEN`, `refreshToken=null`, `expiresAt=null`. Guard `@Roles(Role.ADMIN)`.
   - **`GET /kommo/connect`** + **`GET /kommo/callback`**: fluxo OAuth2 autorizado. Primeiro endpoint redireciona para o painel do Kommo com `client_id`, `state` e `redirect_uri`. Callback troca `code` por token, cria `KommoAccount` com `authType=OAUTH2`, `refreshToken` preenchido, `expiresAt` calculado. Nesta rodada os dois endpoints retornam **`501 Not Implemented`** com mensagem explicita apontando para ADR-004.
3. **`KommoAccount.refreshToken` e nullable** no schema. Invariante runtime:
   - `authType=OAUTH2` → `refreshToken` obrigatorio, `expiresAt` obrigatorio.
   - `authType=LONG_LIVED_TOKEN` → `refreshToken=null`, `expiresAt=null`.
   Validacao acontece no service (`KommoAccountsService.createFromLongLivedToken` nunca preenche refresh/expires; callback OAuth sempre preenche).
4. **Rotacao cron trata apenas `OAUTH2`** — worker de refresh (proxima rodada) filtra por `authType=OAUTH2 AND expiresAt < now + 5min`. Long-lived fica ignorado (nao tem o que rotacionar).
5. **Configuracao condicional por env**:
   - Se `KOMMO_CLIENT_ID` + `KOMMO_CLIENT_SECRET` estiverem definidos → `/kommo/connect` ativa (rodada futura).
   - Senao → endpoint responde 501 sem revelar se OAuth esta desligado por configuracao ou ainda nao implementado (principio #1 squad-kommo: nao vazar estado da integracao).
6. **Expor, nunca, os tokens** — `KommoAccountResponseDto` so serializa `{ id, subdomain, authType, status, createdAt, updatedAt }`. `accessToken`/`refreshToken`/`hmacSecret` nunca trafegam via resposta HTTP nem via log (principio #13 squad-kommo).

### 2.2 Decision matrix — qual caminho usar

| Cenario | authType esperado | Endpoint |
|---|---|---|
| Producao com App Kommo registrado | `OAUTH2` | `/kommo/connect` → `/kommo/callback` |
| Dev local sem App Kommo | `LONG_LIVED_TOKEN` | `POST /kommo/accounts/token` |
| Staging (automacao E2E sem handshake) | `LONG_LIVED_TOKEN` | `POST /kommo/accounts/token` (via fixture) |
| Migracao de tenant do Kommo ja-conectado para novo App | `OAUTH2` (rotaciona) | Re-run `/kommo/connect` com `state` que carrega hint de upgrade |

### 2.3 Invariantes de seguranca (P0)

- **P0:** Endpoint long-lived e restrito a `Role.ADMIN`. Nunca exposto a `OPERATOR`/`VIEWER`.
- **P0:** Resposta HTTP nunca inclui `accessToken`/`refreshToken`/`hmacSecret`. Log idem (ate stack trace passa por redactor).
- **P0:** Quando OAuth subir, `state` param e obrigatorio e validado CSRF-style (random 32 bytes, stored em cache curto, verificado no callback).
- **P1:** Exigir re-confirmacao humana antes de trocar `authType` de `OAUTH2` para `LONG_LIVED_TOKEN` em producao (evita downgrade silencioso).

---

## 3. Consequences

### 3.1 Positivas

1. **Dev loop desbloqueado** — squad pode testar webhook + worker + reconciliacao com long-lived, sem depender do usuario registrar App Kommo.
2. **Producao segura por default** — OAuth e o caminho documentado / esperado. Long-lived e opt-in admin.
3. **Schema estavel** — enum ja esta no Prisma; nao precisa migration quando OAuth subir.
4. **Separacao clara de responsabilidades** — rotacao cron nao precisa de branches por `authType`: filtra por `OAUTH2` e pronto.
5. **Observabilidade** — metrica `kommo_account_auth_type_total{authType}` expoe mix em producao; alerta P2 se aparecer `LONG_LIVED_TOKEN` em prod (politica interna).

### 3.2 Negativas

1. **Dois caminhos sao dois conjuntos de testes** — E2E precisa cobrir ambos. Carolina tem o caminho long-lived nesta rodada; OAuth vira quando endpoint real subir.
2. **Long-lived em producao e pe na jaca** — se alguem usar por engano, token nao rotaciona e alerta P2 detecta tarde. Mitigacao: guard `Role.ADMIN` + alerta Prometheus.
3. **Revogacao manual de long-lived** — se comprometido, admin precisa ir no painel Kommo. Documentar em runbook `kommo-incident-response` (futuro).

### 3.3 Metricas de saude

- `kommo_account_auth_type_total{authType}` — gauge, 1 amostra por account. Alerta P2 se `LONG_LIVED_TOKEN > 0` em ambiente `prod`.
- `kommo_account_token_refresh_total{outcome}` — contador, so para `OAUTH2`. Alerta P1 se `outcome="failed"` > 3/15min.

---

## 4. Alternatives considered (rejected)

### 4.1 Alternativa A — so OAuth2

**Proposta:** exigir OAuth2 desde a rodada 1, sem path para long-lived.

**Rejeitada:**
- Bloqueia todo o dev loop ate o usuario registrar um App Kommo (handshake externo, fora do controle da squad).
- E2E do Carolina ficaria dependente de fixtures de OAuth falsas (mock do provider externo), que e mais complexo que suportar um segundo authType.
- Squad nao consegue provar golden path do webhook nesta rodada.

### 4.2 Alternativa B — so long-lived

**Proposta:** usar long-lived em producao tambem, simplificando codigo.

**Rejeitada:**
- Token estatico nao rotaciona. Compromisso dura ate revogacao manual. Auditoria fraca.
- Viola principio #2 squad-kommo (credenciais com rotacao).
- Revogacao manual escala mal com N tenants.

### 4.3 Alternativa C — auth type implicito por heuristica (tamanho do token)

**Proposta:** nao persistir enum; detectar o tipo por tamanho ou prefixo do token.

**Rejeitada:**
- Fragil — Kommo pode mudar formato. Classificacao errada poderia tentar refresh em long-lived (erro) ou ignorar expiracao em OAuth (vazamento de janela).
- Enum explicito e auditavel, fuzzy-detect nao.
- Custo de uma coluna enum e zero.

### 4.4 Alternativa D — um unico endpoint generico `/kommo/accounts` com campo `authType` no body

**Proposta:** o cliente decide `authType` e manda junto do payload.

**Rejeitada:**
- Superficie maior — um cliente mal-intencionado poderia marcar long-lived como OAUTH2 e desestabilizar rotacao cron.
- Dois endpoints sao mais simples de instrumentar (metricas por rota), mais simples de autorizar (Role differenciado por caminho), mais simples de documentar.

---

## 5. Implementation reference

- **Enum `KommoAuthType`:** `prisma/schema.prisma` linhas 324-327 (Larissa — ja entregue).
- **Controller `kommo-accounts`:** `mundial-erp-api/src/modules/kommo-accounts/kommo-accounts.controller.ts` (Rafael — esta rodada).
- **Service:** `mundial-erp-api/src/modules/kommo-accounts/kommo-accounts.service.ts` — `createFromLongLivedToken` (implementado), `createFromOAuthCode` (stub ate rodada com OAuth).
- **Env validation:** `KOMMO_CLIENT_ID`, `KOMMO_CLIENT_SECRET`, `KOMMO_REDIRECT_URI` — opcionais no `env.validation.ts`; quando ausentes, endpoints OAuth devolvem 501.

---

## 6. Enforcement

1. **Code review P0:** service de accounts nao pode aceitar `refreshToken` em create long-lived — assinatura do metodo `createFromLongLivedToken` exclui o campo.
2. **DTO response:** `KommoAccountResponseDto` testado (Carolina, proxima rodada) para garantir ausencia de `accessToken`/`refreshToken`/`hmacSecret` em toda rota.
3. **Alerta Prometheus:** `kommo_account_auth_type_total{authType="LONG_LIVED_TOKEN", env="prod"} > 0` dispara P2 imediatamente.
4. **Runbook:** `kommo-auth-degraded.md` (futuro) documenta como transicionar uma conta long-lived para OAuth sem perder historico.

---

## 7. Open questions

1. **`scopes` do App Kommo OAuth** — lista exata a pedir no consent. Resolver quando registrarmos App real. Nao bloqueia este ADR.
2. **Rotacao manual de long-lived** — hoje exige revogar no painel Kommo + re-POST `/kommo/accounts/token`. RFC `kommo-secret-rotation` cobrira fluxo automatizado.
3. **Estado de `connectedByUserId` em long-lived** — quem for o usuario que chamou `POST /kommo/accounts/token` fica registrado. Para OAuth e o usuario que completou o consent. Consistente.
4. **Downgrade de auth** — trocar de OAUTH2 para LONG_LIVED_TOKEN e cenario de incident (compromisso do App). Exigir flag explicita `forceDowngrade=true` + log de auditoria. Detalhe de implementacao para rodada futura.

---

## 8. References

- `.claude/plan/PLANO-KOMMO-DASHBOARD.md` §§ 5.1 (enum), 7.1 (contrato `/kommo/accounts`), 8.1 (fluxo OAuth), 13 (Sprint 1 K1-6).
- `.claude/skills/squad-kommo.mdc` principios #1 (nao vazar), #2 (rotacao), #13 (logs sem PII), #15 (dual path dev vs prod), #18 (code review).
- ADR-005 (`kommo-webhook-hmac`) — `hmacSecret` compartilhado entre os dois authTypes.
- ADR-006 (proposta — `kommo-token-envelope-encryption`) — envelope encryption cobre ambos `accessToken` e `refreshToken` + `hmacSecret`.
- Kommo OAuth docs: https://www.amocrm.com/developers/content/oauth/step-by-step (referencia externa — nao e fonte de verdade do nosso contrato).
