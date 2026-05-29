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
import { WorkspaceMemberRole } from '@prisma/client';
import { HandoffsService } from './handoffs.service';
import { CreateHandoffDto } from './dto/create-handoff.dto';
import { UpdateHandoffDto } from './dto/update-handoff.dto';
import { HandoffResponseDto } from './dto/handoff-response.dto';
import { PaginationDto } from '../../../../common/dtos/pagination.dto';
import { WorkspaceRoles } from '../../../auth/decorators';

@ApiTags('BPM - Handoffs')
@ApiBearerAuth()
@Controller('handoffs')
export class HandoffsController {
  constructor(private readonly handoffsService: HandoffsService) {}

  @Post()
  @WorkspaceRoles(WorkspaceMemberRole.OWNER, WorkspaceMemberRole.ADMIN)
  @ApiOperation({ summary: 'Criar handoff (somente ADMIN)' })
  @ApiResponse({ status: 201, type: HandoffResponseDto })
  create(@Body() dto: CreateHandoffDto) {
    return this.handoffsService.create(dto);
  }

  @Get()
  @WorkspaceRoles(WorkspaceMemberRole.OWNER, WorkspaceMemberRole.ADMIN)
  @ApiOperation({ summary: 'Listar handoffs' })
  findAll(@Query() pagination: PaginationDto) {
    return this.handoffsService.findAll(pagination);
  }

  @Get(':id')
  @WorkspaceRoles(WorkspaceMemberRole.OWNER, WorkspaceMemberRole.ADMIN)
  @ApiOperation({ summary: 'Buscar handoff por ID' })
  @ApiResponse({ status: 200, type: HandoffResponseDto })
  @ApiResponse({ status: 404, description: 'Handoff não encontrado' })
  findOne(@Param('id') id: string) {
    return this.handoffsService.findById(id);
  }

  @Patch(':id')
  @WorkspaceRoles(WorkspaceMemberRole.OWNER, WorkspaceMemberRole.ADMIN)
  @ApiOperation({ summary: 'Atualizar handoff (somente ADMIN)' })
  @ApiResponse({ status: 200, type: HandoffResponseDto })
  update(@Param('id') id: string, @Body() dto: UpdateHandoffDto) {
    return this.handoffsService.update(id, dto);
  }

  @Delete(':id')
  @WorkspaceRoles(WorkspaceMemberRole.OWNER, WorkspaceMemberRole.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remover handoff (soft delete, somente ADMIN)' })
  @ApiResponse({ status: 204 })
  remove(@Param('id') id: string) {
    return this.handoffsService.remove(id);
  }
}
