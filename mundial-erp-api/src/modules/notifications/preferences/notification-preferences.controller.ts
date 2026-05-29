import {
  Body,
  Controller,
  Get,
  Param,
  ParseEnumPipe,
  Put,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { NotificationPreferenceType } from '@prisma/client';
import { CurrentUser } from '../../auth/decorators';
import { SkipWorkspaceGuard } from '../../workspaces/decorators/skip-workspace-guard.decorator';
import { NotificationPreferencesService } from './notification-preferences.service';
import {
  NotificationPreferenceResponseDto,
  UpsertNotificationPreferenceDto,
} from './dto/notification-preference.dto';

@ApiTags('Notifications')
@ApiBearerAuth()
@Controller('notifications/preferences')
@SkipWorkspaceGuard()
export class NotificationPreferencesController {
  constructor(private readonly service: NotificationPreferencesService) {}

  @Get()
  @ApiOperation({
    summary: 'Lista preferencias de notificacao do usuario logado',
  })
  @ApiResponse({ status: 200, type: [NotificationPreferenceResponseDto] })
  list(@CurrentUser('sub') userId: string) {
    return this.service.listForUser(userId);
  }

  @Put(':type')
  @ApiOperation({
    summary: 'Upsert da preferencia para um tipo (channels/enabled)',
  })
  @ApiResponse({ status: 200, type: NotificationPreferenceResponseDto })
  upsert(
    @CurrentUser('sub') userId: string,
    @Param('type', new ParseEnumPipe(NotificationPreferenceType))
    type: NotificationPreferenceType,
    @Body() dto: UpsertNotificationPreferenceDto,
  ) {
    return this.service.upsert(userId, type, dto);
  }
}
