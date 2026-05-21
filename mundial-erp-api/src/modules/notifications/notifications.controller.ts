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

  @Get()
  @ApiOperation({
    summary: 'Listar notificações por view com paginação e contagens',
  })
  findAll(
    @CurrentUser('sub') userId: string,
    @Query() query: NotificationQueryDto,
  ) {
    return this.notificationsService.findByView(userId, query);
  }

  @Post('read-all')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Marcar todas as notificações como lidas' })
  @ApiResponse({ status: 204 })
  readAll(@CurrentUser('sub') userId: string, @Body() dto: BulkActionDto) {
    return this.notificationsService.markAllRead(userId, dto);
  }

  @Post('clear-all')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Limpar todas as notificações' })
  @ApiResponse({ status: 204 })
  clearAll(@CurrentUser('sub') userId: string, @Body() dto: BulkActionDto) {
    return this.notificationsService.clearAll(userId, dto);
  }

  @Post('delete-all-cleared')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Excluir permanentemente todas as notificações limpas',
  })
  @ApiResponse({ status: 204 })
  deleteAllCleared(@CurrentUser('sub') userId: string) {
    return this.notificationsService.deleteAllCleared(userId);
  }

  @Post(':id/read')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Marcar notificação como lida' })
  @ApiResponse({ status: 204 })
  markAsRead(
    @CurrentUser('sub') userId: string,
    @Param('id', ParseCuidPipe) id: string,
  ) {
    return this.notificationsService.markAsRead(userId, id);
  }

  @Post(':id/unread')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Marcar notificação como não lida' })
  @ApiResponse({ status: 204 })
  markAsUnread(
    @CurrentUser('sub') userId: string,
    @Param('id', ParseCuidPipe) id: string,
  ) {
    return this.notificationsService.markAsUnread(userId, id);
  }

  @Post(':id/clear')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Limpar notificação' })
  @ApiResponse({ status: 204 })
  clear(
    @CurrentUser('sub') userId: string,
    @Param('id', ParseCuidPipe) id: string,
  ) {
    return this.notificationsService.clear(userId, id);
  }

  @Post(':id/unclear')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Desfazer limpeza da notificação' })
  @ApiResponse({ status: 204 })
  unclear(
    @CurrentUser('sub') userId: string,
    @Param('id', ParseCuidPipe) id: string,
  ) {
    return this.notificationsService.unclear(userId, id);
  }

  @Post(':id/snooze')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Adiar notificação até uma data/hora' })
  @ApiResponse({ status: 204 })
  snooze(
    @CurrentUser('sub') userId: string,
    @Param('id', ParseCuidPipe) id: string,
    @Body() dto: SnoozeNotificationDto,
  ) {
    return this.notificationsService.snooze(userId, id, dto);
  }

  @Post(':id/unsnooze')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Cancelar adiamento da notificação' })
  @ApiResponse({ status: 204 })
  unsnooze(
    @CurrentUser('sub') userId: string,
    @Param('id', ParseCuidPipe) id: string,
  ) {
    return this.notificationsService.unsnooze(userId, id);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Soft-delete da notificação' })
  @ApiResponse({ status: 204 })
  remove(
    @CurrentUser('sub') userId: string,
    @Param('id', ParseCuidPipe) id: string,
  ) {
    return this.notificationsService.remove(userId, id);
  }
}
