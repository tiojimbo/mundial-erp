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
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { CompaniesService } from './companies.service';
import { CreateCompanyDto } from './dto/create-company.dto';
import { UpdateCompanyDto } from './dto/update-company.dto';
import { CompanyResponseDto } from './dto/company-response.dto';
import { PaginationDto } from '../../common/dtos/pagination.dto';
import { Roles } from '../auth/decorators';
import { WorkspaceId } from '../workspaces/decorators/workspace-id.decorator';

@ApiTags('Companies')
@ApiBearerAuth()
@Controller('companies')
export class CompaniesController {
  constructor(private readonly companiesService: CompaniesService) {}

  @Post()
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Criar empresa (somente ADMIN)' })
  @ApiResponse({ status: 201, type: CompanyResponseDto })
  @ApiResponse({ status: 409, description: 'Empresa com este CNPJ já existe' })
  create(@WorkspaceId() workspaceId: string, @Body() dto: CreateCompanyDto) {
    return this.companiesService.create(workspaceId, dto);
  }

  @Get()
  @Roles(Role.ADMIN, Role.MANAGER)
  @ApiOperation({ summary: 'Listar empresas' })
  @ApiQuery({
    name: 'search',
    required: false,
    description: 'Filtrar por nome, nome fantasia ou CNPJ',
  })
  findAll(
    @WorkspaceId() workspaceId: string,
    @Query() pagination: PaginationDto,
    @Query('search') search?: string,
  ) {
    return this.companiesService.findAll(workspaceId, pagination, search);
  }

  @Get(':id')
  @Roles(Role.ADMIN, Role.MANAGER)
  @ApiOperation({ summary: 'Buscar empresa por ID' })
  @ApiResponse({ status: 200, type: CompanyResponseDto })
  @ApiResponse({ status: 404, description: 'Empresa não encontrada' })
  findOne(@WorkspaceId() workspaceId: string, @Param('id') id: string) {
    return this.companiesService.findById(workspaceId, id);
  }

  @Patch(':id')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Atualizar empresa (somente ADMIN)' })
  @ApiResponse({ status: 200, type: CompanyResponseDto })
  update(
    @WorkspaceId() workspaceId: string,
    @Param('id') id: string,
    @Body() dto: UpdateCompanyDto,
  ) {
    return this.companiesService.update(workspaceId, id, dto);
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remover empresa (soft delete, somente ADMIN)' })
  @ApiResponse({ status: 204 })
  remove(@WorkspaceId() workspaceId: string, @Param('id') id: string) {
    return this.companiesService.remove(workspaceId, id);
  }
}
