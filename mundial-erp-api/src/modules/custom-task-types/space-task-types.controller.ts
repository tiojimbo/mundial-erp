import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Put,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';

import { CustomTaskTypesService } from './custom-task-types.service';
import { CustomTaskTypeResponseDto } from './dtos/custom-task-type-response.dto';
import { CreateCustomTaskTypeDto } from './dtos/create-custom-task-type.dto';
import { UpdateCustomTaskTypeDto } from './dtos/update-custom-task-type.dto';
import { CurrentUser } from '../auth/decorators';
import type { JwtPayload } from '../auth/decorators';
import { WorkspaceId } from '../workspaces/decorators/workspace-id.decorator';

@ApiTags('Custom Task Types')
@ApiBearerAuth()
@Controller('spaces/:spaceId/task-types')
export class SpaceTaskTypesController {
  constructor(private readonly service: CustomTaskTypesService) {}

  @Get()
  @ApiOperation({ summary: 'Listar custom task types do space' })
  @ApiResponse({ status: 200, type: [CustomTaskTypeResponseDto] })
  @ApiResponse({ status: 404, description: 'Space nao encontrado' })
  list(@WorkspaceId() workspaceId: string, @Param('spaceId') spaceId: string) {
    return this.service.listBySpace(workspaceId, spaceId);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Criar custom task type vinculado ao space' })
  @ApiResponse({ status: 201, type: CustomTaskTypeResponseDto })
  @ApiResponse({ status: 404, description: 'Space nao encontrado' })
  @ApiResponse({ status: 409, description: 'Nome ja existe no workspace' })
  create(
    @WorkspaceId() workspaceId: string,
    @CurrentUser() user: JwtPayload,
    @Param('spaceId') spaceId: string,
    @Body() dto: CreateCustomTaskTypeDto,
  ) {
    return this.service.create(workspaceId, dto, user.sub, spaceId);
  }

  @Put(':ttId')
  @ApiOperation({ summary: 'Atualizar custom task type do space' })
  @ApiResponse({ status: 200, type: CustomTaskTypeResponseDto })
  @ApiResponse({
    status: 403,
    description: 'Builtin custom task types are read-only',
  })
  @ApiResponse({
    status: 404,
    description: 'Custom task type nao encontrado neste space',
  })
  @ApiResponse({ status: 409, description: 'Nome ja existe no workspace' })
  update(
    @WorkspaceId() workspaceId: string,
    @Param('spaceId') spaceId: string,
    @Param('ttId') ttId: string,
    @Body() dto: UpdateCustomTaskTypeDto,
  ) {
    return this.service.update(workspaceId, ttId, dto, {
      expectedSpaceId: spaceId,
    });
  }

  @Delete(':ttId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remover custom task type do space (soft delete)' })
  @ApiResponse({ status: 204 })
  @ApiResponse({
    status: 403,
    description: 'Builtin custom task types are read-only',
  })
  @ApiResponse({
    status: 404,
    description: 'Custom task type nao encontrado neste space',
  })
  remove(
    @WorkspaceId() workspaceId: string,
    @Param('spaceId') spaceId: string,
    @Param('ttId') ttId: string,
  ) {
    return this.service.remove(workspaceId, ttId, { expectedSpaceId: spaceId });
  }
}
