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
import { SectorsService } from './sectors.service';
import { CreateSectorDto } from './dto/create-sector.dto';
import { UpdateSectorDto } from './dto/update-sector.dto';
import { SectorResponseDto } from './dto/sector-response.dto';
import { PaginationDto } from '../../../../common/dtos/pagination.dto';
import { WorkspaceRoles } from '../../../auth/decorators';
import { WorkspaceId } from '../../../workspaces/decorators/workspace-id.decorator';

@ApiTags('BPM - Sectors')
@ApiBearerAuth()
@Controller('sectors')
export class SectorsController {
  constructor(private readonly sectorsService: SectorsService) {}

  @Post()
  @WorkspaceRoles(WorkspaceMemberRole.OWNER, WorkspaceMemberRole.ADMIN)
  @ApiOperation({ summary: 'Criar setor (somente ADMIN)' })
  @ApiResponse({ status: 201, type: SectorResponseDto })
  @ApiResponse({ status: 409, description: 'Setor com este nome já existe' })
  create(@WorkspaceId() workspaceId: string, @Body() dto: CreateSectorDto) {
    return this.sectorsService.create(workspaceId, dto);
  }

  @Get()
  @WorkspaceRoles(WorkspaceMemberRole.OWNER, WorkspaceMemberRole.ADMIN)
  @ApiOperation({ summary: 'Listar setores' })
  findAll(
    @WorkspaceId() workspaceId: string,
    @Query() pagination: PaginationDto,
  ) {
    return this.sectorsService.findAll(workspaceId, pagination);
  }

  @Get(':id')
  @WorkspaceRoles(WorkspaceMemberRole.OWNER, WorkspaceMemberRole.ADMIN)
  @ApiOperation({ summary: 'Buscar setor por ID' })
  @ApiResponse({ status: 200, type: SectorResponseDto })
  @ApiResponse({ status: 404, description: 'Setor não encontrado' })
  findOne(@WorkspaceId() workspaceId: string, @Param('id') id: string) {
    return this.sectorsService.findById(workspaceId, id);
  }

  @Patch(':id')
  @WorkspaceRoles(WorkspaceMemberRole.OWNER, WorkspaceMemberRole.ADMIN)
  @ApiOperation({ summary: 'Atualizar setor (somente ADMIN)' })
  @ApiResponse({ status: 200, type: SectorResponseDto })
  update(
    @WorkspaceId() workspaceId: string,
    @Param('id') id: string,
    @Body() dto: UpdateSectorDto,
  ) {
    return this.sectorsService.update(workspaceId, id, dto);
  }

  @Delete(':id')
  @WorkspaceRoles(WorkspaceMemberRole.OWNER, WorkspaceMemberRole.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remover setor (soft delete, somente ADMIN)' })
  @ApiResponse({ status: 204 })
  remove(@WorkspaceId() workspaceId: string, @Param('id') id: string) {
    return this.sectorsService.remove(workspaceId, id);
  }
}
