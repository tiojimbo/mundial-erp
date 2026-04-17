import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ParseCuidPipe } from '../../common/pipes/parse-cuid.pipe';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { NotificationsService } from './notifications.service';
import { NotificationQueryDto } from './dto/notification-query.dto';
import { SnoozeNotificationDto } from './dto/snooze-notification.dto';
import { BulkActionDto } from './dto/bulk-action.dto';
import { CurrentUser } from '../auth/decorators';

@ApiTags('Notifications')
@ApiBearerAuth()
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  // ── GET ────────────────────────────────────────────────────────────

  @Get()
  @ApiOperation({ summary: 'Listar notificacoes por view com contagens' })
  findAll(
    @CurrentUser('sub') userId: string,
    @Query() query: NotificationQueryDto,
  ) {
    return this.notificationsService.findByView(userId, query.view);
  }

  // ── Bulk POST (static routes) ─────────────────────────────────────

  @Post('mark-all-read')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Marcar todas as notificacoes como lidas' })
  @ApiResponse({ status: 204 })
  markAllAsRead(
    @CurrentUser('sub') userId: string,
    @Body() dto: BulkActionDto,
  ) {
    return this.notificationsService.markAllRead(userId, dto);
  }

  @Post('clear-all')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Limpar todas as notificacoes' })
  @ApiResponse({ status: 204 })
  clearAll(
    @CurrentUser('sub') userId: string,
    @Body() dto: BulkActionDto,
  ) {
    return this.notificationsService.clearAll(userId, dto);
  }

  @Post('delete-all-cleared')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Excluir permanentemente todas as notificacoes limpas' })
  @ApiResponse({ status: 204 })
  deleteAllCleared(@CurrentUser('sub') userId: string) {
    return this.notificationsService.deleteAllCleared(userId);
  }

  // ── Single-item PATCH (dynamic :id routes) ────────────────────────

  @Patch(':id/read')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Marcar notificacao como lida' })
  @ApiResponse({ status: 204 })
  markAsRead(
    @CurrentUser('sub') userId: string,
    @Param('id', ParseCuidPipe) id: string,
  ) {
    return this.notificationsService.markAsRead(userId, id);
  }

  @Patch(':id/unread')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Marcar notificacao como nao lida' })
  @ApiResponse({ status: 204 })
  markAsUnread(
    @CurrentUser('sub') userId: string,
    @Param('id', ParseCuidPipe) id: string,
  ) {
    return this.notificationsService.markAsUnread(userId, id);
  }

  @Patch(':id/clear')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Limpar notificacao' })
  @ApiResponse({ status: 204 })
  clear(
    @CurrentUser('sub') userId: string,
    @Param('id', ParseCuidPipe) id: string,
  ) {
    return this.notificationsService.clear(userId, id);
  }

  @Patch(':id/unclear')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Desfazer limpeza da notificacao' })
  @ApiResponse({ status: 204 })
  unclear(
    @CurrentUser('sub') userId: string,
    @Param('id', ParseCuidPipe) id: string,
  ) {
    return this.notificationsService.unclear(userId, id);
  }

  @Patch(':id/snooze')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Adiar notificacao ate uma data/hora' })
  @ApiResponse({ status: 204 })
  snooze(
    @CurrentUser('sub') userId: string,
    @Param('id', ParseCuidPipe) id: string,
    @Body() dto: SnoozeNotificationDto,
  ) {
    return this.notificationsService.snooze(userId, id, dto);
  }

  @Patch(':id/unsnooze')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Cancelar adiamento da notificacao' })
  @ApiResponse({ status: 204 })
  unsnooze(
    @CurrentUser('sub') userId: string,
    @Param('id', ParseCuidPipe) id: string,
  ) {
    return this.notificationsService.unsnooze(userId, id);
  }
}
