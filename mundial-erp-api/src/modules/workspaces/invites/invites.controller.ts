import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { InviteStatus } from '@prisma/client';
import { InvitesService } from './invites.service';
import { CreateInviteDto } from './dto/create-invite.dto';
import {
  AcceptInviteResponseDto,
  InviteCreatedResponseDto,
  InviteResponseDto,
} from './dto/invite-response.dto';
import { PaginationDto } from '../../../common/dtos/pagination.dto';
import { CurrentUser } from '../../auth/decorators';
import { SkipWorkspaceGuard } from '../decorators/skip-workspace-guard.decorator';

@ApiTags('Workspaces - Invites')
@ApiBearerAuth()
@Controller('workspaces')
export class InvitesController {
  constructor(private readonly invitesService: InvitesService) {}

  @Get(':workspaceId/invites')
  @ApiOperation({ summary: 'Listar convites do workspace (owner/admin)' })
  @ApiQuery({ name: 'status', required: false, enum: InviteStatus })
  @ApiResponse({ status: 200, type: [InviteResponseDto] })
  list(
    @Param('workspaceId') workspaceId: string,
    @CurrentUser('sub') actorId: string,
    @Query() pagination: PaginationDto,
    @Query('status') status?: InviteStatus,
  ) {
    return this.invitesService.list(workspaceId, actorId, pagination, status);
  }

  @Post(':workspaceId/invites')
  @Throttle({ default: { ttl: 60_000, limit: 5 } })
  @ApiOperation({
    summary:
      'Criar convite (owner/admin). Token e exposto na response apenas uma vez.',
  })
  @ApiResponse({ status: 201, type: InviteCreatedResponseDto })
  create(
    @Param('workspaceId') workspaceId: string,
    @CurrentUser('sub') actorId: string,
    @Body() dto: CreateInviteDto,
  ) {
    return this.invitesService.create(workspaceId, actorId, dto);
  }

  @Post('join/:token')
  @SkipWorkspaceGuard()
  @Throttle({ default: { ttl: 60_000, limit: 10 } })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      'Aceitar convite por token. Vincula o user autenticado ao workspace do convite.',
  })
  @ApiResponse({ status: 200, type: AcceptInviteResponseDto })
  @ApiResponse({ status: 400, description: 'Token expirado ou ja consumido' })
  @ApiResponse({ status: 404, description: 'Convite nao encontrado' })
  accept(@Param('token') token: string, @CurrentUser('sub') userId: string) {
    return this.invitesService.accept(token, userId);
  }

  @Delete(':workspaceId/invites/:inviteId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Revogar convite PENDING (owner/admin)' })
  @ApiResponse({ status: 204 })
  revoke(
    @Param('workspaceId') workspaceId: string,
    @Param('inviteId') inviteId: string,
    @CurrentUser('sub') actorId: string,
  ) {
    return this.invitesService.revoke(workspaceId, inviteId, actorId);
  }
}
