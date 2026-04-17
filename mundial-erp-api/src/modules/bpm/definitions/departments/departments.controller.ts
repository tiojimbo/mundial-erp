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
import { Role } from '@prisma/client';
import { DepartmentsService } from './departments.service';
import { CreateDepartmentDto } from './dto/create-department.dto';
import { UpdateDepartmentDto } from './dto/update-department.dto';
import { DepartmentResponseDto } from './dto/department-response.dto';
import { SidebarDepartmentDto } from './dto/sidebar-department.dto';
import { PaginationDto } from '../../../../common/dtos/pagination.dto';
import { Roles } from '../../../auth/decorators';

@ApiTags('BPM - Departments')
@ApiBearerAuth()
@Controller('departments')
export class DepartmentsController {
  constructor(private readonly departmentsService: DepartmentsService) {}

  @Post()
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Criar departamento (somente ADMIN)' })
  @ApiResponse({ status: 201, type: DepartmentResponseDto })
  @ApiResponse({ status: 409, description: 'Departamento com este nome já existe' })
  create(@Body() dto: CreateDepartmentDto) {
    return this.departmentsService.create(dto);
  }

  @Get()
  @Roles(Role.ADMIN, Role.MANAGER)
  @ApiOperation({ summary: 'Listar departamentos' })
  findAll(@Query() pagination: PaginationDto) {
    return this.departmentsService.findAll(pagination);
  }

  @Get('sidebar')
  @Roles(Role.ADMIN, Role.MANAGER, Role.OPERATOR, Role.VIEWER)
  @ApiOperation({ summary: 'Árvore de departamentos para sidebar' })
  @ApiResponse({ status: 200, type: [SidebarDepartmentDto] })
  getSidebarTree() {
    return this.departmentsService.getSidebarTree();
  }

  @Get('by-slug/:slug')
  @Roles(Role.ADMIN, Role.MANAGER, Role.OPERATOR, Role.VIEWER)
  @ApiOperation({ summary: 'Buscar departamento por slug (com áreas e processos diretos)' })
  @ApiResponse({ status: 200 })
  @ApiResponse({ status: 404, description: 'Departamento não encontrado' })
  findBySlug(@Param('slug') slug: string) {
    return this.departmentsService.findBySlug(slug);
  }

  @Get(':id/process-summaries')
  @Roles(Role.ADMIN, Role.MANAGER, Role.OPERATOR, Role.VIEWER)
  @ApiOperation({
    summary: 'Resumo consolidado de todos os processos do departamento (LIST + BPM)',
  })
  @ApiResponse({ status: 200 })
  @ApiResponse({ status: 404, description: 'Departamento não encontrado' })
  getProcessSummaries(
    @Param('id') id: string,
    @Query('showClosed') showClosed?: string,
  ) {
    return this.departmentsService.getProcessSummaries(
      id,
      showClosed === 'true',
    );
  }

  @Get(':id')
  @Roles(Role.ADMIN, Role.MANAGER)
  @ApiOperation({ summary: 'Buscar departamento por ID' })
  @ApiResponse({ status: 200, type: DepartmentResponseDto })
  @ApiResponse({ status: 404, description: 'Departamento não encontrado' })
  findOne(@Param('id') id: string) {
    return this.departmentsService.findById(id);
  }

  @Patch(':id')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Atualizar departamento (somente ADMIN)' })
  @ApiResponse({ status: 200, type: DepartmentResponseDto })
  update(@Param('id') id: string, @Body() dto: UpdateDepartmentDto) {
    return this.departmentsService.update(id, dto);
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remover departamento (soft delete, somente ADMIN)' })
  @ApiResponse({ status: 204 })
  remove(@Param('id') id: string) {
    return this.departmentsService.remove(id);
  }
}
