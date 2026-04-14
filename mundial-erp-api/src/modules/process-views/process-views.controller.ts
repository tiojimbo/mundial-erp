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
import { ProcessViewsService } from './process-views.service';
import { CreateProcessViewDto } from './dto/create-process-view.dto';
import { UpdateProcessViewDto } from './dto/update-process-view.dto';
import { ProcessViewResponseDto } from './dto/process-view-response.dto';
import { PaginationDto } from '../../common/dtos/pagination.dto';
import { Roles } from '../auth/decorators';

@ApiTags('Process Views')
@ApiBearerAuth()
@Controller('process-views')
export class ProcessViewsController {
  constructor(private readonly processViewsService: ProcessViewsService) {}

  @Post()
  @Roles(Role.ADMIN, Role.MANAGER)
  @ApiOperation({ summary: 'Criar visão de processo' })
  @ApiResponse({ status: 201, type: ProcessViewResponseDto })
  create(@Body() dto: CreateProcessViewDto) {
    return this.processViewsService.create(dto);
  }

  @Get()
  @Roles(Role.ADMIN, Role.MANAGER, Role.OPERATOR)
  @ApiOperation({ summary: 'Listar visões de um processo' })
  findAll(@Query('processId') processId: string, @Query() pagination: PaginationDto) {
    return this.processViewsService.findAllByProcess(processId, pagination);
  }

  @Patch(':id')
  @Roles(Role.ADMIN, Role.MANAGER)
  @ApiOperation({ summary: 'Atualizar visão (nome/config)' })
  @ApiResponse({ status: 200, type: ProcessViewResponseDto })
  @ApiResponse({ status: 404, description: 'Visão não encontrada' })
  update(@Param('id') id: string, @Body() dto: UpdateProcessViewDto) {
    return this.processViewsService.update(id, dto);
  }

  @Patch(':id/pin')
  @Roles(Role.ADMIN, Role.MANAGER)
  @ApiOperation({ summary: 'Fixar visão como padrão (desfixa as demais do processo)' })
  @ApiResponse({ status: 200, type: ProcessViewResponseDto })
  @ApiResponse({ status: 404, description: 'Visão não encontrada' })
  pin(@Param('id') id: string) {
    return this.processViewsService.pin(id);
  }

  @Delete(':id')
  @Roles(Role.ADMIN, Role.MANAGER)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remover visão (soft delete)' })
  @ApiResponse({ status: 204 })
  remove(@Param('id') id: string) {
    return this.processViewsService.remove(id);
  }
}
