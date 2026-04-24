import { Module } from '@nestjs/common';
import { KommoApiClient } from './kommo-api-client.service';

/**
 * `KommoApiClientModule` (PLANO-KOMMO-DASHBOARD §6).
 *
 * Encapsula a fachada de chamadas outbound para a API publica do Kommo e
 * o utilitario de verificacao HMAC dos webhooks. Exporta `KommoApiClient`
 * para os modulos que virao nas proximas rodadas:
 *   - `kommo-webhooks` (controller + HMAC check)
 *   - `kommo-workers`  (handlers que chamam back Kommo em refresh/reconc)
 *   - `kommo-reconciliation` (crons)
 *   - `kommo-accounts` (OAuth callback + management)
 *
 * Nao depende de PrismaService/BullMQ ainda — proxima rodada injetara
 * `KommoAccountsRepository` e `HttpService` (ou `undici`) no client para
 * chamadas reais.
 *
 * Registrar em `app.module.ts` (global imports) — `ConfigService` ja e
 * @Global, PrismaService tambem. Sem dependencias adicionais.
 */
@Module({
  providers: [KommoApiClient],
  exports: [KommoApiClient],
})
export class KommoApiClientModule {}
