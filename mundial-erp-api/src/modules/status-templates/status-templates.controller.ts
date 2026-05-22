import { Body, Controller, Delete, Get, Param, Post } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { StatusTemplatesService } from './status-templates.service';
import { CreateStatusTemplateDto } from './dto/create-status-template.dto';
import { StatusTemplateResponseDto } from './dto/status-template-response.dto';
import { Roles } from '../auth/decorators';
import { WorkspaceId } from '../workspaces/decorators/workspace-id.decorator';

@ApiTags('Status Templates')
@ApiBearerAuth()
@Controller('status-templates')
export class StatusTemplatesController {
  constructor(private readonly service: StatusTemplatesService) {}

  @Get()
  @Roles(Role.ADMIN, Role.MANAGER, Role.OPERATOR, Role.VIEWER)
  @ApiOperation({ summary: 'Listar templates de status do workspace' })
  @ApiResponse({ status: 200, type: [StatusTemplateResponseDto] })
  findAll(@WorkspaceId() workspaceId: string) {
    return this.service.findAll(workspaceId);
  }

  @Post()
  @Roles(Role.ADMIN, Role.MANAGER)
  @ApiOperation({ summary: 'Criar template de status (Hoppe-style)' })
  @ApiResponse({ status: 201, type: StatusTemplateResponseDto })
  create(
    @WorkspaceId() workspaceId: string,
    @Body() dto: CreateStatusTemplateDto,
  ) {
    return this.service.create(workspaceId, dto);
  }

  @Delete(':id')
  @Roles(Role.ADMIN, Role.MANAGER)
  @ApiOperation({ summary: 'Remover template de status' })
  @ApiResponse({ status: 200, type: StatusTemplateResponseDto })
  remove(@WorkspaceId() workspaceId: string, @Param('id') id: string) {
    return this.service.remove(workspaceId, id);
  }
}
