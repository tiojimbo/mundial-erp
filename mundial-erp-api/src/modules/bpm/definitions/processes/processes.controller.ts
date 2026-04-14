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
import { ProcessesService } from './processes.service';
import { CreateProcessDto } from './dto/create-process.dto';
import { UpdateProcessDto } from './dto/update-process.dto';
import { ProcessResponseDto } from './dto/process-response.dto';
import { PaginationDto } from '../../../../common/dtos/pagination.dto';
import { Roles } from '../../../auth/decorators';

@ApiTags('BPM - Processes')
@ApiBearerAuth()
@Controller('processes')
export class ProcessesController {
  constructor(private readonly processesService: ProcessesService) {}

  @Post()
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Criar processo (somente ADMIN)' })
  @ApiResponse({ status: 201, type: ProcessResponseDto })
  @ApiResponse({ status: 409, description: 'Processo com este nome já existe' })
  create(@Body() dto: CreateProcessDto) {
    return this.processesService.create(dto);
  }

  @Get()
  @Roles(Role.ADMIN, Role.MANAGER)
  @ApiOperation({ summary: 'Listar processos' })
  findAll(@Query() pagination: PaginationDto) {
    return this.processesService.findAll(pagination);
  }

  @Get(':id')
  @Roles(Role.ADMIN, Role.MANAGER)
  @ApiOperation({ summary: 'Buscar processo por ID' })
  @ApiResponse({ status: 200, type: ProcessResponseDto })
  @ApiResponse({ status: 404, description: 'Processo não encontrado' })
  findOne(@Param('id') id: string) {
    return this.processesService.findById(id);
  }

  @Patch(':id')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Atualizar processo (somente ADMIN)' })
  @ApiResponse({ status: 200, type: ProcessResponseDto })
  update(@Param('id') id: string, @Body() dto: UpdateProcessDto) {
    return this.processesService.update(id, dto);
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remover processo (soft delete, somente ADMIN)' })
  @ApiResponse({ status: 204 })
  remove(@Param('id') id: string) {
    return this.processesService.remove(id);
  }
}
