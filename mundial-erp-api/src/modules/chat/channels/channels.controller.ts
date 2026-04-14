import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { ChannelMemberRole } from '@prisma/client';
import { ChannelsService } from './channels.service';
import { CreateChannelDto } from './dto/create-channel.dto';
import { CreateChannelLocationDto } from './dto/create-channel-location.dto';
import { CreateDmDto } from './dto/create-dm.dto';
import { UpdateChannelDto } from './dto/update-channel.dto';
import { AddMembersDto } from './dto/add-members.dto';
import { ListChannelsQueryDto } from './dto/list-channels-query.dto';
import { ChannelResponseDto } from './dto/channel-response.dto';
import { CursorPaginationDto } from '../../../common/dtos/cursor-pagination.dto';
import { CurrentUser } from '../../auth/decorators';

@ApiTags('Chat - Channels')
@ApiBearerAuth()
@Controller('chat/channels')
export class ChannelsController {
  constructor(private readonly channelsService: ChannelsService) {}

  @Post()
  @ApiOperation({ summary: 'Criar canal (ClickUp #1)' })
  @ApiResponse({ status: 201, type: ChannelResponseDto })
  @ApiResponse({
    status: 200,
    description: 'Canal com mesmo nome ja existe, retornado',
  })
  create(
    @Body() dto: CreateChannelDto,
    @CurrentUser('sub') userId: string,
  ) {
    return this.channelsService.createChannel(dto, userId);
  }

  @Post('location')
  @ApiOperation({ summary: 'Criar canal vinculado a localizacao (ClickUp #3)' })
  @ApiResponse({ status: 201, type: ChannelResponseDto })
  createByLocation(
    @Body() dto: CreateChannelLocationDto,
    @CurrentUser('sub') userId: string,
  ) {
    return this.channelsService.createChannelByLocation(dto, userId);
  }

  @Post('direct-message')
  @ApiOperation({ summary: 'Criar DM idempotente (ClickUp #9)' })
  @ApiResponse({ status: 201, type: ChannelResponseDto })
  createDm(
    @Body() dto: CreateDmDto,
    @CurrentUser('sub') userId: string,
  ) {
    return this.channelsService.createDm(dto, userId);
  }

  @Get()
  @ApiOperation({ summary: 'Listar canais do usuario (ClickUp #2)' })
  findAll(
    @Query() query: ListChannelsQueryDto,
    @CurrentUser('sub') userId: string,
  ) {
    return this.channelsService.findAll(query, userId);
  }

  @Get(':channelId')
  @ApiOperation({ summary: 'Buscar canal por ID (ClickUp #4)' })
  @ApiResponse({ status: 200, type: ChannelResponseDto })
  @ApiResponse({ status: 404, description: 'Canal nao encontrado' })
  findOne(
    @Param('channelId') channelId: string,
    @CurrentUser('sub') userId: string,
  ) {
    return this.channelsService.findById(channelId, userId);
  }

  @Patch(':channelId')
  @ApiOperation({ summary: 'Atualizar canal (ClickUp #5)' })
  @ApiResponse({ status: 200, type: ChannelResponseDto })
  update(
    @Param('channelId') channelId: string,
    @Body() dto: UpdateChannelDto,
    @CurrentUser('sub') userId: string,
  ) {
    return this.channelsService.update(channelId, dto, userId);
  }

  @Delete(':channelId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Deletar canal (ClickUp #6)' })
  @ApiResponse({ status: 204 })
  remove(
    @Param('channelId') channelId: string,
    @CurrentUser('sub') userId: string,
  ) {
    return this.channelsService.remove(channelId, userId);
  }

  @Get(':channelId/followers')
  @ApiOperation({ summary: 'Listar followers do canal (ClickUp #7)' })
  findFollowers(
    @Param('channelId') channelId: string,
    @Query() query: CursorPaginationDto,
    @CurrentUser('sub') userId: string,
  ) {
    return this.channelsService.findFollowers(channelId, query, userId);
  }

  @Get(':channelId/members')
  @ApiOperation({ summary: 'Listar membros do canal (ClickUp #8)' })
  findMembers(
    @Param('channelId') channelId: string,
    @Query() query: CursorPaginationDto,
    @CurrentUser('sub') userId: string,
  ) {
    return this.channelsService.findMembers(channelId, query, userId);
  }

  @Post(':channelId/members')
  @ApiOperation({ summary: 'Adicionar membros' })
  @ApiResponse({ status: 201 })
  addMembers(
    @Param('channelId') channelId: string,
    @Body() dto: AddMembersDto,
    @CurrentUser('sub') userId: string,
  ) {
    return this.channelsService.addMembers(channelId, dto, userId);
  }

  @Delete(':channelId/members/:targetUserId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remover membro' })
  @ApiResponse({ status: 204 })
  @ApiResponse({
    status: 400,
    description: 'DMs nao permitem remocao de membros',
  })
  removeMember(
    @Param('channelId') channelId: string,
    @Param('targetUserId') targetUserId: string,
    @CurrentUser('sub') userId: string,
  ) {
    return this.channelsService.removeMember(channelId, targetUserId, userId);
  }

  @Patch(':channelId/members/:targetUserId/role')
  @ApiOperation({ summary: 'Alterar role de membro (somente OWNER)' })
  @ApiResponse({ status: 200 })
  updateMemberRole(
    @Param('channelId') channelId: string,
    @Param('targetUserId') targetUserId: string,
    @Body('role') role: ChannelMemberRole,
    @CurrentUser('sub') userId: string,
  ) {
    return this.channelsService.updateMemberRole(
      channelId,
      targetUserId,
      role,
      userId,
    );
  }

  @Post(':channelId/follow')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Seguir canal (receber notificacoes)' })
  follow(
    @Param('channelId') channelId: string,
    @CurrentUser('sub') userId: string,
  ) {
    return this.channelsService.followChannel(channelId, userId);
  }

  @Delete(':channelId/follow')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Deixar de seguir canal (parar notificacoes, continua membro)',
  })
  unfollow(
    @Param('channelId') channelId: string,
    @CurrentUser('sub') userId: string,
  ) {
    return this.channelsService.unfollowChannel(channelId, userId);
  }

  @Post(':channelId/close')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Fechar/esconder DM da listagem' })
  closeDm(
    @Param('channelId') channelId: string,
    @CurrentUser('sub') userId: string,
  ) {
    return this.channelsService.closeDm(channelId, userId);
  }

  @Post(':channelId/open')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reabrir DM na listagem' })
  openDm(
    @Param('channelId') channelId: string,
    @CurrentUser('sub') userId: string,
  ) {
    return this.channelsService.openDm(channelId, userId);
  }

  @Post(':channelId/read')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Marcar canal como lido' })
  markAsRead(
    @Param('channelId') channelId: string,
    @CurrentUser('sub') userId: string,
  ) {
    return this.channelsService.markAsRead(channelId, userId);
  }
}
