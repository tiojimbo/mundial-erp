import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseEnumPipe,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { FavoriteEntity, Role } from '@prisma/client';
import { PaginationDto } from '../../common/dtos/pagination.dto';
import { CurrentUser, Roles } from '../auth/decorators';
import type { JwtPayload } from '../auth/decorators';
import { WorkspaceId } from '../workspaces/decorators/workspace-id.decorator';
import { FavoritesService } from './favorites.service';
import { CreateFavoriteDto } from './dtos/create-favorite.dto';
import { FavoriteResponseDto } from './dtos/favorite-response.dto';
import { GroupedFavoritesResponseDto } from './dtos/grouped-favorites-response.dto';

@ApiTags('Favorites')
@ApiBearerAuth()
@Controller()
@Roles(Role.ADMIN, Role.MANAGER, Role.OPERATOR, Role.VIEWER)
export class FavoritesController {
  constructor(private readonly service: FavoritesService) {}

  @Get('favorites')
  @ApiOperation({
    summary: 'Listar favoritos do usuario agrupados por bucket (TOP/SIDEBAR/BOTTOM)',
  })
  @ApiResponse({ status: 200, type: GroupedFavoritesResponseDto })
  findAll(
    @CurrentUser() user: JwtPayload,
    @WorkspaceId() workspaceId: string,
    @Query() pagination: PaginationDto,
  ) {
    return this.service.findAll(user.sub, workspaceId, pagination);
  }

  @Get('favorites/spaces')
  @ApiOperation({ summary: 'Listar favoritos do tipo SPACE' })
  @ApiResponse({ status: 200, type: [FavoriteResponseDto] })
  listSpaces(
    @CurrentUser() user: JwtPayload,
    @WorkspaceId() workspaceId: string,
    @Query() pagination: PaginationDto,
  ) {
    return this.service.findByEntityType(
      user.sub,
      workspaceId,
      FavoriteEntity.SPACE,
      pagination,
    );
  }

  @Get('favorites/check/:entityType/:entityId')
  @ApiOperation({ summary: 'Verificar se uma entidade esta favoritada' })
  check(
    @CurrentUser() user: JwtPayload,
    @WorkspaceId() workspaceId: string,
    @Param('entityType', new ParseEnumPipe(FavoriteEntity))
    entityType: FavoriteEntity,
    @Param('entityId') entityId: string,
  ) {
    return this.service.check(user.sub, workspaceId, entityType, entityId);
  }

  @Post('favorites')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Criar favorito (idempotente)' })
  @ApiResponse({ status: 201, type: FavoriteResponseDto })
  @ApiResponse({ status: 404, description: 'Entidade nao encontrada no workspace' })
  create(
    @CurrentUser() user: JwtPayload,
    @WorkspaceId() workspaceId: string,
    @Body() dto: CreateFavoriteDto,
  ) {
    return this.service.create(user.sub, workspaceId, dto);
  }

  @Delete('favorites/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remover favorito (hard delete)' })
  @ApiResponse({ status: 204 })
  @ApiResponse({ status: 404, description: 'Favorito nao encontrado' })
  remove(
    @CurrentUser() user: JwtPayload,
    @WorkspaceId() workspaceId: string,
    @Param('id') id: string,
  ) {
    return this.service.remove(user.sub, workspaceId, id);
  }
}
