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
import { ClientClassificationsService } from './client-classifications.service';
import { CreateClientClassificationDto } from './dto/create-client-classification.dto';
import { UpdateClientClassificationDto } from './dto/update-client-classification.dto';
import { ClientClassificationResponseDto } from './dto/client-classification-response.dto';
import { PaginationDto } from '../../common/dtos/pagination.dto';
import { Roles } from '../auth/decorators';

@ApiTags('Client Classifications')
@ApiBearerAuth()
@Controller('client-classifications')
export class ClientClassificationsController {
  constructor(private readonly clientClassificationsService: ClientClassificationsService) {}

  @Post()
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Criar classificação de cliente (somente ADMIN)' })
  @ApiResponse({ status: 201, type: ClientClassificationResponseDto })
  create(@Body() dto: CreateClientClassificationDto) {
    return this.clientClassificationsService.create(dto);
  }

  @Get()
  @Roles(Role.ADMIN, Role.MANAGER)
  @ApiOperation({ summary: 'Listar classificações de cliente' })
  findAll(@Query() pagination: PaginationDto) {
    return this.clientClassificationsService.findAll(pagination);
  }

  @Get(':id')
  @Roles(Role.ADMIN, Role.MANAGER)
  @ApiOperation({ summary: 'Buscar classificação de cliente por ID' })
  @ApiResponse({ status: 200, type: ClientClassificationResponseDto })
  @ApiResponse({ status: 404, description: 'Classificação de cliente não encontrada' })
  findOne(@Param('id') id: string) {
    return this.clientClassificationsService.findById(id);
  }

  @Patch(':id')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Atualizar classificação de cliente (somente ADMIN)' })
  @ApiResponse({ status: 200, type: ClientClassificationResponseDto })
  update(@Param('id') id: string, @Body() dto: UpdateClientClassificationDto) {
    return this.clientClassificationsService.update(id, dto);
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remover classificação de cliente (soft delete, somente ADMIN)' })
  @ApiResponse({ status: 204 })
  remove(@Param('id') id: string) {
    return this.clientClassificationsService.remove(id);
  }
}
