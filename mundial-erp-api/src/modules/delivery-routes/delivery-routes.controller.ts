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
import { DeliveryRoutesService } from './delivery-routes.service';
import { CreateDeliveryRouteDto } from './dto/create-delivery-route.dto';
import { UpdateDeliveryRouteDto } from './dto/update-delivery-route.dto';
import { DeliveryRouteResponseDto } from './dto/delivery-route-response.dto';
import { PaginationDto } from '../../common/dtos/pagination.dto';
import { WorkspaceRoles } from '../auth/decorators';

@ApiTags('Delivery Routes')
@ApiBearerAuth()
@Controller('delivery-routes')
export class DeliveryRoutesController {
  constructor(private readonly deliveryRoutesService: DeliveryRoutesService) {}

  @Post()
  @WorkspaceRoles(WorkspaceMemberRole.OWNER, WorkspaceMemberRole.ADMIN)
  @ApiOperation({ summary: 'Criar rota de entrega (somente ADMIN)' })
  @ApiResponse({ status: 201, type: DeliveryRouteResponseDto })
  create(@Body() dto: CreateDeliveryRouteDto) {
    return this.deliveryRoutesService.create(dto);
  }

  @Get()
  @WorkspaceRoles(WorkspaceMemberRole.OWNER, WorkspaceMemberRole.ADMIN)
  @ApiOperation({ summary: 'Listar rotas de entrega' })
  findAll(@Query() pagination: PaginationDto) {
    return this.deliveryRoutesService.findAll(pagination);
  }

  @Get(':id')
  @WorkspaceRoles(WorkspaceMemberRole.OWNER, WorkspaceMemberRole.ADMIN)
  @ApiOperation({ summary: 'Buscar rota de entrega por ID' })
  @ApiResponse({ status: 200, type: DeliveryRouteResponseDto })
  @ApiResponse({ status: 404, description: 'Rota de entrega não encontrada' })
  findOne(@Param('id') id: string) {
    return this.deliveryRoutesService.findById(id);
  }

  @Patch(':id')
  @WorkspaceRoles(WorkspaceMemberRole.OWNER, WorkspaceMemberRole.ADMIN)
  @ApiOperation({ summary: 'Atualizar rota de entrega (somente ADMIN)' })
  @ApiResponse({ status: 200, type: DeliveryRouteResponseDto })
  update(@Param('id') id: string, @Body() dto: UpdateDeliveryRouteDto) {
    return this.deliveryRoutesService.update(id, dto);
  }

  @Delete(':id')
  @WorkspaceRoles(WorkspaceMemberRole.OWNER, WorkspaceMemberRole.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Remover rota de entrega (soft delete, somente ADMIN)',
  })
  @ApiResponse({ status: 204 })
  remove(@Param('id') id: string) {
    return this.deliveryRoutesService.remove(id);
  }
}
