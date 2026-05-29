import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
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
import { MembersService } from './members.service';
import { BulkAddUsersDto } from './dto/bulk-add-users.dto';
import { BulkAddResponseDto } from './dto/bulk-add-response.dto';
import { SetPermissionDto } from './dto/set-permission.dto';
import { MemberResponseDto } from './dto/member-response.dto';
import { ListWorkspaceUsersQueryDto } from './dto/list-workspace-users-query.dto';
import { WorkspaceUsersResponseDto } from '../dto/workspace-users-response.dto';
import { CurrentUser } from '../../auth/decorators';
import { SkipWorkspaceGuard } from '../decorators/skip-workspace-guard.decorator';

@ApiTags('Workspaces - Users')
@ApiBearerAuth()
@Controller('workspaces/:workspaceId/users')
export class WorkspaceUsersController {
  constructor(private readonly membersService: MembersService) {}

  @Get()
  @SkipWorkspaceGuard()
  @ApiOperation({ summary: 'Listar usuarios do workspace (Hoppe-style)' })
  @ApiQuery({ name: 'showPending', required: false, type: Boolean })
  @ApiResponse({ status: 200, type: WorkspaceUsersResponseDto })
  list(
    @Param('workspaceId') workspaceId: string,
    @CurrentUser('sub') userId: string,
    @Query() query: ListWorkspaceUsersQueryDto,
  ): Promise<WorkspaceUsersResponseDto> {
    return this.membersService.listUsers(
      workspaceId,
      userId,
      query,
      query.showPending ?? false,
    );
  }

  @Post('bulk')
  @ApiOperation({
    summary: 'Adicionar usuarios em lote (cria na hora se nao existe)',
  })
  @ApiResponse({ status: 201, type: BulkAddResponseDto })
  bulk(
    @Param('workspaceId') workspaceId: string,
    @CurrentUser('sub') actorId: string,
    @Body() dto: BulkAddUsersDto,
  ): Promise<BulkAddResponseDto> {
    return this.membersService.bulkAdd(workspaceId, actorId, dto);
  }

  @Post(':userId/permission')
  @ApiOperation({ summary: 'Alterar funcao do usuario no workspace' })
  @ApiResponse({ status: 201, type: MemberResponseDto })
  setPermission(
    @Param('workspaceId') workspaceId: string,
    @Param('userId') targetUserId: string,
    @CurrentUser('sub') actorId: string,
    @Body() dto: SetPermissionDto,
  ): Promise<MemberResponseDto> {
    return this.membersService.updateRole(workspaceId, targetUserId, actorId, {
      role: dto.permission,
    });
  }

  @Delete(':userId/remove')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remover usuario do workspace' })
  @ApiResponse({ status: 204 })
  remove(
    @Param('workspaceId') workspaceId: string,
    @Param('userId') targetUserId: string,
    @CurrentUser('sub') actorId: string,
  ): Promise<void> {
    return this.membersService.remove(workspaceId, targetUserId, actorId);
  }
}
