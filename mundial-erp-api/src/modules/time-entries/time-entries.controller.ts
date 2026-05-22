import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Put,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { Throttle } from '@nestjs/throttler';
import { TimeEntriesService } from './time-entries.service';
import { CreateTimeEntryDto } from './dtos/create-time-entry.dto';
import { StartTimeEntryDto } from './dtos/start-time-entry.dto';
import { TimeEntryResponseDto } from './dtos/time-entry-response.dto';
import { CurrentUser, Roles } from '../auth/decorators';
import type { JwtPayload } from '../auth/decorators';
import { WorkspaceId } from '../workspaces/decorators/workspace-id.decorator';

@ApiTags('Time Entries')
@ApiBearerAuth()
@Controller()
export class TimeEntriesController {
  constructor(private readonly service: TimeEntriesService) {}

  @Get('tasks/:taskId/time-entries')
  @Roles(Role.ADMIN, Role.MANAGER, Role.OPERATOR, Role.VIEWER)
  @ApiOperation({ summary: 'Listar registros de tempo de uma task' })
  @ApiResponse({ status: 200, type: [TimeEntryResponseDto] })
  findAll(@WorkspaceId() workspaceId: string, @Param('taskId') taskId: string) {
    return this.service.findByTask(workspaceId, taskId);
  }

  @Post('tasks/:taskId/time-entries/start')
  @Roles(Role.ADMIN, Role.MANAGER, Role.OPERATOR)
  @HttpCode(HttpStatus.CREATED)
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  @ApiOperation({ summary: 'Iniciar timer (uma entry ativa por task+usuario)' })
  @ApiResponse({ status: 201, type: TimeEntryResponseDto })
  @ApiResponse({ status: 409, description: 'Timer ja ativo' })
  start(
    @WorkspaceId() workspaceId: string,
    @Param('taskId') taskId: string,
    @Body() dto: StartTimeEntryDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.service.start(workspaceId, taskId, user.sub, dto);
  }

  @Put('tasks/:taskId/time-entries/:entryId/stop')
  @Roles(Role.ADMIN, Role.MANAGER, Role.OPERATOR)
  @ApiOperation({ summary: 'Parar timer ativo (apenas o dono)' })
  @ApiResponse({ status: 200, type: TimeEntryResponseDto })
  stop(
    @WorkspaceId() workspaceId: string,
    @Param('taskId') taskId: string,
    @Param('entryId') entryId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.service.stop(workspaceId, taskId, entryId, user.sub);
  }

  @Post('tasks/:taskId/time-entries')
  @Roles(Role.ADMIN, Role.MANAGER, Role.OPERATOR)
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  @ApiOperation({ summary: 'Registrar tempo manualmente (start+end+duration)' })
  @ApiResponse({ status: 201, type: TimeEntryResponseDto })
  createManual(
    @WorkspaceId() workspaceId: string,
    @Param('taskId') taskId: string,
    @Body() dto: CreateTimeEntryDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.service.createManual(workspaceId, taskId, user.sub, dto);
  }
}
