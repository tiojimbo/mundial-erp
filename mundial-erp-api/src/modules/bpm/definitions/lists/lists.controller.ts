import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { ListsService } from './lists.service';
import { CreateListDto } from './dto/create-list.dto';
import { UpdateListDto } from './dto/update-list.dto';
import { ListResponseDto } from './dto/list-response.dto';
import { CurrentUser, Roles } from '../../../auth/decorators';
import type { JwtPayload } from '../../../auth/decorators';
import { WorkspaceId } from '../../../workspaces/decorators/workspace-id.decorator';
import { SkipResponseTransform } from '../../../../common/decorators/skip-response-transform.decorator';

@ApiTags('Lists')
@ApiBearerAuth()
@Controller('lists')
export class ListsController {
  constructor(private readonly listsService: ListsService) {}

  @Post()
  @SkipResponseTransform()
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Criar list (somente ADMIN)' })
  @ApiResponse({ status: 201, type: ListResponseDto })
  @ApiResponse({ status: 409, description: 'List com este nome já existe' })
  create(
    @WorkspaceId() workspaceId: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateListDto,
  ) {
    return this.listsService.create(workspaceId, user.sub, dto);
  }

  @Get()
  @SkipResponseTransform()
  @Roles(Role.ADMIN, Role.MANAGER, Role.OPERATOR, Role.VIEWER)
  @ApiOperation({ summary: 'Listar lists por folder ou space' })
  findAll(
    @WorkspaceId() workspaceId: string,
    @Query('folderId') folderId?: string,
    @Query('spaceId') spaceId?: string,
  ) {
    return this.listsService.findAllScoped(workspaceId, { folderId, spaceId });
  }

  @Get(':id')
  @SkipResponseTransform()
  @Roles(Role.ADMIN, Role.MANAGER, Role.OPERATOR, Role.VIEWER)
  @ApiOperation({ summary: 'Buscar list por ID' })
  @ApiResponse({ status: 200, type: ListResponseDto })
  @ApiResponse({ status: 404, description: 'List não encontrada' })
  findOne(@WorkspaceId() workspaceId: string, @Param('id') id: string) {
    return this.listsService.findById(workspaceId, id);
  }

  @Put(':id')
  @SkipResponseTransform()
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Atualizar list (somente ADMIN)' })
  @ApiResponse({ status: 200, type: ListResponseDto })
  update(
    @WorkspaceId() workspaceId: string,
    @Param('id') id: string,
    @Body() dto: UpdateListDto,
  ) {
    return this.listsService.update(workspaceId, id, dto);
  }

  @Delete(':id')
  @SkipResponseTransform()
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Remover list (soft delete, somente ADMIN)' })
  @ApiResponse({ status: 200 })
  remove(@WorkspaceId() workspaceId: string, @Param('id') id: string) {
    return this.listsService.remove(workspaceId, id);
  }
}
