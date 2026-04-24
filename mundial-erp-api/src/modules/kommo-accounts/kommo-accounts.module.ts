import { Module } from '@nestjs/common';
import { KommoAccountsController } from './kommo-accounts.controller';
import { KommoAccountsService } from './kommo-accounts.service';
import { KommoAccountsRepository } from './kommo-accounts.repository';
import { KommoApiClientModule } from '../kommo-api-client/kommo-api-client.module';

/**
 * `KommoAccountsModule` (PLANO-KOMMO-DASHBOARD §7.1, Sprint 1 K1-6).
 *
 * Expoe:
 *   - `POST /kommo/accounts/token`  (dev/admin — long-lived, ADR-004)
 *   - `GET  /kommo/accounts`
 *   - `DELETE /kommo/accounts/:id`
 *   - `GET  /kommo/connect`         (stub ate OAuth real subir)
 *   - `GET  /kommo/callback`        (stub idem)
 *
 * Exporta `KommoAccountsRepository` e `KommoAccountsService` para que o
 * `KommoWebhooksModule` (HMAC lookup) e futuros `kommo-workers` /
 * `kommo-reconciliation` possam consumir sem duplicar providers. O
 * provider e registrado aqui UMA vez.
 *
 * `PrismaService` vem via `DatabaseModule` global. `KommoFeatureFlagGuard`
 * via `FeatureFlagsModule` (@Global). `KommoApiClientModule` importado
 * para uso futuro no OAuth callback (troca code→token) — inerte hoje.
 */
@Module({
  imports: [KommoApiClientModule],
  controllers: [KommoAccountsController],
  providers: [KommoAccountsService, KommoAccountsRepository],
  exports: [KommoAccountsService, KommoAccountsRepository],
})
export class KommoAccountsModule {}
