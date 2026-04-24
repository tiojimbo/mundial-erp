import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  NotImplementedException,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { Throttle } from '@nestjs/throttler';
import { KommoAccountsService } from './kommo-accounts.service';
import { ConnectKommoTokenDto } from './dto/connect-kommo-token.dto';
import { KommoAccountResponseDto } from './dto/kommo-account-response.dto';
import { CurrentUser, Roles } from '../auth/decorators';
import type { JwtPayload } from '../auth/decorators';
import { WorkspaceId } from '../workspaces/decorators/workspace-id.decorator';
import { KommoFeatureFlagGuard } from '../../common/feature-flags/kommo-feature-flag.guard';

/**
 * `KommoAccountsController` — gestao do cadastro de conta Kommo por
 * workspace (ADR-004 §2.2, PLANO-KOMMO-DASHBOARD §7.1, Sprint 1 K1-6).
 *
 * Guards globais (JWT + Workspace + Roles) ja aplicam no `app.module.ts`.
 * `KommoFeatureFlagGuard` (classe) adiciona o kill switch `KOMMO_SYNC_ENABLED`:
 * se `false`, todas as rotas respondem 404 (principio #1 squad-kommo —
 * nao vazar existencia da feature).
 *
 * Envelope `{data, meta}` aplicado pelo `ResponseInterceptor` global. Cabe
 * a este controller retornar o DTO "cru" — o interceptor embrulha.
 *
 * Rate limits (§7.1):
 *   - POST /token: 10/min (bootstrap raro).
 *   - GET /accounts: 60/min (polling leve).
 *   - DELETE /:id: 10/min (operacao destrutiva).
 */
@ApiTags('Kommo - Accounts')
@ApiBearerAuth()
@UseGuards(KommoFeatureFlagGuard)
@Controller('kommo')
export class KommoAccountsController {
  constructor(private readonly accountsService: KommoAccountsService) {}

  // ──────────────────────────────────────────────────────────────────────
  // Long-lived token flow (dev/admin path — ADR-004 §2.2)
  // ──────────────────────────────────────────────────────────────────────

  @Post('accounts/token')
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.CREATED)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @ApiOperation({
    summary:
      'Registra conta Kommo via long-lived token (dev/admin — ADR-004). NUNCA usado para workspaces com OAuth2.',
  })
  @ApiResponse({ status: 201, type: KommoAccountResponseDto })
  @ApiResponse({ status: 400, description: 'Payload invalido' })
  @ApiResponse({ status: 403, description: 'Exige Role.ADMIN' })
  @ApiResponse({ status: 404, description: 'KOMMO_SYNC_ENABLED=false' })
  async connectToken(
    @WorkspaceId() workspaceId: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: ConnectKommoTokenDto,
  ): Promise<KommoAccountResponseDto> {
    return this.accountsService.createFromLongLivedToken({
      workspaceId,
      subdomain: dto.subdomain,
      accessToken: dto.accessToken,
      hmacSecret: dto.hmacSecret,
      connectedByUserId: user.sub,
    });
  }

  // ──────────────────────────────────────────────────────────────────────
  // Listagem / deletion
  // ──────────────────────────────────────────────────────────────────────

  @Get('accounts')
  @Roles(Role.ADMIN, Role.MANAGER)
  @Throttle({ default: { limit: 60, ttl: 60_000 } })
  @ApiOperation({
    summary:
      'Lista a conta Kommo do workspace (max 1). Retorna array para manter compat com envelope {data, meta}.',
  })
  @ApiResponse({ status: 200, type: [KommoAccountResponseDto] })
  @ApiResponse({ status: 404, description: 'KOMMO_SYNC_ENABLED=false' })
  async list(
    @WorkspaceId() workspaceId: string,
  ): Promise<KommoAccountResponseDto[]> {
    const account = await this.accountsService.findByWorkspaceId(workspaceId);
    return account ? [account] : [];
  }

  @Delete('accounts/:id')
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @ApiOperation({
    summary:
      'Soft delete da conta Kommo. Invalida webhooks futuros (HMAC lookup falha) ate re-conectar.',
  })
  @ApiResponse({ status: 204 })
  @ApiResponse({ status: 404, description: 'Conta nao pertence ao workspace' })
  async remove(
    @WorkspaceId() workspaceId: string,
    @Param('id') id: string,
  ): Promise<void> {
    await this.accountsService.softDelete(workspaceId, id);
  }

  // ──────────────────────────────────────────────────────────────────────
  // OAuth2 stubs (ADR-004 §2.2 — ativacao depende de App Kommo externo)
  // ──────────────────────────────────────────────────────────────────────

  @Get('connect')
  @Roles(Role.ADMIN)
  @ApiOperation({
    summary:
      'STUB OAuth connect — implementado quando KOMMO_CLIENT_ID/KOMMO_CLIENT_SECRET estiverem configurados e App Kommo registrado (ver ADR-004).',
  })
  @ApiResponse({ status: 501 })
  connect(): never {
    throw new NotImplementedException({
      message:
        'OAuth flow pending — register app in Kommo and set KOMMO_CLIENT_ID + KOMMO_CLIENT_SECRET',
      reference: 'ADR-004',
      // TODO(Rafael, Sprint 2): implementar redirect para
      //   `https://${subdomain}.kommo.com/oauth?client_id=...&state=<csrf>&mode=post_message`
      //   apos squad-auth entregar armazenamento seguro do `state` CSRF
      //   (KOMMO_CSRF_SECRET ja no env).
    });
  }

  @Get('callback')
  @Roles(Role.ADMIN)
  @ApiOperation({
    summary:
      'STUB OAuth callback — implementado na rodada seguinte (ver ADR-004).',
  })
  @ApiResponse({ status: 501 })
  callback(): never {
    throw new NotImplementedException({
      message:
        'OAuth flow pending — register app in Kommo and set KOMMO_CLIENT_ID + KOMMO_CLIENT_SECRET',
      reference: 'ADR-004',
      // TODO(Rafael, Sprint 2): validar `state` CSRF, trocar `code` por
      //   accessToken+refreshToken em `POST /oauth2/access_token`,
      //   persistir via repository com `authType=OAUTH2`,
      //   `refreshToken` + `expiresAt` preenchidos (ADR-004 invariante).
    });
  }

}
