import {
  Body,
  Controller,
  Delete,
  Get,
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
import { StatusService } from './status.service';
import { CreateStatusDto } from './dto/create-status.dto';
import { UpdateStatusDto } from './dto/update-status.dto';
import {
  StatusDetailResponseDto,
  StatusResponseDto,
} from './dto/status-response.dto';
import { StatusRequiredFieldResponseDto } from './dto/status-required-field-response.dto';
import { UpdateRequiredFieldsDto } from './dto/update-required-fields.dto';
import { Roles } from '../auth/decorators';
import { WorkspaceId } from '../workspaces/decorators/workspace-id.decorator';

@ApiTags('Status')
@ApiBearerAuth()
@Controller('status')
export class StatusController {
  constructor(private readonly statusService: StatusService) {}

  @Post()
  @Roles(Role.ADMIN, Role.MANAGER)
  @ApiOperation({ summary: 'Criar status (Hoppe-style)' })
  @ApiResponse({ status: 201, type: StatusResponseDto })
  create(@WorkspaceId() workspaceId: string, @Body() dto: CreateStatusDto) {
    return this.statusService.create(workspaceId, dto);
  }

  @Get('list/:listId')
  @Roles(Role.ADMIN, Role.MANAGER, Role.OPERATOR, Role.VIEWER)
  @ApiOperation({ summary: 'Listar status de uma list' })
  @ApiResponse({ status: 200, type: [StatusResponseDto] })
  findByList(
    @WorkspaceId() workspaceId: string,
    @Param('listId') listId: string,
  ) {
    return this.statusService.findByList(workspaceId, listId);
  }

  @Get(':id')
  @Roles(Role.ADMIN, Role.MANAGER, Role.OPERATOR, Role.VIEWER)
  @ApiOperation({ summary: 'Detalhe de status com tasks aninhadas' })
  @ApiResponse({ status: 200, type: StatusDetailResponseDto })
  findById(@WorkspaceId() workspaceId: string, @Param('id') id: string) {
    return this.statusService.findById(workspaceId, id);
  }

  @Put(':id')
  @Roles(Role.ADMIN, Role.MANAGER)
  @ApiOperation({ summary: 'Atualizar status (id no body e na URL)' })
  @ApiResponse({ status: 200, type: StatusResponseDto })
  update(
    @WorkspaceId() workspaceId: string,
    @Param('id') id: string,
    @Body() dto: UpdateStatusDto,
  ) {
    return this.statusService.update(workspaceId, id, dto);
  }

  @Delete(':id')
  @Roles(Role.ADMIN, Role.MANAGER)
  @ApiOperation({ summary: 'Deletar status (sem migração obrigatória)' })
  @ApiResponse({ status: 200, type: StatusResponseDto })
  remove(@WorkspaceId() workspaceId: string, @Param('id') id: string) {
    return this.statusService.remove(workspaceId, id);
  }

  @Get(':id/required-fields')
  @Roles(Role.ADMIN, Role.MANAGER, Role.OPERATOR, Role.VIEWER)
  @ApiOperation({
    summary: 'Listar custom fields obrigatórios pra entrar no status',
  })
  @ApiResponse({ status: 200, type: [StatusRequiredFieldResponseDto] })
  findRequiredFields(
    @WorkspaceId() workspaceId: string,
    @Param('id') id: string,
  ) {
    return this.statusService.findRequiredFields(workspaceId, id);
  }

  @Put(':id/required-fields')
  @Roles(Role.ADMIN, Role.MANAGER)
  @ApiOperation({ summary: 'Substituir custom fields obrigatórios do status' })
  @ApiResponse({ status: 200, type: [StatusRequiredFieldResponseDto] })
  setRequiredFields(
    @WorkspaceId() workspaceId: string,
    @Param('id') id: string,
    @Body() dto: UpdateRequiredFieldsDto,
  ) {
    return this.statusService.setRequiredFields(
      workspaceId,
      id,
      dto.customFieldIds,
    );
  }
}
