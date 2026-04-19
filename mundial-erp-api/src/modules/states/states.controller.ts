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
import { StatesService } from './states.service';
import { CreateStateDto } from './dto/create-state.dto';
import { UpdateStateDto } from './dto/update-state.dto';
import { StateResponseDto } from './dto/state-response.dto';
import { PaginationDto } from '../../common/dtos/pagination.dto';
import { Roles } from '../auth/decorators';

@ApiTags('States')
@ApiBearerAuth()
@Controller('states')
export class StatesController {
  constructor(private readonly statesService: StatesService) {}

  @Post()
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Criar estado (somente ADMIN)' })
  @ApiResponse({ status: 201, type: StateResponseDto })
  @ApiResponse({ status: 409, description: 'Estado com esta UF já existe' })
  create(@Body() dto: CreateStateDto) {
    return this.statesService.create(dto);
  }

  @Get()
  @Roles(Role.ADMIN, Role.MANAGER)
  @ApiOperation({ summary: 'Listar estados' })
  findAll(@Query() pagination: PaginationDto) {
    return this.statesService.findAll(pagination);
  }

  @Get(':id')
  @Roles(Role.ADMIN, Role.MANAGER)
  @ApiOperation({ summary: 'Buscar estado por ID' })
  @ApiResponse({ status: 200, type: StateResponseDto })
  @ApiResponse({ status: 404, description: 'Estado não encontrado' })
  findOne(@Param('id') id: string) {
    return this.statesService.findById(id);
  }

  @Get(':id/cities')
  @Roles(Role.ADMIN, Role.MANAGER, Role.OPERATOR, Role.VIEWER)
  @ApiOperation({ summary: 'Listar cidades do estado' })
  findCitiesByState(
    @Param('id') id: string,
    @Query() pagination: PaginationDto,
  ) {
    return this.statesService.findCitiesByState(id, pagination);
  }

  @Patch(':id')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Atualizar estado (somente ADMIN)' })
  @ApiResponse({ status: 200, type: StateResponseDto })
  update(@Param('id') id: string, @Body() dto: UpdateStateDto) {
    return this.statesService.update(id, dto);
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remover estado (somente ADMIN)' })
  @ApiResponse({ status: 204 })
  remove(@Param('id') id: string) {
    return this.statesService.remove(id);
  }
}
