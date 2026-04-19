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
import { WorkspaceMemberRole } from '@prisma/client';
import { MembersService } from './members.service';
import { AddMemberDto } from './dto/add-member.dto';
import { UpdateMemberRoleDto } from './dto/update-member-role.dto';
import { MemberResponseDto } from './dto/member-response.dto';
import { PaginationDto } from '../../../common/dtos/pagination.dto';
import { CurrentUser } from '../../auth/decorators';

@ApiTags('Workspaces - Members')
@ApiBearerAuth()
@Controller('workspaces/:workspaceId/members')
export class MembersController {
  constructor(private readonly membersService: MembersService) {}

  @Get()
  @ApiOperation({ summary: 'Listar membros do workspace (paginado)' })
  @ApiQuery({
    name: 'role',
    required: false,
    enum: WorkspaceMemberRole,
  })
  list(
    @Param('workspaceId') workspaceId: string,
    @CurrentUser('sub') actorId: string,
    @Query() pagination: PaginationDto,
    @Query('role') role?: WorkspaceMemberRole,
  ) {
    return this.membersService.list(workspaceId, actorId, pagination, role);
  }

  @Post()
  @ApiOperation({ summary: 'Adicionar membro (owner/admin)' })
  @ApiResponse({ status: 201, type: MemberResponseDto })
  add(
    @Param('workspaceId') workspaceId: string,
    @CurrentUser('sub') actorId: string,
    @Body() dto: AddMemberDto,
  ) {
    return this.membersService.add(workspaceId, actorId, dto);
  }

  @Patch(':userId')
  @ApiOperation({ summary: 'Atualizar role do membro (owner/admin)' })
  @ApiResponse({ status: 200, type: MemberResponseDto })
  updateRole(
    @Param('workspaceId') workspaceId: string,
    @Param('userId') targetUserId: string,
    @CurrentUser('sub') actorId: string,
    @Body() dto: UpdateMemberRoleDto,
  ) {
    return this.membersService.updateRole(
      workspaceId,
      targetUserId,
      actorId,
      dto,
    );
  }

  @Delete(':userId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remover membro (owner/admin)' })
  @ApiResponse({ status: 204 })
  remove(
    @Param('workspaceId') workspaceId: string,
    @Param('userId') targetUserId: string,
    @CurrentUser('sub') actorId: string,
  ) {
    return this.membersService.remove(workspaceId, targetUserId, actorId);
  }
}
